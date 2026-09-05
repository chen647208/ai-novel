/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 内置 prompt sections（docs/design/05 §2 的六个标准块 + 世界观摘要）。
 * 文案为中文常量：提示词不随界面语言翻译（与现有各 prompt 服务一致）。
 */
import type { Project } from '../../shared/types';
import type { IndexSnapshot } from '../index';
import type { PromptAssembler, PromptContext, PromptSection } from './promptAssembler.js';
import { truncateText } from './promptAssembler.js';

/** identity：模型身份与创作立场（order 最小，最不易被预算截断）。 */
export const identitySection: PromptSection = {
  id: 'identity',
  title: '身份',
  order: 10,
  render(): string {
    return [
      '你是资深的中文小说创作协作助手，与作者共同打磨长篇作品。',
      '你尊重既有的世界观、人物设定与已写正文，输出风格与全书保持一致；',
      '给出的所有内容都是供作者审阅的草稿建议，不擅自定稿。',
    ].join('\n');
  },
};

/** bookMeta：书名/类型/简介。 */
export const bookMetaSection: PromptSection = {
  id: 'bookMeta',
  title: '作品信息',
  order: 20,
  render(ctx: PromptContext): string | undefined {
    const project = ctx.project as Project | undefined | null;
    if (!project) return undefined;
    const parts: string[] = [`书名：${project.title}`];
    if (project.inspiration) parts.push(`创作灵感：${project.inspiration}`);
    if (project.intro) parts.push(`简介：${project.intro}`);
    return parts.join('\n');
  },
};

export interface WorldDigestOptions {
  includeWorldView?: boolean;
  includeLocations?: boolean;
  includeFactions?: boolean;
  includeTimeline?: boolean;
  includeRuleSystems?: boolean;
  maxLocations?: number;
  maxFactions?: number;
}

/**
 * 世界观摘要文本（沿用原 buildWorldContextForPrompt 的产出格式，
 * aiSemanticCheckService / smartRecommendationService 在工具化前继续消费）。
 */
export function renderWorldDigest(project: Project, options?: WorldDigestOptions): string {
  const opts = {
    includeWorldView: true,
    includeLocations: true,
    includeFactions: true,
    includeTimeline: true,
    includeRuleSystems: true,
    maxLocations: 10,
    maxFactions: 10,
    ...options,
  };

  const parts: string[] = [];

  parts.push(`【作品标题】${project.title}`);

  if (opts.includeWorldView && project.worldView) {
    parts.push('\n【世界观设定】');
    if (project.worldView.magicSystem) {
      parts.push(`魔法/修炼体系：${project.worldView.magicSystem.name}`);
      parts.push(`体系概述：${project.worldView.magicSystem.description}`);
      if (project.worldView.magicSystem.rules?.length) {
        parts.push(`核心规则：${project.worldView.magicSystem.rules.join('；')}`);
      }
    }
    if (project.worldView.technologyLevel) {
      parts.push(`科技水平：${project.worldView.technologyLevel.era}`);
      parts.push(`科技概述：${project.worldView.technologyLevel.description}`);
    }
  }

  if (opts.includeLocations && project.locations?.length) {
    parts.push('\n【重要地点】');
    project.locations
      .slice(0, opts.maxLocations)
      .forEach((loc) => {
        parts.push(`- ${loc.name}（${loc.type}）：${loc.description.substring(0, 100)}...`);
      });
  }

  if (opts.includeFactions && project.factions?.length) {
    parts.push('\n【主要势力】');
    project.factions
      .slice(0, opts.maxFactions)
      .forEach((faction) => {
        parts.push(`- ${faction.name}（${faction.type}）：${faction.description.substring(0, 100)}...`);
      });
  }

  if (opts.includeTimeline && project.timeline) {
    parts.push('\n【时间线】');
    parts.push(`历法系统：${project.timeline.config.calendarSystem}`);
    if (project.timeline.events?.length) {
      parts.push(`关键事件：${project.timeline.events.slice(0, 5).map((e) => e.title).join('、')}`);
    }
  }

  if (opts.includeRuleSystems && project.ruleSystems?.length) {
    parts.push('\n【规则体系】');
    project.ruleSystems.forEach((rule) => {
      parts.push(`- ${rule.name}（${rule.type}）：${rule.levels.length}个等级`);
    });
  }

  return parts.join('\n');
}

