# CI/CD 与发布流程

本项目使用 GitHub Actions 实现持续集成与基于标签的自动发布。

## 工作流一览

| 工作流 | 文件 | 触发条件 | 作用 |
| --- | --- | --- | --- |
| CI | `.github/workflows/ci.yml` | 推送到 `main`、针对 `main` 的 Pull Request、手动触发 | 规范＋类型＋覆盖率测试＋密钥/文档扫描；非文档改动才跑 Electron 全量构建 |
| Release | `.github/workflows/release.yml` | 推送形如 `v*` 的标签 | 三端构建桌面包并发布 GitHub Release |

## CI（持续集成）

- 在 `ubuntu-latest` 上执行，安装依赖用 `npm ci`（锁定 `package-lock.json`），Node 依赖缓存 + 同分支新提交取消旧任务，不浪费分钟数。
- `verify` 作业（每次必跑）：`npm ci` 后跑同一条 `npm run verify` 链
  （预检 lock 同步 → lint（含类型感知异步规则）→ typecheck:all → deps:check → types:escapes → lint:dead → test:coverage → headers:check → licenses:check → scan:secrets → electron:build → bundle:check），
  与本地完全一致，不再逐项手写步骤。测试命令统一设 `NODE_OPTIONS=--max-old-space-size=2048`
  （`cross-env`）；超上限视为回归，先定位根因（必要占用 vs 可优化），禁止只调大上限。
- 文风不进 CI：只写现在、直述句、中性简洁三条标准只在 review 时人工把关
  （标准与正反例见 `CONTRIBUTING.md`）。原因：语气修辞机器判不准，
  机械匹配曾经误杀过引用规则自身的文档。
- `build` 作业（重型）：仅非文档改动时跑，图标校验 + E2E。纯文档 PR 跳过本作业（`verify` 链内构建仍跑，约 10 秒）。
  E2E 覆盖：启动冒烟、建书/无模型禁用/建议/快捷键/持久化回归、章节拆分合并、自动备份按间隔落盘、主题持久化。
  共用助手在 `e2e/helpers.ts`；每例用 `--user-data-dir` 临时目录隔离，并在启动后固定窗口尺寸避免窄窗挤压布局。

## Release（发布）

仅当推送 `v*` 标签时触发，遵循「确认稳定版本后再打标签」的原则：

1. `build` 作业用矩阵在 `windows-latest`、`macos-latest`、`ubuntu-latest` 三个 runner 上并行：
   - `npm ci` → `typecheck:all` + `test:coverage` → `electron-builder --win/--mac/--linux --publish never`。
   - 各平台产物通过 `actions/upload-artifact` 上传。
   - 代码签名按仓库 Secrets 是否存在自动生效（缺失即未签名构建，行为不变）：
     Windows 用 `CSC_LINK` + `CSC_KEY_PASSWORD`；macOS 用 `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID`，
     公证所需 hardened runtime 与权限在 `electron-builder.yml`（`resources/entitlements.mac.plist`）中已配好。
     未配置证书时 macOS 产物带 Gatekeeper 提示，属开源未签名分发的预期行为。
2. `release` 作业汇总三端产物，用 `softprops/action-gh-release` 基于该标签创建 GitHub Release 并上传安装包，自动生成发布说明。

## 打包产物冒烟

`npm run test:e2e:packaged` 启动已打包应用并断言窗口出现（不依赖 vite）。用法：

```bash
npx electron-builder --dir --publish never
# Windows 示例；macOS/Linux 换成对应产物路径
HONGYUE_PACKAGED_EXE="$PWD/build/release/win-unpacked/红月创作.exe" npm run test:e2e:packaged
```

未设置 `HONGYUE_PACKAGED_EXE` 时该用例跳过。

## 打标签发布操作步骤

```bash
# 1) 确认 main 分支稳定、测试全绿
npm run verify

# 2) 同步版本号三处（package.json、releases.ts、CHANGELOG.md）
node scripts/bump-version.mjs 1.0.1 --zh "说明" --en "notes"

# 3) 提交并打标签
git commit -am "chore: release v1.0.1"
git tag v1.0.1
git push origin main --follow-tags
```

推送标签后到仓库的 Actions 页面观察 Release 工作流，完成后在 Releases 页面即可下载三端安装包。

## 权限与安全

- Release 工作流声明 `permissions: contents: write` 以创建 Release。
- 未使用任何第三方发布密钥；代码签名/公证在仓库 Secrets 配置证书后自动启用（见上），无需改工作流。
