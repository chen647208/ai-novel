# 构建与发布说明

## 构建产物目录

- 渲染进程构建输出到 `build/renderer`
- Electron 主进程编译输出到 `build/main`（含 `build/main/preload/` 预加载产物）
- 安装包与发布产物输出到 `build/release`
- Windows 安装包：`AI小说家-<版本号>-setup.exe`
- macOS 镜像：`AI小说家-<版本号>-<arch>.dmg`（x64 与 arm64）
- Linux：`AI小说家-<版本号>.AppImage` 与 `.deb`

## 常用命令

开发：
- `npm run dev`：仅启动前端开发服务器（Vite）
- `npm run electron:dev`：编译主进程后，并行启动 Vite 与 Electron 开发窗口

构建与校验：
- `npm run build`：构建渲染进程
- `npm run build:electron`：编译主进程 + 预加载（分别用 `build:electron:main` / `build:electron:preload`）
- `npm run electron:build`：渲染进程 + 主进程全量构建（打包前置）
- `npm run typecheck`：渲染层类型检查（strict + noUnusedLocals）
- `npm run typecheck:main`：主进程与预加载类型检查（strict）
- `npm run typecheck:all`：以上两者
- `npm run test`：运行全部单元测试（vitest）
- `npm run verify`：typecheck:all + test + electron:build 的完整本地校验（CI 同款）

打包分发：
- `npm run dist`：按当前平台打包
- `npm run dist:win` / `dist:mac` / `dist:linux`：构建并生成对应平台安装包

## 打包配置

- 打包配置的唯一来源是根目录 `electron-builder.yml`（package.json 中不再保留 `build` 块）。
- 主进程入口通过 `extraMetadata.main = build/main/main.js` 注入打包后的 package.json。
- Electron 运行时文件（`.pak`、`locales`、`*.dll`、`snapshot_blob.bin`、`electron.asar` 等）由 electron-builder 随 Electron 发行版自动打包，**严禁在 `files` 中排除**，否则应用无法启动。
- 运行时外部依赖仅 `vectra`（主进程动态 import）；其余依赖均为渲染层依赖，由 Vite 打包进 `build/renderer`，因此置于 devDependencies，不进入安装包 node_modules，显著减小体积。
- 中国大陆网络下 Electron 发行版下载走 `electronDownload.mirror`（npmmirror），CI 与本地均可访问。

## 发布流程（基于 Git 标签）

本项目采用「先确认稳定版本、再打标签触发自动发布」的流程：

1. 在 `main` 分支确认功能与测试稳定，更新 `package.json` 的 `version`。
2. 打标签并推送，标签名须形如 `v1.4.5`：
   ```bash
   git tag v1.4.5
   git push origin v1.4.5
   ```
3. 推送标签会自动触发 `.github/workflows/release.yml`：在 Windows / macOS / Linux 三个 runner 上分别构建安装包，汇总后通过 GitHub Release 发布，并附带自动生成的发布说明。

详见 `docs/guides/ci-and-release.md`。

## 维护建议

- 前端体积增长时优先用懒加载与 `vite.config.ts` 的 `manualChunks` 细化分块。
- 任何改动后先本地跑 `npm run verify`，与 CI 校验保持一致。
- 若接入自动更新（electron-updater），需在 `electron-builder.yml` 配置 `publish` 并生成 `latest.yml`，同步更新版本检查逻辑。
