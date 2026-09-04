# 世界观与一致性功能说明

## 适用范围

本文件覆盖世界观编辑、时间线编辑、图谱展示与一致性检查能力。
对应代码主要位于以下目录：

- `src/renderer/features/world`
- `src/renderer/features/timeline`
- `src/renderer/features/consistency`

## 核心文件

- `world/WorldViewEditor.tsx`：世界观主体编辑
- `world/LocationEditor.tsx`：地点编辑
- `world/FactionEditor.tsx`：势力编辑
- `world/RuleSystemEditor.tsx`：规则体系编辑
- `world/WorldViewGraph.tsx`：世界观图谱展示
- `timeline/TimelineEditor.tsx`：时间线编辑
- `timeline/EnhancedTimeline.tsx`：增强时间线展示
- `consistency/ConsistencyChecker.tsx`：一致性检查界面
- `consistency/ConsistencyPromptManager.tsx`：一致性模板管理界面
- `world/services/worldConsistencyService.ts`：世界观一致性检查服务
- `consistency/services/consistencyCheckPromptService.ts`：一致性模板服务
- `consistency/services/vectorSimilarityService.ts`：语义相似度与辅助检查服务

## 主要职责

- 世界观编辑器负责维护地点、势力、规则体系和宏观世界设定
- 时间线模块负责事件顺序、历史节点和章节时间关联
- 一致性模块负责规则检测、模板驱动检查和语义辅助判断
- 图谱与增强时间线负责可视化展示，帮助定位关系与冲突

## 与知识库的关系

- 这些能力大多从知识库中心入口打开
- 一致性检查和推荐能力会复用知识条目、人物、地点与时间线数据

## 维护建议

- 检查规则与语义相似逻辑继续沉到 `services`
- 可视化组件保持展示职责，避免掺入过多数据清洗逻辑
- 新增世界设定能力时优先按主题放入 `world`、`timeline` 或 `consistency`
