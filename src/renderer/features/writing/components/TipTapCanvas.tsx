/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EditorContent, useEditor } from '@tiptap/react';
import { createNovelExtensions } from '../../../editor/schema';
import { dslToPmDoc, pmDocToDsl, type PmNode } from '../../../editor/serialization';
import type { NovelEditorHandle } from '../types';
import { cn } from '@/shared/utils/cn';

interface TipTapCanvasProps {
  content: string;
  activeChapterId: string | null;
  isFocusMode: boolean;
  /** 生成中且非流式时锁定编辑；流式期间以只读方式回显增量。 */
  isGenerating: boolean;
  isStreaming: boolean;
  onContentChange: (content: string) => void;
  onMouseUp: (event: React.MouseEvent<HTMLDivElement>) => void;
  onKeyUp: () => void;
  onMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * 小说 DSL 富文本画布：把受控的 DSL 字符串与 ProseMirror 文档双向同步，
 * 并通过 NovelEditorHandle 向编排层暴露 PM 语义的选区与坐标。
 */
const TipTapCanvas = forwardRef<NovelEditorHandle, TipTapCanvasProps>(function TipTapCanvas(
  { content, activeChapterId, isFocusMode, isGenerating, isStreaming, onContentChange, onMouseUp, onKeyUp, onMouseMove },
  ref,
) {
  const { t } = useTranslation('writing');
  // 回调经 ref 传递，避免每次渲染重建编辑器实例。
  const onChangeRef = useRef(onContentChange);
  onChangeRef.current = onContentChange;
  // 记录最近一次由本编辑器吐出的 DSL，用于区分「外部受控更新」与「自身回环」。
  const lastEmitted = useRef<string>(content);
  const [isEmpty, setIsEmpty] = useState(() => content.trim().length === 0);

  const extensions = useMemo(() => createNovelExtensions(), []);

  const editor = useEditor({
    extensions,
    content: dslToPmDoc(content),
    editable: !!activeChapterId && !(isGenerating && !isStreaming),
    onUpdate: ({ editor: e }) => {
      const dsl = pmDocToDsl(e.getJSON() as PmNode);
      lastEmitted.current = dsl;
      setIsEmpty(dsl.trim().length === 0);
      onChangeRef.current(dsl);
    },
  });

  // 受控同步：外部 content 变化（切章、流式增量、AI 回写）时刷新文档，
  // 但跳过自身 onUpdate 刚吐出的值，防止光标跳动与回环。
  useEffect(() => {
    if (!editor) return;
    if (content === lastEmitted.current) return;
    lastEmitted.current = content;
    setIsEmpty(content.trim().length === 0);
    editor.commands.setContent(dslToPmDoc(content), false);
  }, [content, editor]);

  // 可编辑态：无章节或生成中（非流式）时锁定。
  useEffect(() => {
    if (!editor) return;
    const editable = !!activeChapterId && !(isGenerating && !isStreaming);
    if (editor.isEditable !== editable) editor.setEditable(editable);
  }, [editor, activeChapterId, isGenerating, isStreaming]);

  useImperativeHandle(
    ref,
    () => ({
      getSelection() {
        if (!editor) return null;
        const { from, to, empty } = editor.state.selection;
        if (empty || from === to) return null;
        const text = editor.state.doc.textBetween(from, to, '\n');
        if (!text.trim()) return null;
        return { text, range: { start: from, end: to } };
      },
      getKeyboardSelectionMenuPosition() {
        if (!editor) return null;
        const { from, to, empty } = editor.state.selection;
        if (empty || from === to) return null;
        const coords = editor.view.coordsAtPos(to);
        return { x: coords.left, y: coords.bottom };
      },
      focus() {
        editor?.commands.focus();
      },
    }),
    [editor],
  );

  if (!editor) return null;

  return (
    <div
      className={cn(
        'relative h-full w-full min-h-[1200px] rounded-lg border border-border bg-card p-16 font-serif text-lg leading-relaxed text-foreground shadow-sm',
        'selection:bg-primary/15',
        isFocusMode ? 'max-w-3xl text-xl leading-loose' : 'max-w-4xl',
      )}
      onMouseUp={onMouseUp}
      onKeyUp={onKeyUp}
      onMouseMove={onMouseMove}
    >
      {isEmpty && activeChapterId ? (
        <div className="pointer-events-none absolute inset-0 p-16 text-muted-foreground/50">
          {t('canvas.placeholderReady')}
        </div>
      ) : null}
      <EditorContent
        editor={editor}
        className={cn(
          'novel-canvas min-h-full outline-none',
          !activeChapterId || (isGenerating && !isStreaming) ? 'cursor-not-allowed opacity-60' : 'cursor-text',
        )}
      />
    </div>
  );
});

export default TipTapCanvas;
