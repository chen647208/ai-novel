# 创作主流程说明

## 适用范围

本文件覆盖从书籍创建到灵感生成、人物构建、大纲整理和章节规划的主流程。
对应代码主要分布在以下目录：

- `src/renderer/features/books`
- `src/renderer/features/inspiration`
- `src/renderer/features/characters`
- `src/renderer/features/outline`
- `src/renderer/features/chapters`
- `src/renderer/app`

## 主流程入口

- `src/renderer/app/App.tsx`：主状态编排、步骤切换和各功能域接线
- `src/renderer/app/app-shell/Sidebar.tsx`：左侧导航、步骤切换和书籍管理入口
- `src/renderer/features/books/BookManager.tsx`：书籍列表与切换入口

## 流程分段

### 1. 书籍管理

- `BookManager.tsx`：管理书籍列表、切换当前项目、触发新建入口
- `BookItem.tsx`：单本书籍卡片展示与交互
- `NewBookModal.tsx`：新建、复制模板等创建方式

### 2. 灵感生成

- `StepInspiration.tsx`：输入灵感、选择提示词、调用 AI 生成书名与简介
- 当前步骤也承接世界观起始信息的录入与预览

### 3. 人物构建

- `StepCharacters.tsx`：人物生成、人物列表与人物编辑调度
- `CharacterModal.tsx`：单个人物的详细编辑
- `CompactCharacterCard.tsx`：人物卡片展示
- `RelationshipDiagram.tsx`：人物关系图展示

### 4. 大纲整理

- `StepOutline.tsx`：根据简介与人物设定生成和整理大纲

### 5. 章节规划

- `StepChapterOutline.tsx`：生成章节细纲、维护章节列表与章节概要

## 数据流说明

- 当前项目主状态由 `App.tsx` 统一持有
- 各步骤组件通过 `project` 和 `onUpdate` 接收数据与回写修改
- 书籍切换、本地持久化和初始化加载由 `src/renderer/shared/services/storage.ts` 配合完成

## 维护建议

- 主流程步骤组件继续保持“单步骤单入口”结构
- 跨步骤复用逻辑优先抽到对应功能域的 `services`
- 不再把流程组件放回旧的 `components` 根目录
