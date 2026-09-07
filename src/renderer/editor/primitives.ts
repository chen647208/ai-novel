/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 写作原语 8 件套（06 篇 §2，全部 TipTap 扩展）：
 *   enterFlow / placeholder / darlings / ghostOutline /
 *   typography / spellOnDemand / tagDecorate / chapterRenumber
 *
 * 原则：PM transaction 唯一入口；不阻塞输入（Twine 宪法「给默认值」）；
 * 装饰类用 PM Decoration 不碰正文；结构类经 commands 走单一事务管线。
 * 节点类型（sceneBreak/placeholder/darlingSlot/ghostNote）由 schema.ts 定义，
 * 本文件只提供「行为」扩展，不重复定义节点。
 */

import { Extension, InputRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/** ---------- enterFlow：Enter=新段；×2=sceneBreak；×3=新章（回调给宿主弹默认名，不阻塞） ---------- */
export interface EnterFlowOptions {
  /** 连按 3 次 Enter 时回调（宿主创建新章并切换，默认名不阻塞继续输入）。 */
  onNewChapter?: () => void;
}
export const EnterFlow = Extension.create<EnterFlowOptions>({
  name: 'enterFlow',
  addOptions() {
    return {};
  },
  addKeyboardShortcuts() {
    return { Enter: () => this.editor.commands.handleEnterFlow() };
  },
  addCommands() {
    // 连按计数是扩展实例级闭包状态（每次装配编辑器即重置），与快捷键语义一致。
    let lastEnterAt = 0;
    let consecutive = 0;
    const reset = () => { consecutive = 0; };
    return {
      handleEnterFlow: () => ({ chain, state }) => {
        const now = Date.now();
        consecutive = now - lastEnterAt < 700 ? consecutive + 1 : 1;
        lastEnterAt = now;

        if (consecutive >= 3) {
          // ×3：新章——回调宿主，同时正常换行（不插入分隔线，避免连环）
          reset();
          this.options.onNewChapter?.();
          return chain().splitBlock().run();
        }
        if (consecutive === 2) {
          const { $from, empty } = state.selection;
          const node = empty && $from.parent.content.size === 0
            ? state.schema.nodes.sceneBreak?.create()
            : null;
          if (node) {
            // ×2：场景分隔——把当前空段整段替换为 sceneBreak 锚点（不 reset，让第三次 Enter 走到新章）
            const start = $from.before($from.depth);
            const end = $from.after($from.depth);
            return chain().command(({ tr, dispatch }) => {
              if (dispatch) {
                tr.delete(start, end);
                tr.insert(start, node);
              }
              return true;
            }).run();
          }
          // 非空段：退化为普通换行，不破坏正文
        }
        return chain().splitBlock().run();
      },
    };
  },
});

/** ---------- placeholder 扩展：⌘/Ctrl+Shift+X 插入 {占位符|kind} 行内原子 ---------- */
export const InsertPlaceholder = Extension.create({
  name: 'insertPlaceholder',
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-x': () => this.editor.commands.insertContent({
        type: 'placeholder', attrs: { name: '待填', kind: null },
      }),
    };
  },
});

/** ---------- darlings：选区收割为 darlingSlot 锚点（存回文档，可精确放回） ---------- */
export const Darlings = Extension.create({
  name: 'darlings',
  addCommands() {
    return {
      /** 选区文本移入 Darlings 面板，原位留 darlingSlot（原文留在 slot.attrs 里）。 */
      harvestDarling: (text?: string) => ({ chain, state }) => {
        const { from, to } = state.selection;
        if (from === to) return false;
        const slotType = state.schema.nodes.darlingSlot;
        if (!slotType) return false;
        const replaced = text || state.doc.textBetween(from, to, '\n');
        return chain().command(({ tr, dispatch }) => {
          if (!dispatch) return true;
          tr.replaceWith(from, to, slotType.create({ text: replaced }));
          dispatch(tr);
          return true;
        }).run();
      },
      /** 放回：darlingSlot 锚点还原为正文段落。 */
      restoreDarling: (pos: number) => ({ chain }) => {
        const node = this.editor.state.doc.nodeAt(pos);
        if (!node || node.type.name !== 'darlingSlot') return false;
        return chain().command(({ tr, dispatch }) => {
          if (!dispatch) return true;
          tr.insertText(String(node.attrs.text ?? ''), pos, pos + node.nodeSize);
          dispatch(tr);
          return true;
        }).run();
      },
    };
  },
});

