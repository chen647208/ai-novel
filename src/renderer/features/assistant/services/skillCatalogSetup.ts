/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 内置写法技能装配（docs/design/05 §3）。
 * 技能正文以 ?raw 打包进渲染端（离线可用）；用户目录/插件/书籍级来源
 * 由 M2.6/M3 的发现层级接入，在返回的 SkillCatalog 上续注。
 */
import { SkillCatalog } from '@core/ai';

import goldenThreeChaptersMd from '@core/ai/skills/builtin/golden-three-chapters/SKILL.md?raw';
import snowflakeMd from '@core/ai/skills/builtin/snowflake/SKILL.md?raw';
import povSwitchMd from '@core/ai/skills/builtin/pov-switch/SKILL.md?raw';
import foreshadowPayoffMd from '@core/ai/skills/builtin/foreshadow-payoff/SKILL.md?raw';
import aiFlavorRemovalMd from '@core/ai/skills/builtin/ai-flavor-removal/SKILL.md?raw';

const BUILTIN_SKILLS = [
  { sourceFile: 'golden-three-chapters/SKILL.md', md: goldenThreeChaptersMd },
  { sourceFile: 'snowflake/SKILL.md', md: snowflakeMd },
  { sourceFile: 'pov-switch/SKILL.md', md: povSwitchMd },
  { sourceFile: 'foreshadow-payoff/SKILL.md', md: foreshadowPayoffMd },
  { sourceFile: 'ai-flavor-removal/SKILL.md', md: aiFlavorRemovalMd },
] as const;

/** 创建装载了全部内置技能的目录（每会话一个实例）。 */
export function createBuiltinSkillCatalog(): SkillCatalog {
  const catalog = new SkillCatalog();
  const errors = catalog.registerParsed(
    BUILTIN_SKILLS.map((s) => ({ md: s.md, source: 'builtin' as const, sourceFile: s.sourceFile })),
  );
  if (errors.length) {
    // 打包内置技能解析失败属于构建期缺陷：启动即暴露
    throw new Error(`内置技能解析失败：${errors.map((e) => `${e.sourceFile}: ${e.reason}`).join('; ')}`);
  }
  return catalog;
}
