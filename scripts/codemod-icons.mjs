/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 一次性 codemod：Font Awesome <i> 标签 → lucide-react 组件。
 *
 * 处理静态用法 `<i className="fas fa-xxx [text-Nxl] [mr-2 ...]"></i>`：
 *   - fa-xxx 按映射表换成 lucide 组件名；
 *   - 字号类 text-* 换算为 lucide 的 size-*；fa-spin 换 animate-spin；
 *   - 其余类（颜色/间距）原样保留（lucide 用 currentColor，text-颜色 依然生效）；
 *   - 每个文件自动补 `import { ... } from 'lucide-react'`。
 * 动态模板串（`fas ${x}`）不处理，只报告，由人工按站点改造数据源。
 *
 * 用法：node scripts/codemod-icons.mjs [--dry]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const MAP = {
  'angle-double-left': 'ChevronsLeft',
  'angle-double-right': 'ChevronsRight',
  'arrow-down': 'ArrowDown',
  'arrow-left': 'ArrowLeft',
  'arrow-right': 'ArrowRight',
  'arrow-up': 'ArrowUp',
  ban: 'Ban',
  book: 'BookOpen',
  'book-atlas': 'BookOpenText',
  'book-download': 'BookDown',
  'book-medical': 'BookHeart',
  'book-open': 'BookOpen',
  'book-open-reader': 'BookOpenText',
  'book-upload': 'BookUp',
  brain: 'Brain',
  calculator: 'Calculator',
  calendar: 'Calendar',
  'calendar-alt': 'CalendarDays',
  'calendar-times': 'CalendarX2',
  camera: 'Camera',
  'chart-bar': 'BarChart3',
  'chart-line': 'LineChart',
  check: 'Check',
  'check-circle': 'CheckCircle2',
  'check-double': 'CheckCheck',
  'chevron-down': 'ChevronDown',
  'chevron-left': 'ChevronLeft',
  'chevron-right': 'ChevronRight',
  'chevron-up': 'ChevronUp',
  'circle-notch': 'LoaderCircle',
  clock: 'Clock',
  cloud: 'Cloud',
  'cloud-upload-alt': 'CloudUpload',
  cog: 'Settings',
  cogs: 'Settings2',
  comments: 'MessagesSquare',
  copy: 'Copy',
  crown: 'Crown',
  database: 'Database',
  download: 'Download',
  edit: 'PenLine',
  'ellipsis-h': 'MoreHorizontal',
  eraser: 'Eraser',
  'exchange-alt': 'ArrowLeftRight',
  'exclamation-circle': 'AlertCircle',
  'exclamation-triangle': 'AlertTriangle',
  'external-link-alt': 'ExternalLink',
  eye: 'Eye',
  'eye-slash': 'EyeOff',
  feather: 'Feather',
  'feather-alt': 'Feather',
  'file-alt': 'FileText',
  'file-export': 'FileOutput',
  'file-import': 'FileInput',
  flag: 'Flag',
  'flag-checkered': 'Flag',
  'folder-open': 'FolderOpen',
  'forward-step': 'FastForward',
  globe: 'Globe',
  'globe-asia': 'Globe2',
  'graduation-cap': 'GraduationCap',
  heart: 'Heart',
  history: 'History',
  home: 'Home',
  'id-card': 'IdCard',
  'info-circle': 'Info',
  key: 'Key',
  keyboard: 'Keyboard',
  landmark: 'Landmark',
  'layer-group': 'Layers',
  lightbulb: 'Lightbulb',
  list: 'List',
  'list-ol': 'ListOrdered',
  lock: 'Lock',
  'lock-open': 'LockOpen',
  magic: 'WandSparkles',
  'map-marked-alt': 'MapPinned',
  'map-marker-alt': 'MapPin',
  microchip: 'Cpu',
  minus: 'Minus',
  mountain: 'Mountain',
  'paper-plane': 'Send',
  paperclip: 'Paperclip',
  pen: 'Pen',
  'pen-nib': 'PenTool',
  'pen-to-square': 'SquarePen',
  plug: 'Plug',
  plus: 'Plus',
  'plus-circle': 'PlusCircle',
  'project-diagram': 'Network',
  redo: 'Redo2',
  reply: 'Reply',
  robot: 'Bot',
  rocket: 'Rocket',
  'rotate-left': 'RotateCcw',
  save: 'Save',
  scroll: 'ScrollText',
  search: 'Search',
  seedling: 'Sprout',
  server: 'Server',
  'share-nodes': 'Share2',
  'shield-alt': 'Shield',
  sitemap: 'ListTree',
  skull: 'Skull',
  'skull-crossbones': 'Skull',
  'sliders-h': 'SlidersHorizontal',
  spinner: 'Loader2',
  star: 'Star',
  stethoscope: 'Stethoscope',
  stop: 'Square',
  'stop-circle': 'CircleStop',
  stream: 'LayoutList',
  'sync-alt': 'RefreshCw',
  tag: 'Tag',
  times: 'X',
  'times-circle': 'XCircle',
  trash: 'Trash',
  'trash-alt': 'Trash2',
  'trash-can': 'Trash2',
  'triangle-exclamation': 'AlertTriangle',
  undo: 'Undo2',
  upload: 'Upload',
  user: 'User',
  'user-friends': 'Users',
  'user-group': 'Users',
  'user-tag': 'UserRound',
  users: 'Users',
  vial: 'FlaskConical',
  'wand-magic-sparkles': 'WandSparkles',
  'wand-sparkles': 'Wand2',
  thumbtack: 'Pin',
  'expand-alt': 'Maximize2',
  compress: 'Minimize2',
  'window-close': 'X',
  'xmark': 'X',
};

