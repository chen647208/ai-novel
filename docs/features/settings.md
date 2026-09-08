# 设置功能说明

## 适用范围

本文件覆盖模型设置、Embedding 设置、提示词设置、存储设置与系统说明。
对应代码位于 `src/renderer/features/settings`。

## 核心文件

- `SettingsModal.tsx`：设置弹窗主编排器
- `components/SettingsTabNav.tsx` + `SettingsTabContent.tsx`：标签导航与内容分发
- `components/SettingsModalHeader.tsx` + `SettingsModalFooter.tsx`：头尾（含暂存保存按钮）
- `components/GeneralSettingsPanel.tsx`：语言/主题/字体/快捷键/系统/代理（直写 store 即时生效）
- `components/SystemPanel.tsx`：最小化到托盘 + 开机自启（经 `shellSync.ts` 下发主进程）
- `components/ProxyPanel.tsx`：代理地址 + 连通测试（经 `shellSync.ts` 下发，网关与 Chromium 双覆盖）
- `components/ModelSettingsPanel.tsx`：模型配置面板（`ModelSettings.tsx` 为入口组件）
- `components/ProviderSidebar.tsx` + `ProviderEditor.tsx`：渠道侧栏与参数编辑
- `components/EmbeddingSettingsPanel.tsx` + `EmbeddingSidebar.tsx` + `EmbeddingEditor.tsx`：Embedding 配置
- `components/PromptTemplatesPanel.tsx`：提示词模板管理
- `components/CardPromptSettingsPanel.tsx`：卡牌命令模板管理
- `components/ConsistencyPromptSettingsPanel.tsx`：一致性检查模板管理
- `components/PluginSettingsPanel.tsx`：插件状态面板（发行档/装配树入口）
- `components/StorageSettingsPanel.tsx`：存储设置面板
- `components/SystemGuidePanel.tsx`：系统说明和使用引导
- `components/ShortcutRecorder.tsx` + `services/keybindings.ts`：快捷键录制/冲突检测/默认回退（`App.tsx` 开关与分区跳转、`WritingEditor.tsx` 查找条只读合并态）
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
- 设置持久化走 `app/stores/settingsStore.ts` + `persistenceBridge.ts` 差分落盘
- 主进程侧：`main/app/tray.ts`（托盘/自启/关闭拦截）+ `main/net/proxy.ts`（地址校验/豁免/dispatcher）+ `proxyIpc.ts`
- 保存语义：语言/主题/字体直写即时生效；模型与密钥类暂存按保存落盘（防半配置生效），关闭直接丢弃

## 维护建议

- 新增设置项优先落到对应 `Panel` 组件，不要直接堆到 `SettingsModal.tsx`
- 模型、Embedding、模板相关逻辑优先放到 `services`、`factories.ts` 或 `constants.ts`
- 保持设置面板按主题拆分，便于后续继续扩展
