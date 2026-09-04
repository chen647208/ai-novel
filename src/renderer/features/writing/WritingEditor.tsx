/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { templateDisplayName } from '@/i18n';
import { dialogService } from '@/shared/services/dialogService';
import { type AIHistoryRecord, type Chapter, type PromptTemplate, type StreamingAIResponse } from '../../../shared/types';
import { AIService } from '../assistant/services/aiService';
import WritingEditorToolbar from './components/WritingEditorToolbar';
import WritingSidebar from './components/WritingSidebar';
import WritingEditorOverlayLayer from './components/WritingEditorOverlayLayer';
import WritingEditorCanvas from './components/WritingEditorCanvas';
import ForeshadowPanel from '../foreshadowing/components/ForeshadowPanel';
import { extractChapterSummary } from './services/summaryExtractionService';
import { appendSnapshot, createSnapshot, shouldAutoSnapshot } from './services/chapterSnapshotService';
import { computeBookStats, computeChapterStats } from './services/writingStatsService';
import { buildForeshadowContextForPrompt, openForeshadows, overdueForeshadows } from '../foreshadowing/services/foreshadowService';
import {
  DEFAULT_BATCH_MODE,
  DEFAULT_OUTPUT_MODE,
  DEFAULT_TARGET_WORD_COUNT,
  INITIAL_BATCH_PROGRESS,
  INITIAL_GENERATION_MODAL_STATE,
  INITIAL_TOKEN_USAGE,
} from './constants';
import type {
  BatchMode,
  BatchProgress,
  GenerationModalState,
  MenuPosition,
  TextSelectionRange,
  TokenUsage,
  WritingEditorProps,
} from './types';
import {
  buildExportContent,
  buildExportFilename,
  debounce,
  getChapterContext,
  getKeyboardSelectionMenuPosition,
  getPreviousChapterSummaryIds,
  getTextSelectionSnapshot,
  getFloatingMenuPosition,
  saveExportFile,
  toggleSetValue,
  type ExportFormat,
} from './utils';

