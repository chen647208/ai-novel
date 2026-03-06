
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, Chapter, ModelConfig, PromptTemplate, KnowledgeItem, StreamingAIResponse, OutputMode, AIHistoryRecord } from '../types';
import { AIService } from '../services/aiService';
import AIHistoryViewer from './AIHistoryViewer';

// 防抖函数
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

interface WritingEditorProps {
  project: Project;
  prompts: PromptTemplate[];
  activeModel: ModelConfig;
  onUpdate: (updates: Partial<Project>) => void;
  initialChapterId?: string | null;
  onBack: () => void;
}

const WritingEditor: React.FC<WritingEditorProps> = ({ project, prompts, activeModel, onUpdate, initialChapterId, onBack }) => {
  const [activeChapterId, setActiveChapterId] = useState<string | null>(initialChapterId || null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [isGenerating, setIsGenerating] = useState(false);
  // 输出模式状态
  const [outputMode, setOutputMode] = useState<OutputMode>('streaming');
  
  // 流式生成相关状态
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingResponse, setStreamingResponse] = useState<StreamingAIResponse | null>(null);
  const [streamingAbortController, setStreamingAbortController] = useState<AbortController | null>(null);
  
  // 批量生成相关状态
  const [batchMode, setBatchMode] = useState<'single' | 'batch5' | 'batch10'>('single');
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentChapterTitle: '' });
  const [batchAbortController, setBatchAbortController] = useState<AbortController | null>(null);
  
  // Token消耗状态
  const [streamingTokens, setStreamingTokens] = useState({ prompt: 0, completion: 0, total: 0 });
  const [traditionalTokens, setTraditionalTokens] = useState({ prompt: 0, completion: 0, total: 0 });

  // 浮动菜单状态
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);

  // 章节生成配置弹窗状态
  const [genModal, setGenModal] = useState<{
    isOpen: boolean;
    chapter: Chapter | null;
  }>({ isOpen: false, chapter: null });
  const [targetWordCount, setTargetWordCount] = useState<number>(2000);
  const [selectedGenPromptId, setSelectedGenPromptId] = useState<string>('');
  
  // 新增：生成时选中的知识库 IDs
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<Set<string>>(new Set());

  // 润色/扩写 模态窗口状态
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEditPromptId, setSelectedEditPromptId] = useState<string>('');
  const [customEditPrompt, setCustomEditPrompt] = useState<string>(''); // 自定义提示词

  // 批量导出模态框状态
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedExportChapterIds, setSelectedExportChapterIds] = useState<Set<string>>(new Set());
  
  // AI历史记录查看器状态
  const [isHistoryViewerOpen, setIsHistoryViewerOpen] = useState(false);
  // 全局AI历史记录侧边栏状态
  const [isGlobalHistorySidebarOpen, setIsGlobalHistorySidebarOpen] = useState(false);

  // 章节正文摘要相关状态
  const [isExtractingSummary, setIsExtractingSummary] = useState(false);
  const [selectedSummaryPromptId, setSelectedSummaryPromptId] = useState<string>('');

  // AI提示词注入增强功能相关状态
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

  // 初始化默认选中的模板
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

  // 当打开生成弹窗时，默认清除上次选择
  useEffect(() => {
    if (genModal.isOpen) {
      setSelectedKnowledgeIds(new Set()); 
    }
  }, [genModal.isOpen]);

  // 当打开生成弹窗时，设置editableSummary为当前章节的细纲
  useEffect(() => {
    if (genModal.isOpen && genModal.chapter) {
      setEditableSummary(genModal.chapter.summary || "");
    }
  }, [genModal.isOpen, genModal.chapter]);

  // --- 辅助函数：获取相邻章节上下文 ---
  const getChapterContext = (currentChap: Chapter) => {
    const sorted = [...project.chapters].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(c => c.id === currentChap.id);
    
    // 上一章（用于接龙）
    const prevChapter = idx > 0 ? sorted[idx - 1] : null;
    const prevContent = prevChapter?.content?.trim() || "";
    // 截取上一章最后 800 字
    const prevContextText = prevContent.length > 800 ? "..." + prevContent.slice(-800) : prevContent;

    // 下一章（用于铺垫）
    const nextChapter = idx < sorted.length - 1 ? sorted[idx + 1] : null;
    const nextSummary = nextChapter?.summary?.trim() || "";

    return { prevChapter, prevContextText, nextChapter, nextSummary };
  };

  const updateChapterContent = (text: string) => {
    if (!activeChapterId) return;
    const newChapters = project.chapters.map(c => 
      c.id === activeChapterId ? { ...c, content: text } : c
    );
    onUpdate({ chapters: newChapters });
  };

  // 更新章节细纲
  const updateChapterSummary = (summary: string) => {
    if (!activeChapterId) return;
    const newChapters = project.chapters.map(c => 
      c.id === activeChapterId ? { ...c, summary } : c
    );
    onUpdate({ chapters: newChapters });
  };

  // 更新章节正文摘要
  const updateChapterContentSummary = (contentSummary: string) => {
    if (!activeChapterId) return;
    const newChapters = project.chapters.map(c => 
      c.id === activeChapterId ? { ...c, contentSummary } : c
    );
    onUpdate({ chapters: newChapters });
  };

  const handleClearContent = () => {
    if (window.confirm("确定要清空当前章节的所有正文内容吗？")) {
      updateChapterContent("");
    }
  };

  // --- 导出逻辑 ---
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
    if (selectedExportChapterIds.size === 0) { alert("请至少选择一个章节。"); return; }
    const chaptersToExport = project.chapters.filter(c => selectedExportChapterIds.has(c.id)).sort((a, b) => a.order - b.order);
    let fileContent = `《${project.title}》\n\n`;
    if (project.intro) fileContent += `简介：\n${project.intro}\n\n================================\n\n`;
    chaptersToExport.forEach(c => {
      fileContent += `第 ${c.order + 1} 章：${c.title}\n\n${c.content || "（暂无内容）"}\n\n--------------------------------\n\n`;
    });
    const safeTitle = project.title.replace(/[\\/:*?"<>|]/g, "_");
    const filename = `${safeTitle}_导出稿_${new Date().toISOString().split('T')[0]}.txt`;
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
  };

  // 处理知识库选择
  const toggleKnowledge = (id: string) => {
     const newSet = new Set(selectedKnowledgeIds);
     if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
     setSelectedKnowledgeIds(newSet);
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

  // AI提示词注入增强功能辅助函数
  // 1. 角色选择/取消选择
  const toggleCharacter = (id: string) => {
    const newSet = new Set(selectedCharacterIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedCharacterIds(newSet);
  };

  // 2. 章节摘要选择/取消选择
  const toggleChapterSummary = (id: string) => {
    const newSet = new Set(selectedChapterSummaryIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedChapterSummaryIds(newSet);
  };

  // 3. 全选/清空角色
  const selectAllCharacters = () => {
    const allIds = project.characters.map(c => c.id);
    setSelectedCharacterIds(new Set(allIds));
  };

  const clearAllCharacters = () => {
    setSelectedCharacterIds(new Set());
  };

  // 4. 全选/清空章节摘要
  const selectAllChapterSummaries = () => {
    // 获取当前章节之前的所有章节（按顺序）
    const currentChapter = genModal.chapter || activeChapter;
    if (!currentChapter) return;
    
    const sortedChapters = [...project.chapters].sort((a, b) => a.order - b.order);
    const currentIndex = sortedChapters.findIndex(c => c.id === currentChapter.id);
    
    // 选择当前章节之前的所有章节（最多前5章）
    const previousChapters = sortedChapters.slice(Math.max(0, currentIndex - 5), currentIndex);
    const previousChapterIds = previousChapters
      .filter(c => c.contentSummary && c.contentSummary.trim().length > 0)
      .map(c => c.id);
    
    setSelectedChapterSummaryIds(new Set(previousChapterIds));
  };

  const clearAllChapterSummaries = () => {
    setSelectedChapterSummaryIds(new Set());
  };

  // 处理鼠标文本选择
  const handleMouseSelect = (e: React.MouseEvent) => {
    if (!textRef.current) return;
    if (editModalOpen || genModal.isOpen || exportModalOpen) return;
    const start = textRef.current.selectionStart;
    const end = textRef.current.selectionEnd;
    const text = textRef.current.value.substring(start, end);
    if (text.trim().length > 0) {
      // 使用鼠标位置直接显示菜单
      const xPos = e.clientX;
      const yPos = e.clientY;
      
      // 添加偏移量，使菜单显示在鼠标右下方
      const offsetX = 10;
      const offsetY = 10;
      
      // 确保菜单位置在视口内
      const menuWidth = 200;
      const menuHeight = 60;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let finalXPos = xPos + offsetX;
      let finalYPos = yPos + offsetY;
      
      // 检查X轴边界
      if (finalXPos + menuWidth > viewportWidth - 20) {
        finalXPos = viewportWidth - menuWidth - 20;
      } else if (finalXPos < 20) {
        finalXPos = 20;
      }
      
      // 检查Y轴边界
      if (finalYPos + menuHeight > viewportHeight - 20) {
        finalYPos = yPos - menuHeight - 10; // 显示在鼠标上方
      } else if (finalYPos < 20) {
        finalYPos = 20;
      }
      
      setMenuPos({ x: finalXPos, y: finalYPos });
      setSelectedText(text);
      setSelectionRange({ start, end });
    } else {
      setMenuPos(null);
      setSelectedText("");
    }
  };

  // 处理键盘文本选择
  const handleKeySelect = () => {
    if (!textRef.current) return;
    if (editModalOpen || genModal.isOpen || exportModalOpen) return;
    const start = textRef.current.selectionStart;
    const end = textRef.current.selectionEnd;
    const text = textRef.current.value.substring(start, end);
    if (text.trim().length > 0) {
      // 对于键盘选择，使用默认位置（textarea中间）
      const textareaRect = textRef.current.getBoundingClientRect();
      const xPos = textareaRect.left + textareaRect.width / 2 - 100; // 菜单宽度的一半
      const yPos = textareaRect.top + textareaRect.height / 2 - 30; // 菜单高度的一半
      
      // 确保菜单位置在视口内
      const menuWidth = 200;
      const menuHeight = 60;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let finalXPos = xPos;
      let finalYPos = yPos;
      
      // 检查X轴边界
      if (xPos + menuWidth > viewportWidth - 20) {
        finalXPos = viewportWidth - menuWidth - 20;
      } else if (xPos < 20) {
        finalXPos = 20;
      }
      
      // 检查Y轴边界
      if (yPos + menuHeight > viewportHeight - 20) {
        finalYPos = yPos - menuHeight - 10;
      } else if (yPos < 20) {
        finalYPos = 20;
      }
      
      setMenuPos({ x: finalXPos, y: finalYPos });
      setSelectedText(text);
      setSelectionRange({ start, end });
    } else {
      setMenuPos(null);
      setSelectedText("");
    }
  };

  // 处理鼠标移动事件（用于检测文本选择状态）
  const handleMouseMove = useMemo(() => debounce((e: React.MouseEvent) => {
    // 只在没有其他模态窗口打开时处理
    if (editModalOpen || genModal.isOpen || exportModalOpen) return;
    
    // 检查是否有选中的文本
    if (!textRef.current) return;
    const start = textRef.current.selectionStart;
    const end = textRef.current.selectionEnd;
    if (start === end) {
      // 没有选中文本，隐藏菜单
      if (menuPos) setMenuPos(null);
      return;
    }
    
    // 有选中文本，计算并显示菜单
    const text = textRef.current.value.substring(start, end);
    if (text.trim().length > 0) {
      // 使用鼠标位置直接显示菜单
      const xPos = e.clientX;
      const yPos = e.clientY;
      
      // 添加偏移量，使菜单显示在鼠标右下方
      const offsetX = 10;
      const offsetY = 10;
      
      // 确保菜单位置在视口内
      const menuWidth = 200;
      const menuHeight = 60;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let finalXPos = xPos + offsetX;
      let finalYPos = yPos + offsetY;
      
      // 检查X轴边界
      if (finalXPos + menuWidth > viewportWidth - 20) {
        finalXPos = viewportWidth - menuWidth - 20;
      } else if (finalXPos < 20) {
        finalXPos = 20;
      }
      
      // 检查Y轴边界
      if (finalYPos + menuHeight > viewportHeight - 20) {
        finalYPos = yPos - menuHeight - 10; // 显示在鼠标上方
      } else if (finalYPos < 20) {
        finalYPos = 20;
      }
      
      setMenuPos({ x: finalXPos, y: finalYPos });
      setSelectedText(text);
      setSelectionRange({ start, end });
    }
  }, 100), [editModalOpen, genModal.isOpen, exportModalOpen, menuPos]);

  const handleChapterClick = (chapter: Chapter) => { setGenModal({ isOpen: true, chapter }); };
  const handleEnterEditor = () => {
    if (genModal.chapter) { setActiveChapterId(genModal.chapter.id); setGenModal({ isOpen: false, chapter: null }); }
  };

  // 执行 AI 任务
  const runAITemplate = async (template: PromptTemplate, overrideContent?: string) => {
    const targetChapter = genModal.chapter || activeChapter;
    if (!targetChapter) return;

    setIsGenerating(true);
    setMenuPos(null);
    setEditModalOpen(false);
    // 重置token状态
    setStreamingTokens({ prompt: 0, completion: 0, total: 0 });
    setTraditionalTokens({ prompt: 0, completion: 0, total: 0 });
    
    if (genModal.isOpen && genModal.chapter) {
      setActiveChapterId(genModal.chapter.id);
      setGenModal({ isOpen: false, chapter: null });
    }

    let finalPrompt = template.content;
    const context = overrideContent || selectedText || targetChapter.content;

    // 获取相邻章节上下文
    const { prevChapter, prevContextText, nextChapter, nextSummary } = getChapterContext(targetChapter);

    // 检查提示词中是否包含{content}变量
    const hasContentVariable = finalPrompt.includes('{content}');
    
    // 如果提示词中没有{content}变量，自动将内容添加到提示词末尾
    if (!hasContentVariable && context) {
      finalPrompt += `\n\n需要处理的原文内容：\n"""\n${context}\n"""\n\n请根据上述内容进行处理。`;
    }
    
    // 执行变量替换
    finalPrompt = finalPrompt
      .replace('{content}', context)
      .replace('{title}', project.title)
      .replace('{chapter_title}', targetChapter.title)
      .replace('{summary}', targetChapter.summary)
      .replace('{inspiration}', project.inspiration);

    // 1. 注入知识库内容 (RAG-lite)
    if (selectedKnowledgeIds.size > 0 && project.knowledge) {
       const knowledgeContent = project.knowledge
          .filter(k => selectedKnowledgeIds.has(k.id))
          .map(k => `【参考资料：${k.name}】\n${k.content.substring(0, 10000)}`) // 简单防止过长
          .join('\n\n');
       
       if (knowledgeContent) {
          finalPrompt += `\n\n### 必须参考的背景资料 (Knowledge Base)\n请务必参考以下设定资料进行创作：\n\n${knowledgeContent}\n\n`;
       }
    }

    // 2. AI提示词注入增强功能
    // 2.1 小说大纲注入
    if (useOutline && project.outline && project.outline.trim().length > 0) {
        finalPrompt += `\n\n### 小说整体大纲 (Novel Outline)\n请严格遵循以下整体故事大纲进行创作：\n"""\n${project.outline}\n"""\n\n`;
    }

    // 2.2 角色信息注入
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

    // 2.3 章节正文摘要注入
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

    // 2.4 细纲自由编辑注入
    if (editableSummary && editableSummary.trim().length > 0) {
        finalPrompt += `\n\n### 本章细纲补充 (Enhanced Chapter Outline)\n请优先参考以下补充细纲进行创作：\n"""\n${editableSummary.trim()}\n"""\n\n`;
    }

    // 3. 注入上下文 (上一章/下一章) - 强制接龙逻辑
    if (template.category !== 'edit') {
        // A. 承接上文
        if (prevContextText && prevContextText.length > 0) {
            finalPrompt += `\n\n### 情节连贯性要求 (Critical)\n1. **承接上文**：上一章${prevChapter ? `《${prevChapter.title}》` : ''}的结尾内容如下：\n"""\n${prevContextText}\n"""\n请务必紧接上述情节、氛围和人物状态继续描写，严禁割裂。`;
        } else {
            finalPrompt += `\n\n### 情节说明\n这是本书的第一章（或上一章暂无内容），请开始全新的叙述。`;
        }

        // B. 铺垫下文
        if (nextSummary && nextSummary.length > 0) {
            finalPrompt += `\n\n2. **铺垫下文**：下一章${nextChapter ? `《${nextChapter.title}》` : ''}的预告是：\n"${nextSummary}"\n请在本章结尾为后续发展埋下伏笔或做好铺垫。`;
        }

        finalPrompt += `\n\n### 核心指令\n重点依据本章细纲（${targetChapter.summary}）创作。请确保逻辑自洽，文笔流畅。`;
    }

    if (genModal.isOpen) {
       finalPrompt += `\n\n要求：请撰写约 ${targetWordCount} 字的正文内容。`;
    }

    // 根据输出模式选择调用方式
    const shouldUseStreaming = outputMode === 'streaming' && activeModel.supportsStreaming !== false;

    if (shouldUseStreaming) {
      // 使用流式调用
      setIsStreaming(true);
      setStreamingContent("");
      setStreamingResponse(null);
      
      // 创建AbortController用于停止流式响应
      const abortController = new AbortController();
      setStreamingAbortController(abortController);

      try {
        await AIService.callStreaming(activeModel, finalPrompt, (response) => {
          // 更新流式内容
          setStreamingContent(response.content);
          setStreamingResponse(response);
          
          // 更新流式token信息
          if (response.tokens) {
            setStreamingTokens(response.tokens);
          }

          if (response.isComplete) {
            // 流式完成，将内容插入到章节中
            setIsStreaming(false);
            setStreamingAbortController(null);
            
            if (response.error) {
              alert(`AI 执行失败: ${response.error}`);
              return;
            }

            const result = response.content;
            if (selectedText && selectionRange && !genModal.isOpen) {
              // 润色/插入模式
              const currentContent = activeChapter?.content || "";
              const newContent = currentContent.substring(0, selectionRange.start) + result + currentContent.substring(selectionRange.end);
              
              // 保存历史记录（润色模式）
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
              
              // 更新章节的内容和历史记录（一次性更新）
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
              // 全新生成/续写模式
              const currentContent = targetChapter.content || "";
              // 如果原有内容很少，直接替换；否则追加
              const newContent = currentContent.length < 50 ? result : (currentContent + "\n\n" + result);
              const newChapters = project.chapters.map(c => {
                if (c.id === targetChapter.id) {
                  // 保存历史记录
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
            
            // 重置状态
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
      // 使用普通调用
      try {
        const result = await AIService.call(activeModel, finalPrompt);
        
        // 保存传统输出模式的token信息
        if (result.tokens) {
          setTraditionalTokens(result.tokens);
        }
        
        if (selectedText && selectionRange && !genModal.isOpen) {
          // 润色/插入模式
          const currentContent = activeChapter?.content || "";
          const newContent = currentContent.substring(0, selectionRange.start) + result.content + currentContent.substring(selectionRange.end);
          
          // 保存历史记录（润色模式）
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
          
          // 更新章节的内容和历史记录（一次性更新）
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
          // 全新生成/续写模式
          const currentContent = targetChapter.content || "";
          // 如果原有内容很少，直接替换；否则追加
          const newContent = currentContent.length < 50 ? result.content : (currentContent + "\n\n" + result.content);
          const newChapters = project.chapters.map(c => {
            if (c.id === targetChapter.id) {
              // 保存历史记录
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

  // 停止流式响应
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

  // 批量生成单个章节 - 返回生成的内容
  const generateSingleChapter = async (chapter: Chapter, template: PromptTemplate): Promise<{content: string, historyRecord?: AIHistoryRecord}> => {
    try {
      // 设置当前章节为活动章节
      setActiveChapterId(chapter.id);
      
      // 构建提示词
      let finalPrompt = template.content;
      const context = chapter.content;

      // 获取相邻章节上下文
      const { prevChapter, prevContextText, nextChapter, nextSummary } = getChapterContext(chapter);

      finalPrompt = finalPrompt
        .replace('{content}', context)
        .replace('{title}', project.title)
        .replace('{chapter_title}', chapter.title)
        .replace('{summary}', chapter.summary)
        .replace('{inspiration}', project.inspiration);

      // 注入知识库内容
      if (selectedKnowledgeIds.size > 0 && project.knowledge) {
         const knowledgeContent = project.knowledge
            .filter(k => selectedKnowledgeIds.has(k.id))
            .map(k => `【参考资料：${k.name}】\n${k.content.substring(0, 10000)}`)
            .join('\n\n');
         
         if (knowledgeContent) {
            finalPrompt += `\n\n### 必须参考的背景资料 (Knowledge Base)\n请务必参考以下设定资料进行创作：\n\n${knowledgeContent}\n\n`;
         }
      }

      // AI提示词注入增强功能
      // 1. 小说大纲注入
      if (useOutline && project.outline && project.outline.trim().length > 0) {
          finalPrompt += `\n\n### 小说整体大纲 (Novel Outline)\n请严格遵循以下整体故事大纲进行创作：\n"""\n${project.outline}\n"""\n\n`;
      }

      // 2. 角色信息注入
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

      // 3. 章节正文摘要注入
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

      // 4. 细纲自由编辑注入
      if (editableSummary && editableSummary.trim().length > 0) {
          finalPrompt += `\n\n### 本章细纲补充 (Enhanced Chapter Outline)\n请优先参考以下补充细纲进行创作：\n"""\n${editableSummary.trim()}\n"""\n\n`;
      }

      // 5. 注入上下文
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

      // 根据输出模式选择调用方式
      const shouldUseStreaming = outputMode === 'streaming' && activeModel.supportsStreaming !== false;

      if (shouldUseStreaming) {
        // 流式调用
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
              
              // 创建历史记录
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
        // 传统调用
        const result = await AIService.call(activeModel, finalPrompt);
        
        if (result.tokens) {
          setTraditionalTokens(result.tokens);
        }
        
        const currentContent = chapter.content || "";
        const newContent = currentContent.length < 50 ? result.content : (currentContent + "\n\n" + result.content);
        
        // 创建历史记录
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

  // 批量生成逻辑 - 优化保存机制
  const runBatchGeneration = async () => {
    const template = prompts.find(p => p.id === selectedGenPromptId);
    if (!template || !genModal.chapter) return;

    // 保存 chapter 引用，避免 setGenModal 后变为 null
    const targetChapter = genModal.chapter;

    setIsBatchGenerating(true);
    setGenModal({ isOpen: false, chapter: null });

    // 确定要生成的章节数量
    const chapterCount = batchMode === 'batch5' ? 5 : 10;
    
    // 获取排序后的章节列表
    const sortedChapters = [...project.chapters].sort((a, b) => a.order - b.order);
    
    // 找到起始章节的索引
    const startIndex = sortedChapters.findIndex(c => c.id === targetChapter.id);
    
    // 确定要生成的章节范围
    const chaptersToGenerate = sortedChapters.slice(startIndex, startIndex + chapterCount);
    
    // 创建AbortController
    const abortController = new AbortController();
    setBatchAbortController(abortController);

    try {
      // 收集所有章节的更新和历史记录
      const chapterUpdates: Array<{id: string, content: string, historyRecord?: AIHistoryRecord}> = [];
      
      for (let i = 0; i < chaptersToGenerate.length; i++) {
        // 检查是否被中断
        if (abortController.signal.aborted) {
          break;
        }

        const chapter = chaptersToGenerate[i];
        
        // 更新进度
        setBatchProgress({
          current: i + 1,
          total: chaptersToGenerate.length,
          currentChapterTitle: chapter.title
        });

        try {
          // 生成当前章节内容
          const result = await generateSingleChapter(chapter, template);
          
          // 收集更新
          chapterUpdates.push({
            id: chapter.id,
            content: result.content,
            historyRecord: result.historyRecord
          });
          
          // 短暂延迟，让用户看到进度更新
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`生成章节 ${chapter.title} 失败:`, err);
          // 继续生成其他章节，不中断整个批量生成
          continue;
        }
      }

      // 批量更新所有章节 - 单次调用onUpdate避免状态更新合并问题
      if (chapterUpdates.length > 0) {
        const newChapters = project.chapters.map(c => {
          const update = chapterUpdates.find(u => u.id === c.id);
          if (update) {
            // 更新章节内容和历史记录
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
        
        // 单次调用onUpdate，确保所有更新一次性保存
        onUpdate({ chapters: newChapters });
        
        // 等待状态更新完成
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 批量生成完成
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

  // 停止批量生成
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
    // 优先使用自定义提示词
    if (customEditPrompt && customEditPrompt.trim() !== '') {
      // 创建临时PromptTemplate对象
      const customTemplate: PromptTemplate = {
        id: 'custom-prompt-' + Date.now(),
        category: 'edit',
        name: '自定义提示词',
        content: customEditPrompt.trim()
      };
      runAITemplate(customTemplate);
    } else {
      // 使用选中的模板
      const template = prompts.find(p => p.id === selectedEditPromptId);
      if (template) runAITemplate(template);
    }
  };
  const openEditModal = () => { 
    setMenuPos(null); 
    setEditModalOpen(true); 
    // 清空自定义提示词，以便每次打开都是干净的
    setCustomEditPrompt('');
  };

  // 提取章节正文摘要
  const handleExtractSummary = async () => {
    if (!activeChapter || !activeChapter.content || activeChapter.content.trim().length === 0) {
      alert("当前章节没有正文内容，无法提取摘要。");
      return;
    }

    if (summaryPrompts.length === 0) {
      alert("没有可用的摘要提示词模板，请先添加摘要类别的提示词。");
      return;
    }

    // 如果没有选择摘要提示词，使用第一个
    const selectedPromptId = selectedSummaryPromptId || (summaryPrompts.length > 0 ? summaryPrompts[0].id : '');
    if (!selectedPromptId) {
      alert("请选择摘要提示词模板。");
      return;
    }

    const template = prompts.find(p => p.id === selectedPromptId);
    if (!template) {
      alert("选择的摘要提示词模板不存在。");
      return;
    }

    setIsExtractingSummary(true);

    try {
      // 构建提示词
      let finalPrompt = template.content;
      const context = activeChapter.content;

      // 检查提示词中是否包含{content}变量
      const hasContentVariable = finalPrompt.includes('{content}');
      
      // 如果提示词中没有{content}变量，自动将内容添加到提示词末尾
      if (!hasContentVariable && context) {
        finalPrompt += `\n\n需要处理的原文内容：\n"""\n${context}\n"""\n\n请根据上述内容进行处理。`;
      }
      
      // 执行变量替换
      finalPrompt = finalPrompt
        .replace('{content}', context)
        .replace('{title}', project.title)
        .replace('{chapter_title}', activeChapter.title)
        .replace('{summary}', activeChapter.summary)
        .replace('{inspiration}', project.inspiration);

      // 使用传统输出模式提取摘要（摘要通常较短，不需要流式）
      const result = await AIService.call(activeModel, finalPrompt);
      
      if (result.error) {
        alert(`AI 提取摘要失败: ${result.error}`);
        return;
      }

      // 更新章节的contentSummary字段
      const newChapters = project.chapters.map(c => {
        if (c.id === activeChapter.id) {
          return {
            ...c,
            contentSummary: result.content
          };
        }
        return c;
      });
      
      onUpdate({ chapters: newChapters });
      
      // 保存历史记录
      const historyRecord = AIService.buildHistoryRecordData(
        activeChapter.id,
        finalPrompt,
        result.content,
        activeModel,
        result,
        {
          templateName: template.name,
          batchGeneration: false,
          chapterTitle: activeChapter.title,
          operationType: 'summary_extraction'
        }
      );
      
      // 更新章节的历史记录
      const updatedChapters = newChapters.map(c => {
        if (c.id === activeChapter.id) {
          const existingHistory = c.history || [];
          return {
            ...c,
            history: [...existingHistory, historyRecord]
          };
        }
        return c;
      });
      
      onUpdate({ chapters: updatedChapters });
      
      alert("章节正文摘要提取成功！");
      
    } catch (err) {
      console.error(err);
      alert("AI 提取摘要失败，请检查网络或模型配置。");
    } finally {
      setIsExtractingSummary(false);
    }
  };

  // 打开摘要提示词管理器（占位函数，可根据需要实现）
  const handleOpenSummaryPromptManager = () => {
    alert("摘要提示词管理器功能待实现。当前使用默认摘要提示词模板。");
  };

  // 弹窗内部使用的上下文信息（用于 UI 显示）
  const modalContextInfo = genModal.chapter ? getChapterContext(genModal.chapter) : { prevChapter: null, prevContextText: "", nextChapter: null, nextSummary: "" };

  return (
    <div className="flex h-full bg-white overflow-hidden relative animate-in fade-in duration-300">
      
      {/* 1. 章节生成配置弹窗 */}
      {genModal.isOpen && genModal.chapter && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl border border-gray-100 overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-black text-gray-800 tracking-tight">AI 智能正文生成</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Context-Aware Generation</p>
              </div>
              <button onClick={() => setGenModal({ isOpen: false, chapter: null })} className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all"><i className="fas fa-times"></i></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1">
              
              {/* 信息概览卡片 */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 border-b border-gray-200">
                  <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">目标章节</div>
                  <div className="col-span-9 p-4 text-sm font-bold text-gray-800 flex items-center bg-white justify-between">
                     <span>第 {genModal.chapter.order + 1} 章：{genModal.chapter.title}</span>
                     <span className={`text-[10px] px-2 py-0.5 rounded border ${genModal.chapter.content.length > 50 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                        {genModal.chapter.content.length > 50 ? '已有内容 (AI将续写)' : '空白章节'}
                     </span>
                  </div>
                </div>

                {/* 上下文连贯性检测面板 */}
                <div className="grid grid-cols-12 border-b border-gray-200">
                   <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-blue-500 uppercase flex items-start pt-5">上下文连贯性</div>
                   <div className="col-span-9 p-4 bg-white">
                      <div className="space-y-2">
                         {modalContextInfo.prevContextText && modalContextInfo.prevContextText.length > 0 ? (
                            <div className="flex items-start gap-3">
                               <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black shrink-0">↑</div>
                               <div>
                                  <p className="text-xs font-bold text-blue-700">承接上文</p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">上一章{modalContextInfo.prevChapter ? `《${modalContextInfo.prevChapter.title}》` : ''}的最后内容已注入，AI将自动接龙。</p>
                               </div>
                            </div>
                         ) : (
                            <div className="flex items-start gap-3">
                               <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-black shrink-0">↑</div>
                               <div>
                                  <p className="text-xs font-bold text-gray-400">无上文</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">这是本书的第一章（或上一章暂无内容）。</p>
                               </div>
                            </div>
                         )}
                         {modalContextInfo.nextSummary && modalContextInfo.nextSummary.length > 0 ? (
                            <div className="flex items-start gap-3">
                               <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-black shrink-0">↓</div>
                               <div>
                                  <p className="text-xs font-bold text-green-700">铺垫下文</p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">下一章{modalContextInfo.nextChapter ? `《${modalContextInfo.nextChapter.title}》` : ''}的预告已注入，AI将自动铺垫。</p>
                               </div>
                            </div>
                         ) : (
                            <div className="flex items-start gap-3">
                               <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-black shrink-0">↓</div>
                               <div>
                                  <p className="text-xs font-bold text-gray-400">无下文</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">暂无后续章节预告。</p>
                               </div>
                            </div>
                         )}
                      </div>
                   </div>
                </div>
              </div>
              
              {/* AI提示词注入增强功能区域 */}
              <div className="space-y-6">
                {/* 区域A：小说大纲关联 */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="grid grid-cols-12 border-b border-gray-200">
                    <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">A. 小说大纲</div>
                    <div className="col-span-9 p-4 bg-white">
                      <button 
                        onClick={() => setUseOutline(!useOutline)}
                        className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                          useOutline 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <i className="fas fa-book"></i>
                        {useOutline ? '已关联小说大纲' : '关联小说大纲'}
                      </button>
                      <p className="text-[10px] text-gray-400 mt-2">
                        * 关联后，AI将参考作品的整体大纲进行创作，确保情节连贯性。
                      </p>
                    </div>
                  </div>
                </div>

                {/* 区域B：角色选择器 */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="grid grid-cols-12 border-b border-gray-200">
                    <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">B. 角色库</div>
                    <div className="col-span-9 p-4 bg-white">
                      <div className="flex gap-3 mb-3">
                        <button 
                          onClick={selectAllCharacters}
                          className="px-4 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          全选角色
                        </button>
                        <button 
                          onClick={clearAllCharacters}
                          className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          清空选择
                        </button>
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto custom-scrollbar border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                        {project.characters.map(character => {
                          const isSelected = selectedCharacterIds.has(character.id);
                          return (
                            <div 
                              key={character.id}
                              onClick={() => toggleCharacter(character.id)}
                              className={`flex items-start gap-3 p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'bg-blue-50 border border-blue-100' 
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 ${
                                isSelected 
                                  ? 'bg-blue-500 border-blue-500 text-white' 
                                  : 'bg-white border-gray-300'
                              }`}>
                                {isSelected && <i className="fas fa-check text-[10px]"></i>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <div className="text-sm font-bold text-gray-800">
                                    {character.name}
                                  </div>
                                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                                    isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {character.role || '未指定'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1 line-clamp-2">
                                  {character.personality || character.background || '暂无角色描述'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {project.characters.length === 0 && (
                          <div className="text-center py-4 text-gray-400 text-sm">
                            暂无角色信息，请先在世界与角色库中添加角色。
                          </div>
                        )}
                      </div>
                      
                      <p className="text-[10px] text-gray-400 mt-2">
                        * 选择角色后，AI将参考这些角色的设定进行创作。显示格式：角色名字 + 角色类型（主角、配角、反派等）。
                      </p>
                    </div>
                  </div>
                </div>

                {/* 区域C：章节正文摘要选择器 */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="grid grid-cols-12 border-b border-gray-200">
                    <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">C. 章节摘要</div>
                    <div className="col-span-9 p-4 bg-white">
                      <div className="flex gap-3 mb-3">
                        <button 
                          onClick={selectAllChapterSummaries}
                          className="px-4 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          智能选择前5章
                        </button>
                        <button 
                          onClick={clearAllChapterSummaries}
                          className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          清空选择
                        </button>
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto custom-scrollbar border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                        {project.chapters
                          .sort((a, b) => a.order - b.order)
                          .filter(chapter => chapter.contentSummary && chapter.contentSummary.trim().length > 0)
                          .map(chapter => {
                            const isSelected = selectedChapterSummaryIds.has(chapter.id);
                            const isCurrentChapter = genModal.chapter?.id === chapter.id;
                            return (
                              <div 
                                key={chapter.id}
                                onClick={() => !isCurrentChapter && toggleChapterSummary(chapter.id)}
                                className={`flex items-start gap-3 p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                                  isCurrentChapter 
                                    ? 'bg-gray-100 cursor-not-allowed' 
                                    : isSelected 
                                      ? 'bg-green-50 border border-green-100' 
                                      : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 ${
                                  isCurrentChapter 
                                    ? 'bg-gray-300 border-gray-300 text-gray-400' 
                                    : isSelected 
                                      ? 'bg-green-500 border-green-500 text-white' 
                                      : 'bg-white border-gray-300'
                                }`}>
                                  {isCurrentChapter && <i className="fas fa-ban text-[8px]"></i>}
                                  {!isCurrentChapter && isSelected && <i className="fas fa-check text-[10px]"></i>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                    <div className="text-sm font-bold text-gray-800">
                                      第{chapter.order + 1}章：{chapter.title}
                                      {isCurrentChapter && <span className="ml-2 text-xs text-gray-500">(当前章节)</span>}
                                    </div>
                                    {!isCurrentChapter && (
                                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                                        isSelected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        {isSelected ? '已选择' : '未选择'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-gray-500 mt-1 line-clamp-2">
                                    {chapter.contentSummary}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        }
                        
                        {project.chapters.filter(c => c.contentSummary && c.contentSummary.trim().length > 0).length === 0 && (
                          <div className="text-center py-4 text-gray-400 text-sm">
                            暂无章节正文摘要，请先使用AI提取摘要功能。
                          </div>
                        )}
                      </div>
                      
                      <p className="text-[10px] text-gray-400 mt-2">
                        * 选择前面章节的正文摘要，AI将参考这些摘要进行连贯性创作。
                      </p>
                    </div>
                  </div>
                </div>

                {/* 区域D：细纲自由编辑 */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="grid grid-cols-12 border-b border-gray-200">
                    <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-start pt-5">D. 细纲编辑</div>
                    <div className="col-span-9 p-4 bg-white">
                      <textarea
                        value={editableSummary}
                        onChange={(e) => setEditableSummary(e.target.value)}
                        placeholder="在此自由编辑或补充本章细纲，AI将参考此内容进行创作..."
                        className="w-full bg-amber-50/50 border border-amber-100 text-gray-700 text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-200 resize-none h-32 custom-scrollbar"
                      />
                      <p className="text-[10px] text-gray-400 mt-2">
                        * 此处编辑的内容将作为本章细纲的补充，优先于原始细纲。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 知识库选择区域 */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 border-b border-gray-200">
                  <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">知识库注入</div>
                  <div className="col-span-9 p-4 bg-white">
                    <div className="flex gap-3 mb-3">
                      <button onClick={selectAllKnowledge} className="px-4 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors">全选</button>
                      <button onClick={clearAllKnowledge} className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors">清空</button>
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                      {project.knowledge && project.knowledge.filter(k => k.category === 'writing').length > 0 ? (
                        project.knowledge.filter(k => k.category === 'writing').map(k => {
                          const isSelected = selectedKnowledgeIds.has(k.id);
                          return (
                            <div key={k.id} onClick={() => toggleKnowledge(k.id)} className={`flex items-center gap-3 p-3 rounded-lg mb-2 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}>
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300'}`}>
                                {isSelected && <i className="fas fa-check text-[10px]"></i>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-gray-800 truncate">{k.name}</div>
                                <div className="text-[10px] text-gray-500 truncate">{k.category}</div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-gray-400 text-sm">
                          暂无写作知识库，请先添加知识库。
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">
                      * 选择知识库后，AI将参考这些设定资料进行创作。
                    </p>
                  </div>
                </div>
              </div>
              
              {/* 生成模板选择区域 */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 border-b border-gray-200">
                  <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">生成模板</div>
                  <div className="col-span-9 p-4 bg-white">
                    <select 
                      value={selectedGenPromptId} 
                      onChange={(e) => setSelectedGenPromptId(e.target.value)}
                      className="w-full bg-blue-50/50 border border-blue-100 text-blue-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer hover:bg-blue-50 transition-colors"
                    >
                      {writingPrompts.map(p => (
                        <option key={p.id} value={p.id}>📝 {p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
{/* 字数目标选择区域 */}
<div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
  <div className="grid grid-cols-12 border-b border-gray-200">
    <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">字数目标</div>
    <div className="col-span-9 p-4 bg-white">
      <div className="flex items-center gap-4">
        <input 
          type="number" 
          min="1"
          value={targetWordCount}
          onChange={(e) => setTargetWordCount(parseInt(e.target.value) || 1)}
          className="flex-1 bg-blue-50/50 border border-blue-100 text-blue-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="输入字数..."
        />
        <div className="text-sm font-bold text-blue-600 min-w-[80px] text-right">
          字
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-2">
        * 手动输入期望生成的字数，不设上限。
      </p>
    </div>
  </div>
</div>
              
              {/* 批量生成模式选择区域 */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 border-b border-gray-200">
                  <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">批量模式</div>
                  <div className="col-span-9 p-4 bg-white">
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setBatchMode('single')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                          batchMode === 'single' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        单章生成
                      </button>
                      <button 
                        onClick={() => setBatchMode('batch5')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                          batchMode === 'batch5' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        批量5章
                      </button>
                      <button 
                        onClick={() => setBatchMode('batch10')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                          batchMode === 'batch10' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        批量10章
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">
                      * 选择批量模式可一次性生成多章内容。
                    </p>
                  </div>
                </div>
              </div>
              
              {/* 输出模式选择区域 */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 border-b border-gray-200">
                  <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">输出模式</div>
                  <div className="col-span-9 p-4 bg-white">
                    <select 
                      value={outputMode}
                      onChange={(e) => setOutputMode(e.target.value as OutputMode)}
                      className="w-full bg-purple-50/50 border border-purple-100 text-purple-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer hover:bg-purple-50 transition-colors"
                    >
                      <option value="streaming">流式输出</option>
                      <option value="traditional">传统输出</option>
                    </select>
                    
                    {/* 流式输出状态提示 */}
                    <div className="mt-3 p-3 bg-white/80 border border-purple-100 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${activeModel.supportsStreaming !== false ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                          <span className="text-xs font-bold text-gray-700">
                            当前模型支持流式输出：
                          </span>
                        </div>
                        <span className={`text-xs font-black px-2 py-1 rounded ${activeModel.supportsStreaming !== false ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                          {activeModel.supportsStreaming !== false ? '已开启' : '未开启'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2">
                        {activeModel.supportsStreaming !== false 
                          ? `"${activeModel.name}" 模型已配置为支持流式输出，选择流式输出模式时将实时显示生成内容。`
                          : `"${activeModel.name}" 模型未配置流式输出支持，将自动使用传统输出模式。`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                {/* Token消耗显示 */}
                {(isStreaming || isGenerating || streamingTokens.total >= 0 || traditionalTokens.total >= 0) && (
                  <div className="flex items-center gap-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-3 shadow-sm">
                    <div className="text-center">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">输入Token</div>
                      <div className="text-sm font-bold text-blue-600">
                        {isStreaming ? streamingTokens.prompt : traditionalTokens.prompt}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">输出Token</div>
                      <div className="text-sm font-bold text-green-600">
                        {isStreaming ? streamingTokens.completion : traditionalTokens.completion}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">总计</div>
                      <div className="text-sm font-bold text-purple-600">
                        {isStreaming ? streamingTokens.total : traditionalTokens.total}
                      </div>
                    </div>
                    {isStreaming && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-gray-500">生成中...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <button onClick={handleEnterEditor} className="px-6 py-3 rounded-xl text-gray-500 font-bold text-sm hover:bg-gray-200 hover:text-gray-800 transition-all">仅进入编辑器</button>
                <button onClick={handleModalGenerate} className="px-8 py-3 bg-blue-600 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"><i className="fas fa-wand-magic-sparkles"></i> 确认生成正文</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. 润色/扩写 模态窗口 (保持不变) */}
      {editModalOpen && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-gray-800 tracking-tight">AI 润色与扩写</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Text Polish & Expansion</p>
                </div>
                <button onClick={() => setEditModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all"><i className="fas fa-times"></i></button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                 <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="grid grid-cols-12 border-b border-gray-200">
                       <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-start pt-5">1. 选中文字</div>
                       <div className="col-span-9 p-4 bg-white relative group">
                          <div className="max-h-48 overflow-y-auto custom-scrollbar text-sm text-gray-600 leading-relaxed whitespace-pre-wrap italic bg-gray-50/50 p-3 rounded-lg border border-gray-100">{selectedText}</div>
                       </div>
                    </div>
                    <div className="grid grid-cols-12 border-b border-gray-200">
                       <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">2. 优化策略</div>
                       <div className="col-span-9 p-4 bg-white">
                          <select value={selectedEditPromptId} onChange={(e) => setSelectedEditPromptId(e.target.value)} className="w-full bg-blue-50/50 border border-blue-100 text-blue-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer hover:bg-blue-50 transition-colors">
                            {editPrompts.map(p => (<option key={p.id} value={p.id}>✨ {p.name}</option>))}
                          </select>
                       </div>
                    </div>
                    <div className="grid grid-cols-12 border-b border-gray-200">
                       <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-start pt-5">3. 自定义提示词</div>
                       <div className="col-span-9 p-4 bg-white">
      <textarea
        value={customEditPrompt}
        onChange={(e) => setCustomEditPrompt(e.target.value)}
        placeholder="输入自定义提示词（可选）。例如：'将这段文字改写得更生动，增加细节描写' 或 '扩写这段内容，增加300字左右'。建议包含 {content} 变量来引用选中文本。如果留空，将使用上方选择的优化策略。"
        className="w-full bg-amber-50/50 border border-amber-100 text-gray-700 text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-200 resize-none h-32 custom-scrollbar"
      />
      <p className="text-[10px] text-gray-400 mt-2">
        * 自定义提示词将优先于上方选择的优化策略。支持变量替换：{'{content}'}（选中文本）、{'{title}'}（作品标题）、{'{chapter_title}'}（章节标题）等。如果提示词中不包含 {'{content}'} 变量，系统会自动将选中文本附加到提示词末尾。
      </p>
                       </div>
                    </div>
                    <div className="grid grid-cols-12">
                       <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">4. 输出模式</div>
                       <div className="col-span-9 p-4 bg-white">
                          <select 
                            value={outputMode}
                            onChange={(e) => setOutputMode(e.target.value as OutputMode)}
                            className="w-full bg-purple-50/50 border border-purple-100 text-purple-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer hover:bg-purple-50 transition-colors"
                          >
                            <option value="streaming">流式输出</option>
                            <option value="traditional">传统输出</option>
                          </select>
                          
                          {/* 流式输出状态提示 */}
                          <div className="mt-3 p-3 bg-white/80 border border-purple-100 rounded-xl">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${activeModel.supportsStreaming !== false ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                <span className="text-xs font-bold text-gray-700">
                                  当前模型支持流式输出：
                                </span>
                              </div>
                              <span className={`text-xs font-black px-2 py-1 rounded ${activeModel.supportsStreaming !== false ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                {activeModel.supportsStreaming !== false ? '已开启' : '未开启'}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">
                              {activeModel.supportsStreaming !== false 
                                ? `"${activeModel.name}" 模型已配置为支持流式输出，选择流式输出模式时将实时显示生成内容。`
                                : `"${activeModel.name}" 模型未配置流式输出支持，将自动使用传统输出模式。`
                              }
                            </p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  {/* Token消耗显示 */}
                  {(isStreaming || isGenerating || streamingTokens.total >= 0 || traditionalTokens.total >= 0) && (
                    <div className="flex items-center gap-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-3 shadow-sm">
                      <div className="text-center">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">输入Token</div>
                        <div className="text-sm font-bold text-blue-600">
                          {isStreaming ? streamingTokens.prompt : traditionalTokens.prompt}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">输出Token</div>
                        <div className="text-sm font-bold text-green-600">
                          {isStreaming ? streamingTokens.completion : traditionalTokens.completion}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">总计</div>
                        <div className="text-sm font-bold text-purple-600">
                          {isStreaming ? streamingTokens.total : traditionalTokens.total}
                        </div>
                      </div>
                      {isStreaming && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-gray-500">生成中...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setEditModalOpen(false)} className="px-6 py-3 rounded-xl text-gray-500 font-bold text-sm hover:bg-gray-200 hover:text-gray-800 transition-all">取消</button>
                  <button onClick={handleEditGenerate} className="px-8 py-3 bg-purple-600 text-white font-black text-sm rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 active:scale-95 transition-all flex items-center gap-2"><i className="fas fa-magic"></i> AI 立即执行</button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* 3. 批量导出模态窗口 (保持不变) */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-gray-800 tracking-tight">导出小说正文</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Export Novel Content</p>
                </div>
                <button onClick={() => setExportModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all"><i className="fas fa-times"></i></button>
              </div>

              <div className="px-8 py-4 bg-white border-b border-gray-50 flex justify-between items-center shrink-0">
                 <div className="text-sm text-gray-600 font-medium">
                    已选择 <span className="font-black text-blue-600">{selectedExportChapterIds.size}</span> / {project.chapters.length} 章
                 </div>
                 <button onClick={toggleAllExport} className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
                   {selectedExportChapterIds.size === project.chapters.length ? '取消全选' : '全部选择'}
                 </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar bg-gray-50/30 space-y-2 flex-1">
                 {project.chapters.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">暂无章节可导出</div>
                 ) : (
                    project.chapters.sort((a,b) => a.order - b.order).map(chap => {
                       const isSelected = selectedExportChapterIds.has(chap.id);
                       const wordLen = (chap.content || '').length;
                       return (
                          <div 
                             key={chap.id}
                             onClick={() => toggleExportChapter(chap.id)}
                             className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none ${
                                isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'
                             }`}
                          >
                             <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300'}`}>
                                {isSelected && <i className="fas fa-check text-[10px]"></i>}
                             </div>
                             <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                                   第{chap.order + 1}章：{chap.title}
                                </h4>
                                <p className="text-[10px] text-gray-400 mt-0.5">字数：{wordLen}</p>
                             </div>
                          </div>
                       )
                    })
                 )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-4 shrink-0">
                 <button onClick={() => setExportModalOpen(false)} className="px-6 py-3 rounded-xl text-gray-500 font-bold text-sm hover:bg-gray-200 hover:text-gray-800 transition-all">取消</button>
                 <button onClick={handleExecuteExport} className="px-8 py-3 bg-emerald-600 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2">
                   <i className="fas fa-file-export"></i> 确认导出TXT
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* 4. 浮动 AI 动作菜单 (保持不变) */}
      {menuPos && !editModalOpen && (
        <div className="fixed z-[100] bg-white border border-gray-200 shadow-2xl rounded-2xl p-1.5 flex gap-1 animate-in zoom-in-95 duration-200" style={{ left: menuPos.x, top: menuPos.y }}>
           <button onClick={openEditModal} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-black rounded-xl hover:shadow-lg hover:shadow-blue-200 transition-all flex items-center gap-2 active:scale-95"><i className="fas fa-wand-magic-sparkles"></i> AI 润色 / 扩写</button>
           <div className="w-px h-6 bg-gray-200 self-center mx-1"></div>
           <button onClick={() => { setMenuPos(null); setSelectedText(""); setSelectionRange(null); }} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex items-center justify-center transition-all" title="取消选择"><i className="fas fa-times"></i></button>
        </div>
      )}

      {/* 5. AI历史记录查看器 */}
      {isHistoryViewerOpen && activeChapter && (
        <div className="fixed inset-0 z-[300] bg-gray-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            
            {/* 头部 */}
            <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-black text-gray-800 tracking-tight">AI 生成历史记录</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">第{activeChapter.order + 1}章: {activeChapter.title}</p>
              </div>
              <button 
                onClick={() => setIsHistoryViewerOpen(false)}
                className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* 历史记录列表 */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
              {activeChapter.history && activeChapter.history.length > 0 ? (
                <div className="space-y-4">
                  {activeChapter.history.sort((a, b) => b.timestamp - a.timestamp).map((record) => {
                    const formatTimestamp = (timestamp: number) => {
                      const date = new Date(timestamp);
                      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                    };

                    const formatTokens = (tokens?: { prompt: number; completion: number; total: number }) => {
                      if (!tokens) return 'N/A';
                      return `输入: ${tokens.prompt} | 输出: ${tokens.completion} | 总计: ${tokens.total}`;
                    };

                    const getProviderIcon = (provider: string) => {
                      switch (provider) {
                        case 'gemini': return 'fas fa-robot text-blue-500';
                        case 'ollama': return 'fas fa-server text-green-500';
                        case 'openai-compatible': return 'fas fa-brain text-purple-500';
                        default: return 'fas fa-microchip text-gray-500';
                      }
                    };

                    const getGenerationType = () => {
                      if (record.metadata?.batchGeneration) {
                        return '批量生成';
                      }
                      if (record.metadata?.templateName?.includes('润色') || record.metadata?.templateName?.includes('扩写')) {
                        return '润色/扩写';
                      }
                      return '正文生成';
                    };

                    return (
                      <div 
                        key={record.id}
                        className="bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all hover:shadow-lg"
                      >
                        {/* 记录头部 */}
                        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <i className={getProviderIcon(record.modelConfig.provider)}></i>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-800">{record.modelConfig.modelName}</span>
                                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-bold">
                                  {getGenerationType()}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {record.metadata?.templateName || '自定义生成'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-xs font-bold text-gray-700">{formatTimestamp(record.timestamp)}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {record.tokens ? `${record.tokens.total} tokens` : 'N/A tokens'}
                            </div>
                          </div>
                        </div>
                        
                        {/* 记录详情 */}
                        <div className="p-6 space-y-6">
                          {/* 提示词 */}
                          <div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">提示词</div>
                            <div className="bg-gray-50 text-gray-700 text-sm p-4 rounded-xl border border-gray-100 whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                              {record.prompt}
                            </div>
                          </div>
                          
                          {/* 生成内容 */}
                          <div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">生成内容</div>
                            <div className="bg-emerald-50/50 text-gray-800 text-sm p-4 rounded-xl border border-emerald-100 whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar">
                              {record.generatedContent}
                            </div>
                            <div className="text-xs text-gray-400 mt-2 text-right">
                              长度: {record.generatedContent.length} 字符
                            </div>
                          </div>
                          
                          {/* 模型配置详情 */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-xl p-4">
                              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">模型配置</div>
                              <div className="space-y-1">
                                <div className="text-sm text-gray-700">
                                  <span className="font-bold">提供商:</span> {record.modelConfig.provider}
                                </div>
                                {record.modelConfig.temperature !== undefined && (
                                  <div className="text-sm text-gray-700">
                                    <span className="font-bold">温度:</span> {record.modelConfig.temperature}
                                  </div>
                                )}
                                {record.modelConfig.maxTokens !== undefined && (
                                  <div className="text-sm text-gray-700">
                                    <span className="font-bold">最大Token:</span> {record.modelConfig.maxTokens}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="bg-gray-50 rounded-xl p-4">
                              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Token消耗</div>
                              <div className="space-y-1">
                                <div className="text-sm text-gray-700">
                                  <span className="font-bold">输入:</span> {record.tokens?.prompt || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-700">
                                  <span className="font-bold">输出:</span> {record.tokens?.completion || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-700">
                                  <span className="font-bold">总计:</span> {record.tokens?.total || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* 操作按钮 */}
                          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button 
                              onClick={() => {
                                // 复制生成内容到剪贴板
                                navigator.clipboard.writeText(record.generatedContent);
                                alert('已复制生成内容到剪贴板');
                              }}
                              className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                            >
                              <i className="fas fa-copy"></i> 复制内容
                            </button>
                            <button 
                              onClick={() => {
                                // 使用此内容替换当前章节内容
                                if (activeChapter) {
                                  updateChapterContent(record.generatedContent);
                                  setIsHistoryViewerOpen(false);
                                }
                              }}
                              className="px-4 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                            >
                              <i className="fas fa-redo"></i> 重新应用
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <i className="fas fa-history text-4xl text-gray-300 mb-4"></i>
                  <p className="text-gray-500 font-medium">暂无AI生成历史记录</p>
                  <p className="text-gray-400 text-sm mt-2">使用AI生成功能后，历史记录将显示在这里</p>
                </div>
              )}
            </div>

            {/* 底部操作栏 */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
              <div className="text-xs text-gray-500">
                共 {activeChapter?.history?.length || 0} 条记录
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    // 批量删除所有历史记录
                    if (window.confirm('确定要删除本章所有AI生成历史记录吗？')) {
                      if (activeChapterId) {
                        const newChapters = project.chapters.map(c => 
                          c.id === activeChapterId ? { ...c, history: [] } : c
                        );
                        onUpdate({ chapters: newChapters });
                        setIsHistoryViewerOpen(false);
                      }
                    }
                  }}
                  className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-trash"></i> 清空历史
                </button>
                <button 
                  onClick={() => setIsHistoryViewerOpen(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-300 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. 全局AI历史记录侧边栏 */}
      {isGlobalHistorySidebarOpen && (
        <AIHistoryViewer 
          project={project}
          onUpdate={onUpdate}
          onClose={() => setIsGlobalHistorySidebarOpen(false)}
          mode="sidebar"
        />
      )}

      {/* Sidebar & Editor Areas (保持不变) */}
      {isSidebarOpen && (
        <div className="w-80 border-r bg-gray-50 flex flex-col h-full animate-in slide-in-from-left duration-300">
          <div className="p-4 border-b bg-gray-100 flex justify-between items-center">
            <h3 className="font-black text-gray-700 text-sm tracking-tight">创作参考面板</h3>
            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-angle-double-left"></i></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            <section>
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">关键角色设定</h4>
              {project.characters.length === 0 ? <p className="text-xs text-gray-400 italic">暂无角色信息</p> : project.characters.map(char => (
                  <div key={char.id} className="mb-3 p-3 bg-white rounded-xl border border-gray-200 text-sm shadow-sm hover:border-blue-100 transition-colors">
                    <div className="font-bold text-gray-800 flex justify-between items-center">{char.name} <span className="text-[9px] font-black px-1.5 py-0.5 bg-gray-50 rounded border text-gray-400 uppercase">{char.role}</span></div>
                    <div className="text-[11px] text-gray-500 mt-2 line-clamp-3 leading-relaxed italic">{char.personality || char.background}</div>
                  </div>
              ))}
            </section>
<section>
  <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">本章细纲参考</h4>
  <textarea
    value={activeChapter?.summary || ""}
    onChange={(e) => updateChapterSummary(e.target.value)}
    placeholder="输入或编辑本章细纲..."
    className="w-full p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed shadow-inner mb-4 min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
  />
</section>
            
            {/* 章节正文摘要区域 */}
            <section>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest">章节正文摘要</h4>
                <div className="flex gap-1">
                  <button 
                    onClick={handleOpenSummaryPromptManager}
                    className="text-[8px] text-gray-400 hover:text-purple-500 transition-colors"
                    title="管理摘要提示词"
                  >
                    <i className="fas fa-cog"></i>
                  </button>
                </div>
              </div>
              
  {/* 摘要显示区域 */}
  <textarea
    value={activeChapter?.contentSummary || ""}
    onChange={(e) => updateChapterContentSummary(e.target.value)}
    placeholder="输入或编辑章节正文摘要..."
    className="w-full p-4 bg-purple-50 rounded-2xl border border-purple-100 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed shadow-inner mb-4 min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
  />
              
              {/* 摘要提取控件 */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <select 
                    value={selectedSummaryPromptId}
                    onChange={(e) => setSelectedSummaryPromptId(e.target.value)}
                    className="flex-1 bg-white border border-purple-200 text-black text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-purple-200 cursor-pointer appearance-none"
                  >
                    <option value="" className="text-black">选择摘要模板</option>
                    {summaryPrompts.map(p => (
                      <option key={p.id} value={p.id} className="text-black">{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <button 
                  onClick={handleExtractSummary}
                  disabled={isExtractingSummary || !activeChapter?.content || activeChapter.content.trim().length === 0}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    isExtractingSummary 
                      ? 'bg-purple-100 text-purple-400 cursor-not-allowed' 
                      : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                  }`}
                >
                  {isExtractingSummary ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      提取中...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-robot"></i>
                      AI 提取正文摘要
                    </>
                  )}
                </button>
                
                <p className="text-[9px] text-gray-400 text-center">
                  * 基于当前章节正文内容，使用AI提取摘要
                </p>
              </div>
            </section>
            <section>
              <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-3">章节导航</h4>
              <div className="space-y-1">{project.chapters.sort((a,b) => a.order - b.order).map(chap => (
                  <div key={chap.id} onClick={() => handleChapterClick(chap)} className={`flex justify-between items-center group px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${activeChapterId === chap.id ? 'bg-gray-900 text-white shadow-lg' : 'hover:bg-gray-200 text-gray-600 font-medium'}`}>
                    <span className="truncate flex-1">第{chap.order + 1}章: {chap.title}</span>
                    {activeChapterId !== chap.id && <i className="fas fa-chevron-right opacity-0 group-hover:opacity-50 text-[10px]"></i>}
                  </div>
              ))}</div>
            </section>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col h-full bg-gray-50/30">
        <div className="border-b px-10 py-5 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-6">
             <button onClick={onBack} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-all"><i className="fas fa-arrow-left"></i></button>
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">正在撰写</span>
                {activeChapterId ? (
                   <input className="text-2xl font-black border-none focus:ring-0 w-96 p-0 text-gray-800 placeholder-gray-200 bg-transparent" value={activeChapter?.title || ''} onChange={(e) => { if (!activeChapterId) return; onUpdate({ chapters: project.chapters.map(c => c.id === activeChapterId ? { ...c, title: e.target.value } : c) }); }} placeholder="输入章节标题..." />
                ) : <span className="text-2xl font-black text-gray-300">请选择章节</span>}
             </div>
          </div>
          <div className="flex items-center gap-6">
             {project.chapters.length > 0 && <button onClick={handleOpenExportModal} className="text-gray-300 hover:text-emerald-500 transition-colors flex items-center gap-2 text-xs font-bold mr-4" title="导出小说正文"><i className="fas fa-file-export"></i> 导出TXT</button>}
             {activeChapterId && <button onClick={handleClearContent} className="text-gray-300 hover:text-red-500 transition-colors flex items-center gap-2 text-xs font-bold mr-2" title="清空当前章节正文"><i className="fas fa-eraser"></i> 清空正文</button>}
             {/* 全局历史记录按钮 - 始终显示 */}
             <button 
               onClick={() => setIsGlobalHistorySidebarOpen(!isGlobalHistorySidebarOpen)}
               className={`text-gray-300 hover:text-blue-500 transition-colors flex items-center gap-2 text-xs font-bold mr-2 ${isGlobalHistorySidebarOpen ? 'text-blue-500' : ''}`} 
               title="全局AI历史记录"
             >
               <i className="fas fa-history"></i> 全局历史
             </button>
             {/* 章节历史记录按钮 - 仅在当前章节有历史记录时显示 */}
             {activeChapterId && activeChapter?.history && activeChapter.history.length > 0 && (
               <button 
                 onClick={() => setIsHistoryViewerOpen(true)}
                 className="text-gray-300 hover:text-purple-500 transition-colors flex items-center gap-2 text-xs font-bold mr-2" 
                 title="查看当前章节AI生成历史记录"
               >
                 <i className="fas fa-file-alt"></i> 章节历史
               </button>
             )}
             {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="w-10 h-10 rounded-2xl bg-white shadow-lg border border-gray-100 text-gray-400 hover:text-blue-600 flex items-center justify-center transition-all"><i className="fas fa-angle-double-right"></i></button>}
             <div className="flex flex-col items-end">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">字数: <span className="text-gray-900">{wordCount}</span></span>
               <span className="text-[9px] text-gray-300 font-medium mt-0.5 italic">自动保存: {new Date(lastSaved).toLocaleTimeString()}</span>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 flex justify-center custom-scrollbar">
           <textarea
             ref={textRef}
             disabled={!activeChapterId || (isGenerating && !isStreaming)}
             value={isStreaming ? streamingContent : (activeChapter?.content || '')}
             onMouseUp={handleMouseSelect}
             onKeyUp={handleKeySelect}
             onMouseMove={handleMouseMove}
             onChange={(e) => updateChapterContent(e.target.value)}
             placeholder={activeChapterId ? "泼墨挥毫，选中文字可唤出 AI 润色工具..." : "请点击左侧目录选择章节..."}
             className="w-full max-w-4xl h-full p-16 bg-white shadow-2xl rounded-3xl border border-gray-100 outline-none text-lg text-gray-700 leading-relaxed font-serif resize-none min-h-[1200px] transition-all duration-500 selection:bg-blue-100 disabled:bg-gray-50 disabled:cursor-not-allowed cursor-text"
             style={{ whiteSpace: 'pre-wrap', opacity: (isGenerating && !isStreaming) ? 0.6 : 1 }}
           />
           {isGenerating && !isStreaming && (
             <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-20">
               <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 flex flex-col items-center animate-in zoom-in duration-300">
                 <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                 <p className="text-blue-600 font-black text-xs tracking-widest uppercase">AI 正在斟酌文字...</p>
                 <p className="text-gray-400 text-[10px] mt-2">预计字数: {targetWordCount}</p>
                 <p className="text-gray-300 text-[9px] mt-1">已注入上下文 (包括{selectedKnowledgeIds.size}个知识库文件)</p>
               </div>
             </div>
           )}
           {isStreaming && (
             <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-20">
               <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 flex flex-col items-center animate-in zoom-in duration-300">
                 <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                 <p className="text-green-600 font-black text-xs tracking-widest uppercase">AI 正在实时生成...</p>
                 <p className="text-gray-400 text-[10px] mt-2">已生成: {streamingContent.length} 字</p>
                 <p className="text-gray-300 text-[9px] mt-1">流式输出模式中，内容实时显示</p>
                 <button 
                   onClick={stopStreaming}
                   className="mt-4 px-4 py-2 bg-red-100 text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
                 >
                   <i className="fas fa-stop"></i> 停止生成
                 </button>
               </div>
             </div>
           )}
           
           {isBatchGenerating && (
             <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-20">
               <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 flex flex-col items-center animate-in zoom-in duration-300 max-w-md">
                 <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                 <p className="text-blue-600 font-black text-xs tracking-widest uppercase">批量生成进行中...</p>
                 
                 <div className="w-full mt-4 mb-2">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-sm font-bold text-gray-700">
                       正在生成：第 {batchProgress.current} / {batchProgress.total} 章
                     </span>
                     <span className="text-xs text-gray-500">
                       {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                     </span>
                   </div>
                   <div className="w-full bg-gray-200 rounded-full h-3">
                     <div 
                       className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                       style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                     ></div>
                   </div>
                 </div>
                 
                 <p className="text-gray-600 text-sm font-bold mt-3 mb-1">
                   {batchProgress.currentChapterTitle}
                 </p>
                 <p className="text-gray-400 text-[10px]">当前章节</p>
                 
                 <button 
                   onClick={stopBatchGeneration}
                   className="mt-6 px-6 py-3 bg-red-100 text-red-600 text-sm font-bold rounded-xl hover:bg-red-200 transition-colors flex items-center gap-2"
                 >
                   <i className="fas fa-stop"></i> 停止批量生成
                 </button>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default WritingEditor;
