# 设置功能说明

## 适用范围

本文件覆盖模型设置、Embedding 设置、提示词设置、存储设置与系统说明。
对应代码位于 `src/renderer/features/settings`。

## 核心文件

- `SettingsModal.tsx`：设置弹窗主编排器
- `ModelSettings.tsx`：模型设置入口组件
- `components/ModelSettingsPanel.tsx`：模型配置面板
- `components/EmbeddingSettingsPanel.tsx`：Embedding 模型与参数配置面板
- `components/PromptTemplatesPanel.tsx`：提示词模板管理
- `components/CardPromptSettingsPanel.tsx`：卡牌命令模板管理
- `components/ConsistencyPromptSettingsPanel.tsx`：一致性检查模板管理
- `components/StorageSettingsPanel.tsx`：存储设置面板
- `components/SystemGuidePanel.tsx`：系统说明和使用引导
- `services/modelListService.ts`：模型列表拉取服务
- `services/embeddingModelService.ts`：Embedding 模型配置服务
- `factories.ts`：设置项构造与默认值生成
- `constants.ts`、`types.ts`：设置域常量与类型

## 主要职责

- `SettingsModal.tsx` 负责标签页切换、设置项收集和整体保存流程
- 各 `Panel` 组件分别管理单一设置主题，降低设置弹窗复杂度
- 服务层负责模型列表拉取、Embedding 配置读写和相关辅助逻辑

## 关联模块

- 写作、助手、知识库和一致性检查都会依赖设置中的模型或模板配置
- 本地持久化依赖 `src/renderer/shared/services/storage.ts`

## 维护建议

- 新增设置项优先落到对应 `Panel` 组件，不要直接堆到 `SettingsModal.tsx`
- 模型、Embedding、模板相关逻辑优先放到 `services`、`factories.ts` 或 `constants.ts`
- 保持设置面板按主题拆分，便于后续继续扩展
