// 双轨技能逻辑轨（可选）：与 SKILL.md 同目录放置即为该技能的逻辑处理。
// 约定：function run(input) 返回值作为输出，可返回 { output, toolCalls }。
function run(input) {
  return { output: input, toolCalls: [] };
}
