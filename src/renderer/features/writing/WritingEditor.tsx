/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { logger } from '@/shared/utils/logger';
import { STORAGE_KEYS } from '@shared/constants/storageKeys';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { templateDisplayName } from '@/i18n';
import { dialogService } from '@/shared/services/dialogService';
import { type AIHistoryRecord, type Chapter, type ModelConfig, type Project, type PromptTemplate, type StreamingAIResponse } from '../../../shared/types';
import { AIService } from '@/shared/services/ai/aiService';
import WritingEditorToolbar from './components/WritingEditorToolbar';
import WritingSidebar from './components/WritingSidebar';
import WritingEditorOverlayLayer from './components/WritingEditorOverlayLayer';
import FindBar from './components/FindBar';
import { eventToKeybinding, resolveKeybindings } from '../settings/services/keybindings';
import WritingEditorCanvas from './components/WritingEditorCanvas';
import ForeshadowPanel from '../foreshadowing/components/ForeshadowPanel';
import { extractChapterSummary } from './services/summaryExtractionService';
import { appendSnapshot, createSnapshot } from './services/chapterSnapshotService';
import { useChapterSnapshots } from './hooks/useChapterSnapshots';
import { computeBookStats, computeChapterStats } from './services/writingStatsService';
import { buildForeshadowContextForPrompt, openForeshadows, overdueForeshadows } from '../foreshadowing/services/foreshadowService';
import {
  BATCH_CHAPTER_INTERVAL_MS,
  DEFAULT_BATCH_MODE,
  DEFAULT_OUTPUT_MODE,
  DEFAULT_TARGET_WORD_COUNT,
  INITIAL_BATCH_PROGRESS,
  INITIAL_GENERATION_MODAL_STATE,
  INITIAL_TOKEN_USAGE,
  SELECTION_MENU_DEBOUNCE_MS,
  WRITING_OUTPUT_FORMAT_DIRECTIVE,
} from './constants';
import type {
  BatchMode,
  BatchProgress,
  GenerationModalState,
  MenuPosition,
  NovelEditorHandle,
  TextSelectionRange,
  TokenUsage,
  WritingEditorProps,
} from './types';
import {
  buildExportContent,
  buildExportFilename,
  buildExportPackage,
  savePackageFile,
  debounce,
  getChapterContext,
  getPreviousChapterSummaryIds,
  getFloatingMenuPosition,
  saveExportFile,
  toggleSetValue,
  type ExportFormat,
} from './utils';
import { applySelectionReplacement } from '../../editor/commands';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { roleLabel } from '@/shared/utils/displayLabels';
import { useProjectStore, type CommitOptions } from '@/app/stores/projectStore';
import { PROMPT_KNOWLEDGE_TRUNCATE, isVirtualChapter } from '../../../shared/constants/chapters';
import { useSettingsStore, useUsableModel } from '@/app/stores/settingsStore';
import { isModelUsable } from '@/shared/utils/modelReadiness';
import { uuidv7 } from '@core/entities';

