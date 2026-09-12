// 插件逻辑贡献：导出具名函数，经宿主 `runPluginLogic` 或 hooks 的 do:'logic' 调用。
// 只能返回数据或建议的工具调用；沙箱默认拒绝一切宿主能力。
function example(input) {
  return { received: input };
}
