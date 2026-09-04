# 知识库功能说明

## 适用范围

本文件覆盖知识库、向量检索、世界构建入口与知识条目管理。
对应代码主要位于 `src/renderer/features/knowledge`。

## 核心文件

- `StepKnowledgeEnhanced.tsx`：增强版知识库主编排器
- `StepKnowledge.tsx`：旧版知识库界面保留文件
- `components/KnowledgeFeaturePanels.tsx`：世界构建能力入口面板
- `services/vectorIntegrationService.ts`：知识索引与检索接入层
- `services/vectorService.ts`：底层向量搜索能力
- `services/simpleVectorStore.ts`：向量存储封装
- `services/embeddingService.ts`：Embedding 生成服务
- `services/apiEmbeddingService.ts`：Embedding API 接入服务

## 主要职责

- `StepKnowledgeEnhanced.tsx` 负责知识条目列表、编辑区、搜索编排和多面板接线
- `KnowledgeFeaturePanels.tsx` 负责地点、势力、时间线、规则系统、图谱、一致性与推荐入口
- 向量相关服务负责知识条目索引、语义检索和混合搜索

## 与其他模块的关系

- 知识库会调用 `settings` 中的 Embedding 配置
- 会复用 `world`、`timeline`、`consistency` 与 `assistant` 的相关面板和能力
- 检索与索引结果会反馈到写作和助手功能中使用

## 维护建议

- 新增世界构建入口优先接到 `KnowledgeFeaturePanels.tsx`
- 向量索引、Embedding 与搜索实现继续集中在 `services`
- `StepKnowledgeEnhanced.tsx` 已压到 1000 行以内，后续优先继续拆列表区和编辑区
