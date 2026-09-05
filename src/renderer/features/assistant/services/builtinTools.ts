/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 首批内置工具（docs/design/05 §2 清单的第一批）。
 *
 * 本批工具把既有服务原样接入注册表（工具化转写，非新功能）：
 * 卡片生成/命令解析、一致性扫描、智能推荐、索引查询。
 * text/outline/chapter 工具的编辑器接线（涉及 proposal diff 面）与
 * summary/foreshadow 工具为当前边界，随组件级重构推进。
 */
import { ToolRegistry, type ToolContext, type ToolSpec } from '@core/ai';
import { aiGatewayClient, type CallOptions } from '@/shared/services/ai/gatewayClient';
import type { ModelConfig, Project } from '@shared/types';
import type { IndexSnapshot } from '@core/index';
import { AICardCreationService } from '@/features/cards/services/aiCardCreationService';
import { AICardCommandService } from '@/features/cards/services/aiCardCommandService';
import {
  performSemanticCheck,
  performQuickSemanticCheck,
} from './aiSemanticCheckService';
import {
  getAIEnhancedRecommendations,
  getSmartRecommendations,
} from './smartRecommendationService';
import type { ConsistencyCheckPromptTemplate } from '@shared/types';
import type { RecommendationContext } from './smartRecommendationService';

function projectOf(ctx: ToolContext): Project {
  const project = ctx.project as Project | undefined | null;
  if (!project) {
    throw new Error('当前没有打开的书籍项目');
  }
  return project;
}

function modelOf(ctx: ToolContext): ModelConfig {
  const model = ctx.modelConfig as ModelConfig | undefined | null;
  if (!model) {
    throw new Error('未配置 AI 模型');
  }
  return model;
}

function str(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`参数 ${label} 必须是非空字符串`);
  }
  return value;
}

/** core.card.generate：自然语言/斜杠命令生成卡片数据（写操作走提案，不直接落库）。 */
export const cardGenerateTool: ToolSpec = {
  id: 'core.card.generate',
  description: '从一段自然语言描述（或 /角色 /地点 等斜杠命令文本）生成书籍卡片数据。',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string', description: '用户输入文本，可含 /角色 /地点 等命令前缀' },
    },
    required: ['input'],
  },
  permission: 'write:proposal',
  async execute(req, ctx) {
    const input = str((req.args as { input?: unknown }).input, 'input');
    const customTemplate = ctx.services?.cardTemplate as Parameters<typeof AICardCreationService.processInput>[3];
    const result = await AICardCreationService.processInput(input, projectOf(ctx), modelOf(ctx), customTemplate);
    if (!result) {
      return { ok: false, error: '输入不是卡片创建命令（缺少 /角色 等前缀）' };
    }
    return { ok: result.success, data: result, error: result.success ? undefined : result.message };
  },
};

/** core.card.command：只解析斜杠命令（读），供助手层判断意图。 */
export const cardCommandTool: ToolSpec = {
  id: 'core.card.command',
  description: '解析输入文本中的卡片命令（/角色 /地点 /势力 等），返回命令类型与描述，不执行创建。',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string', description: '待解析文本' },
    },
    required: ['input'],
  },
  permission: 'read',
  async execute(req) {
    const input = str((req.args as { input?: unknown }).input, 'input');
    const parsed = AICardCommandService.parseCommand(input);
    return { ok: true, data: parsed };
  },
};

/** core.consistency.scan：全书/快速一致性语义检查（读）。 */
export const consistencyScanTool: ToolSpec = {
  id: 'core.consistency.scan',
  description: '对全书做一致性语义检查（人物/势力/地点设定与正文矛盾点），返回问题清单。',
  parameters: {
    type: 'object',
    properties: {
      quick: { type: 'boolean', description: 'true 时只抽查少量条目（更快），默认 false' },
    },
  },
  permission: 'read',
  async execute(req, ctx) {
    const project = projectOf(ctx);
    const model = modelOf(ctx);
    const templates = ctx.services?.consistencyTemplates as
      | Record<string, ConsistencyCheckPromptTemplate>
      | undefined;
    if (!templates || Object.keys(templates).length === 0) {
      return { ok: false, error: '未配置一致性检查提示词模板' };
    }
    const quick = Boolean((req.args as { quick?: unknown } | undefined)?.quick);
    const result = quick
      ? await performQuickSemanticCheck(project, model, templates)
      : await performSemanticCheck(project, model, templates);
    return { ok: true, data: result };
  },
};

