# 贡献指南

感谢你有兴趣为「红月创作」贡献！本文件说明如何参与，以及贡献需遵守的许可条款。

## 许可与 CLA（必读）

本项目采用 **AGPL-3.0 + 商业授权** 的双重许可模式（详见 `docs/guides/licensing.md`）。为了让维护者能够把包含你贡献的代码再许可给商业客户（含闭源），**所有贡献者需签署贡献者许可协议（CLA）**：

- 协议正文：`docs/CLA.md`
- 你**保留**对自己贡献的版权；
- 你授予维护者一项永久、不可撤销、可再许可（含闭源商用）的版权与专利许可。

签署方式：项目使用 **cla-assistant** 在 Pull Request 上自动校验。首次提交 PR 时，按机器人评论中的链接以 GitHub 账号确认即可，一次签署长期有效。

> 若你不同意 CLA，请不要提交贡献；也欢迎通过 Issue 反馈问题与想法。

## 开发环境

要求：Node.js 24+、npm 11+（与 CI 一致）。

```bash
git clone https://github.com/chen647208/ai-novel.git
cd ai-novel
npm install                 # 中国大陆可加 --registry=https://registry.npmmirror.com
npm run electron:dev        # 开发模式（Vite + Electron）
```

## 提交前自检

请在本地跑与 CI 一致的完整校验：

```bash
npm run verify              # = typecheck:all + test + headers:check + electron:build
```

- 类型检查为 strict 且开启 `noUnusedLocals`（不要引入未使用的导入/变量）。
- 新增纯逻辑请配套单元测试（放在被测代码同级 `__tests__/*.test.ts`）。
- 涉及打包/多端的改动，验证 `npm run dist:win` / `dist:mac` / `dist:linux` 产物。

## 贡献流程

1. 从 `main` 新建分支：`git checkout -b feat/your-feature`。
2. 编写改动与测试，本地 `npm run verify` 通过。
3. 提交（遵循 Conventional Commits：`feat:` / `fix:` / `docs:` / `refactor:` 等）。
4. 推送并开 Pull Request 到 `main`；按提示签署 CLA。
5. CI 通过后，等待维护者 review。

## 代码与结构约定

- 业务逻辑放在对应 `src/renderer/features/<domain>`；跨功能域通用才进 `src/renderer/shared`；跨进程类型进 `src/shared`。
- 不新增旧版兼容层；新版严格更优时直接替换旧实现。
- 遵循现有 TypeScript 风格与命名。
- 每个源码文件顶部需带 AGPL-3.0 / SPDX 许可证声明头。新建文件后运行 `npm run headers` 自动补齐（幂等，已有声明头的文件会跳过），CI 会用 `npm run headers:check` 校验。

## 文档与注释文风（人审，不进 CI）

- 只写现在：不写"过去什么样、现在变成什么样"的变迁叙事，历史归 git log。
- 直述句：不用"不是……而是/而非"双重否定，直接说是什么。
- 中性简洁：无第一人称、无抒情感叹、无括号旁白；已知边界用现在时。

## 问题反馈

- Bug / 功能请求：提交 GitHub Issue。
- 安全漏洞：请勿公开 Issue，通过维护者私下渠道报告。
