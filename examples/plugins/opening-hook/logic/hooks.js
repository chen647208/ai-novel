// 插件逻辑贡献（design/22 §3）：导出具名函数，调用时才进沙箱。
function injectOpeningRules() {
  return '开篇规则：首段必须出现人物、处境与麻烦；三章内立金手指并留下期待。';
}

function summarize(input) {
  var text = typeof input === 'string' ? input : JSON.stringify(input);
  return text.slice(0, 40);
}
