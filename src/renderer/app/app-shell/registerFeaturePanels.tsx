/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 面板注册（特性契约，app 层统一接线）：拥有 feature 的组件在此注册，
 * 消费 feature 经 `FeaturePanel` 渲染，消除跨 feature 组件 import。
 */
import SessionEventBrowser from '@/features/assistant/components/SessionEventBrowser';
import SmartRecommender from '@/features/assistant/SmartRecommender';
import ConsistencyChecker from '@/features/consistency/ConsistencyChecker';
import ConsistencyPromptManager from '@/features/consistency/ConsistencyPromptManager';
import ForeshadowPanel from '@/features/foreshadowing/components/ForeshadowPanel';
import ScreenplayPanel from '@/features/screenplay/ScreenplayPanel';
import DualAxisTimeline from '@/features/timeline/DualAxisTimeline';
import EnhancedTimeline from '@/features/timeline/EnhancedTimeline';
import TimelineEditor from '@/features/timeline/TimelineEditor';
import MultiViewPanel from '@/features/views/MultiViewPanel';
import FactionEditor from '@/features/world/FactionEditor';
import LocationEditor from '@/features/world/LocationEditor';
import RuleSystemEditor from '@/features/world/RuleSystemEditor';
import WorldViewEditor from '@/features/world/WorldViewEditor';
import WorldViewGraph from '@/features/world/WorldViewGraph';
import WritingToolsPanel from '@/features/writing/components/WritingToolsPanel';
import { registerFeaturePanel } from '@/shared/services/featurePanels';

export function registerFeaturePanels(): void {
  registerFeaturePanel('world.factionEditor', FactionEditor);
  registerFeaturePanel('world.locationEditor', LocationEditor);
  registerFeaturePanel('world.ruleSystemEditor', RuleSystemEditor);
  registerFeaturePanel('world.worldViewGraph', WorldViewGraph);
  registerFeaturePanel('world.worldViewEditor', WorldViewEditor);
  registerFeaturePanel('timeline.enhanced', EnhancedTimeline);
  registerFeaturePanel('timeline.editor', TimelineEditor);
  registerFeaturePanel('timeline.dual', DualAxisTimeline);
  registerFeaturePanel('assistant.smartRecommender', SmartRecommender);
  registerFeaturePanel('assistant.sessionEventBrowser', SessionEventBrowser);
  registerFeaturePanel('consistency.checker', ConsistencyChecker);
  registerFeaturePanel('consistency.promptManager', ConsistencyPromptManager);
  registerFeaturePanel('foreshadowing.panel', ForeshadowPanel);
  registerFeaturePanel('view.entities', MultiViewPanel);
  registerFeaturePanel('screenplay.panel', ScreenplayPanel);
  registerFeaturePanel('writing.tools', WritingToolsPanel);
}
