/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 渲染端会话管理器：把 core/ai 的 Agent 循环接到应用真实环境——
 * jsonl 落盘（userData/ai-sessions/<bookId>/）、技能目录、工具注册表、
 * 审批 broker 全部在此装配。UI（GlobalAssistant / 审批面板 / 事件浏览器）
 * 只消费这里暴露的会话与状态。
 */
import {
  ApprovalRouter,
  AiSession,
  registerBuiltinSections,
  runAgentSession,
} from '@core/ai';
import type {
  AgentTurnResult,
  AiEvent,
  ApprovalBroker,
  PromptAssembler,
  SessionSink,
  SkillCatalog,
  ToolRegistry,
} from '@core/ai';
import type { EventBus, SeamPolicy } from '@core/plugin';
import type { CardPromptTemplate, ConsistencyCheckPromptTemplate, ModelConfig, Project } from '@shared/types';
import { aiGatewayClient } from '@/shared/services/ai/gatewayClient.js';
import { useSettingsStore } from '@/app/stores/settingsStore';

function electron(): NonNullable<Window['electronAPI']> {
  if (!window.electronAPI) {
    throw new Error('ai-sessions: electronAPI 不可用（预览环境无文件系统）');
  }
  return window.electronAPI;
}

/** jsonl 落盘：整文件重写（单会话单文件，量级 <100KB，安全简单）。 */
class FileSessionSink implements SessionSink {
  private lines: string[] = [];
  private readonly path: Promise<string>;

  constructor(sessionId: string, bookId: string | undefined) {
    this.path = electron()
      .getAppDataPath()
      .then((base) => `${base}/ai-sessions/${bookId ?? 'no-book'}/${sessionId}.jsonl`)
      .catch(() => Promise.reject(new Error('ai-sessions: 无法解析数据目录')));
  }

  async append(_sessionId: string, line: string): Promise<void> {
    this.lines.push(line);
    try {
      await electron().writeFile(await this.path, `${this.lines.join('\n')}\n`);
    } catch {
      // 落盘失败不阻断会话：事件仍在内存，UI 可读（end 时会再尝试）
    }
  }

  /** 待写入路径（测试/诊断用）。 */
  get targetPath(): Promise<string> {
    return this.path;
  }

  get bufferedLines(): number {
    return this.lines.length;
  }
}

export interface SessionManagerDeps {
  assembler: PromptAssembler;
  registry: ToolRegistry;
  catalog: SkillCatalog;
  broker: ApprovalBroker;
  /** 能力接缝：ai.request 的 inject 策略在装配时注入系统约束 */
  events: EventBus;
}

export interface RunSessionInput {
  bookId?: string;
  task: string;
  project: Project | null | undefined;
  index?: unknown;
  model: ModelConfig;
  maxTurns?: number;
  signal?: AbortSignal;
  /** 用户在助手中选中的卡片模板（Agent 卡片生成沿用，不再回退默认） */
  cardTemplate?: CardPromptTemplate;
}

export class AiSessionManager {
  private readonly assembler: PromptAssembler;
  private readonly registry: ToolRegistry;
  private readonly catalog: SkillCatalog;
  readonly broker: ApprovalBroker;
  private readonly router: ApprovalRouter;
  private lastSession: AiSession | null = null;

  private readonly events: EventBus;

  constructor(deps: SessionManagerDeps) {
    this.assembler = deps.assembler;
    this.registry = deps.registry;
    this.catalog = deps.catalog;
    this.broker = deps.broker;
    this.events = deps.events;
    this.router = new ApprovalRouter(deps.broker);
    registerBuiltinSections(this.assembler);
  }

  /** 最近一次会话的事件（事件浏览器/诊断消费）。 */
  getEvents(): AiEvent[] {
    return this.lastSession?.events ?? [];
  }

  /** 审批待审箱数量（角标消费）。 */
  get pendingCount(): number {
    return this.broker.pendingCount();
  }

