# 版本功能说明

## 适用范围

本文件覆盖版本信息展示、更新检查与版本历史展示。
对应代码位于 `src/renderer/features/version`。

## 核心文件

- `VersionCheckModal.tsx`：版本检查弹窗
- `services/versionService.ts`：版本读取、比较、GitHub Release 检查与版本历史服务
- `src/renderer/env.d.ts`：前端构建常量声明
- `vite.config.ts`：注入前端可用的 `__APP_VERSION__`

## 当前实现方式

- 当前版本号来源于 `package.json` 中的 `version`
- 构建时由 `vite.config.ts` 读取版本号并注入 `__APP_VERSION__`
- 渲染层不再通过 Node 的 `module` 或 `createRequire` 读取 `package.json`
- 远程更新检查通过 GitHub Releases 的 latest 接口完成

## 当前职责

- `checkForUpdates()`：请求最新 Release 信息并判断是否有新版本
- `compareVersions()`：比较语义化版本号
- `getCurrentVersionInfo()`：返回当前本地版本信息
- `getVersionHistory()`：返回内置版本历史
- `formatVersion()`：统一版本号显示格式

## 当前限制

- “下载更新”目前仍是前端模拟流程
- 真正的下载与安装尚未接入 Electron 原生自动更新链路
- 后续如果接入自动更新，建议把下载与安装逻辑放到主进程