const WritingEditor: React.FC<WritingEditorProps> = ({ project, initialChapterId, onBack, onNavigateToCharacters, onOpenSettings }) => {
  const { t } = useTranslation(['writing', 'steps']);
  // 直读 store：模型/提示词/更新动作不再经 App→View 层层透传
  const prompts = useSettingsStore((s) => s.prompts);
  // 手写 bypass 下可能为 undefined，未填凭证的默认模型也不可用：AI 入口各自守卫，调用前收窄
  const activeModel = useUsableModel();
  const updateActiveProject = useProjectStore((s) => s.updateActiveProject);
  const onUpdate = useCallback(
    (updates: Partial<Project>, opts?: CommitOptions) => updateActiveProject(updates, opts),
    [updateActiveProject],
  );

  // AI 落笔归因：模板回写正文时标注 agentId + 模板 cause，手写路径不经此函数
  const commitAIChapters = (chapters: Chapter[], template: PromptTemplate) =>
    onUpdate({ chapters }, {
      agentId: template.category === 'edit' ? 'ai:edit' : 'ai:writing',
      cause: template.id,
    });
  const [activeChapterId, setActiveChapterId] = useState<string | null>(initialChapterId || null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [saveDirty, setSaveDirty] = useState(false);
  const [typewriter, setTypewriter] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.editorTypewriter) === '1';
    } catch {
      return false;
    }
  });
  const toggleTypewriter = () => {
    setTypewriter((v) => {
      try {
        localStorage.setItem(STORAGE_KEYS.editorTypewriter, v ? '0' : '1');
      } catch {
        // 忽略
      }
      return !v;
    });
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputMode, setOutputMode] = useState(DEFAULT_OUTPUT_MODE);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [, setStreamingResponse] = useState<StreamingAIResponse | null>(null);
  const [streamingAbortController, setStreamingAbortController] = useState<AbortController | null>(null);
  
  const [batchMode, setBatchMode] = useState<BatchMode>(DEFAULT_BATCH_MODE);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress>(INITIAL_BATCH_PROGRESS);
  const [batchAbortController, setBatchAbortController] = useState<AbortController | null>(null);
  
  const [streamingTokens, setStreamingTokens] = useState<TokenUsage>(INITIAL_TOKEN_USAGE);
  const [traditionalTokens, setTraditionalTokens] = useState<TokenUsage>(INITIAL_TOKEN_USAGE);

  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<TextSelectionRange | null>(null);

  const [genModal, setGenModal] = useState<GenerationModalState>(INITIAL_GENERATION_MODAL_STATE);
  const [targetWordCount, setTargetWordCountState] = useState<number>(project.wordTarget ?? DEFAULT_TARGET_WORD_COUNT);
  const [selectedGenPromptId, setSelectedGenPromptId] = useState<string>('');
  // 上次 AI 执行参数（重试键复用）；中断半截保留（保留/丢弃由用户决定）
  const lastRunRef = useRef<{ template: PromptTemplate; overrideContent?: string } | null>(null);
  const [stoppedPartial, setStoppedPartial] = useState<string | null>(null);
  const [spellcheckOn, setSpellcheckOn] = useState(false);
  // 查找替换浮条状态（匹配列表按查询/正文实时重算，当前匹配即选区）
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findReplacement, setFindReplacement] = useState('');
  const [findCaseSensitive, setFindCaseSensitive] = useState(false);
  const [findIndex, setFindIndex] = useState(0);
  
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<Set<string>>(new Set());

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEditPromptId, setSelectedEditPromptId] = useState<string>('');
  const [customEditPrompt, setCustomEditPrompt] = useState<string>(''); // 自定义提示词

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedExportChapterIds, setSelectedExportChapterIds] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<ExportFormat>('txt');
  
  const [isHistoryViewerOpen, setIsHistoryViewerOpen] = useState(false);
  const [isGlobalHistorySidebarOpen, setIsGlobalHistorySidebarOpen] = useState(false);

  const [isExtractingSummary, setIsExtractingSummary] = useState(false);
  const [selectedSummaryPromptId, setSelectedSummaryPromptId] = useState<string>('');

  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set());
  const [selectedChapterSummaryIds, setSelectedChapterSummaryIds] = useState<Set<string>>(new Set());
  const [useOutline, setUseOutline] = useState<boolean>(true);
  const [editableSummary, setEditableSummary] = useState<string>("");

  // 字数目标持久化：随书保存（缺席旧书用默认，不迁移）
  const setTargetWordCount = (count: number) => {
    setTargetWordCountState(count);
    if (project.wordTarget !== count) onUpdate({ wordTarget: count });
  };

  const toggleSpellcheck = () => {
    const next = !spellcheckOn;
    setSpellcheckOn(next);
    editorRef.current?.setSpellcheck(next);
  };

  const editPrompts = useMemo(() => prompts.filter(p => p.category === 'edit'), [prompts]);
  const writingPrompts = useMemo(() => prompts.filter(p => p.category === 'writing'), [prompts]);
  const summaryPrompts = useMemo(() => prompts.filter(p => p.category === 'summary'), [prompts]);

  const activeChapter = project.chapters.find(c => c.id === activeChapterId);
  const chapterStats = useMemo(() => computeChapterStats(activeChapter?.content || ''), [activeChapter?.content]);
  const bookStats = useMemo(() => computeBookStats(project), [project]);
  const openForeshadowCount = useMemo(() => openForeshadows(project).length, [project]);
  const overdueForeshadowCount = useMemo(
    () => overdueForeshadows(project, activeChapter?.order ?? 0).length,
    [project, activeChapter?.order],
  );
  const editorRef = useRef<NovelEditorHandle>(null);

  useEffect(() => {
    if (writingPrompts.length > 0 && !selectedGenPromptId) {
      setSelectedGenPromptId(writingPrompts[0]?.id ?? '');
    }
    if (editPrompts.length > 0 && !selectedEditPromptId) {
      setSelectedEditPromptId(editPrompts[0]?.id ?? '');
    }
  }, [writingPrompts, editPrompts, selectedGenPromptId, selectedEditPromptId]);

  useEffect(() => {
    if (initialChapterId) {
      setActiveChapterId(initialChapterId);
    }
  }, [initialChapterId]);

  // 左栏直达写作时没有活动章：有章则默认选中第一章，无章则画布显示建章 CTA
  useEffect(() => {
    if (!activeChapterId && project.chapters.length > 0) {
      const first = [...project.chapters].sort((a, b) => a.order - b.order)[0];
      if (first) setActiveChapterId(first.id);
    }
  }, [activeChapterId, project.chapters]);

  // onUpdate 通过 ref 持有最新引用，避免定时器 effect 依赖回调身份
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const saveDirtyRef = useRef(false);
  saveDirtyRef.current = saveDirty;

  useEffect(() => {
    const timer = setInterval(() => {
      if (!saveDirtyRef.current) return;
      onUpdateRef.current({});
      setLastSaved(Date.now());
      setSaveDirty(false);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // ===== 手动编辑快照：定时捕获，防误删/误覆盖（调度见 useChapterSnapshots） =====
  const projectRef = useRef(project);
  projectRef.current = project;

  const { handleManualSnapshot, snapshotChapterIfDue } = useChapterSnapshots({
    project,
    activeChapterId,
    onUpdate: (updates) => onUpdateRef.current(updates),
  });

  // 用新的 chapter 对象（如删除快照后）替换 chapters 中同 ID 项
  const handleUpdateChapter = (updated: Chapter) => {
    const chapters = projectRef.current.chapters.map((c) => (c.id === updated.id ? updated : c));
    onUpdate({ chapters });
  };

  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isForeshadowOpen, setIsForeshadowOpen] = useState(false);

  // 查找替换：匹配经 editor doc 实时计算，当前匹配即选区（选区即高亮）
  const findMatchesNow = useCallback((): Array<{ from: number; to: number }> => {
    if (!findQuery.trim()) return [];
    return editorRef.current?.findAll(findQuery, findCaseSensitive) ?? [];
  }, [findQuery, findCaseSensitive, activeChapterId, activeChapter?.content]);

  const jumpToFindMatch = useCallback((delta: number) => {
    const matches = findMatchesNow();
    if (matches.length === 0) return;
    const next = (findIndex + delta + matches.length) % matches.length;
    setFindIndex(next);
    const m = matches[next];
    if (m) editorRef.current?.selectRange(m.from, m.to);
  }, [findMatchesNow, findIndex]);

  const handleReplaceOne = () => {
    const matches = findMatchesNow();
    const m = matches[Math.min(findIndex, Math.max(0, matches.length - 1))];
    if (!m) return;
    editorRef.current?.replaceRange(m.from, m.to, findReplacement);
  };

  const handleReplaceAll = () => {
    // 从后往前替换，坐标不漂移
    const matches = findMatchesNow();
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      if (m) editorRef.current?.replaceRange(m.from, m.to, findReplacement);
    }
    setFindIndex(0);
  };

  // 查找条开关：默认 Ctrl/Cmd+F（弹窗打开时不抢键，设置页可改键）
  const findBinding = resolveKeybindings(useSettingsStore(s => s.keybindings)).find;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (eventToKeybinding(e) === findBinding && activeChapterId && !genModal.isOpen && !editModalOpen && !exportModalOpen && !isHistoryViewerOpen && !isForeshadowOpen) {
        e.preventDefault();
        setFindOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [findBinding, activeChapterId, genModal.isOpen, editModalOpen, exportModalOpen, isHistoryViewerOpen, isForeshadowOpen]);

  // 查询变化回到首个匹配
  useEffect(() => {
    if (!findOpen) return;
    setFindIndex(0);
    const matches = editorRef.current?.findAll(findQuery, findCaseSensitive) ?? [];
    const m = matches[0];
    if (m && findQuery.trim()) editorRef.current?.selectRange(m.from, m.to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findOpen, findQuery, findCaseSensitive, activeChapterId]);

  // 专注模式下 Esc 退出
  useEffect(() => {
    if (!isFocusMode) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFocusMode(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFocusMode]);

  useEffect(() => {
    if (genModal.isOpen) {
      setSelectedKnowledgeIds(new Set()); 
    }
  }, [genModal.isOpen]);

  useEffect(() => {
    if (genModal.isOpen && genModal.chapter) {
      setEditableSummary(genModal.chapter.summary || "");
    }
  }, [genModal.isOpen, genModal.chapter]);

  const updateChapterContent = (text: string) => {
    if (!activeChapterId) return;
    const newChapters = project.chapters.map(c =>
      c.id === activeChapterId ? { ...c, content: text } : c
    );
    onUpdate({ chapters: newChapters });
    setSaveDirty(true);
  };

  const updateChapterSummary = (summary: string) => {
    if (!activeChapterId) return;
    const newChapters = project.chapters.map(c => 
      c.id === activeChapterId ? { ...c, summary } : c
    );
    onUpdate({ chapters: newChapters });
  };

  const updateChapterContentSummary = (contentSummary: string) => {
    if (!activeChapterId) return;
    const newChapters = project.chapters.map(c => 
      c.id === activeChapterId ? { ...c, contentSummary } : c
    );
    onUpdate({ chapters: newChapters });
  };

  const updateActiveChapterTitle = (title: string) => {
    if (!activeChapterId) return;
    const newChapters = project.chapters.map(c =>
      c.id === activeChapterId ? { ...c, title } : c
    );
    onUpdate({ chapters: newChapters });
  };

  // Enter×3 连按：在当前章之后插入新章并切换过去（默认名「第N章」，不阻塞继续输入）。
  const handleNewChapter = useCallback(() => {
    const chapters = projectRef.current.chapters;
    const nextOrder = chapters.reduce((m, c) => Math.max(m, c.order), -1) + 1;
    const num = chapters.filter(c => !isVirtualChapter(c)).length + 1;
    const newChapter: Chapter = {
      id: `${Date.now()}-${uuidv7()}`,
      title: t('canvas.newChapterTitle', { num }),
      summary: '',
      content: '',
      order: nextOrder,
    };
    onUpdate({ chapters: [...chapters, newChapter] });
    setActiveChapterId(newChapter.id);
  }, [onUpdate, t]);

  const handleClearContent = async () => {
    if (await dialogService.confirm({ message: t('editor.clearContentConfirm'), danger: true })) {
      if (!activeChapterId) return;
      // 快照与清空必须在同一次 chapters 更新中完成，否则后者会用旧数组覆盖掉快照
      const chapters = projectRef.current.chapters;
      const target = chapters.find((c) => c.id === activeChapterId);
      let updated = chapters;
      if (target && (target.content ?? '').trim().length > 0 && !target.snapshots?.some((s) => s.content === target.content)) {
        updated = updated.map((c) => (c.id === activeChapterId ? appendSnapshot(c, createSnapshot(c.content, 'before-clear')) : c));
      }
      updated = updated.map((c) => (c.id === activeChapterId ? { ...c, content: '' } : c));
      onUpdate({ chapters: updated });
    }
  };

  // 章节拆分：按光标把本章正文切成两段，后段成为紧随其后的新章
  const handleSplitChapter = useCallback(() => {
    const parts = editorRef.current?.splitAtCursor();
    if (!parts) {
      dialogService.alert(t('editor.splitNeedCursor'));
      return;
    }
    const chapters = projectRef.current.chapters;
    const idx = chapters.findIndex((c) => c.id === activeChapterId);
    if (idx < 0) return;
    const current = chapters[idx];
    if (!current) return;
    const nextOrder = chapters.reduce((m, c) => Math.max(m, c.order), -1) + 1;
    const newChapter: Chapter = {
      id: `${Date.now()}-${uuidv7()}`,
      title: t('editor.splitNewTitle', { title: current.title }),
      summary: '',
      content: parts.after,
      order: nextOrder,
    };
    const updated = [...chapters];
    updated[idx] = { ...current, content: parts.before };
    updated.splice(idx + 1, 0, newChapter);
    onUpdate({ chapters: updated });
    setActiveChapterId(newChapter.id);
  }, [activeChapterId, onUpdate, t]);

  // 章节合并：把下一章正文并入本章，删除下一章（正文全程保留，不漏字）
  const handleMergeNextChapter = useCallback(async () => {
    const chapters = projectRef.current.chapters;
    const idx = chapters.findIndex((c) => c.id === activeChapterId);
    if (idx < 0 || idx >= chapters.length - 1) return;
    const current = chapters[idx];
    const next = chapters[idx + 1];
    if (!current || !next) return;
    if (!(await dialogService.confirm({ message: t('editor.mergeConfirm', { title: next.title }) }))) return;
    const merged = [current.content, next.content].filter((s) => s && s.trim().length > 0).join('\n\n');
    const updated = [...chapters];
    updated[idx] = { ...current, content: merged };
    updated.splice(idx + 1, 1);
    onUpdate({ chapters: updated });
  }, [activeChapterId, onUpdate, t]);

  const handleOpenExportModal = () => {
    const allIds = new Set(project.chapters.map(c => c.id));
    setSelectedExportChapterIds(allIds);
    setExportModalOpen(true);
  };
  const toggleExportChapter = (id: string) => {
    const newSet = new Set(selectedExportChapterIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedExportChapterIds(newSet);
  };
  const toggleAllExport = () => {
    if (selectedExportChapterIds.size === project.chapters.length) setSelectedExportChapterIds(new Set());
    else setSelectedExportChapterIds(new Set(project.chapters.map(c => c.id)));
  };
  const handleExecuteExport = async () => {
    if (selectedExportChapterIds.size === 0) {
      dialogService.alert(t('editor.selectAtLeastOne'));
      return;
    }
    const filename = buildExportFilename(project.title, exportFormat);
    try {
      if (exportFormat === 'epub' || exportFormat === 'docx') {
        const files = buildExportPackage(project, selectedExportChapterIds, exportFormat);
        const fallbackHtml = buildExportContent(project, selectedExportChapterIds, 'html');
        await savePackageFile(filename, files, exportFormat, fallbackHtml);
      } else {
        const fileContent = buildExportContent(project, selectedExportChapterIds, exportFormat);
        await saveExportFile(filename, fileContent, exportFormat);
      }
      setExportModalOpen(false);
    } catch (err) {
      dialogService.alert(t('editor.exportFailed', { error: err instanceof Error ? err.message : t('editor.unknownError') }));
    }
  };

  const toggleKnowledge = (id: string) => {
    setSelectedKnowledgeIds((prev) => toggleSetValue(prev, id));
  };

  const selectAllKnowledge = () => {
     const allIds = (project.knowledge || [])
       .filter(k => k.category === 'writing')
       .map(k => k.id);
     setSelectedKnowledgeIds(new Set(allIds));
  };

  const clearAllKnowledge = () => {
     setSelectedKnowledgeIds(new Set());
  };

  const toggleCharacter = (id: string) => {
    setSelectedCharacterIds((prev) => toggleSetValue(prev, id));
  };

  const toggleChapterSummary = (id: string) => {
    setSelectedChapterSummaryIds((prev) => toggleSetValue(prev, id));
  };

  const selectAllCharacters = () => {
    const allIds = project.characters.map(c => c.id);
    setSelectedCharacterIds(new Set(allIds));
  };

  const clearAllCharacters = () => {
    setSelectedCharacterIds(new Set());
  };

  const selectAllChapterSummaries = () => {
    const currentChapter = genModal.chapter || activeChapter;
    setSelectedChapterSummaryIds(getPreviousChapterSummaryIds(project.chapters, currentChapter));
  };

  const clearAllChapterSummaries = () => {
    setSelectedChapterSummaryIds(new Set());
  };

  const selectionBlocked = editModalOpen || genModal.isOpen || exportModalOpen;

  const applySelectionMenu = (text: string, range: TextSelectionRange, x: number, y: number) => {
    setMenuPos(getFloatingMenuPosition(x, y));
    setSelectedText(text);
    setSelectionRange(range);
  };

  const handleMouseSelect = (e: React.MouseEvent) => {
    const handle = editorRef.current;
    if (!handle || selectionBlocked) return;
    const snapshot = handle.getSelection();
    if (!snapshot) {
      clearSelectionMenu();
      return;
    }
    applySelectionMenu(snapshot.text, snapshot.range, e.clientX, e.clientY);
  };

  const handleKeySelect = () => {
    const handle = editorRef.current;
    if (!handle || selectionBlocked) return;
    const snapshot = handle.getSelection();
    if (!snapshot) {
      clearSelectionMenu();
      return;
    }
    const anchor = handle.getKeyboardSelectionMenuPosition();
    if (anchor) setMenuPos(getFloatingMenuPosition(anchor.x, anchor.y));
    setSelectedText(snapshot.text);
    setSelectionRange(snapshot.range);
  };

  const handleMouseMove = useMemo(() => debounce((e: React.MouseEvent) => {
    const handle = editorRef.current;
    if (selectionBlocked || !handle) return;
    const snapshot = handle.getSelection();
    if (!snapshot) {
      if (menuPos) setMenuPos(null);
      return;
    }
    applySelectionMenu(snapshot.text, snapshot.range, e.clientX, e.clientY);
    }, SELECTION_MENU_DEBOUNCE_MS), [selectionBlocked, menuPos]);

  const handleChapterClick = (chapter: Chapter) => { setGenModal({ isOpen: true, chapter }); };
  const handleEnterEditor = () => {
    if (genModal.chapter) { setActiveChapterId(genModal.chapter.id); setGenModal({ isOpen: false, chapter: null }); }
  };

  const runAITemplate = async (template: PromptTemplate, overrideContent?: string) => {
    const targetChapter = genModal.chapter || activeChapter;
    if (!targetChapter) return;
    if (!isModelUsable(activeModel)) {
      dialogService.alert(t('steps:common.noModel'));
      return;
    }

    // 写前快照：AI 落笔前先保一次，失败可从快照/历史找回（定时/切章快照不覆盖此路径）。
    snapshotChapterIfDue(targetChapter.id, 'manual');
    // 记录上次执行参数：工具条重试键原样复用
    lastRunRef.current = { template, overrideContent };

    setIsGenerating(true);
    setMenuPos(null);
    setEditModalOpen(false);
    setStreamingTokens({ prompt: 0, completion: 0, total: 0 });
    setTraditionalTokens({ prompt: 0, completion: 0, total: 0 });
    
    if (genModal.isOpen && genModal.chapter) {
      setActiveChapterId(genModal.chapter.id);
      setGenModal({ isOpen: false, chapter: null });
    }

    let finalPrompt = template.content;
    const context = overrideContent || selectedText || targetChapter.content;

    const { prevChapter, prevContextText, nextChapter, nextSummary } = getChapterContext(project.chapters, targetChapter);

    const hasContentVariable = finalPrompt.includes('{content}');
    
    if (!hasContentVariable && context) {
      finalPrompt += `\n\n需要处理的原文内容：\n"""\n${context}\n"""\n\n请根据上述内容进行处理。`;
    }
    
    finalPrompt = finalPrompt
      .replace('{content}', context)
      .replace('{title}', project.title)
      .replace('{chapter_title}', targetChapter.title)
      .replace('{summary}', targetChapter.summary)
      .replace('{inspiration}', project.inspiration);

    if (selectedKnowledgeIds.size > 0 && project.knowledge) {
       const knowledgeContent = project.knowledge
          .filter(k => selectedKnowledgeIds.has(k.id))
          .map(k => `【参考资料：${k.name}】\n${k.content.substring(0, PROMPT_KNOWLEDGE_TRUNCATE)}`) // 简单防止过长
          .join('\n\n');
       
       if (knowledgeContent) {
          finalPrompt += `\n\n### 必须参考的背景资料 (Knowledge Base)\n请务必参考以下设定资料进行创作：\n\n${knowledgeContent}\n\n`;
       }
    }

    if (useOutline && project.outline && project.outline.trim().length > 0) {
        finalPrompt += `\n\n### 小说整体大纲 (Novel Outline)\n请严格遵循以下整体故事大纲进行创作：\n"""\n${project.outline}\n"""\n\n`;
    }

    if (selectedCharacterIds.size > 0) {
        const selectedCharacters = project.characters.filter(c => selectedCharacterIds.has(c.id));
        if (selectedCharacters.length > 0) {
            const characterInfo = selectedCharacters.map(c => {
                let info = `【角色：${c.name}】`;
                if (c.role) info += `\n- 身份/角色：${roleLabel(c.role)}`;
                if (c.personality) info += `\n- 性格特点：${c.personality}`;
                if (c.background) info += `\n- 背景故事：${c.background}`;
                if (c.appearance) info += `\n- 外貌特征：${c.appearance}`;
                if (c.relationships) info += `\n- 人际关系：${c.relationships}`;
                return info;
            }).join('\n\n');
            
            finalPrompt += `\n\n### 关键角色设定 (Character Settings)\n以下角色将在本章中出现，请严格遵循其设定进行描写：\n\n${characterInfo}\n\n`;
        }
    }

    if (selectedChapterSummaryIds.size > 0) {
        const selectedChapters = project.chapters
            .filter(c => selectedChapterSummaryIds.has(c.id))
            .sort((a, b) => a.order - b.order);
        
        if (selectedChapters.length > 0) {
            const chapterSummaries = selectedChapters.map(c => {
                return `【第${c.order + 1}章：${c.title}】\n${c.contentSummary}`;
            }).join('\n\n');
            
            finalPrompt += `\n\n### 前文情节摘要 (Previous Chapter Summaries)\n请参考以下前面章节的正文摘要，确保情节连贯性：\n\n${chapterSummaries}\n\n`;
        }
    }

    if (editableSummary && editableSummary.trim().length > 0) {
        finalPrompt += `\n\n### 本章细纲补充 (Enhanced Chapter Outline)\n请优先参考以下补充细纲进行创作：\n"""\n${editableSummary.trim()}\n"""\n\n`;
    }

    if (template.category !== 'edit') {
        if (prevContextText && prevContextText.length > 0) {
            finalPrompt += `\n\n### 情节连贯性要求 (Critical)\n1. **承接上文**：上一章${prevChapter ? `《${prevChapter.title}》` : ''}的结尾内容如下：\n"""\n${prevContextText}\n"""\n请务必紧接上述情节、氛围和人物状态继续描写，严禁割裂。`;
        } else {
            finalPrompt += `\n\n### 情节说明\n这是本书的第一章（或上一章暂无内容），请开始全新的叙述。`;
        }

        if (nextSummary && nextSummary.length > 0) {
            finalPrompt += `\n\n2. **铺垫下文**：下一章${nextChapter ? `《${nextChapter.title}》` : ''}的预告是：\n"${nextSummary}"\n请在本章结尾为后续发展埋下伏笔或做好铺垫。`;
        }

        finalPrompt += `\n\n### 核心指令\n重点依据本章细纲（${targetChapter.summary}）创作。请确保逻辑自洽，文笔流畅。`;

        // RAG 增强：注入截至本章仍未回收的伏笔，提醒模型承接
        finalPrompt += buildForeshadowContextForPrompt(project, targetChapter.order);
    }

    if (genModal.isOpen) {
       finalPrompt += `\n\n要求：请撰写约 ${targetWordCount} 字的正文内容。`;
    }

    finalPrompt += WRITING_OUTPUT_FORMAT_DIRECTIVE;

    const shouldUseStreaming = outputMode === 'streaming' && activeModel.supportsStreaming !== false;

    if (shouldUseStreaming) {
      setIsStreaming(true);
      setStreamingContent("");
      setStreamingResponse(null);
      
      const abortController = new AbortController();
      setStreamingAbortController(abortController);

      try {
        await AIService.callStreaming(activeModel, finalPrompt, (response) => {
          setStreamingContent(response.content);
          setStreamingResponse(response);
          
          if (response.tokens) {
            setStreamingTokens(response.tokens);
          }

          if (response.isComplete) {
            setIsStreaming(false);
            setStreamingAbortController(null);
            
            if (response.error) {
              // 用户主动取消不算失败，不打扰；其余错误提示并复位生成态（'生成已取消' 为适配层控制流哨兵，保持字面比对）
              if (response.error !== '生成已取消') {
                dialogService.alert(t('editor.aiFailed', { error: response.error }));
              }
              setIsGenerating(false);
              return;
            }

            const result = response.content;
            if (selectedText && selectionRange && !genModal.isOpen) {
              const currentContent = activeChapter?.content || "";
              const newContent = applySelectionReplacement(currentContent, selectionRange.start, selectionRange.end, result);
              
              const historyRecord = AIService.buildHistoryRecordData(
                targetChapter.id,
                finalPrompt,
                result,
                activeModel,
                response,
                {
                  templateName: templateDisplayName(template),
                  batchGeneration: false,
                  chapterTitle: targetChapter.title
                }
              );
              
              const updatedChapters = project.chapters.map(c => {
                if (c.id === targetChapter.id) {
                  const existingHistory = c.history || [];
                  return {
                    ...c,
                    content: newContent,
                    history: [...existingHistory, historyRecord]
                  };
                }
                return c;
              });
              commitAIChapters(updatedChapters, template);
            } else {
              const currentContent = targetChapter.content || "";
              const newContent = currentContent.length < 50 ? result : (currentContent + "\n\n" + result);
              const newChapters = project.chapters.map(c => {
                if (c.id === targetChapter.id) {
                  const historyRecord = AIService.buildHistoryRecordData(
                    targetChapter.id,
                    finalPrompt,
                    result,
                    activeModel,
                    response,
                    {
                      templateName: templateDisplayName(template),
                      batchGeneration: false,
                      chapterTitle: targetChapter.title
                    }
                  );
                  
                  const existingHistory = c.history || [];
                  return {
                    ...c,
                    content: newContent,
                    history: [...existingHistory, historyRecord]
                  };
                }
                return c;
              });
              commitAIChapters(newChapters, template);
            }
            
            setIsGenerating(false);
            setSelectionRange(null);
            setSelectedText("");
          }
        }, { signal: abortController.signal });
      } catch (err) {
        logger.error(err);
        setIsStreaming(false);
        setIsGenerating(false);
        setStreamingAbortController(null);
        dialogService.alert(t('editor.streamCallFailed'));
      }
    } else {
      try {
        const result = await AIService.call(activeModel, finalPrompt);
        
        if (result.tokens) {
          setTraditionalTokens(result.tokens);
        }
        
        if (selectedText && selectionRange && !genModal.isOpen) {
          const currentContent = activeChapter?.content || "";
          const newContent = applySelectionReplacement(currentContent, selectionRange.start, selectionRange.end, result.content);
          
          const historyRecord = AIService.buildHistoryRecordData(
            targetChapter.id,
            finalPrompt,
            result.content,
            activeModel,
            result,
            {
              templateName: templateDisplayName(template),
              batchGeneration: false,
              chapterTitle: targetChapter.title
            }
          );
          
          const updatedChapters = project.chapters.map(c => {
            if (c.id === targetChapter.id) {
              const existingHistory = c.history || [];
              return {
                ...c,
                content: newContent,
                history: [...existingHistory, historyRecord]
              };
            }
            return c;
          });
          commitAIChapters(updatedChapters, template);
        } else {
          const currentContent = targetChapter.content || "";
          const newContent = currentContent.length < 50 ? result.content : (currentContent + "\n\n" + result.content);
          const newChapters = project.chapters.map(c => {
            if (c.id === targetChapter.id) {
              const historyRecord = AIService.buildHistoryRecordData(
                targetChapter.id,
                finalPrompt,
                result.content,
                activeModel,
                result,
                {
                  templateName: templateDisplayName(template),
                  batchGeneration: false,
                  chapterTitle: targetChapter.title
                }
              );
              
              const existingHistory = c.history || [];
              return {
                ...c,
                content: newContent,
                history: [...existingHistory, historyRecord]
              };
            }
            return c;
          });
          commitAIChapters(newChapters, template);
        }
      } catch (err) {
        logger.error(err);
        dialogService.alert(t('editor.callFailed'));
      } finally {
        setIsGenerating(false);
        setSelectionRange(null);
        setSelectedText("");
      }
    }
  };

  const stopStreaming = () => {
    if (streamingAbortController) {
      streamingAbortController.abort();
      // 半截保留：不直接清空，交由用户保留/丢弃（完成态合并规则复用）
      const partial = streamingContent;
      setIsStreaming(false);
      setIsGenerating(false);
      setStreamingAbortController(null);
      setStreamingResponse(null);
      setStreamingTokens({ prompt: 0, completion: 0, total: 0 });
      setStoppedPartial(partial.trim() ? partial : null);
      if (!partial.trim()) {
        setStreamingContent("");
      }
    }
  };

  const keepStoppedPartial = () => {
    if (!stoppedPartial || !activeChapter) {
      setStoppedPartial(null);
      return;
    }
    const currentContent = activeChapter.content || "";
    const merged = currentContent.length < 50 ? stoppedPartial : (currentContent + "\n\n" + stoppedPartial);
    updateChapterContent(merged);
    setStoppedPartial(null);
    setStreamingContent("");
  };

  const discardStoppedPartial = () => {
    setStoppedPartial(null);
    setStreamingContent("");
  };

  const handleRetryAI = () => {
    const last = lastRunRef.current;
    if (!last || isGenerating || isStreaming || isBatchGenerating) return;
    void runAITemplate(last.template, last.overrideContent);
  };

  const handleDeleteChapter = async (chapterId: string) => {
    const target = project.chapters.find((c) => c.id === chapterId);
    if (!target) return;
    const ok = await dialogService.confirm({
      message: t('canvas.deleteChapterConfirm', { title: target.title }),
      danger: true,
    });
    if (!ok) return;
    const remaining = project.chapters.filter((c) => c.id !== chapterId);
    onUpdate({ chapters: remaining });
    if (activeChapterId === chapterId) {
      setActiveChapterId(remaining[0]?.id ?? null);
    }
  };

  const handleChaptersChange = (chapters: Chapter[]) => {
    onUpdate({ chapters });
  };

  const handleBatchDeleteChapter = async (chapterIds: string[]) => {
    const ids = new Set(chapterIds);
    const remaining = project.chapters.filter((c) => !ids.has(c.id));
    onUpdate({ chapters: remaining });
    if (activeChapterId && ids.has(activeChapterId)) {
      setActiveChapterId(remaining[0]?.id ?? null);
    }
  };

  const generateSingleChapter = async (chapter: Chapter, template: PromptTemplate, model: ModelConfig, externalSignal?: AbortSignal): Promise<{content: string, historyRecord?: AIHistoryRecord}> => {
    try {
      setActiveChapterId(chapter.id);
      
      let finalPrompt = template.content;
      const context = chapter.content;

      const { prevChapter, prevContextText, nextChapter, nextSummary } = getChapterContext(project.chapters, chapter);

      finalPrompt = finalPrompt
        .replace('{content}', context)
        .replace('{title}', project.title)
        .replace('{chapter_title}', chapter.title)
        .replace('{summary}', chapter.summary)
        .replace('{inspiration}', project.inspiration);

      if (selectedKnowledgeIds.size > 0 && project.knowledge) {
         const knowledgeContent = project.knowledge
            .filter(k => selectedKnowledgeIds.has(k.id))
            .map(k => `【参考资料：${k.name}】\n${k.content.substring(0, PROMPT_KNOWLEDGE_TRUNCATE)}`)
            .join('\n\n');
         
         if (knowledgeContent) {
            finalPrompt += `\n\n### 必须参考的背景资料 (Knowledge Base)\n请务必参考以下设定资料进行创作：\n\n${knowledgeContent}\n\n`;
         }
      }

      if (useOutline && project.outline && project.outline.trim().length > 0) {
          finalPrompt += `\n\n### 小说整体大纲 (Novel Outline)\n请严格遵循以下整体故事大纲进行创作：\n"""\n${project.outline}\n"""\n\n`;
      }

      if (selectedCharacterIds.size > 0) {
          const selectedCharacters = project.characters.filter(c => selectedCharacterIds.has(c.id));
          if (selectedCharacters.length > 0) {
              const characterInfo = selectedCharacters.map(c => {
                  let info = `【角色：${c.name}】`;
                  if (c.role) info += `\n- 身份/角色：${roleLabel(c.role)}`;
                  if (c.personality) info += `\n- 性格特点：${c.personality}`;
                  if (c.background) info += `\n- 背景故事：${c.background}`;
                  if (c.appearance) info += `\n- 外貌特征：${c.appearance}`;
                  if (c.relationships) info += `\n- 人际关系：${c.relationships}`;
                  return info;
              }).join('\n\n');
              
              finalPrompt += `\n\n### 关键角色设定 (Character Settings)\n以下角色将在本章中出现，请严格遵循其设定进行描写：\n\n${characterInfo}\n\n`;
          }
      }

      if (selectedChapterSummaryIds.size > 0) {
          const selectedChapters = project.chapters
              .filter(c => selectedChapterSummaryIds.has(c.id))
              .sort((a, b) => a.order - b.order);
          
          if (selectedChapters.length > 0) {
              const chapterSummaries = selectedChapters.map(c => {
                  return `【第${c.order + 1}章：${c.title}】\n${c.contentSummary}`;
              }).join('\n\n');
              
              finalPrompt += `\n\n### 前文情节摘要 (Previous Chapter Summaries)\n请参考以下前面章节的正文摘要，确保情节连贯性：\n\n${chapterSummaries}\n\n`;
          }
      }

      if (editableSummary && editableSummary.trim().length > 0) {
          finalPrompt += `\n\n### 本章细纲补充 (Enhanced Chapter Outline)\n请优先参考以下补充细纲进行创作：\n"""\n${editableSummary.trim()}\n"""\n\n`;
      }

      if (template.category !== 'edit') {
          if (prevContextText && prevContextText.length > 0) {
              finalPrompt += `\n\n### 情节连贯性要求 (Critical)\n1. **承接上文**：上一章${prevChapter ? `《${prevChapter.title}》` : ''}的结尾内容如下：\n"""\n${prevContextText}\n"""\n请务必紧接上述情节、氛围和人物状态继续描写，严禁割裂。`;
          } else {
              finalPrompt += `\n\n### 情节说明\n这是本书的第一章（或上一章暂无内容），请开始全新的叙述。`;
          }

          if (nextSummary && nextSummary.length > 0) {
              finalPrompt += `\n\n2. **铺垫下文**：下一章${nextChapter ? `《${nextChapter.title}》` : ''}的预告是：\n"${nextSummary}"\n请在本章结尾为后续发展埋下伏笔或做好铺垫。`;
          }

          finalPrompt += `\n\n### 核心指令\n重点依据本章细纲（${chapter.summary}）创作。请确保逻辑自洽，文笔流畅。`;

          // RAG 增强：注入截至本章仍未回收的伏笔
          finalPrompt += buildForeshadowContextForPrompt(project, chapter.order);
      }

      finalPrompt += `\n\n要求：请撰写约 ${targetWordCount} 字的正文内容。`;

      finalPrompt += WRITING_OUTPUT_FORMAT_DIRECTIVE;

      const shouldUseStreaming = outputMode === 'streaming' && model.supportsStreaming !== false;

      if (shouldUseStreaming) {
        setIsStreaming(true);
        setStreamingContent("");
        setStreamingResponse(null);
        
        const abortController = new AbortController();
        setStreamingAbortController(abortController);
        // 批量停止信号联动本次请求
        if (externalSignal) {
          if (externalSignal.aborted) abortController.abort();
          else externalSignal.addEventListener('abort', () => abortController.abort(), { once: true });
        }

        return new Promise<{content: string, historyRecord?: AIHistoryRecord}>((resolve, reject) => {
          AIService.callStreaming(model, finalPrompt, (response) => {
            setStreamingContent(response.content);
            setStreamingResponse(response);
            
            if (response.tokens) {
              setStreamingTokens(response.tokens);
            }

            if (response.isComplete) {
              setIsStreaming(false);
              setStreamingAbortController(null);
              
              if (response.error) {
                reject(new Error(response.error));
                return;
              }

              const result = response.content;
              const currentContent = chapter.content || "";
              const newContent = currentContent.length < 50 ? result : (currentContent + "\n\n" + result);
              
              const historyRecord = AIService.buildHistoryRecordData(
                chapter.id,
                finalPrompt,
                result,
                model,
                response,
                {
                  templateName: templateDisplayName(template),
                  batchGeneration: true,
                  chapterTitle: chapter.title
                }
              );
              
              resolve({ content: newContent, historyRecord });
            }
          }, { signal: abortController.signal }).catch(reject);
        });
      } else {
        const result = await AIService.call(model, finalPrompt, { signal: externalSignal });
        
        if (result.tokens) {
          setTraditionalTokens(result.tokens);
        }
        
        const currentContent = chapter.content || "";
        const newContent = currentContent.length < 50 ? result.content : (currentContent + "\n\n" + result.content);
        
        const historyRecord = AIService.buildHistoryRecordData(
          chapter.id,
          finalPrompt,
          result.content,
          model,
          result,
          {
            templateName: templateDisplayName(template),
            batchGeneration: true,
            chapterTitle: chapter.title
          }
        );
        
        return { content: newContent, historyRecord };
      }
    } catch (err) {
      logger.error(err);
      throw err;
    }
  };

  const runBatchGeneration = async () => {
    const template = prompts.find(p => p.id === selectedGenPromptId);
    if (!template || !genModal.chapter) return;
    if (!isModelUsable(activeModel)) {
      dialogService.alert(t('steps:common.noModel'));
      return;
    }

    const targetChapter = genModal.chapter;

    setIsBatchGenerating(true);
    setGenModal({ isOpen: false, chapter: null });

    const chapterCount = batchMode === 'batch5' ? 5 : 10;
    
    const sortedChapters = [...project.chapters].sort((a, b) => a.order - b.order);
    
    const startIndex = sortedChapters.findIndex(c => c.id === targetChapter.id);
    
    const chaptersToGenerate = sortedChapters.slice(startIndex, startIndex + chapterCount);
    
    const abortController = new AbortController();
    setBatchAbortController(abortController);

    try {
      const chapterUpdates: Array<{id: string, content: string, historyRecord?: AIHistoryRecord}> = [];
      
      for (let i = 0; i < chaptersToGenerate.length; i++) {
        if (abortController.signal.aborted) {
          break;
        }

        const chapter = chaptersToGenerate[i];
        if (!chapter) continue;

        snapshotChapterIfDue(chapter.id, 'manual');
        setBatchProgress({
          current: i + 1,
          total: chaptersToGenerate.length,
          currentChapterTitle: chapter.title
        });

        try {
          const result = await generateSingleChapter(chapter, template, activeModel, abortController.signal);
          
          chapterUpdates.push({
            id: chapter.id,
            content: result.content,
            historyRecord: result.historyRecord
          });
          
          await new Promise(resolve => setTimeout(resolve, BATCH_CHAPTER_INTERVAL_MS));
        } catch (err) {
          logger.error(`生成章节 ${chapter.title} 失败:`, err);
          continue;
        }
      }

      if (chapterUpdates.length > 0) {
        const newChapters = project.chapters.map(c => {
          const update = chapterUpdates.find(u => u.id === c.id);
          if (update) {
            const existingHistory = c.history || [];
            const newHistory = update.historyRecord ? [...existingHistory, update.historyRecord] : existingHistory;
            return { 
              ...c, 
              content: update.content,
              history: newHistory
            };
          }
          return c;
        });
        
        onUpdate({ chapters: newChapters }, { agentId: 'ai:writing-batch', cause: selectedGenPromptId });

        await new Promise(resolve => setTimeout(resolve, SELECTION_MENU_DEBOUNCE_MS));
      }

      dialogService.alert(t('editor.batchDone', { count: chapterUpdates.length }));
    } catch (err) {
      logger.error(err);
      dialogService.alert(t('editor.batchFailed', { error: err instanceof Error ? err.message : t('editor.unknownError') }));
    } finally {
      setIsBatchGenerating(false);
      setBatchAbortController(null);
      setBatchProgress({ current: 0, total: 0, currentChapterTitle: '' });
    }
  };

  const stopBatchGeneration = () => {
    if (batchAbortController) {
      batchAbortController.abort();
      setIsBatchGenerating(false);
      setBatchAbortController(null);
      setBatchProgress({ current: 0, total: 0, currentChapterTitle: '' });
    }
  };

  const handleModalGenerate = () => {
    if (batchMode === 'single') {
      const template = prompts.find(p => p.id === selectedGenPromptId);
      if (template) runAITemplate(template);
    } else {
      runBatchGeneration();
    }
  };
  const handleEditGenerate = () => {
    if (customEditPrompt && customEditPrompt.trim() !== '') {
      const customTemplate: PromptTemplate = {
        id: 'custom-prompt-' + Date.now(),
        category: 'edit',
        name: t('editor.customPromptName'),
        content: customEditPrompt.trim()
      };
      runAITemplate(customTemplate);
    } else {
      const template = prompts.find(p => p.id === selectedEditPromptId);
      if (template) runAITemplate(template);
    }
  };
  const openEditModal = () => { 
    setMenuPos(null); 
    setEditModalOpen(true); 
    setCustomEditPrompt('');
  };

  const clearSelectionMenu = () => {
    setMenuPos(null);
    setSelectedText("");
    setSelectionRange(null);
  };

  const handleClearChapterHistory = async () => {
    if (!activeChapterId) return;
    if (await dialogService.confirm({ message: t('editor.clearHistoryConfirm'), danger: true })) {
      const newChapters = project.chapters.map(c =>
        c.id === activeChapterId ? { ...c, history: [] } : c
      );
      onUpdate({ chapters: newChapters });
      setIsHistoryViewerOpen(false);
    }
  };

  const handleExtractSummary = async () => {
    if (!isModelUsable(activeModel)) {
      dialogService.alert(t('steps:common.noModel'));
      return;
    }
    setIsExtractingSummary(true);
    try {
      await extractChapterSummary({
        activeChapter,
        summaryPrompts,
        selectedSummaryPromptId,
        prompts,
        project,
        activeModel,
        onUpdate,
      });
    } catch (err) {
      logger.error(err);
      dialogService.alert(t('editor.extractSummaryFailed'));
    } finally {
      setIsExtractingSummary(false);
    }
  };
  const modalContextInfo = genModal.chapter ? getChapterContext(project.chapters, genModal.chapter) : { prevChapter: null, prevContextText: "", nextChapter: null, nextSummary: "" };

  return (
    <div className="relative flex h-full overflow-hidden bg-background">
      
      <WritingEditorOverlayLayer
        genModal={genModal}
        setGenModal={setGenModal}
        modalContextInfo={modalContextInfo}
        useOutline={useOutline}
        setUseOutline={setUseOutline}
        project={project}
        selectedCharacterIds={selectedCharacterIds}
        toggleCharacter={toggleCharacter}
        selectAllCharacters={selectAllCharacters}
        clearAllCharacters={clearAllCharacters}
        selectedChapterSummaryIds={selectedChapterSummaryIds}
        toggleChapterSummary={toggleChapterSummary}
        selectAllChapterSummaries={selectAllChapterSummaries}
        clearAllChapterSummaries={clearAllChapterSummaries}
        editableSummary={editableSummary}
        setEditableSummary={setEditableSummary}
        selectedKnowledgeIds={selectedKnowledgeIds}
        toggleKnowledge={toggleKnowledge}
        selectAllKnowledge={selectAllKnowledge}
        clearAllKnowledge={clearAllKnowledge}
        writingPrompts={writingPrompts}
        selectedGenPromptId={selectedGenPromptId}
        setSelectedGenPromptId={setSelectedGenPromptId}
        targetWordCount={targetWordCount}
        setTargetWordCount={setTargetWordCount}
        batchMode={batchMode}
        setBatchMode={setBatchMode}
        isBatchGenerating={isBatchGenerating}
        batchProgress={batchProgress}
        activeModel={activeModel}
        outputMode={outputMode}
        setOutputMode={setOutputMode}
        isStreaming={isStreaming}
        streamingTokens={streamingTokens}
        traditionalTokens={traditionalTokens}
        isGenerating={isGenerating}
        handleEnterEditor={handleEnterEditor}
        handleModalGenerate={handleModalGenerate}
        stopBatchGeneration={stopBatchGeneration}
        editModalOpen={editModalOpen}
        selectedText={selectedText}
        editPrompts={editPrompts}
        selectedEditPromptId={selectedEditPromptId}
        customEditPrompt={customEditPrompt}
        onCloseEditModal={() => setEditModalOpen(false)}
        onSelectedEditPromptChange={setSelectedEditPromptId}
        onCustomEditPromptChange={setCustomEditPrompt}
        onEditSubmit={handleEditGenerate}
        exportModalOpen={exportModalOpen}
        selectedExportChapterIds={selectedExportChapterIds}
        exportFormat={exportFormat}
        onCloseExportModal={() => setExportModalOpen(false)}
        onToggleAllExport={toggleAllExport}
        onToggleExportChapter={toggleExportChapter}
        onExportFormatChange={setExportFormat}
        onConfirmExport={handleExecuteExport}
        menuPos={menuPos}
        hasModel={isModelUsable(activeModel)}
        onOpenEditModal={openEditModal}
        onClearSelection={clearSelectionMenu}
        isHistoryViewerOpen={isHistoryViewerOpen}
        activeChapter={activeChapter}
        onCloseHistoryViewer={() => setIsHistoryViewerOpen(false)}
        onApplyHistoryContent={updateChapterContent}
        onClearChapterHistory={handleClearChapterHistory}
        isGlobalHistorySidebarOpen={isGlobalHistorySidebarOpen}
        onCloseGlobalHistorySidebar={() => setIsGlobalHistorySidebarOpen(false)}
        onUpdate={onUpdate}
        onUpdateChapter={handleUpdateChapter}
        onOpenSettings={onOpenSettings}
      />

      {/* Sidebar & Editor Areas */}
      {isSidebarOpen && !isFocusMode && (
        <WritingSidebar
          characters={project.characters}
          activeChapter={activeChapter}
          activeChapterId={activeChapterId}
          chapters={project.chapters}
          summaryPrompts={summaryPrompts}
          selectedSummaryPromptId={selectedSummaryPromptId}
          isExtractingSummary={isExtractingSummary}
          hasModel={isModelUsable(activeModel)}
          onClose={() => setIsSidebarOpen(false)}
          onChapterSummaryChange={updateChapterSummary}
          onContentSummaryChange={updateChapterContentSummary}
          onSummaryPromptChange={setSelectedSummaryPromptId}
          onExtractSummary={handleExtractSummary}
          onChapterClick={handleChapterClick}
          onNavigateToCharacters={onNavigateToCharacters}
          onDeleteChapter={handleDeleteChapter}
          onChaptersChange={handleChaptersChange}
          onBatchDeleteChapter={handleBatchDeleteChapter}
        />
      )}

      <div className="relative flex h-full min-w-0 flex-1 flex-col bg-muted/30">
        {findOpen && project.chapters.length > 0 && (
          <FindBar
            query={findQuery}
            onQueryChange={setFindQuery}
            replacement={findReplacement}
            onReplacementChange={setFindReplacement}
            caseSensitive={findCaseSensitive}
            onToggleCaseSensitive={() => setFindCaseSensitive((v) => !v)}
            matchIndex={findIndex}
            matchCount={findMatchesNow().length}
            onPrev={() => jumpToFindMatch(-1)}
            onNext={() => jumpToFindMatch(1)}
            onReplace={handleReplaceOne}
            onReplaceAll={handleReplaceAll}
            onClose={() => setFindOpen(false)}
          />
        )}
        <WritingEditorToolbar
          activeChapterId={activeChapterId}
          activeChapterTitle={activeChapter?.title || ""}
          hasProjectChapters={project.chapters.length > 0}
          hasActiveChapterHistory={Boolean(activeChapter?.history && activeChapter.history.length > 0)}
          isSidebarOpen={isSidebarOpen}
          isGlobalHistorySidebarOpen={isGlobalHistorySidebarOpen}
          chapterStats={chapterStats}
          bookStats={bookStats}
          snapshotCount={activeChapter?.snapshots?.length ?? 0}
          openForeshadowCount={openForeshadowCount}
          overdueForeshadowCount={overdueForeshadowCount}
          isFocusMode={isFocusMode}
          lastSaved={lastSaved}
          targetWordCount={targetWordCount}
          typewriter={typewriter}
          saveDirty={saveDirty}
          canUndo={editorRef.current?.canUndo() ?? false}
          canRedo={editorRef.current?.canRedo() ?? false}
          onBack={onBack}
          onTitleChange={updateActiveChapterTitle}
          onOpenExport={handleOpenExportModal}
          onOpenForeshadow={() => setIsForeshadowOpen(true)}
          onClearContent={handleClearContent}
          onToggleGlobalHistory={() => setIsGlobalHistorySidebarOpen(!isGlobalHistorySidebarOpen)}
          onOpenChapterHistory={() => setIsHistoryViewerOpen(true)}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onToggleFocusMode={() => setIsFocusMode((v) => !v)}
          onToggleTypewriter={toggleTypewriter}
          onUndo={() => editorRef.current?.undo()}
          onRedo={() => editorRef.current?.redo()}
          onManualSnapshot={handleManualSnapshot}
          canRetryAI={Boolean(lastRunRef.current) && !isGenerating && !isStreaming && !isBatchGenerating}
          onRetryAI={handleRetryAI}
          spellcheckOn={spellcheckOn}
          onToggleSpellcheck={toggleSpellcheck}
          onToggleFind={() => setFindOpen((v) => !v)}
          canSplitChapter={!!activeChapterId && (activeChapter?.content.trim().length ?? 0) > 0}
          canMergeChapter={project.chapters.findIndex(c => c.id === activeChapterId) >= 0 && project.chapters.findIndex(c => c.id === activeChapterId) < project.chapters.length - 1}
          onSplitChapter={handleSplitChapter}
          onMergeChapter={() => void handleMergeNextChapter()}
        />

        {project.chapters.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              title={t('canvas.emptyBookTitle')}
              description={t('canvas.emptyBookHint')}
              action={
                <div className="flex items-center gap-2">
                  <Button onClick={handleNewChapter}>{t('canvas.createFirstChapter')}</Button>
                  <Button variant="ghost" onClick={onBack}>{t('canvas.backToStructure')}</Button>
                </div>
              }
            />
          </div>
        ) : (
        <WritingEditorCanvas
          editorRef={editorRef}
          activeChapterId={activeChapterId}
          content={isStreaming ? streamingContent : (activeChapter?.content || "")}
          isFocusMode={isFocusMode}
          typewriter={typewriter}
          isGenerating={isGenerating}
          isStreaming={isStreaming}
          isBatchGenerating={isBatchGenerating}
          targetWordCount={targetWordCount}
          selectedKnowledgeCount={selectedKnowledgeIds.size}
          streamingContentLength={streamingContent.length}
          batchProgress={batchProgress}
          onMouseUp={handleMouseSelect}
          onKeyUp={handleKeySelect}
          onMouseMove={handleMouseMove}
          onContentChange={updateChapterContent}
          onNewChapter={handleNewChapter}
          onStopStreaming={stopStreaming}
          onStopBatchGeneration={stopBatchGeneration}
          streamingTokens={streamingTokens}
          traditionalTokens={traditionalTokens}
          stoppedPartialLength={stoppedPartial?.length ?? 0}
          onKeepStoppedPartial={keepStoppedPartial}
          onDiscardStoppedPartial={discardStoppedPartial}
        />
        )}
      </div>

      <ForeshadowPanel
        isOpen={isForeshadowOpen}
        project={project}
        activeModel={activeModel}
        activeChapter={activeChapter ? { id: activeChapter.id, title: activeChapter.title, order: activeChapter.order, content: activeChapter.content } : null}
        onUpdate={onUpdate}
        onClose={() => setIsForeshadowOpen(false)}
      />
    </div>
  );
};

export default WritingEditor;