  /**
   * 运行一次完整会话。技能渐进注入：目录按触发词命中后自动激活，
   * 会话结束自动卸载（不跨会话残留）。
   */
  async run(input: RunSessionInput): Promise<AgentTurnResult> {
    // 发行档策略：ai.request 拦截器可整体否决（minimal 档禁全部 AI，公理 4）
    const gate = this.events.request('ai.request', { task: input.task, bookId: input.bookId });
    if (!gate.allowed) {
      return { ok: false, reply: '', turns: 0, error: gate.reason ?? 'AI 请求被发行档策略拒绝' };
    }
    const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const sink = window.electronAPI ? new FileSessionSink(sessionId, input.bookId) : undefined;

    // 渐进注入：触发词命中即激活全文，会话结束在 finally 中卸载
    const suggested = this.catalog.matchByTrigger(input.task);
    if (suggested) this.catalog.activate(suggested.name);

    const session = new AiSession({
      sessionId,
      bookId: input.bookId,
      task: input.task,
      skill: suggested?.name,
      sections: [],
      sink,
    });
    this.lastSession = session;

    try {
      const result = await runAgentSession(
        {
          assembler: this.assembler,
          registry: this.registry,
          router: this.router,
          session,
          model: input.model,
          context: () => ({
            project: input.project,
            index: input.index,
            activeSkill: this.catalog.getActive(),
            activeSkillTools: this.catalog.getActive()?.tools,
            // 工具执行上下文：模型配置与宿主服务在此注入（缺失则需模型的工具直接失败）
            modelConfig: input.model,
            services: {
              consistencyTemplates: toConsistencyRecord(useSettingsStore.getState().consistencyPrompts),
              cardTemplate: input.cardTemplate,
              // 全文检索（SQLite FTS5）：延迟加载仓库，测试与预览环境不预付成本
              textSearch: async (query: string, limit: number) => {
                const { repository } = await import('@/shared/services/repository/index.js');
                return repository.search(query, { projectId: input.project?.id, limit });
              },
              // 语义检索（向量库 + 嵌入，自动降级）：不可用返回空数组，工具层如实回填
              semanticSearch: async (query: string, limit: number) => {
                const projectId = input.project?.id;
                if (!projectId) throw new Error('当前没有打开的书籍项目');
                const { vectorIntegrationService } = await import(
                  '@/features/knowledge/services/vectorIntegrationService'
                );
                const hits = await vectorIntegrationService.semanticSearchKnowledge(projectId, query, { limit });
                return hits.map((h) => ({
                  name: h.metadata?.name,
                  category: h.metadata?.category,
                  score: h.score,
                  content: h.content.slice(0, 800),
                }));
              },
              // 技能按名加载（会话内状态变更，不碰数据；激活后白名单对后续轮次生效）
              skillLoad: (name: string) => this.catalog.activate(name),
            },
            extra: {
              // 技能清单常驻 prompt（渐进加载：清单一直可见，全文按需 core.skill.load）
              skillManifest: this.catalog.manifest() ?? undefined,
              aiPolicies: this.events
                .policiesFor('ai')
                .filter((p): p is SeamPolicy & { do: 'inject'; text: string } => p.do === 'inject' && p.where === 'system')
                .map((p) => p.text),
            },
          }),
          complete: (model, prompt, retries) => aiGatewayClient.complete(model, prompt, { retries }),
          maxTurns: input.maxTurns,
          signal: input.signal,
          // 首轮预算 24000 字符（约 8–12k token，32k 上下文模型留足工具观察与输出空间）
          charBudget: 24000,
        },
        input.task,
      );
      return result;
    } finally {
      this.catalog.deactivate();
    }
  }

}

/** 一致性模板数组转工具要的 record（与一致性检查页同口径：按 category 建键）。 */
function toConsistencyRecord(
  prompts: ConsistencyCheckPromptTemplate[],
): Record<string, ConsistencyCheckPromptTemplate> {
  const record: Record<string, ConsistencyCheckPromptTemplate> = {};
  for (const p of prompts) record[p.category] = p;
  return record;
}

/** 装配默认会话管理器（App 启动时创建一次；M3 插件在此续注工具/section/技能）。 */
export function createSessionManager(deps: SessionManagerDeps): AiSessionManager {
  return new AiSessionManager(deps);
}

export type { SkillCatalog, ToolRegistry };
