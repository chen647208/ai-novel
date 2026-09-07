# 项目规范（AGENTS）

> 收录规则：只收约束与机制；流水、状态、解释禁入；新增一条先合一条。
> 分组：原则（一、二、九）/ 流程（三、四、七）/ 门禁（五、六、八）。欠账不住本文件，各归设计文档与 issue。
> 本文件即 OpenCode 自动加载的 `AGENTS.md`（个人全局规则放 `~/.config/opencode/AGENTS.md`，不进本仓库）。

## 一、试验田理念（总根，一切评判先引用本条）

- 定位：试验田，用最新、最流行、最工业化的方案实时更新；方向"既要 AI 又要常规写作"，各类型数据通用的小说工具，功能靠插件化支撑大而全。
- 功能广度外包给插件生态（单人堆功能是死路），核心只做数据模型加扩展机制。
- AI 是增强层不是地基：禁用全部插件后纯写作完整可用。
- 只敢打补丁、不敢重塑流程的设计，视为违反本条。
- AI 层对标 OpenAI codex：工具契约、SKILL.md 渐进加载、沙箱乘审批、会话事件流。
- 插件化跟踪 deepseek-harness：MIT 可抄实现；其缺规范、缺协议、无隔离是 day-1 清单。
- 许可证红线：copyleft 只抄设计不抄代码。GPL-3.0：novelWriter / Zettlr / Twine / Manuskript / bibisco；AGPL-3.0：Trilium。宽松可参考实现：harness MIT、codex Apache-2.0、编辑器内核 MIT。
- 插件交互以已落地的运行时强制协议为基线：manifest 依赖声明加版本区间、PluginHost 拓扑激活、事件命名空间强制、权限默认拒绝；不退回约定式约束。
- 新文体走类型模板加发行档，不动核心；多人协作在不做清单，非请勿动。
- 插件 v0 仅资源型（Markdown 技能）可用，逻辑型 JS / WASM 不跑。

## 二、不留残留（无兼容包袱）

- 新版严格更优就干净替换：同步更新所有调用方，不留垫片、deprecated 别名、回退分支、旧 API。
- `// 兼容旧版`式可选字段、双路径 if/else、re-export 别名，禁写（新方案未覆盖旧能力时除外）。
- 不设老用户兼容是现状（实际没有老用户），不是原则；一旦存在真实用户数据，格式换代必须带迁移（旧数据改名 .legacy 保留），禁静默丢失。
- 替换同时清理随之失效的死代码。

## 九、说人话（默认读者是第一次见的外人）

- 规则、报错、注释、文档一律写到"不用猜"的程度：给结论、给例子、给位置；黑话与缩写第一次出现必须展开。
- 每条规范附正反例（细则与例子集中在 `CONTRIBUTING.md`，本文件只收原则）。
- 对用户说话也一样：先给结论与代价，再给选项；不确定就明说不知道并给出验证路径，禁编造。

## 三、文档与注释只写现在

- 禁变迁叙事：「已重构为 / 换代后 / 此前是 / 旧的 / 新增」不写；历史归 git log。
- 里程碑编号不进正文与代码注释。
- 中性描述：禁江湖黑话、括号旁白、感叹抒情、第一人称；只陈述事实。
- 已知边界用现在时；时点快照单独归档。
- 每次文档改动后 grep 违禁模式（已重构 / 换代 / 此前 / 旧的 / 新增 / M\d\. / 黑话 / 漏洞 /（现有！）类旁白）清零。
- 结构按 Diátaxis 四象限落位（design=解释前瞻，features=参考现状，guides=操作指南）；新建文档先定象限。
- 行文取 Google developer style（第二人称、主动语态、条件前置）；项目规范优先于它。
- 大功能先写 spec（what / why / 验收标准）再动手（Spec Kit 式 Spec→Plan→Tasks→Implement）。
- CHANGELOG 按 Keep a Changelog、版本号按 SemVer；不采用 OpenAPI（无 HTTP API 面）。
- 功能改动同步更新 docs/features 对应篇；忘同步的判定标准：代码行为与文档描述不一致即 bug。