/** core.recommend.next：基于正文场景的下一步创作推荐（读）。 */
export const recommendNextTool: ToolSpec = {
  id: 'core.recommend.next',
  description: '根据当前写作上下文推荐下一步可操作的内容（新角色/势力/地点/事件等）。',
  parameters: {
    type: 'object',
    properties: {
      currentContent: { type: 'string', description: '当前正文片段（可选）' },
      writingScene: { type: 'string', description: '当前场景描述（可选）' },
      maxResults: { type: 'number', description: '最多返回条数，默认 5' },
    },
  },
  permission: 'read',
  async execute(req, ctx) {
    const project = projectOf(ctx);
    const args = (req.args ?? {}) as { currentContent?: unknown; writingScene?: unknown; maxResults?: unknown };
    const context: RecommendationContext = {
      currentContent: typeof args.currentContent === 'string' ? args.currentContent : undefined,
      writingScene: typeof args.writingScene === 'string' ? args.writingScene : undefined,
    } as RecommendationContext;
    const options = { maxResults: typeof args.maxResults === 'number' ? args.maxResults : 5 };
    const model = ctx.modelConfig as ModelConfig | undefined | null;
    const result = model
      ? await getAIEnhancedRecommendations(project, context, model, options)
      : getSmartRecommendations(project, context, options);
    return { ok: true, data: result };
  },
};

/** core.index.query：全书索引结构化查询（读）：标签/引用/线索/伏笔/未解析。 */
export const indexQueryTool: ToolSpec = {
  id: 'core.index.query',
  description: '查询全书索引：标签清单、标签引用、叙事线索进度、未回收伏笔、未解析引用。',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', enum: ['tags', 'refs', 'strands', 'foreshadow', 'unresolved'], description: '查询种类' },
      tag: { type: 'string', description: 'query=refs 时的标签名' },
      limit: { type: 'number', description: '最多返回条数，默认 20' },
    },
    required: ['query'],
  },
  permission: 'read',
  skillHint: 'foreshadow-payoff',
  async execute(req, ctx) {
    const index = ctx.index as NonNullable<ToolContext['index']> | undefined | null;
    if (!index) {
      return { ok: false, error: '索引快照不可用' };
    }
    const args = (req.args ?? {}) as { query?: unknown; tag?: unknown; limit?: unknown };
    const query = str(args.query, 'query');
    const limit = typeof args.limit === 'number' && args.limit > 0 ? Math.floor(args.limit) : 20;
    const idx = index as IndexSnapshot;

    switch (query) {
      case 'tags': {
        const data = [...idx.tags.entries()]
          .map(([tag, entry]) => ({ tag, displayName: entry.displayName, aliases: entry.aliases, kind: entry.kind, refs: idx.refs.get(tag)?.length ?? 0 }))
          .sort((a, b) => b.refs - a.refs)
          .slice(0, limit);
        return { ok: true, data };
      }
      case 'refs': {
        const tag = str(args.tag, 'tag');
        const data = (idx.refs.get(tag) ?? []).slice(0, limit);
        return { ok: true, data };
      }
      case 'strands': {
        const data = [...idx.strandProgress.values()]
          .sort((a, b) => b.wordCount - a.wordCount)
          .slice(0, limit);
        return { ok: true, data };
      }
      case 'foreshadow': {
        return { ok: true, data: idx.foreshadowOpen.slice(0, limit) };
      }
      case 'unresolved': {
        return { ok: true, data: idx.unresolved.slice(0, limit) };
      }
      default:
        return { ok: false, error: `未知查询种类：${query}` };
    }
  },
};



// ── 生成类工具（write:proposal：产出提案文本，经审批后由用户落稿）──────

async function generateProposal(ctx: ToolContext, prompt: string): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const response = await aiGatewayClient.complete(modelOf(ctx), prompt, { signal: ctx.signal } as CallOptions);
  if (response.error) {
    return { ok: false, error: response.error };
  }
  return { ok: true, data: { text: response.content, tokens: response.tokens } };
}

/** core.text.continue：从既有正文续写（提案）。 */
export const textContinueTool: ToolSpec = {
  id: 'core.text.continue',
  description: '根据既有正文片段续写后文，返回建议文本（不直接写入稿件）。',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: '既有正文（结尾处衔接续写）' },
      instruction: { type: 'string', description: '补充要求（情节走向/字数/风格）' },
    },
    required: ['text'],
  },
  permission: 'write:proposal',
  async execute(req, ctx) {
    const args = (req.args ?? {}) as { text?: unknown; instruction?: unknown };
    const text = str(args.text, 'text');
    const instruction = typeof args.instruction === 'string' ? args.instruction : '自然承接前文推进剧情';
    const project = projectOf(ctx);
    const prompt = `你是小说续写助手。书名《${project.title}》。
请承接下面正文的结尾续写约 400-800 字，要求：${instruction}。只输出正文，不要解释。

【既有正文结尾】
${text.slice(-3000)}`;
    return generateProposal(ctx, prompt);
  },
};

