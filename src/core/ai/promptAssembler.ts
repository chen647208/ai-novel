/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * PromptAssembler —— prompt 组装的 section 装配器（docs/design/05 §2）。
 *
 * 每个逻辑块（identity / bookMeta / indexDigest / activeSkill / toolSchemas /
 * userTask …）都是独立 section 提供者：按 order 排序装配，render 返回 undefined
 * 表示本轮不注入。M3 插件经 hooks 在注册表上增删 section，实现「AI 功能越塞
 * 越多、prompt 爆炸」的结构性治理。
 *
 * 纯模块：不依赖 DOM / Electron，渲染端与测试环境均可直接使用。
 */

/** 装配上下文：section 从这里取数据，字段可选（缺数据的 section 自然跳过）。 */
export interface PromptContext {
  /** 当前书籍项目（数据层快照） */
  project?: unknown;
  /** 全书索引快照（src/core/index） */
  index?: unknown;
  /** 激活技能（渐进注入：会话内显式激活后才非空） */
  activeSkill?: { name: string; body: string } | null;
  /** 本轮可用工具清单（ToolRegistry 提供） */
  toolSchemas?: Array<{ id: string; description: string; parameters: string }> | null;
  /** 用户本轮任务原文 */
  userTask?: string;
  /** 全文总预算（字符数），超限从尾部 section 开始整体丢弃 */
  charBudget?: number;
  /** 插件/调用方附加数据，自定义 section 消费 */
  extra?: Record<string, unknown>;
}

/** 一个 prompt section 提供者。order 决定装配顺序，小者在前。 */
export interface PromptSection {
  /** 稳定 id：诊断与插件注销用 */
  id: string;
  /** 给模型看的段落标题（渲染为【标题】） */
  title: string;
  /** 装配顺序 */
  order: number;
  /** 渲染本段正文；返回 undefined 表示本轮无内容、不注入 */
  render(ctx: PromptContext): string | undefined;
}

export interface AssembleResult {
  /** 最终 prompt 文本 */
  prompt: string;
  /** 实际注入的 section id（按装配顺序） */
  sections: string[];
  /** 是否发生了预算截断 */
  truncated: boolean;
}

const SECTION_TITLE_RE = /^【.+】$/;

/** 渲染段落标题：统一包一层【】（title 已带括号则原样使用）。 */
function renderTitle(title: string): string {
  return SECTION_TITLE_RE.test(title) ? title : `【${title}】`;
}

/** 预算紧张时永不丢弃的段：身份/调用协议/工具清单/本轮任务（丢了它们等于丢任务本身）。 */
const PROTECTED_SECTIONS: ReadonlySet<string> = new Set(['identity', 'agentProtocol', 'toolSchemas', 'userTask']);

/** PromptAssembler：section 注册表 + 装配器。 */
export class PromptAssembler {
  private readonly sections = new Map<string, PromptSection>();

  /** 注册 section；同 id 覆盖（插件升级语义）。 */
  register(section: PromptSection): this {
    this.sections.set(section.id, section);
    return this;
  }

  /** 注销 section（插件卸载/技能卸载时调用）。 */
  unregister(id: string): boolean {
    return this.sections.delete(id);
  }

  list(): string[] {
    return [...this.sections.values()].sort((a, b) => a.order - b.order).map((s) => s.id);
  }

  /**
   * 装配 prompt：按 order 渲染全部 section；超预算时先丢可再生上下文段
   * （身份/协议/工具/任务受保护），仍超才退化为尾部整段丢弃。
   */
  assemble(ctx: PromptContext): AssembleResult {
    const ordered = [...this.sections.values()].sort((a, b) => a.order - b.order);
    const blocks: Array<{ id: string; text: string }> = [];

    for (const section of ordered) {
      const body = section.render(ctx);
      if (body === undefined) continue;
      blocks.push({ id: section.id, text: `${renderTitle(section.title)}\n${body}` });
    }

    const budget = ctx.charBudget;
    let truncated = false;
    let kept = blocks;
    if (budget !== undefined && budget > 0) {
      const total = () => kept.reduce((sum, b) => sum + b.text.length + 2, -2);
      // 先丢可再生上下文段（尾部优先）：身份/协议/工具/任务永不丢弃——
      // 旧语义从尾部整段丢会先丢 userTask（order 最大），导致预算稍紧就丢任务本身
      while (kept.length > 1 && total() > budget) {
        let drop = -1;
        for (let i = kept.length - 1; i >= 0; i--) {
          if (!PROTECTED_SECTIONS.has(kept[i]!.id)) {
            drop = i;
            break;
          }
        }
        if (drop < 0) break;
        kept = [...kept.slice(0, drop), ...kept.slice(drop + 1)];
        truncated = true;
      }
      // 仍超限：退化为旧语义（尾部整段丢弃，至少保留一段并截断）
      while (kept.length > 1 && total() > budget) {
        kept = kept.slice(0, -1);
        truncated = true;
      }
      const only = kept[0];
      if (kept.length === 1 && only && only.text.length > budget) {
        kept = [{ id: only.id, text: truncateText(only.text, budget) }];
        truncated = true;
      }
    }

    return {
      prompt: kept.map((b) => b.text).join('\n\n'),
      sections: kept.map((b) => b.id),
      truncated,
    };
  }
}

/** 截断文本到 maxLength，尽量在换行处断开并标注截断。 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const truncated = text.substring(0, maxLength);
  const lastNewline = truncated.lastIndexOf('\n');

  if (lastNewline > maxLength * 0.8) {
    return truncated.substring(0, lastNewline) + '\n\n[内容已截断...]';
  }

  return truncated + '\n\n[内容已截断...]';
}
