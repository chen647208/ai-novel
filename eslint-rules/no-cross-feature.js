/**
 * 本地 ESLint 规则：禁止跨 feature 直接 import（design/02 §2）。
 * 与 no-restricted-imports 的差别：本规则把相对路径与 @/features 别名都解析成
 * 绝对路径后再判断，因此能识破 `../../other-feature/...` 这类绕过写法的 import。
 * 存量债务通过配置项 allow（形如 "assistant->cards"）冻结，只拦新增边。
 */

import path from 'node:path';

const FEATURE_SEGMENT = '/src/renderer/features/';

function normalize(p) {
  return p.replace(/\\/g, '/');
}

function featureOf(absPath) {
  const norm = normalize(absPath);
  const idx = norm.indexOf(FEATURE_SEGMENT);
  if (idx === -1) return null;
  const name = norm.slice(idx + FEATURE_SEGMENT.length).split('/')[0];
  return name || null;
}

function resolveTarget(spec, absFilename, rendererRoot) {
  if (spec.startsWith('@/')) {
    return path.posix.normalize(`${rendererRoot}/${spec.slice(2)}`);
  }
  if (spec.startsWith('.')) {
    const norm = normalize(absFilename);
    const dir = norm.slice(0, norm.lastIndexOf('/'));
    return path.posix.normalize(`${dir}/${spec}`);
  }
  return null;
}

const rule = {
  meta: {
    type: 'problem',
    docs: { description: '禁止跨 feature 直接 import（走 core 契约或事件总线）' },
    schema: [
      {
        type: 'object',
        properties: { allow: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: {
      crossFeature:
        '"{{source}}" 跨 feature 直接 import "{{target}}" 的实现。请走 core 契约或事件总线；新增边不允许（存量边见 allow 清单）。',
    },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const allow = new Set(options.allow ?? []);
    const filename = context.filename ?? context.getFilename();
    const source = featureOf(filename);
    if (!source) return {};
    const rendererRootIdx = normalize(filename).indexOf(FEATURE_SEGMENT);
    const rendererRoot = normalize(filename).slice(0, rendererRootIdx) + '/src/renderer';

    function check(node) {
      const spec = node.source?.value;
      if (typeof spec !== 'string') return;
      const target = resolveTarget(spec, filename, rendererRoot);
      if (!target) return;
      const targetFeature = featureOf(target);
      if (!targetFeature || targetFeature === source) return;
      if (allow.has(`${source}->${targetFeature}`)) return;
      context.report({ node, messageId: 'crossFeature', data: { source, target: targetFeature } });
    }

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    };
  },
};

export default {
  rules: {
    'no-cross-feature': rule,
  },
};