const WritingEditor: React.FC<WritingEditorProps> = ({ project, prompts, activeModel, onUpdate, initialChapterId, onBack }) => {
  const { t } = useTranslation('writing');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(initialChapterId || null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
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
  const [targetWordCount, setTargetWordCount] = useState<number>(DEFAULT_TARGET_WORD_COUNT);
  const [selectedGenPromptId, setSelectedGenPromptId] = useState<string>('');
  
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
  const textRef = useRef<HTMLTextAreaElement>(null);

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

  // onUpdate 通过 ref 持有最新引用，避免定时器 effect 依赖回调身份
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const timer = setInterval(() => {
      onUpdateRef.current({});
      setLastSaved(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, [activeChapter?.content]);

  // ===== 手动编辑快照：定时捕获，防误删/误覆盖 =====
  const projectRef = useRef(project);
  projectRef.current = project;

  const snapshotChapterIfDue = (chapterId: string, source: 'auto' | 'manual' | 'before-clear'): void => {
    const chapters = projectRef.current.chapters;
    const target = chapters.find((c) => c.id === chapterId);
    if (!target) return;
    if (source === 'auto' && !shouldAutoSnapshot(target)) return;
    if ((target.content ?? '').trim().length === 0) return;
    if (target.snapshots?.some((s) => s.content === target.content)) return; // 内容未变
    const updated = chapters.map((c) =>
      c.id === chapterId ? appendSnapshot(c, createSnapshot(c.content, source)) : c,
    );
    onUpdateRef.current({ chapters: updated });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      // 每 30 秒扫描一次，单轮最多处理一章，避免高频写盘
      const due = projectRef.current.chapters.find((c) => shouldAutoSnapshot(c));
      if (due) snapshotChapterIfDue(due.id, 'auto');
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  // 切换章节时为刚离开的章节补一次快照
  const prevChapterIdRef = useRef<string | null>(activeChapterId);
  useEffect(() => {
    const prev = prevChapterIdRef.current;
    if (prev && prev !== activeChapterId) {
      snapshotChapterIfDue(prev, 'auto');
    }
    prevChapterIdRef.current = activeChapterId;
  }, [activeChapterId]);

  const handleManualSnapshot = () => {
    if (!activeChapterId) return;
    snapshotChapterIfDue(activeChapterId, 'manual');
  };

  // 用新的 chapter 对象（如删除快照后）替换 chapters 中同 ID 项
  const handleUpdateChapter = (updated: Chapter) => {
    const chapters = projectRef.current.chapters.map((c) => (c.id === updated.id ? updated : c));
    onUpdate({ chapters });
  };

  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isForeshadowOpen, setIsForeshadowOpen] = useState(false);

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
    setLastSaved(Date.now());
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
    const fileContent = buildExportContent(project, selectedExportChapterIds, exportFormat);
    const filename = buildExportFilename(project.title, exportFormat);
    try {
      await saveExportFile(filename, fileContent, exportFormat);
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
    if (!textRef.current || selectionBlocked) return;
    const snapshot = getTextSelectionSnapshot(textRef.current);
    if (!snapshot) {
      clearSelectionMenu();
      return;
    }
    applySelectionMenu(snapshot.text, snapshot.range, e.clientX, e.clientY);
  };

  const handleKeySelect = () => {
    if (!textRef.current || selectionBlocked) return;
    const snapshot = getTextSelectionSnapshot(textRef.current);
    if (!snapshot) {
      clearSelectionMenu();
      return;
    }
    const position = getKeyboardSelectionMenuPosition(textRef.current);
    setMenuPos(position);
    setSelectedText(snapshot.text);
    setSelectionRange(snapshot.range);
  };

  const handleMouseMove = useMemo(() => debounce((e: React.MouseEvent) => {
    if (selectionBlocked || !textRef.current) return;
    const snapshot = getTextSelectionSnapshot(textRef.current);
    if (!snapshot) {
      if (menuPos) setMenuPos(null);
      return;
    }
    applySelectionMenu(snapshot.text, snapshot.range, e.clientX, e.clientY);
  }, 100), [selectionBlocked, menuPos]);

  const handleChapterClick = (chapter: Chapter) => { setGenModal({ isOpen: true, chapter }); };
  const handleEnterEditor = () => {
    if (genModal.chapter) { setActiveChapterId(genModal.chapter.id); setGenModal({ isOpen: false, chapter: null }); }
  };

  const runAITemplate = async (template: PromptTemplate, overrideContent?: string) => {
    const targetChapter = genModal.chapter || activeChapter;
    if (!targetChapter) return;

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
          .map(k => `【参考资料：${k.name}】\n${k.content.substring(0, 10000)}`) // 简单防止过长
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
                if (c.role) info += `\n- 身份/角色：${c.role}`;
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
              const newContent = currentContent.substring(0, selectionRange.start) + result + currentContent.substring(selectionRange.end);
              
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
              onUpdate({ chapters: updatedChapters });
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
              onUpdate({ chapters: newChapters });
            }
            
            setIsGenerating(false);
            setSelectionRange(null);
            setSelectedText("");
          }
        }, { signal: abortController.signal });
      } catch (err) {
        console.error(err);
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
          const newContent = currentContent.substring(0, selectionRange.start) + result.content + currentContent.substring(selectionRange.end);
          
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
          onUpdate({ chapters: updatedChapters });
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
          onUpdate({ chapters: newChapters });
        }
      } catch (err) {
        console.error(err);
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
      setIsStreaming(false);
      setIsGenerating(false);
      setStreamingAbortController(null);
      setStreamingContent("");
      setStreamingResponse(null);
      setStreamingTokens({ prompt: 0, completion: 0, total: 0 });
    }
  };

  const generateSingleChapter = async (chapter: Chapter, template: PromptTemplate, externalSignal?: AbortSignal): Promise<{content: string, historyRecord?: AIHistoryRecord}> => {
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
            .map(k => `【参考资料：${k.name}】\n${k.content.substring(0, 10000)}`)
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
                  if (c.role) info += `\n- 身份/角色：${c.role}`;
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

      const shouldUseStreaming = outputMode === 'streaming' && activeModel.supportsStreaming !== false;

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
          AIService.callStreaming(activeModel, finalPrompt, (response) => {
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
                activeModel,
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
        const result = await AIService.call(activeModel, finalPrompt, { signal: externalSignal });
        
        if (result.tokens) {
          setTraditionalTokens(result.tokens);
        }
        
        const currentContent = chapter.content || "";
        const newContent = currentContent.length < 50 ? result.content : (currentContent + "\n\n" + result.content);
        
        const historyRecord = AIService.buildHistoryRecordData(
          chapter.id,
          finalPrompt,
          result.content,
          activeModel,
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
      console.error(err);
      throw err;
    }
  };

  const runBatchGeneration = async () => {
    const template = prompts.find(p => p.id === selectedGenPromptId);
    if (!template || !genModal.chapter) return;

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
        
        setBatchProgress({
          current: i + 1,
          total: chaptersToGenerate.length,
          currentChapterTitle: chapter.title
        });

        try {
          const result = await generateSingleChapter(chapter, template, abortController.signal);
          
          chapterUpdates.push({
            id: chapter.id,
            content: result.content,
            historyRecord: result.historyRecord
          });
          
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`生成章节 ${chapter.title} 失败:`, err);
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
        
        onUpdate({ chapters: newChapters });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      dialogService.alert(t('editor.batchDone', { count: chapterUpdates.length }));
    } catch (err) {
      console.error(err);
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
      console.error(err);
      dialogService.alert(t('editor.extractSummaryFailed'));
    } finally {
      setIsExtractingSummary(false);
    }
  };
  const handleOpenSummaryPromptManager = () => {
    dialogService.alert(t('editor.summaryManagerTodo'));
  };

  const modalContextInfo = genModal.chapter ? getChapterContext(project.chapters, genModal.chapter) : { prevChapter: null, prevContextText: "", nextChapter: null, nextSummary: "" };

  return (
    <div className="flex h-full bg-white overflow-hidden relative animate-in fade-in duration-300">
      
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
          onClose={() => setIsSidebarOpen(false)}
          onChapterSummaryChange={updateChapterSummary}
          onOpenSummaryPromptManager={handleOpenSummaryPromptManager}
          onContentSummaryChange={updateChapterContentSummary}
          onSummaryPromptChange={setSelectedSummaryPromptId}
          onExtractSummary={handleExtractSummary}
          onChapterClick={handleChapterClick}
        />
      )}

      <div className="flex-1 flex flex-col h-full bg-gray-50/30">
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
          onBack={onBack}
          onTitleChange={updateActiveChapterTitle}
          onOpenExport={handleOpenExportModal}
          onOpenForeshadow={() => setIsForeshadowOpen(true)}
          onClearContent={handleClearContent}
          onToggleGlobalHistory={() => setIsGlobalHistorySidebarOpen(!isGlobalHistorySidebarOpen)}
          onOpenChapterHistory={() => setIsHistoryViewerOpen(true)}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onToggleFocusMode={() => setIsFocusMode((v) => !v)}
          onManualSnapshot={handleManualSnapshot}
        />

        <WritingEditorCanvas
          textRef={textRef}
          activeChapterId={activeChapterId}
          content={isStreaming ? streamingContent : (activeChapter?.content || "")}
          isFocusMode={isFocusMode}
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
          onStopStreaming={stopStreaming}
          onStopBatchGeneration={stopBatchGeneration}
        />
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


