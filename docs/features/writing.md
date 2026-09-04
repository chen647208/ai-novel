# 写作功能说明

## 适用范围

本文件覆盖正文写作、章节编辑、AI 生成、历史记录与导出相关能力。
对应代码位于 `src/renderer/features/writing`。

## 核心文件

- `WritingEditor.tsx`：写作主编排器
- `AIHistoryViewer.tsx`：AI 历史记录查看器
- `components/`：写作域子组件目录
- `components/history/AIHistoryRecordList.tsx`：历史记录列表展示
- `services/summaryExtractionService.ts`：摘要提取服务
- `utils.ts`：写作域通用工具
- `types.ts`：写作域本地类型
- `constants.ts`：写作域常量

## 主要职责

- `WritingEditor.tsx` 负责状态编排、AI 生成入口和子组件接线
- `WritingEditorOverlayLayer.tsx` 负责生成弹窗、编辑弹窗、导出弹窗、选区菜单和历史侧层
- `WritingSidebar.tsx` 负责章节导航、摘要区域和辅助信息展示
- `WritingEditorCanvas.tsx` 负责正文输入区与状态遮罩
- `AIHistoryViewer.tsx` 与 `AIHistoryRecordList.tsx` 负责历史记录筛选、排序、展示与操作

## 与其他模块的关系

- 写作过程会读取主流程生成的章节、人物、知识条目和提示词
- AI 调用依赖助手域和设置域中的模型配置能力
- 历史记录与正文内容通过共享存储服务持久化

## 维护建议

- 新增弹窗、局部面板或历史展示能力时优先放入 `components`
- 通用逻辑优先放入 `services`、`utils.ts` 或 `types.ts`
- `WritingEditor.tsx` 已压到 1000 行以内，应继续保持编排器定位
