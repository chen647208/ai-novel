/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * codemod 第二遍：处理动态模板串里“分支为静态 FA 类名”的常见形态。
 * 数据驱动（${x.icon}）的站点仍会报告，需人工把数据源改为组件引用。
 * 用法：node scripts/codemod-icons2.mjs [--dry]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const MAP = {
  'chevron-up': 'ChevronUp', 'chevron-down': 'ChevronDown', 'chevron-right': 'ChevronRight',
  'chevron-left': 'ChevronLeft', 'angle-double-left': 'ChevronsLeft', 'angle-double-right': 'ChevronsRight',
  'skull-crossbones': 'Skull', 'trash-can': 'Trash2', 'exclamation-circle': 'AlertCircle',
  'info-circle': 'Info', 'check-circle': 'CheckCircle2', 'times-circle': 'XCircle',
  'spinner': 'Loader2', 'sync-alt': 'RefreshCw', 'wand-magic-sparkles': 'WandSparkles',
  'thumbtack': 'Pin', 'lock': 'Lock', 'lock-open': 'LockOpen', 'expand-alt': 'Maximize2',
  'minus': 'Minus', 'play': 'Play', 'pause': 'Pause', 'book-open': 'BookOpen',
  'paperclip': 'Paperclip', 'code': 'Code', 'file-alt': 'FileText', 'book': 'BookOpen',
  'trash': 'Trash2', 'save': 'Save', 'times': 'X', 'check': 'Check', 'plus': 'Plus',
  'search': 'Search', 'edit': 'PenLine', 'copy': 'Copy', 'download': 'Download',
  'upload': 'Upload', 'eye': 'Eye', 'star': 'Star', 'heart': 'Heart', 'globe': 'Globe',
  'users': 'Users', 'lightbulb': 'Lightbulb', 'robot': 'Bot', 'magic': 'WandSparkles',
  'list': 'List', 'sitemap': 'ListTree', 'brain': 'Brain', 'crown': 'Crown',
  'flag-checkered': 'Flag', 'history': 'History', 'redo': 'Redo2', 'undo': 'Undo2',
  'rotate-left': 'RotateCcw', 'eraser': 'Eraser', 'microchip': 'Cpu', 'plug': 'Plug',
  'feather-alt': 'Feather', 'stream': 'LayoutList', 'database': 'Database',
  'exclamation-triangle': 'AlertTriangle', 'triangle-exclamation': 'AlertTriangle',
  'stop': 'Square', 'stop-circle': 'CircleStop', 'external-link-alt': 'ExternalLink',
  'comments': 'MessagesSquare', 'user': 'User', 'key': 'Key', 'shield-alt': 'Shield',
  'calendar': 'Calendar', 'calendar-alt': 'CalendarDays', 'clock': 'Clock',
  'tag': 'Tag', 'flag': 'Flag', 'folder-open': 'FolderOpen', 'cog': 'Settings',
  'sliders-h': 'SlidersHorizontal', 'graduation-cap': 'GraduationCap', 'rocket': 'Rocket',
  'seedling': 'Sprout', 'mountain': 'Mountain', 'landmark': 'Landmark', 'vial': 'FlaskConical',
  'server': 'Server', 'cloud': 'Cloud', 'camera': 'Camera', 'keyboard': 'Keyboard',
  'calculator': 'Calculator', 'paper-plane': 'Send', 'pen': 'Pen', 'pen-nib': 'PenTool',
  'pen-to-square': 'SquarePen', 'id-card': 'IdCard', 'user-group': 'Users',
  'user-friends': 'Users', 'user-tag': 'UserRound', 'project-diagram': 'Network',
  'layer-group': 'Layers', 'chart-bar': 'BarChart3', 'chart-line': 'LineChart',
  'map-marker-alt': 'MapPin', 'map-marked-alt': 'MapPinned', 'globe-asia': 'Globe2',
  'book-medical': 'BookHeart', 'book-atlas': 'BookOpenText', 'book-open-reader': 'BookOpenText',
  'book-download': 'BookDown', 'book-upload': 'BookUp', 'file-export': 'FileOutput',
  'ellipsis-h': 'MoreHorizontal', 'exchange-alt': 'ArrowLeftRight', 'ban': 'Ban',
  'forward-step': 'FastForward', 'stethoscope': 'Stethoscope', 'skull': 'Skull',
  'home': 'Home', 'scroll': 'ScrollText', 'wand-sparkles': 'Wand2', 'reply': 'Reply',
  'check-double': 'CheckCheck', 'circle-notch': 'LoaderCircle', 'cloud-upload-alt': 'CloudUpload',
  'cogs': 'Settings2', 'calendar-times': 'CalendarX2', 'feather': 'Feather',
  'expand': 'Maximize2', 'compress': 'Minimize2', 'compress-alt': 'Minimize2',
};

const SIZE = {
  'text-[8px]': 'size-2', 'text-[9px]': 'size-2.5', 'text-[10px]': 'size-3', 'text-xs': 'size-3.5',
  'text-sm': 'size-4', 'text-base': 'size-4', 'text-lg': 'size-5', 'text-xl': 'size-6',
  'text-2xl': 'size-6', 'text-3xl': 'size-8', 'text-4xl': 'size-10', 'text-5xl': 'size-12',
};

