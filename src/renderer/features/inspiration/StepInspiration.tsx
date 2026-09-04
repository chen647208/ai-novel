/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import { logger } from '../../shared/utils/logger';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, i18n, templateDisplayName } from '@/i18n';
import { type Project, type PromptTemplate, type ModelConfig, type KnowledgeItem, type StreamingAIResponse, type OutputMode } from '../../../shared/types';
import { AIService } from '../assistant/services/aiService';
import WorldViewEditor from '../world/WorldViewEditor';
import { dialogService } from '@/shared/services/dialogService';
import { BookOpenText, Bot, Check, CheckCheck, ChevronDown, ChevronUp, CloudUpload, Globe, Lightbulb, Loader2, Pause, Pen, Play, Square, Trash2, WandSparkles, XCircle } from 'lucide-react';

interface StepInspirationProps {
  project: Project | null;
  prompts: PromptTemplate[];
  activeModel: ModelConfig;
  onUpdate: (updates: Partial<Project>) => void;
}

const StepInspiration: React.FC<StepInspirationProps> = ({ project, prompts, activeModel, onUpdate }) => {
  const { t } = useTranslation(['steps', 'common']);
  // 调试日志
  useEffect(() => {
    logger.debug('StepInspiration组件渲染:', {
      projectId: project?.id,
      projectTitle: project?.title,
      hasKnowledge: project?.knowledge?.length || 0,
      inspiration: project?.inspiration,
      intro: project?.intro
    });
  }, [project]);
  
  const [input, setInput] = useState(project?.inspiration || '');
  const [selectedPromptId, setSelectedPromptId] = useState(prompts.find(p => p.category === 'inspiration')?.id || '');
  const [loading, setLoading] = useState(false);
  
  // 输出模式状态
  const [outputMode, setOutputMode] = useState<OutputMode>('streaming');
  
  // 世界观编辑器显示状态（可选功能）
  const [showWorldView, setShowWorldView] = useState(false);
  
  // 流式输出状态
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingTokens, setStreamingTokens] = useState({ prompt: 0, completion: 0, total: 0 });
  const [, setIsComplete] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 传统输出模式的token信息
  const [traditionalTokens, setTraditionalTokens] = useState({ prompt: 0, completion: 0, total: 0 });
  
  // Knowledge Base Selection State
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<Set<string>>(new Set());
  
  // 直接读取结果或使用流式内容
  const results = isStreaming ? streamingContent : (project?.intro || '');
  
  // 安全获取知识库数据
  const safeKnowledge = Array.isArray(project?.knowledge) ? project.knowledge : [];
  const inspirationKnowledge = safeKnowledge.filter(k => k && k.category === 'inspiration');

  // 流式回调处理函数
  const handleStreamingChunk = (response: StreamingAIResponse, finalPrompt?: string) => {
    // 契约：response.content 为累计全文，直接替换（旧实现按增量累加导致内容重复）
    if (response.content) {
      setStreamingContent(response.content);
    }
    if (response.tokens) {
      setStreamingTokens(response.tokens);
    }
    if (response.isComplete) {
      setIsComplete(true);
      setIsStreaming(false);
      setLoading(false);

      // 出错时不写入项目数据，避免用空/残缺内容覆盖
      if (response.error) {
        dialogService.alert(t('steps:common.generateFailed', { error: response.error }));
        return;
      }
      
      // 流式完成后更新项目数据
      const finalContent = response.content || streamingContent;
      const firstLine = finalContent.split('\n')[0]?.replace(/[#*]/g, '').trim() ?? '';
      
      // 创建AI历史记录
      const historyRecord = AIService.buildHistoryRecordData(
        'inspiration-virtual-chapter', // 虚拟章节ID
        finalPrompt || '', // 使用传递的finalPrompt
        finalContent,
        activeModel,
        response,
        {
          templateName: templateDisplayName(prompts.find(p => p.id === selectedPromptId) ?? { name: t('steps:inspiration.defaultTemplateName') }),
          batchGeneration: false,
          chapterTitle: t('steps:inspiration.chapterTitle')
        }
      );
      
      // 安全处理虚拟章节
      const updatedVirtualChapters = Array.isArray(project?.virtualChapters) ? project.virtualChapters : [];
      const inspirationChapter = updatedVirtualChapters.find(c => c && c.id === 'inspiration-virtual-chapter') || {
        id: 'inspiration-virtual-chapter',
        title: t('steps:inspiration.chapterTitle'),
        summary: t('steps:inspiration.historySummary'),
        content: '',
        order: -100, // 特殊顺序，放在最前面
        history: []
      };
      
      const existingHistory = Array.isArray(inspirationChapter.history) ? inspirationChapter.history : [];
      const updatedInspirationChapter = {
        ...inspirationChapter,
        history: [...existingHistory, historyRecord]
      };
      
      // 更新虚拟章节列表
      const finalVirtualChapters = updatedVirtualChapters.filter(c => c && c.id !== 'inspiration-virtual-chapter');
      finalVirtualChapters.unshift(updatedInspirationChapter);
      
      // 安全处理项目标题
      const currentTitle = project?.title;
      const newTitle = currentTitle && currentTitle !== i18n.t('app:book.defaultTitle') ? currentTitle : (firstLine || t('steps:inspiration.untitledNovel'));
      
      onUpdate({ 
        inspiration: input, 
        intro: finalContent,
        title: newTitle,
        virtualChapters: finalVirtualChapters
      });
    }
  };

  // 暂停/继续流式输出
  const handlePauseResume = () => {
    if (isPaused) {
      setIsPaused(false);
    } else {
      setIsPaused(true);
    }
  };

  // 停止流式输出
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setLoading(false);
    setIsPaused(false);
  };

  const generate = async () => {
    if (!input) return;
    
    // 重置流式状态
    setStreamingContent('');
    setStreamingTokens({ prompt: 0, completion: 0, total: 0 });
    setIsComplete(false);
    setIsPaused(false);
    
    setLoading(true);
    setIsStreaming(true);
    
    const promptTemplate = prompts.find(p => p.id === selectedPromptId)?.content || '{inspiration}';
    let finalPrompt = promptTemplate.replace('{inspiration}', input);
    
    // Inject Knowledge
    if (project && project.knowledge && selectedKnowledgeIds.size > 0) {
       const kContent = project.knowledge
         .filter(k => k && selectedKnowledgeIds.has(k.id))
         .map(k => {
           const name = k.name || '未命名资料';
           const content = typeof k.content === 'string' ? k.content.substring(0, 8000) : '';
           return `【参考资料：${name}】\n${content}`;
         })
         .join('\n\n');
       if (kContent) finalPrompt += `\n\n### 参考世界观/设定资料 (Knowledge Base)\n请务必参考以下资料进行构思：\n${kContent}`;
    }

    try {
      // 创建新的AbortController用于取消请求
      abortControllerRef.current = new AbortController();
      
      // 根据输出模式选择调用方式
      if (outputMode === 'streaming' && activeModel.supportsStreaming !== false) {
        await AIService.callStreaming(
          activeModel,
          finalPrompt,
          (response) => handleStreamingChunk(response, finalPrompt),
          { signal: abortControllerRef.current.signal }
        );
      } else {
        // 使用传统方法
        const result = await AIService.call(activeModel, finalPrompt, { signal: abortControllerRef.current.signal });
        if (result.error) {
          dialogService.alert(t('steps:common.generateFailed', { error: result.error }));
          return;
        }
        
        // 保存传统输出模式的token信息
        if (result.tokens) {
          setTraditionalTokens(result.tokens);
        } else {
          setTraditionalTokens({ prompt: 0, completion: 0, total: 0 });
        }
        
        // 创建AI历史记录（传统输出模式）
        const historyRecord = AIService.buildHistoryRecordData(
          'inspiration-virtual-chapter', // 虚拟章节ID
          finalPrompt,
          result.content,
          activeModel,
          result,
          {
            templateName: templateDisplayName(prompts.find(p => p.id === selectedPromptId) ?? { name: t('steps:inspiration.defaultTemplateName') }),
            batchGeneration: false,
            chapterTitle: t('steps:inspiration.chapterTitle')
          }
        );
        
        // 将历史记录添加到虚拟章节
        const updatedVirtualChapters = project?.virtualChapters || [];
        const inspirationChapter = updatedVirtualChapters.find(c => c.id === 'inspiration-virtual-chapter') || {
          id: 'inspiration-virtual-chapter',
          title: t('steps:inspiration.chapterTitle'),
          summary: t('steps:inspiration.historySummary'),
          content: '',
          order: -100, // 特殊顺序，放在最前面
          history: []
        };
        
        const existingHistory = inspirationChapter.history || [];
        const updatedInspirationChapter = {
          ...inspirationChapter,
          history: [...existingHistory, historyRecord]
        };
        
        // 更新虚拟章节列表
        const finalVirtualChapters = updatedVirtualChapters.filter(c => c.id !== 'inspiration-virtual-chapter');
        finalVirtualChapters.unshift(updatedInspirationChapter);
        
        // 更新项目数据
        const firstLine = result.content.split('\n')[0]?.replace(/[#*]/g, '').trim() ?? '';
        onUpdate({ 
          inspiration: input, 
          intro: result.content,
          title: project?.title && project.title !== i18n.t('app:book.defaultTitle') ? project.title : (firstLine || t('steps:inspiration.untitledNovel')),
          virtualChapters: finalVirtualChapters
        });
        setIsStreaming(false);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        logger.debug('流式输出已停止');
      } else {
        dialogService.alert(t('steps:inspiration.generateFailedGeneric'));
        console.error(e);
      }
    } finally {
      if (!isStreaming) {
        setLoading(false);
      }
    }
  };

  const handleClear = async () => {
    if (await dialogService.confirm({ message: t('steps:inspiration.clearConfirm'), danger: true })) {
      setInput('');
      onUpdate({ inspiration: '', intro: '' });
    }
  };

  const toggleKnowledge = (id: string) => {
     const newSet = new Set(selectedKnowledgeIds);
     if (newSet.has(id)) newSet.delete(id);
     else newSet.add(id);
     setSelectedKnowledgeIds(newSet);
  };

  const selectAllKnowledge = () => {
     const allIds = (project?.knowledge || [])
       .filter(k => k.category === 'inspiration')
       .map(k => k.id);
     setSelectedKnowledgeIds(new Set(allIds));
  };

  const clearAllKnowledge = () => {
     setSelectedKnowledgeIds(new Set());
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = e.target.files;
    const newItems: KnowledgeItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      // 简单限制：仅处理文本文件
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
        try {
            const text = await file.text();
            // Consistent ID generation with StepKnowledge
            const uniqueId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9) + '_' + i;
            newItems.push({
                id: uniqueId,
                name: file.name,
                content: text,
                type: file.name.split('.').pop() || 'txt',
                size: file.size,
                addedAt: Date.now(),
                category: 'inspiration' as const
            });
        } catch (err) {
            console.error("读取文件失败", err);
            dialogService.alert(t('steps:inspiration.readFailed', { name: file.name }));
        }
      } else {
        dialogService.alert(t('steps:inspiration.formatUnsupported', { name: file.name }));
      }
    }

    if (newItems.length > 0) {
      const currentKnowledge = project?.knowledge || [];
      // 更新项目数据
      onUpdate({ knowledge: [...currentKnowledge, ...newItems] });
      
      // 自动选中新上传的文件
      const newSet = new Set(selectedKnowledgeIds);
      newItems.forEach(item => newSet.add(item.id));
      setSelectedKnowledgeIds(newSet);
    }
    
    // 清空 input 防止重复选择同一文件不触发 onChange
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm">1</span>
            {t('steps:inspiration.stepTitle')}
          </h3>
          {(input || results) && (
            <button onClick={handleClear} className="text-xs text-gray-400 hover:text-red-500 font-bold transition-colors">
              <Trash2 className="size-4 mr-1" />{t('steps:inspiration.clearContent')}
            </button>
          )}
        </div>
        
        <textarea
          value={input}
          onChange={(e) => {
             setInput(e.target.value);
             // Sync to project state immediately
             onUpdate({ inspiration: e.target.value });
          }}
          placeholder={t('steps:inspiration.inputPlaceholder')}
          className="w-full h-40 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all text-gray-700"
        />
        
        {/* Knowledge Base Selection */}
        <div className="mt-4 border-t border-gray-100 pt-4">
             <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <BookOpenText className="size-4 text-blue-500" />
                    <span className="text-xs font-bold text-gray-500">{t('steps:inspiration.knowledgeRef')}</span>
                </div>
                {(project?.knowledge || []).filter(k => k.category === 'inspiration').length > 0 && (
                   <div className="flex gap-1">
                      <button 
                         onClick={selectAllKnowledge}
                         className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-[9px] font-bold transition-all flex items-center gap-1"
                         title={t('steps:common.selectAllTitle')}
                      >
                         <CheckCheck className="size-2" /> {t('steps:common.selectAll')}
                      </button>
                      <button 
                         onClick={clearAllKnowledge}
                         className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-[9px] font-bold transition-all flex items-center gap-1"
                         title={t('steps:common.clearTitle')}
                      >
                         <XCircle className="size-2" /> {t('steps:common.clear')}
                      </button>
                   </div>
                )}
                <label className="cursor-pointer px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-500 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 border border-transparent hover:border-blue-100">
                    <CloudUpload className="size-4" /> {t('steps:inspiration.uploadNew')}
                    <input type="file" multiple className="hidden" onChange={handleFileUpload} accept=".txt,.md,.json,.csv" />
                </label>
             </div>
             
             {inspirationKnowledge.length === 0 ? (
                <div className="text-xs text-gray-400 italic pl-6 bg-gray-50/50 py-3 rounded-lg border border-dashed border-gray-200 text-center">
                   {t('steps:inspiration.noKnowledge')}<br/>
                   <span className="text-[10px] opacity-70">{t('steps:inspiration.noKnowledgeHint')}</span>
                </div>
             ) : (
                <div className="max-h-48 overflow-y-auto custom-scrollbar pr-2">
                   <div className="flex flex-wrap gap-2">
                      {inspirationKnowledge.map(k => k && (
                         <button
                           key={k.id}
                           onClick={() => toggleKnowledge(k.id)}
                           className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${
                              selectedKnowledgeIds.has(k.id) 
                                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                           }`}
                         >
                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${selectedKnowledgeIds.has(k.id) ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}>
                               {selectedKnowledgeIds.has(k.id) && <Check className="size-4 text-[6px] text-white" />}
                            </div>
                            {k.name || t('steps:common.unnamedFile')}
                         </button>
                      ))}
                   </div>
                </div>
             )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-bold">{t('steps:common.outputMode')}</span>
              <select 
                value={outputMode}
                onChange={(e) => setOutputMode(e.target.value as OutputMode)}
                className="text-sm border rounded-lg px-3 py-1.5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                <option value="streaming">{t('steps:common.streaming')}</option>
                <option value="traditional">{t('steps:common.traditional')}</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-bold">{t('steps:common.promptTemplate')}</span>
              <select 
                value={selectedPromptId}
                onChange={(e) => setSelectedPromptId(e.target.value)}
                className="text-sm border rounded-lg px-3 py-1.5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                {prompts.filter(p => p.category === 'inspiration').map(p => (
                  <option key={p.id} value={p.id}>{templateDisplayName(p)}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Token 信息显示 */}
            {(isStreaming && streamingTokens.total > 0) || (!isStreaming && traditionalTokens.total > 0) ? (
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-gray-500">Tokens:</span>
                  <span className="text-xs font-bold text-blue-600">
                    {isStreaming ? streamingTokens.total : traditionalTokens.total}
                  </span>
                </div>
                <div className="h-3 w-px bg-gray-300"></div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400">{t('steps:common.input')}</span>
                  <span className="text-xs font-bold text-gray-600">
                    {isStreaming ? streamingTokens.prompt : traditionalTokens.prompt}
                  </span>
                </div>
                <div className="h-3 w-px bg-gray-300"></div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400">{t('steps:common.output')}</span>
                  <span className="text-xs font-bold text-gray-600">
                    {isStreaming ? streamingTokens.completion : traditionalTokens.completion}
                  </span>
                </div>
              </div>
            ) : null}
            
            {/* 流式控制按钮 */}
            {isStreaming && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePauseResume}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    isPaused 
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100' 
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                  {isPaused ? t('steps:common.resume') : t('steps:common.pause')}
                </button>
                <button
                  onClick={handleStopStreaming}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center gap-1.5"
                >
                  <Square className="size-3.5" />
                  {t('steps:common.stop')}
                </button>
              </div>
            )}
            
            {/* 生成按钮 */}
            <button 
              onClick={generate}
              disabled={loading || (!input && selectedKnowledgeIds.size === 0)}
              className={`px-8 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center ${
                loading || (!input && selectedKnowledgeIds.size === 0) ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 active:scale-95'
              }`}
            >
              {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <WandSparkles className="size-4 mr-2" />}
              {loading ? t('steps:inspiration.generating') : t('steps:inspiration.generateBtn')}
            </button>
          </div>
        </div>
      </section>

      {/* ===== 世界观设定（可选增强功能） ===== */}
      <section className="bg-white/50 p-4 rounded-xl border border-gray-200">
        <button
          onClick={() => setShowWorldView(!showWorldView)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              project?.worldView ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
            }`}>
              <Globe className="size-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">{t('steps:inspiration.worldTitle')}</h4>
              <p className="text-xs text-gray-500">
                {project?.worldView 
                  ? t('steps:inspiration.worldConfigured') 
                  : t('steps:inspiration.worldOptional')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {project?.worldView && (
              <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded-lg text-xs font-bold">
                {t('steps:inspiration.enabled')}
              </span>
            )}
            {showWorldView ? <ChevronUp className="size-4 text-gray-400 transition-transform" /> : <ChevronDown className="size-4 text-gray-400 transition-transform" />}
          </div>
        </button>
        
        {showWorldView && (
          <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in">
            <WorldViewEditor
              projectId={project?.id || ''}
              worldView={project?.worldView}
              onSave={(worldView) => {
                onUpdate({ worldView });
              }}
            />
          </div>
        )}
      </section>

      {results ? (
        <section className="bg-white p-8 rounded-[2rem] shadow-lg border border-gray-100 border-l-8 border-l-blue-500 animate-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-50">
             <div className="flex items-center gap-2">
                <Bot className="size-4 text-blue-500" />
                <h3 className="text-lg font-black text-gray-800">{t('steps:inspiration.aiPlan')}</h3>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded ml-2 font-bold">{t('steps:common.editable')}</span>
             </div>
             <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg">
                <span className="text-xs font-bold text-gray-400">{t('steps:inspiration.bookName')}</span>
                <input 
                  placeholder={t('steps:inspiration.bookNamePlaceholder')}
                  className="text-sm font-bold bg-transparent border-none focus:ring-0 outline-none text-gray-800 w-48"
                  value={project?.title || ''}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                />
                <Pen className="size-3.5 text-gray-300" />
             </div>
          </div>
          <textarea
            className="w-full min-h-[500px] p-4 -ml-4 rounded-xl border-2 border-transparent hover:border-gray-100 focus:border-blue-100 focus:bg-blue-50/10 outline-none resize-y transition-all text-gray-600 leading-loose whitespace-pre-wrap font-medium custom-scrollbar"
            value={results}
            onChange={(e) => onUpdate({ intro: e.target.value })}
            placeholder={t('steps:inspiration.resultPlaceholder')}
            spellCheck={false}
          />
        </section>
      ) : (
        <div className="text-center py-10 opacity-50">
          <Lightbulb className="size-10 text-gray-200 mb-4" />
          <p className="text-gray-400 text-sm">{t('steps:inspiration.emptyHint')}</p>
        </div>
      )}
    </div>
  );
};

export default StepInspiration;

