# NovaLocal AI Novelist - 桌面应用

## 项目概述

NovaLocal AI Novelist 是一个基于 Electron 的桌面应用程序，专门为小说创作者设计。它集成了 Google Gemini AI 模型，提供从灵感生成到完整小说创作的全流程辅助工具。

## 技术栈

### 核心框架
- **前端**: React 19 + TypeScript
- **桌面**: Electron 39
- **构建工具**: Vite 6
- **样式**: Tailwind CSS 4 + Font Awesome 图标

### AI 集成
- **AI 模型**: Google Gemini API (@google/genai)
- **模型支持**: gemini-3-flash-preview 等

### 开发工具
- **语言**: TypeScript (编译为 JavaScript)
- **包管理**: npm
- **代码检查**: TypeScript 类型检查
- **构建系统**: Electron Builder

## 功能特性

### 1. 项目管理
- 创建、保存、加载小说项目
- 项目数据本地持久化存储
- 项目导入/导出功能

### 2. AI 辅助创作流程
- **灵感生成**: 基于灵感碎片生成小说创意
- **角色构建**: 多维角色体系创建
- **大纲设计**: 逻辑自洽的小说大纲
- **章节规划**: 详细章节细纲生成
- **正文创作**: 沉浸式正文写作
- **内容优化**: 文学性润色和细节扩充

### 3. AI 模型管理
- 多模型配置支持
- Google Gemini API 集成
- 自定义提示词模板
- 模型参数调整

### 4. 数据管理
- 本地文件系统存储
- 数据备份和恢复
- 项目版本管理

## 项目结构

```text
src/
├── main/                 # Electron 主进程与 preload 源码
│   ├── main.js
│   ├── preload.js
│   └── tsconfig.json
├── renderer/             # React 渲染进程源码
│   ├── App.tsx
│   ├── index.tsx
│   ├── index.html
│   ├── index.css
│   ├── components/
│   ├── constants/
│   └── services/
├── shared/               # 共享类型与常量
│   ├── types.ts
│   └── constants.tsx
└── assets/               # 图标与静态资源
build/
├── renderer/             # Vite 构建输出
├── main/                 # Electron 主进程构建输出
└── release/              # 安装包与发行产物
scripts/                  # 构建与辅助脚本
package.json              # 项目配置
vite.config.ts            # Vite 配置
tailwind.config.js        # Tailwind 配置
postcss.config.js         # PostCSS 配置
```

## 安装和运行

### 系统要求
- Windows 10/11 (也支持 macOS 和 Linux)
- Node.js 18+
- npm 9+

### 开发环境设置

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd my-Electron开发环境
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置 AI API 密钥**
   - 在应用中设置 Google Gemini API 密钥
   - 或配置环境变量

### 开发模式运行

```bash
npm run electron:dev
```

