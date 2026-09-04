# 助手功能说明

## 适用范围

本文件覆盖全局助手、上下文分析、聊天工作区和智能推荐能力。
对应代码位于 `src/renderer/features/assistant`。

## 核心文件

- `GlobalAssistant.tsx`：全局助手主编排器
- `SmartRecommender.tsx`：根据当前场景生成推荐项
- `components/AssistantChatWorkspace.tsx`：聊天区、输入区与附件区
- `components/AssistantContextPanel.tsx`：上下文分析与项目快照面板
- `components/AssistantEditPanel.tsx`：项目数据编辑面板
- `services/aiService.ts`：模型调用与 AI 交互服务
- `services/smartRecommendationService.ts`：推荐规则与推荐结果计算
- `services/aiContextBuilder.ts`：上下文拼装
- `services/aiSemanticCheckService.ts`：语义检查能力
- `utils.ts`：助手域内通用工具函数

## 主要职责

- `GlobalAssistant.tsx` 负责窗口状态、拖拽、尺寸、消息发送编排与面板切换
- `AssistantChatWorkspace.tsx` 负责聊天记录展示、模板选择、文件上传和输入交互
- `AssistantContextPanel.tsx` 负责上下文浏览、分析和辅助展示
- `AssistantEditPanel.tsx` 负责项目局部数据的编辑入口
- `SmartRecommender.tsx` 负责根据当前写作上下文、人物、地点和势力给出推荐项

## 依赖关系

- 助手能力会读取当前项目、知识条目、人物与提示词数据
- AI 调用会复用共享的模型配置与写作上下文
- 智能推荐会和知识库、世界观及写作过程联动

## 维护建议

- 新增窗口内视图优先拆到 `components`
- 上下文拼装、推荐计算、AI 请求等逻辑优先下沉到 `services`
- `GlobalAssistant.tsx` 保持编排层定位，避免重新堆积大段业务实现