/** ---------- ghostOutline：把章节 synopsis 铺为灰色 ghostNote；打字即覆盖（转普通段） ---------- */
export const GhostOutline = Extension.create({
  name: 'ghostOutline',
  addCommands() {
    return {
      /** 在当前选区插入一条灰色 ghostNote，承载场景概要。 */
      insertGhostOutline: (synopsis: string) => ({ chain }) => {
        const node = this.editor.schema.nodes.ghostNote?.create(
          { fromSynopsis: true },
          synopsis ? this.editor.schema.text(synopsis) : undefined,
        );
        if (!node) return false;
        return chain().insertContent(node).run();
      },
    };
  },
  addProseMirrorPlugins() {
    // 打字即覆盖：仅转换被本次输入事务实际改动到的 ghostNote(fromSynopsis)，
    // 不误伤同文档中其它未触碰的灰色大纲段。
    const key = new PluginKey('ghostOutlineOverwrite');
    return [
      new Plugin({
        key,
        appendTransaction(transactions, _oldState, newState) {
          const para = newState.schema.nodes.paragraph;
          if (!para) return null;
          // 收集本批输入事务在新文档中触及的区间
          const touched: Array<[number, number]> = [];
          for (const tr of transactions) {
            if (!(tr.docChanged && tr.getMeta('uiEvent') === 'input')) continue;
            tr.steps.forEach((_step, i) => {
              const map = tr.mapping.maps[i];
              map?.forEach((_f, _t, nFrom, nTo) => { touched.push([nFrom, nTo]); });
            });
          }
          if (touched.length === 0) return null;
          let modified = false;
          const out = newState.tr;
          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'ghostNote' || !node.attrs.fromSynopsis || node.childCount === 0) return;
            const start = pos;
            const end = pos + node.nodeSize;
            if (touched.some(([a, b]) => a < end && b > start)) {
              out.setNodeMarkup(pos, para, {});
              modified = true;
            }
          });
          return modified ? out : null;
        },
      }),
    ];
  },
});

/** ---------- typography：em dash/弯引号/省略号输入规则（编辑器态，不落 DSL） ---------- */
export const NovelTypography = Extension.create({
  name: 'novelTypography',
  addInputRules() {
    return [
      // --- → ——（em dash）
      new InputRule({
        find: /---$/,
        handler: ({ chain }) => { chain().insertContent('——').run(); },
      }),
      // ... → ……
      new InputRule({
        find: /\.\.\.$/,
        handler: ({ chain }) => { chain().insertContent('……').run(); },
      }),
      // " → “（直引号转左弯引号）
      new InputRule({
        find: /"$/,
        handler: ({ chain }) => { chain().insertContent('“').run(); },
      }),
    ];
  },
});

/** ---------- spellOnDemand：拼写检查仅主动调用（默认关闭原生红波浪线） ---------- */
export const SpellOnDemand = Extension.create({
  name: 'spellOnDemand',
  addOptions() {
    return { spellcheck: false };
  },
  onBeforeCreate() {
    this.editor.setOptions({ editorProps: { attributes: { spellcheck: String(this.options.spellcheck) } } });
  },
  addCommands() {
    return {
      /** 主动开启/关闭（宿主菜单入口调用）。创建后直接改 DOM 属性，setOptions 不会重刷已建视图。 */
      setSpellcheck: (enabled: boolean) => () => {
        this.options.spellcheck = enabled;
        this.editor.view.dom.setAttribute('spellcheck', String(enabled));
        return true;
      },
    };
  },
});

/** ---------- tagDecorate：@tag 高亮装饰（软引用，不碰正文） ---------- */
export const TAG_DECORATE_KEY = new PluginKey('tagDecorate');
const TAG_PATTERN = /@([\p{L}\p{N}_-]{2,})/gu;
export const TagDecorate = Extension.create({
  name: 'tagDecorate',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: TAG_DECORATE_KEY,
        props: {
          decorations(state) {
            const decos: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              for (const m of node.text.matchAll(TAG_PATTERN)) {
                const start = pos + (m.index ?? 0);
                decos.push(Decoration.inline(start, start + m[0].length, {
                  class: 'novel-tag-ref', 'data-tag-ref': m[1] ?? '',
                }));
              }
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});

/** ---------- chapterRenumber：章节拖拽后标题序号重写（宿主传入新序列） ---------- */
export interface RenumberItem { id: string; index: number; title: string }
export const ChapterRenumber = Extension.create({
  name: 'chapterRenumber',
  addOptions() {
    return { renumber: (_items: RenumberItem[]) => undefined as void };
  },
  addCommands() {
    return {
      /** 把 {第N章:} 前缀重写为拖拽后的新序号；无前缀的标题不动。经回调交还宿主落库。 */
      renumberChapters: (items: RenumberItem[]) => () => {
        const re = /^(第)(\d+)(章[:：]?)/;
        this.options.renumber(items.map(it => ({
          ...it,
          title: re.test(it.title) ? it.title.replace(re, `$1${it.index + 1}$3`) : it.title,
        })));
        return true;
      },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    darlings: {
      harvestDarling: (text?: string) => ReturnType;
      restoreDarling: (pos: number) => ReturnType;
    };
    ghostOutline: {
      insertGhostOutline: (synopsis: string) => ReturnType;
    };
    enterFlow: {
      handleEnterFlow: () => ReturnType;
    };
    spellOnDemand: {
      setSpellcheck: (enabled: boolean) => ReturnType;
    };
    chapterRenumber: {
      renumberChapters: (items: RenumberItem[]) => ReturnType;
    };
  }
}

/**
 * 装配全部写作原语扩展（06 篇 §2 八件套）。
 * enterFlow/chapterRenumber 需要宿主回调，经参数注入；其余无状态可直接复用。
 */
export interface WritingPrimitivesOptions {
  onNewChapter?: () => void;
  renumber?: (items: RenumberItem[]) => void;
}
export function createWritingPrimitives(options: WritingPrimitivesOptions = {}): Extension[] {
  return [
    EnterFlow.configure({ onNewChapter: options.onNewChapter }),
    InsertPlaceholder,
    Darlings,
    GhostOutline,
    NovelTypography,
    SpellOnDemand,
    TagDecorate,
    ChapterRenumber.configure({ renumber: options.renumber ?? (() => { /* 宿主未接线时静默 */ }) }),
  ];
}