/** core.text.rewrite：按指令重写既有正文（提案，diff 由审批面构造）。 */
export const textRewriteTool: ToolSpec = {
  id: 'core.text.rewrite',
  description: '按改写指令重写给出的正文片段（去 AI 味/调整节奏/换视角等），返回建议文本。',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: '待重写的正文' },
      instruction: { type: 'string', description: '改写要求' },
    },
    required: ['text', 'instruction'],
  },
  permission: 'write:proposal',
  skillHint: 'ai-flavor-removal',
  async execute(req, ctx) {
    const args = (req.args ?? {}) as { text?: unknown; instruction?: unknown };
    const text = str(args.text, 'text');
    const instruction = str(args.instruction, 'instruction');
    const prompt = `你是小说改写助手。按以下要求重写正文：${instruction}。保持事实与设定一致，只输出改写后的正文，不要解释。

【原文】
${text.slice(0, 8000)}`;
    return generateProposal(ctx, prompt);
  },
};

/** core.outline.generate：从灵感/梗概生成大纲草案（提案）。 */
export const outlineGenerateTool: ToolSpec = {
  id: 'core.outline.generate',
  description: '根据灵感与设定生成小说大纲草案（分卷/分章结构建议）。',
  parameters: {
    type: 'object',
    properties: {
      inspiration: { type: 'string', description: '灵感/一句话梗概' },
      chapterCount: { type: 'number', description: '期望章节数，默认 30' },
    },
    required: ['inspiration'],
  },
  permission: 'write:proposal',
  skillHint: 'snowflake',
  async execute(req, ctx) {
    const args = (req.args ?? {}) as { inspiration?: unknown; chapterCount?: unknown };
    const inspiration = str(args.inspiration, 'inspiration');
    const count = typeof args.chapterCount === 'number' ? Math.floor(args.chapterCount) : 30;
    const project = projectOf(ctx);
    const prompt = `你是小说大纲策划。书名《${project.title}》，灵感：${inspiration}。
请给出约 ${count} 章的大纲草案：分卷、每卷主线、每章一行（含冲突与结果：转折/推进/受挫）。只输出大纲。`;
    return generateProposal(ctx, prompt);
  },
};

/** core.chapter.plan：为单章生成细纲（提案）。 */
export const chapterPlanTool: ToolSpec = {
  id: 'core.chapter.plan',
  description: '为指定章节生成本章细纲（场景拆分/出场角色/钩子）。',
  parameters: {
    type: 'object',
    properties: {
      chapterTitle: { type: 'string', description: '章节标题' },
      chapterSummary: { type: 'string', description: '本章概要/大纲条目' },
      previousRecap: { type: 'string', description: '前情提要（可选）' },
    },
    required: ['chapterTitle', 'chapterSummary'],
  },
  permission: 'write:proposal',
  async execute(req, ctx) {
    const args = (req.args ?? {}) as { chapterTitle?: unknown; chapterSummary?: unknown; previousRecap?: unknown };
    const title = str(args.chapterTitle, 'chapterTitle');
    const summary = str(args.chapterSummary, 'chapterSummary');
    const recap = typeof args.previousRecap === 'string' ? `
【前情提要】${args.previousRecap}` : '';
    const prompt = `你是章节细纲策划。为《${title}》生成本章细纲：场景拆分（每场景的地点/人物/冲突/结果）、出场角色、章末钩子。${recap}
【本章概要】${summary}
只输出细纲。`;
    return generateProposal(ctx, prompt);
  },
};

/** 首批内置工具清单。 */
export function createBuiltinTools(): ToolSpec[] {
  return [
    cardGenerateTool,
    cardCommandTool,
    consistencyScanTool,
    recommendNextTool,
    indexQueryTool,
    textContinueTool,
    textRewriteTool,
    outlineGenerateTool,
    chapterPlanTool,
  ];
}

/** 创建并装配内置工具的注册表（会话/宿主启动时调用；M3 起插件在返回实例上续注）。 */
export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  for (const tool of createBuiltinTools()) {
    registry.register(tool);
  }
  return registry;
}
