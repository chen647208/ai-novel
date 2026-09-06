/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 版本发布数据：发布日志是发布产物的一部分，不是界面文案，
 * 因此以数据模块维护（zh/en 双语字段），不进入 i18n 语言包。
 * 发版时只需在 RELEASES 顶部追加一条，并同步 package.json 的 version。
 */

export interface ReleaseEntry {
  version: string;
  date: string;
  description: Record<'zh' | 'en', string>;
}

export const RELEASES: ReleaseEntry[] = [
  {
    version: '1.0.0',
    date: '2026-09-05',
    description: {
      zh: '完全重构后的首个版本：插件化架构、AI 网关与 Agent 循环、同步与构建管线、界面全面令牌化。',
      en: 'First release after the full rework: plugin architecture, AI gateway & agent loop, sync & build pipeline, fully tokenized UI.',
    },
  },
];