## 四、开发规范

- 子代理可用：并行调研与探索用 Task 分发，主线程做决策与写码；禁把整块交付甩给子代理后不看。
- 质量随功能内联：类型收紧、去重、命名、错误处理、可测试性；交付说明改进点。
- 渲染层日志走 logger 单出口，禁直调 console（lint 门禁）；魔法数字收 shared/constants，改值只改一处。

## 五、校验门禁（verify && 提交，全量回归）

- 一律 `npm run verify && git add … && git commit`；verify 非零即停，禁分号链。
- verify = lint + typecheck:all + test:coverage + headers:check + electron:build；失败先看 lint error 段（与 CRLF 噪音区分）。
- 覆盖率分层锁线见 vitest.config.ts（core / main / renderer 三组，只许随测试补充上调）。
- 全量回归：全量单测加双端构建；打包与多端验产物；运行时改动 Electron 冒烟（whenReady / IPC / createWindow）。
- E2E 启动冒烟：npm run test:e2e（xvfb 无头，数据目录隔离，CI 同跑）；UI 断言已落地（建书/禁用/建议/切换/持久化），E2E 选择器中英双语，跑前锁 `--lang=zh-CN`。
- 新目录首交后 `git diff --cached --stat` 核对；提交前密钥扫描零命中。
- 中间产物与隐私禁入库：build / coverage / 日志 / 数据库 / 密钥只活本地；提交前 `git status` 逐项核对，陌生文件先问再加。
- 禁为过测试扭曲实现（硬编码用例、`any` 逃逸、测试污染生产代码）；测行为不测实现；覆盖率是地板不是目标。
- gitignore 用前导 `/` 锚定，禁宽模式静默吞目录。
- 交付区分已验证与未验证。
- CI 与本地同门：Node 大版本一致（本地 24，CI 跟进），lock 文件与 package.json 同步（CI 跑 npm ci，解析器不一致即挂）；CI 跑 test:coverage（禁降级为 test）；纯文档改动跳过重构建；密钥 CI 兜底；文风（只写现在/直述句/中性简洁，标准与正反例见 CONTRIBUTING）只在 review 时人工把关，不进 CI。

## 六、汇报精度

- 逐条标注 ✅完成 / 🟡部分（缺什么） / ❌未做（为什么与代价）。
- "声明层就位、物理重构未做"必须写在条目内；禁拿"可选深化 / 已记录"带过。
- 汇报前自查每条与提交、测试一一对应。

## 七、设计规范（先对标再动手）

- 动交互流程前先联网对标先进项目（Cherry Studio / SillyTavern / OpenWebUI / LibreChat），抄成熟形态再设计；禁闭门凭历史版本小改。
- UI 只调样式不动流程，视为打补丁，违反第一条。
- 版本单点：手改点唯一（package.json），消费走单源模块，展示走模板组件；package-lock 版本须同步。
- 展示名单源：产品展示名唯一（红月创作 / Hongyue Creation），散在各处的字面量改名走一次性 codemod；机器标识（appId / 数据目录 / 包名 / 插件 id / 仓库名）保持稳定，禁顺手改。
- 通用 UI 模式抽模板复用（ViewModeToggle / SegmentedControl），禁各处手写第二套。
- 构建面 Electron：主进程重度依赖 Node（sqlite / vectra / MCP stdio / safeStorage），无 Rust 人力；移动端需求出现前不迁 Tauri。

## 八、开源协作（贡献审核）

- main 保护：CI 必过方可合；CODEOWNERS 默认指派维护者。
- 外部 PR 自查清单：verify 全绿、中英字典对齐、docs 同步、无密钥、无变迁叙事（文风按 CONTRIBUTING 人审）；先开 issue 对齐方向再写代码。
- AI 写入审核（三档：read 直通 / proposal 弹批 / direct 受限）与人类合码审核是两套门，不互相代替。
