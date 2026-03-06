# 构建与发布说明

## 构建产物目录

- 渲染进程构建输出到 `build/renderer`
- Electron 主进程编译输出到 `build/main`
- 安装包与发布产物输出到 `build/release`
- Windows 安装包文件名模式为 `AI小说家-<版本号>-setup.exe`

## 常用命令

- `npm run dev`：启动前端开发服务器
- `npm run build`：构建渲染进程
- `npm run build:electron`：编译 Electron 主进程
- `npm run electron:dev`：启动 Electron 开发模式
- `npm run electron:build`：先构建前端与主进程，再准备打包
- `npm run electron:build-win`：生成 Windows 安装包
- `npm run electron:build-mac`：生成 macOS 安装包
- `npm run electron:build-linux`：生成 Linux 安装包

## 当前构建方式

- `vite.config.ts` 负责渲染进程构建与分块配置
- 版本号通过构建期常量 `__APP_VERSION__` 注入前端
- `src/main/tsconfig.json` 负责主进程 TypeScript 编译
- `package.json` 中的 `build.directories.output` 目前指向 `build/release`
- `electron-builder` 负责安装包打包

## 发布产物说明

- 只执行 `npm run build` 时不会生成 `.exe`
- 需要 `.exe` 时应执行 `npm run electron:build-win`
- 生成后的安装包位于 `build/release`

## 维护建议

- 若前端体积继续增长，优先通过懒加载与 `manualChunks` 细化分块
- 若后续接入自动更新，发布说明需同步更新版本检查与安装流程
