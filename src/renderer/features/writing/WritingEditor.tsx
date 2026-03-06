import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AIHistoryRecord, Chapter, KnowledgeItem, OutputMode, PromptTemplate, StreamingAIResponse } from '../../../shared/types';
import { AIService } from '../assistant/services/aiService';
import WritingEditorToolbar from './components/WritingEditorToolbar';
import WritingSidebar from './components/WritingSidebar';
import WritingEditorOverlayLayer from './components/WritingEditorOverlayLayer';
import WritingEditorCanvas from './components/WritingEditorCanvas';
import { extractChapterSummary } from './services/summaryExtractionService';
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
  downloadTextFile,
  formatHistoryTimestamp,
  formatTokenUsage,
  getChapterContext,
  getGenerationType,
  getKeyboardSelectionMenuPosition,
  getPreviousChapterSummaryIds,
  getProviderIcon,
  getTextSelectionSnapshot,
  getFloatingMenuPosition,
  toggleSetValue,
} from './utils';

const WritingEditor: React.FC<WritingEditorProps> = ({ project, prompts, activeModel, onUpdate, initialChapterId, onBack }) => {
  const [activeChapterId, setActiveChapterId] = useState<string | null>(initialChapterId || null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputMode, setOutputMode] = useState(DEFAULT_OUTPUT_MODE);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingResponse, setStreamingResponse] = useState<StreamingAIResponse | null>(null);
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
  
  const [isHistoryViewerOpen, setIsHistoryViewerOpen] = useState(false);
  const [isGlobalHistorySidebarOpen, setIsGlobalHistorySidebarOpen] = useState(false);

  const [isExtractingSummary, setIsExtractingSummary] = useState(false);
  const [selectedSummaryPromptId, setSelectedSummaryPromptId] = useState<string>('');

  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set());
  const [selectedChapterSummaryIds, setSelectedChapterSummaryIds] = useState<Set<string>>(new Set());
  const [useOutline, setUseOutline] = useState<boolean>(true);
  const [editableSummary, setEditableSummary] = useState<string>("");
  const [isCharacterDropdownOpen, setIsCharacterDropdownOpen] = useState<boolean>(false);

  const editPrompts = useMemo(() => prompts.filter(p => p.category === 'edit'), [prompts]);
  const writingPrompts = useMemo(() => prompts.filter(p => p.category === 'writing'), [prompts]);
  const summaryPrompts = useMemo(() => prompts.filter(p => p.category === 'summary'), [prompts]);

  const activeChapter = project.chapters.find(c => c.id === activeChapterId);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (writingPrompts.length > 0 && !selectedGenPromptId) {
      setSelectedGenPromptId(writingPrompts[0].id);
    }
    if (editPrompts.length > 0 && !selectedEditPromptId) {
      setSelectedEditPromptId(editPrompts[0].id);
    }
  }, [writingPrompts, editPrompts, selectedGenPromptId, selectedEditPromptId]);

  useEffect(() => {
    if (initialChapterId) {
      setActiveChapterId(initialChapterId);
    } 
  }, [initialChapterId]);

  useEffect(() => {
    const timer = setInterval(() => onUpdate({}), 10000);
    return () => clearInterval(timer);
  }, [activeChapter?.content]);

  useEffect(() => {
    if (activeChapter) {
      setWordCount(activeChapter.content.replace(/\s+/g, '').length);
    }
  }, [activeChapter?.content]);

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

  const handleClearContent = () => {
    if (window.confirm("确定要清空当前章节的所有正文内容吗？")) {
      updateChapterContent("");
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
  const handleExecuteExport = () => {
    if (selectedExportChapterIds.size === 0) {
      alert("请至少选择一个章节。");
      return;
    }
    const fileContent = buildExportContent(project, selectedExportChapterIds);
    const filename = buildExportFilename(project.title);
    downloadTextFile(filename, fileContent);
    setExportModalOpen(false);
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
              alert(`AI 执行失败: ${response.error}`);
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
                  templateName: template.name,
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
                      templateName: template.name,
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
        });
      } catch (err) {
        console.error(err);
        setIsStreaming(false);
        setIsGenerating(false);
        setStreamingAbortController(null);
        alert("AI 流式调用失败，请检查网络或模型配置。");
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
              templateName: template.name,
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
                  templateName: template.name,
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
        alert("AI 执行失败，请检查网络或模型配置。");
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

  const generateSingleChapter = async (chapter: Chapter, template: PromptTemplate): Promise<{content: string, historyRecord?: AIHistoryRecord}> => {
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
      }

      finalPrompt += `\n\n要求：请撰写约 ${targetWordCount} 字的正文内容。`;

      const shouldUseStreaming = outputMode === 'streaming' && activeModel.supportsStreaming !== false;

      if (shouldUseStreaming) {
        setIsStreaming(true);
        setStreamingContent("");
        setStreamingResponse(null);
        
        const abortController = new AbortController();
        setStreamingAbortController(abortController);

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
                  templateName: template.name,
                  batchGeneration: true,
                  chapterTitle: chapter.title
                }
              );
              
              resolve({ content: newContent, historyRecord });
            }
          }).catch(reject);
        });
      } else {
        const result = await AIService.call(activeModel, finalPrompt);
        
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
            templateName: template.name,
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
        
        setBatchProgress({
          current: i + 1,
          total: chaptersToGenerate.length,
          currentChapterTitle: chapter.title
        });

        try {
          const result = await generateSingleChapter(chapter, template);
          
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

      alert(`批量生成完成！成功生成 ${chapterUpdates.length} 章内容。`);
    } catch (err) {
      console.error(err);
      alert(`批量生成失败：${err instanceof Error ? err.message : '未知错误'}`);
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
        name: '自定义提示词',
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

  const handleClearChapterHistory = () => {
    if (!activeChapterId) return;
    if (window.confirm('确定要删除本章所有AI生成历史记录吗？')) {
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
      alert('AI 提取摘要失败，请检查网络或模型配置。');
    } finally {
      setIsExtractingSummary(false);
    }
  };
  const handleOpenSummaryPromptManager = () => {
    alert("摘要提示词管理器功能待实现。当前使用默认摘要提示词模板。");
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
        onCloseExportModal={() => setExportModalOpen(false)}
        onToggleAllExport={toggleAllExport}
        onToggleExportChapter={toggleExportChapter}
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
      />

      {/* Sidebar & Editor Areas (保持不变) */}
      {isSidebarOpen && (
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
          wordCount={wordCount}
          lastSaved={lastSaved}
          onBack={onBack}
          onTitleChange={updateActiveChapterTitle}
          onOpenExport={handleOpenExportModal}
          onClearContent={handleClearContent}
          onToggleGlobalHistory={() => setIsGlobalHistorySidebarOpen(!isGlobalHistorySidebarOpen)}
          onOpenChapterHistory={() => setIsHistoryViewerOpen(true)}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />

        <WritingEditorCanvas
          textRef={textRef}
          activeChapterId={activeChapterId}
          content={isStreaming ? streamingContent : (activeChapter?.content || "")}
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
    </div>
  );
};

export default WritingEditor;