/** 从类串提取 size 与其余类；'fa-spin'→animate-spin，'fa-rotate-90'→rotate-90 */
function parseClasses(rest) {
  let tokens = rest.trim().split(/\s+/).filter(Boolean).map(t =>
    t === 'fa-spin' ? 'animate-spin' : t === 'fa-rotate-90' ? 'rotate-90' : t
  );
  let size = 'size-4';
  const kept = [];
  for (const t of tokens) {
    if (SIZE[t]) { size = SIZE[t]; continue; }
    kept.push(t);
  }
  return { size, rest: kept.join(' ') };
}

/** 分支字符串（如 "fa-lock" 或 "fa-thumbtack fa-rotate-90" 或 "fa-check-circle text-emerald-500"）→ {comp, extra} */
function branchToIcon(branch) {
  const tokens = branch.trim().split(/\s+/);
  const first = tokens[0];
  if (!first || !first.startsWith('fa-')) return null;
  const name = first.slice(3);
  if (!MAP[name]) return null;
  return { comp: MAP[name], extra: tokens.slice(1).join(' ') };
}

const files = execSync('git ls-files "src/renderer/**/*.tsx"', { encoding: 'utf8' }).split('\n').filter(Boolean);
const DRY = process.argv.includes('--dry');
const remaining = [];
let replaced = 0;

for (const file of files) {
  let original = readFileSync(file, 'utf8');
  if (!original.includes('`fas ')) continue;
  const used = new Set();

  // 形态 A：`fas fa-chevron-${COND ? 'up' : 'down'} REST`（含 down/right、up/down 变体）
  original = original.replace(
    /<i className=\{`fas fa-chevron-\$\{([^}]+?) \? '(\w+)' : '(\w+)'\}(.*?)`\}><\/i>/g,
    (m, cond, a, b, rest) => {
      const ca = `chevron-${a}`, cb = `chevron-${b}`;
      if (!MAP[ca] || !MAP[cb]) return m;
      const { size, rest: r } = parseClasses(rest);
      const cls = r ? `${size} ${r}` : size;
      used.add(MAP[ca]); used.add(MAP[cb]); replaced++;
      return `{${cond.trim()} ? <${MAP[ca]} className="${cls}" /> : <${MAP[cb]} className="${cls}" />}`;
    }
  );

  // 形态 B（泛化）：`fas [前缀类] ${COND ? '分支串' : '分支串'} [后缀类]`
  original = original.replace(
    /<i className=\{`fas ([^`$]*?)\$\{([^}]+?) \? '([^']+)' : '([^']+)'\}([^`]*)`\}><\/i>/g,
    (m, lead, cond, a, b, trail) => {
      const ia = branchToIcon(a), ib = branchToIcon(b);
      if (!ia || !ib) return m;
      const restAll = `${lead} ${trail}`.trim();
      const mk = (i) => {
        const { size, rest: r2 } = parseClasses(`${i.extra} ${restAll}`);
        const cls = r2 ? `${size} ${r2}` : size;
        return `<${i.comp} className="${cls}" />`;
      };
      used.add(ia.comp); used.add(ib.comp); replaced++;
      return `{${cond.trim()} ? ${mk(ia)} : ${mk(ib)}}`;
    }
  );

  // 形态 C：`fas fa-X ${COND ? 'cls' : 'cls2'} REST`（静态图标 + 动态颜色类）
  original = original.replace(
    /<i className=\{`fas fa-([a-z0-9-]+) \$\{([^`]+?)\}(.*?)`\}><\/i>/g,
    (m, name, dyn, rest) => {
      if (!MAP[name]) return m;
      const { size, rest: r } = parseClasses(rest);
      used.add(MAP[name]); replaced++;
      return `<${MAP[name]} className={\`${size}${r ? ' ' + r : ''} \${${dyn}}\`} />`;
    }
  );

  // 形态 C2：`fas fa-X [静态类] ${动态类}`（尾部动态，如 rotate-90 切换）
  original = original.replace(
    /<i className=\{`fas fa-([a-z0-9-]+) ([^`$]*?)\$\{([^`]+?)\}`\}><\/i>/g,
    (m, name, rest, dyn) => {
      if (!MAP[name]) return m;
      const { size, rest: r } = parseClasses(rest);
      used.add(MAP[name]); replaced++;
      return `<${MAP[name]} className={\`${size}${r ? ' ' + r : ''} \${${dyn}}\`} />`;
    }
  );

  if (used.size > 0) {
    const importLine = `import { ${[...used].sort().join(', ')} } from 'lucide-react';\n`;
    const importRe = /^(import[^\n]*\n)+/m;
    const match = original.match(importRe);
    if (match) {
      const end = (match.index ?? 0) + match[0].length;
      original = original.slice(0, end) + importLine + original.slice(end);
    }
    if (!DRY) writeFileSync(file, original);
  }

  for (const line of original.split('\n')) {
    if (/`fas |fas fa-/.test(line)) remaining.push(`${file}: ${line.trim().slice(0, 110)}`);
  }
}

console.log(`第二遍替换 ${replaced} 处${DRY ? '（dry-run）' : ''}`);
if (remaining.length) {
  console.log('\n仍需人工:');
  for (const s of remaining) console.log('  ' + s);
}