/** worldDigest：项目级世界观摘要（数据来自 Project 快照）。 */
export const worldDigestSection: PromptSection = {
  id: 'worldDigest',
  title: '世界观设定',
  order: 30,
  render(ctx: PromptContext): string | undefined {
    const project = ctx.project as Project | undefined | null;
    if (!project) return undefined;
    return renderWorldDigest(project);
  },
};

const TAG_DIGEST_LIMIT = 24;
const STRAND_DIGEST_LIMIT = 10;
const FORESHADOW_DIGEST_LIMIT = 10;

/** 由索引快照渲染全书结构摘要：标签热度、线索体量、未回收伏笔、未解析引用。 */
export function renderIndexDigest(index: IndexSnapshot): string {
  const parts: string[] = [];

  if (index.tags.size) {
    const ranked = [...index.tags.entries()]
      .map(([tag, entry]) => ({ tag, name: entry.displayName, refs: index.refs.get(tag)?.length ?? 0 }))
      .sort((a, b) => b.refs - a.refs)
      .slice(0, TAG_DIGEST_LIMIT);
    parts.push(`核心标签（按引用热度）：${ranked.map((r) => `${r.name}(${r.refs})`).join('、')}`);
  }

  if (index.strandProgress.size) {
    const strands = [...index.strandProgress.values()]
      .sort((a, b) => b.wordCount - a.wordCount)
      .slice(0, STRAND_DIGEST_LIMIT);
    parts.push(`叙事线索体量：${strands.map((s) => `${s.strandTag}（${s.sceneCount} 场景/约 ${s.wordCount} 字）`).join('、')}`);
  }

  if (index.foreshadowOpen.length) {
    const foreshadows = [...index.foreshadowOpen]
      .sort((a, b) => (b.ageChapters ?? 0) - (a.ageChapters ?? 0))
      .slice(0, FORESHADOW_DIGEST_LIMIT);
    parts.push(
      `未回收伏笔：${foreshadows
        .map((f) => `《${f.title}》埋于第 ${f.plantedChapterOrder ?? '?'} 章、已 ${f.ageChapters ?? '?'} 章${f.overdue ? '（超期）' : ''}`)
        .join('；')}`,
    );
  }

  if (index.unresolved.length) {
    parts.push(`未解析引用 ${index.unresolved.length} 处：${index.unresolved.slice(0, 8).map((u) => u.target).join('、')}`);
  }

  let totalWords = 0;
  for (const n of index.wordCounts.values()) totalWords += n;
  parts.push(`全书正文字数：约 ${totalWords}`);
  return parts.join('\n');
}

/** indexDigest：全书索引摘要（数据来自 core/index 快照）。 */
export const indexDigestSection: PromptSection = {
  id: 'indexDigest',
  title: '全书索引',
  order: 40,
  render(ctx: PromptContext): string | undefined {
    const index = ctx.index as IndexSnapshot | undefined | null;
    if (!index) return undefined;
    return renderIndexDigest(index);
  },
};

/** activeSkill：激活技能的完整方法论正文（渐进注入的门在 M2.4：只有激活才有值）。 */
export const activeSkillSection: PromptSection = {
  id: 'activeSkill',
  title: '当前技能',
  order: 50,
  render(ctx: PromptContext): string | undefined {
    if (!ctx.activeSkill?.body) return undefined;
    return `技能：${ctx.activeSkill.name}\n${truncateText(ctx.activeSkill.body, 6000)}`;
  },
};

/** toolSchemas：本轮可用工具的 id/描述/参数（M2.2 ToolRegistry 注入）。 */
export const toolSchemasSection: PromptSection = {
  id: 'toolSchemas',
  title: '可用工具',
  order: 60,
  render(ctx: PromptContext): string | undefined {
    if (!ctx.toolSchemas?.length) return undefined;
    return ctx.toolSchemas.map((t) => `- ${t.id}：${t.description}\n  参数：${t.parameters}`).join('\n');
  },
};

/** userTask：用户本轮任务原文（order 最大，永远紧贴对话末尾）。 */
export const userTaskSection: PromptSection = {
  id: 'userTask',
  title: '本轮任务',
  order: 100,
  render(ctx: PromptContext): string | undefined {
    return ctx.userTask?.trim() || undefined;
  },
};

/** 注册全部内置 section（应用启动/会话创建时调用一次）。 */
export function registerBuiltinSections(assembler: PromptAssembler): void {
  const sections = [
    identitySection,
    bookMetaSection,
    worldDigestSection,
    indexDigestSection,
    activeSkillSection,
    toolSchemasSection,
    userTaskSection,
  ];
  for (const section of sections) {
    assembler.register(section);
  }
}