/** FA 字号类 → lucide size 类 */
const SIZE = {
  'text-[8px]': 'size-2',
  'text-[10px]': 'size-3',
  'text-xs': 'size-3.5',
  'text-sm': 'size-4',
  'text-base': 'size-4',
  'text-lg': 'size-5',
  'text-xl': 'size-6',
  'text-2xl': 'size-6',
  'text-3xl': 'size-8',
  'text-4xl': 'size-10',
  'text-5xl': 'size-12',
};

const files = execSync('git ls-files "src/renderer/**/*.tsx"', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const DRY = process.argv.includes('--dry');
const unmapped = new Map();
const dynamicSites = [];
let totalReplaced = 0;
let filesChanged = 0;

for (const file of files) {
  const original = readFileSync(file, 'utf8');
  if (!original.includes('fa-')) continue;

  const used = new Set();
  let out = original.replace(
    /<i\s+className="fas\s+(fa-[a-z0-9-]+)((?:\s+[^"]*)?)"\s*><\/i>/g,
    (m, faClass, rest) => {
      const name = faClass.slice(3);
      const comp = MAP[name];
      if (!comp) {
        unmapped.set(faClass, (unmapped.get(faClass) || 0) + 1);
        return m;
      }
      let classes = rest.trim();
      classes = classes.replace(/\bfa-spin\b/, 'animate-spin');
      let sizeClass = 'size-4';
      for (const [fa, lu] of Object.entries(SIZE)) {
        if (classes.includes(fa)) {
          sizeClass = lu;
          classes = classes.replace(fa, '').replace(/\s+/g, ' ').trim();
          break;
        }
      }
      used.add(comp);
      totalReplaced++;
      const cls = classes ? `${sizeClass} ${classes}` : sizeClass;
      return `<${comp} className="${cls}" />`;
    }
  );

  // 报告动态模板串站点
  for (const line of out.split('\n')) {
    if (/className=\{`fas/.test(line)) dynamicSites.push(`${file}: ${line.trim().slice(0, 100)}`);
  }

  if (used.size > 0) {
    const importLine = `import { ${[...used].sort().join(', ')} } from 'lucide-react';\n`;
    // 插到最后一个 import 之后
    const importRe = /^(import[^\n]*\n)+/m;
    const match = out.match(importRe);
    if (match) {
      const end = (match.index ?? 0) + match[0].length;
      out = out.slice(0, end) + importLine + out.slice(end);
    } else {
      out = importLine + out;
    }
    filesChanged++;
    if (!DRY) writeFileSync(file, out);
  }
}

console.log(`替换 ${totalReplaced} 处静态图标，涉及 ${filesChanged} 个文件${DRY ? '（dry-run）' : ''}`);
if (unmapped.size) {
  console.log('\n未映射的 FA 类:');
  for (const [k, v] of [...unmapped].sort()) console.log(`  ${k} ×${v}`);
}
if (dynamicSites.length) {
  console.log('\n动态模板串站点（需人工）:');
  for (const s of dynamicSites) console.log('  ' + s);
}
