# Zettlr 调研：Electron 主进程的工程化范本

> 调研日期：2026-08-31 ｜ 仓库：https://github.com/Zettlr/Zettlr ｜ 13.5k★ ｜ Electron + Vue + TypeScript + CodeMirror 6 ｜ 活跃
> 定位：学术写作工作台（"Your One-Stop Publication Workbench"）。非 AI，纯写作。与 ai-novel 技术栈最接近的工业级参照。

## 1. 为什么值得深挖

Zettlr 是"Electron 应用怎么组织主进程"的教科书。它没有用任何 DI 框架，却用 ~200 行代码建立了一套**服务容器 + Provider 契约 + 类型化 IPC + 命令对象**的完整体系，维护了近十年、9000+ commits 没有腐化成面条。我们要"什么功能都敢往里塞"，最大的风险就是主进程膨胀失控——Zettlr 就是解药。

## 2. 核心架构拆解

### 2.1 AppServiceContainer：手写依赖注入容器

主进程只有一个全局单例容器，持有所有服务的单例引用：

```ts
export class AppServiceContainer {
  private readonly _logProvider: LogProvider
  private readonly _configProvider: ConfigProvider
  private readonly _fsal: FSAL
  // ... 22 个 provider
  constructor () {
    // 按依赖顺序手动实例化（构造器注入，无框架）
    this._logProvider = new LogProvider()
    this._configProvider = new ConfigProvider(this._logProvider)
    this._fsal = new FSAL(this._logProvider, this._configProvider, this._lrtProvider)
    // ...
  }
}
export function getAppServiceContainer () { /* boot 前访问直接 throw */ }
```

要点：
- **依赖顺序显式化**：Log 最先，Config 第二，文件系统层第三。谁依赖谁一目了然，杜绝循环依赖。
- **`isBooted` 守卫**：boot 完成前访问容器直接抛错，配合 splash screen 显示启动进度。
- 没有装饰器魔法，纯 TypeScript + 构造器参数。可读性 > 优雅性。

### 2.2 ProviderContract：所有服务的统一生命周期

```ts
export default abstract class ProviderContract {
  public async boot (): Promise<void> { /* 默认空实现 */ }
  public abstract shutdown (): Promise<void>
}
```

每个 Provider 强制实现 boot/shutdown。应用退出时容器逆序调用 shutdown——**资源清理有契约保证**（文件监听器、子进程、数据库句柄不会泄漏）。

### 2.3 IPCAPI 泛型：类型化的渲染→主进程通信

这是最值得抄的一招。每个 Provider 声明自己的命令→载荷映射：

```ts
interface ProviderAPIMap {
  commandName: { property1: string, property2: number }
}
type ProviderAPI = IPCAPI<ProviderAPIMap>
// IPCAPI<T> 把 key->value 映射变换成 {command:'commandName', payload:{...}} 的可辨识联合

ipcMain.handle('provider-name', (event, message: ProviderAPI) => { ... })
```

- **一个 Provider 只占一个 IPC channel**，channel 内用 `{command, payload}` 可辨识联合分发。
- 渲染进程发错载荷类型 → 编译期报错。IPC 不再是"字符串黑洞"。
- 对比我们项目：现在大概率是散落的 `ipcMain.handle('xxx:yyy')` 几十个通道。**收敛为"每服务一通道 + 类型化命令联合"是我们 IPC 重构的目标形态。**

### 2.4 CommandProvider：命令对象化

所有"用户可触发的动作"都是类（`DirNew`、`FileRename`、`Export`、`Print`、`OpenAuxWindow`……30+ 个），实现统一的 `ZettlrCommand` 接口，注册进一个数组：

```ts
export const commands = [ DirDelete, DirNewProject, ..., RenameTag, WorkspaceSort ]
```

