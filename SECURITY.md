# 安全政策

## 报告漏洞

请勿在公开 Issue 中披露安全问题。请通过 GitHub 的
[私密漏洞报告](https://docs.github.com/zh/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
（仓库 → Security → Advisories → Report a vulnerability）提交，包含：

- 受影响版本与平台；
- 复现步骤或最小样例；
- 影响评估（数据泄露/远程执行/拒绝服务等）。

我们会在 7 天内确认收到，并在修复可用后协调披露时间；修复版本会写入 `CHANGELOG.md`。

## 支持范围

仅最新发布版本接受安全报告。使用 Electron 加固（`contextIsolation`、`sandbox`、
CSP、asar 完整性校验、Electron fuses）与本地优先存储；API Key 经系统钥匙串
（safeStorage）加密，业务数据存本地。

## 不在范围内

- 需要本地物理访问或已取得操作系统账户权限的攻击；
- 依赖项的已知漏洞（请向对应上游报告，本仓库通过 Dependabot 与 `npm audit` 跟踪）。
