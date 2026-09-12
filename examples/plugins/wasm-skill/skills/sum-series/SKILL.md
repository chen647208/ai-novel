---
name: sum-series
description: 计算 1..9 之和的 WASM 示例技能。触发词：wasm 示例、求和
tools: []
---
# WASM 求和示例

`handler.wasm` 在隔离沙箱内运行（无导入、纯计算），`run()` 返回 1+2+…+9 = 45。

- 源码：`handler.wat`（WAT 文本格式）
- 编译：`npm run wasm:build`（用 wabt 编译为同级 `handler.wasm`）
- 能力：模块不导入任何宿主函数，故无任何宿主能力；死循环由外层进程超时兜底。