这将启动：
- Vite 开发服务器 (http://localhost:3000)
- Electron 应用窗口

### 生产构建

1. **构建应用**
   ```bash
   npm run electron:build
   ```

2. **平台特定构建**
   ```bash
   # Windows
   npm run electron:build-win
   
   # macOS
   npm run electron:build-mac
   
   # Linux
   npm run electron:build-linux
   ```

### 直接运行生产版本

构建后，可以直接运行：
- `build/release/win-unpacked/AI小说家.exe`（示例路径，具体名称以当前版本号为准）
- `build/release/AI小说家-<version>-setup.exe`（安装程序）

## 使用指南

### 1. 开始新项目
1. 启动应用
2. 点击"新建项目"
3. 输入项目名称和描述
4. 开始创作流程

### 2. 创作流程
1. **灵感阶段**: 输入灵感碎片，生成小说创意
2. **角色阶段**: 基于创意构建角色体系
3. **大纲阶段**: 创建完整的小说大纲
4. **章节阶段**: 生成详细章节规划
5. **写作阶段**: 逐章创作正文内容
6. **优化阶段**: 润色和优化已写内容

### 3. AI 模型配置
1. 进入"模型设置"
2. 配置 Google Gemini API 密钥
3. 选择或创建模型配置
4. 调整温度、最大令牌数等参数

### 4. 数据管理
- **自动保存**: 所有更改自动保存到本地
- **手动导出**: 支持项目数据导出为 JSON
- **导入项目**: 从 JSON 文件导入已有项目

## 开发指南

### 项目架构

#### 主进程 (Main Process)
- 文件: `src/main/main.js`
- 职责: 窗口管理、系统集成、安全沙箱

#### 预加载脚本 (Preload Script)
- 文件: `src/main/preload.js`
- 职责: 安全地暴露 API 给渲染进程

#### 渲染进程 (Renderer Process)
- 基于 React 的 UI 应用
- 使用 TypeScript 进行类型安全开发

#### 数据存储
- 服务: `services/storage.ts`
- 使用 Electron 的 `ipcRenderer` 进行文件系统操作
- 数据位置: `%APPDATA%/novalocal-ai-novelist/`

### 添加新功能

1. **创建新组件**
   ```typescript
   // 在 components/ 目录下创建新组件
   // 使用 TypeScript 和 React Hooks
   ```

2. **扩展服务**
   ```typescript
   // 在 services/ 目录下添加新服务
   // 遵循现有的异步模式
   ```

3. **更新类型定义**
   ```typescript
   // 在 `src/shared/types.ts` 中添加新类型
   ```

### 构建和部署

#### 版本管理
1. 更新 `package.json` 中的版本号
2. 更新应用中的版本显示
3. 构建新版本

#### 发布流程
1. 运行完整测试
2. 构建生产版本
3. 测试安装程序
4. 分发到目标平台

## 配置说明

### 环境变量
```bash
# Google Gemini API 密钥 (可选，可在应用中设置)
VITE_GEMINI_API_KEY=your_api_key_here
```

### 构建配置 (package.json)
```json
{
  "build": {
    "appId": "com.novalocal.ainovelist",
    "productName": "NovaLocal AI Novelist",
    "directories": {
      "output": "build/release"
    },
    "files": [
      "build/renderer/**/*",
      "build/main/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "src/assets/icon.icns"
    }
  }
}
```

### Vite 配置
```typescript
// vite.config.ts
export default defineConfig({
  base: './', // 相对路径，适用于 Electron
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss()],
})
```

## 故障排除

### 常见问题

1. **应用无法启动**
   - 检查 Node.js 版本 (需要 18+)
   - 运行 `npm install` 重新安装依赖
   - 检查控制台错误信息

2. **AI 功能不可用**
   - 确认 API 密钥已正确配置
   - 检查网络连接
   - 验证模型配置

3. **数据保存失败**
   - 检查应用数据目录权限
   - 确认磁盘空间充足
   - 查看开发者工具控制台

4. **构建失败**
   - 清理 `build/renderer`、`build/main` 和 `build/release` 目录
   - 重新运行 `npm install`
   - 检查 TypeScript 编译错误

### 日志和调试

- **开发模式**: 使用 Chrome 开发者工具
- **主进程日志**: 查看终端输出
- **数据存储**: 检查 `%APPDATA%/novalocal-ai-novelist/` 目录
- **错误报告**: 收集控制台错误和日志文件

## 性能优化

### 应用启动
- 使用 Vite 进行快速构建
- 代码分割和懒加载
- 优化初始数据加载

### 内存管理
- 合理使用 React 组件生命周期
- 及时清理事件监听器
- 优化大型数据操作

### 存储优化
- 增量数据保存
- 数据压缩 (如果需要)
- 定期清理临时文件

## 安全考虑

### 数据安全
- 所有数据本地存储
- 输不传用户数据到外部服务器 (除非使用 AI API)
- 文件系统权限最小化

### API 安全
- 使用预加载脚本进行安全的 IPC 通信
- 验证所有用户输入
- 安全的 API 密钥存储

### 应用安全
- 遵循 Electron 安全最佳实践
- 定期更新依赖
- 代码审查和安全测试

## 未来扩展

### 计划功能
1. **多语言支持**: 国际化界面
2. **云同步**: 可选的项目云备份
3. **协作功能**: 多作者协作编辑
4. **模板系统**: 可定制的小说模板
5. **分析工具**: 写作进度和习惯分析

### 技术改进
1. **性能监控**: 应用性能分析工具
2. **自动化测试**: 完整的测试套件
3. **CI/CD**: 自动化构建和部署流程
4. **插件系统**: 可扩展的插件架构

## 贡献指南

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 React Hooks 最佳实践
- 保持组件单一职责
- 编写清晰的注释和文档

### 提交流程
1. Fork 项目仓库
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request
5. 代码审查和测试

### 测试要求
- 新功能需要单元测试
- UI 更改需要手动测试
- 重大更改需要端到端测试

## 许可证

本项目基于 MIT 许可证开源。详见 LICENSE 文件。

## 支持与联系

- **问题报告**: 使用 GitHub Issues
- **功能请求**: 提交 Feature Request
- **技术讨论**: 参与项目 Discussions
- **文档改进**: 提交文档更新

## 更新日志

### v1.0.0 (当前版本)
- 初始 Electron 桌面应用版本
- 完整的 AI 辅助创作流程
- 本地数据存储系统
- Windows 安装程序支持
- 响应式 UI 设计

---

*最后更新: 2025年12月26日*
*文档版本: 1.0.0*


