// 双轨技能逻辑轨（design/05 §9.2）：沙箱内执行，只能"提议"工具调用，由宿主裁决执行。
function run(input) {
  var text = typeof input === 'string' ? input : String((input && input.text) || '');
  var firstLine = text.split('\n')[0] || '';
  return {
    output: {
      openingLine: firstLine.slice(0, 60),
      hasConflict: /[？?！!]|但是|然而|突然|没想/.test(firstLine),
      advice: '首段需同时出现人物、处境与麻烦；缺一即重写。',
    },
    toolCalls: [],
  };
}
