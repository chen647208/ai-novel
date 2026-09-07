# CI/CD 与发布流程

本项目使用 GitHub Actions 实现持续集成与基于标签的自动发布。

## 工作流一览

| 工作流 | 文件 | 触发条件 | 作用 |
| --- | --- | --- | --- |
| CI | `.github/workflows/ci.yml` | 推送到 `main`、针对 `main` 的 Pull Request、手动触发 | 规范＋类型＋覆盖率测试＋密钥/文档扫描；非文档改动才跑 Electron 全量构建 |
| Release | `.github/workflows/release.yml` | 推送形如 `v*` 的标签 | 三端构建桌面包并发布 GitHub Release |

## CI（持续集成）

- 在 `ubuntu-latest` 上执行，安装依赖用 `npm ci`（锁定 `package-lock.json`），Node 依赖缓存 + 同分支新提交取消旧任务，不浪费分钟数。
- `verify` 作业（每次必跑）：
  1. `npm run lint`：ESLint 严格模式。
  2. `npm run typecheck:all`：渲染层与主进程 strict 类型检查（含 `noUnusedLocals`，拦截死代码）。
  3. `npm run test:coverage`：vitest 全量单元测试 + 覆盖率分层锁线（与本地 `verify` 一致）。
  4. `npm run headers:check`：许可证声明头。
  5. 密钥扫描：密钥模式零命中门禁。
  6. 文档变迁叙事检查（只写现在）：零命中门禁。
- `build` 作业（重型）：仅非文档改动时跑，`npm run electron:build` + `npm run check:icons`。纯文档 PR 跳过构建。

## Release（发布）

仅当推送 `v*` 标签时触发，遵循「确认稳定版本后再打标签」的原则：

1. `build` 作业用矩阵在 `windows-latest`、`macos-latest`、`ubuntu-latest` 三个 runner 上并行：
   - `npm ci` → `typecheck:all` + `test:coverage` → `electron-builder --win/--mac/--linux --publish never`。
   - 各平台产物通过 `actions/upload-artifact` 上传。
   - macOS 默认不签名（`CSC_IDENTITY_AUTO_DISCOVERY=false`），产物带 Gatekeeper 提示，属开源未签名分发的预期行为。
2. `release` 作业汇总三端产物，用 `softprops/action-gh-release` 基于该标签创建 GitHub Release 并上传安装包，自动生成发布说明。

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
- 未使用任何第三方发布密钥；如需代码签名/公证，另行在仓库 Secrets 配置证书并调整 `electron-builder.yml`。
