/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 编辑器文献编解码器：DSL ↔ ProseMirror ↔ Y.XmlFragment（y-prosemirror）。 */
import { getSchema } from '@tiptap/core';
import { Node as PMNode } from '@tiptap/pm/model';
import { prosemirrorToYXmlFragment, yXmlFragmentToProseMirrorRootNode } from 'y-prosemirror';

import { createNovelExtensions } from '../../editor/schema';
import { dslToPmDoc, pmDocToDsl, type PmNode as DslPmNode } from '../../editor/serialization';
import type { ChapterContentCodec } from './projectDoc';

/** 与 TipTapCanvas 共用的 schema。 */
export const editorSchema = getSchema(createNovelExtensions());

export const editorContentCodec: ChapterContentCodec = {
  toFragment: (dsl, fragment) => {
    const node = PMNode.fromJSON(editorSchema, dslToPmDoc(dsl));
    prosemirrorToYXmlFragment(node, fragment);
  },
  toDsl: (fragment) => {
    try {
      const node = yXmlFragmentToProseMirrorRootNode(fragment, editorSchema);
      return pmDocToDsl(node.toJSON() as DslPmNode);
    } catch {
      return '';
    }
  },
};