命令 = **菜单项 + 快捷键 + IPC 入口**三合一：菜单从命令注册表生成，快捷键绑定到命令 ID，渲染进程也能直接 invoke 命令。新增一个功能 = 写一个命令类 + 注册一行。

**这正是插件化的雏形**——把数组换成插件贡献点（contribution point），就是 VS Code 的 `commands` 扩展点。我们做插件系统时，第一步就该把现有功能全部改造成这种"命令对象"，命令注册表即插件 API 的宿主。

### 2.5 FSAL：文件系统抽象层

File System Abstraction Layer 是独立 Provider：工作区（workspace）→ 项目（project）→ 目录 → 文件四级树，统一扫描、缓存、监听、元数据提取（YAML frontmatter、标签、链接）。上层功能（搜索、标签、链接面板、导出）全部消费 FSAL，**没有第二个功能直接碰 fs**。

对我们的映射：我们的"书→章节→卡片"树应该有一个同等的单一数据访问层，AI 工具（MCP server）也应挂在它上面，而不是各 feature 自己读写。

### 2.6 按窗口组织代码

`source/` 下每个 `win-*` 目录是一个独立窗口入口（win-main、win-preferences、win-update、win-stats、win-print、win-project-properties、win-tag-manager、win-onboarding、win-splash-screen……），各自独立的 webpack entry。

- 好处：辅助功能（统计、导出预览、标签管理）崩溃不影响主窗口；每个窗口是独立 Vue 应用，天然隔离。
- 代价：跨窗口状态同步要走 IPC/主进程，不能共享内存。
- 我们的 settings/consistency 等大面板可以考虑从"弹窗组件"升级为"辅助窗口"，主窗口保持轻。

## 3. 其他工程实践

- **构建**：Electron Forge（开发/打包）+ electron-builder（发行）双工具并用，webpack 分 main/renderer 两份配置。
- **自动更新**：独立 UpdateProvider + win-update 窗口，更新流程有自己的 UI 状态机。
- **导出**：Pandoc 子进程封装（`common/pandoc-util`），自己不造排版轮子（与 novelWriter 同路线）。
- **长任务**：LongRunningTaskProvider 统一管理进度条任务（索引重建、导出），带取消。
- **代码头注释规范**：每个文件有 `CVM-Role`（Controller/Model/View/Contract）标注——一种轻量的架构角色文档化，值得抄进我们的 lint 规则。

## 4. 我们要抄什么（映射到 ai-novel）

1. **ProviderContract + 服务容器** → 主进程重构目标形态。我们的 Electron 主进程目前只有 687 行，趁小直接按这个骨架立规矩。
2. **IPCAPI 类型化命令联合** → 立即应用到现有 IPC 通道，消灭裸字符串。
3. **命令对象注册表** → 所有功能动作（含 AI 动作）统一为命令，为插件贡献点铺路。
4. **FSAL 单一数据访问层** → 对应我们的"书/章节/卡片"存储层，AI 上下文构建器只准从这里取数。
5. **辅助窗口拆分** → consistency 检查、导出预览这类重 UI 功能。
6. **boot 守卫 + splash 进度** → 我们项目大索引重建时需要同等待遇。

## 5. 不要学的

- **Webpack**：Zettlr 是历史包袱，我们已用 Vite，不要倒退。
- **Vue**：仅参考架构，不参考框架绑定方式；我们的 React 等价物是 Context/Zustand。
- **学术向功能**（citeproc、引用样式）：与小说场景无关，但注意它的 citeproc Provider 恰好演示了"可选重依赖 Provider"的隔离方式。
- **GPL v3 许可证**：抄设计思路没问题，**不要直接复制代码**（我们项目许可证需兼容，Zettlr 代码不可引入）。

## 6. 参考

- 服务容器：`source/app/app-service-container.ts`
- Provider 契约：`source/app/service-providers/provider-contract.ts`
- 命令注册表：`source/app/service-providers/commands/index.ts`
- 窗口组织：`source/win-*`
