/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 助手"上下文分析"面板的内容拼装：按分区把项目数据渲染为可发送文本。
 * 纯函数，便于单测；空内容表示该分区暂无数据（调用方保持静默）。
 */
import { type Project } from '../../../../shared/types';
import { genderLabel, roleLabel } from '@/shared/utils/displayLabels';
import { type AssistantCategory } from '../types';

export function buildContextContent(
  project: Project | null,
  activeCategory: AssistantCategory,
  subSelectionId: string,
): string {
  if (!project) return '当前未打开任何项目。';

  switch (activeCategory) {
    case 'inspiration':
      return `【书名】\n${project.title}\n\n【原始灵感】\n${project.inspiration || '无'}\n\n【简介方案】\n${project.intro || '无'}`;

    case 'knowledge': {
      if (subSelectionId === 'all') {
        return (project.knowledge || []).map((k) => `- ${k.name} (${k.type})`).join('\n');
      }
      const kItem = project.knowledge?.find((k) => k.id === subSelectionId);
      return kItem ? `【资料：${kItem.name}】\n${kItem.content}` : '';
    }

    case 'characters':
      if ((project.characters || []).length === 0) return '';
      return (project.characters || []).map((c) =>
        `角色名：${c.name || '未命名'}\n` +
        `性别：${genderLabel(c.gender)}\n` +
        `年龄：${c.age || '未知'}\n` +
        `角色类型：${roleLabel(c.role)}\n` +
        `性格：${c.personality || '暂无描述'}\n` +
        `背景：${c.background || '暂无背景'}\n` +
        `关系：${c.relationships || '暂无关系'}\n` +
        `外观：${c.appearance || '暂无描述'}\n` +
        `标志性特征：${c.distinctiveFeatures || '暂无特征'}\n` +
        `职业：${c.occupation || '暂无'}\n` +
        `动机：${c.motivation || '暂无'}\n` +
        `优势：${c.strengths || '暂无'}\n` +
        `弱点：${c.weaknesses || '暂无'}\n` +
        `成长弧线：${c.characterArc || '暂无'}`
      ).join('\n\n----------------\n\n');

    case 'outline':
      return project.outline || '';

    case 'chapters': {
      if (subSelectionId === 'all') {
        return [...(project.chapters || [])].sort((a, b) => a.order - b.order)
          .map((c) => `第${c.order + 1}章：${c.title}`).join('\n');
      }
      const chap = project.chapters?.find((c) => c.id === subSelectionId);
      return chap ? `【第${chap.order + 1}章：${chap.title}】\n\n细纲：\n${chap.summary}` : '';
    }

    default:
      return '';
  }
}
