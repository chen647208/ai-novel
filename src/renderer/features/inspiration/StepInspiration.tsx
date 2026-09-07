/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { logger } from '../../shared/utils/logger';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, i18n, templateDisplayName } from '@/i18n';
import { type Project, type ModelConfig, type KnowledgeItem, type StreamingAIResponse, type OutputMode } from '../../../shared/types';
import { useProjectStore, type CommitOptions } from '@/app/stores/projectStore';
import { VIRTUAL_CHAPTER_ORDER, KNOWLEDGE_SNIPPET_TRUNCATE } from '../../../shared/constants/chapters';
import { useSettingsStore, useUsableModel } from '@/app/stores/settingsStore';
import { AIService } from '../assistant/services/aiService';
import WorldViewEditor from '../world/WorldViewEditor';
import { dialogService } from '@/shared/services/dialogService';
import { cn } from '@/shared/utils/cn';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { BookOpenText, Bot, Check, CheckCheck, ChevronDown, ChevronUp, CloudUpload, Eye, Globe, Lightbulb, Loader2, Pause, PenLine, Pencil, Play, Square, Trash2, WandSparkles, XCircle } from 'lucide-react';
import { MarkdownView } from '@/shared/ui/Markdown';

interface StepInspirationProps {
  project: Project | null;
}

const StepInspiration: React.FC<StepInspirationProps> = ({ project }) => {
  const { t } = useTranslation(['steps', 'common']);
  // 直读 store：模型/提示词/更新动作不再经 App→View 层层透传
  const prompts = useSettingsStore((s) => s.prompts);
  // 手写 bypass 下可能为 undefined：与旧 effectiveModel 透传语义一致，AI 调用处各自报错引导
  const activeModel = useUsableModel() as ModelConfig;
  const updateActiveProject = useProjectStore((s) => s.updateActiveProject);
  const onUpdate = (updates: Partial<Project>, opts?: CommitOptions) => updateActiveProject(updates, opts);
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
  // 预览（Markdown 渲染）⇄ 编辑（textarea）切换；有内容时默认预览
  const [resultEditing, setResultEditing] = useState(false);
  
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
        order: VIRTUAL_CHAPTER_ORDER, // 特殊顺序，放在最前面
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
      }, { agentId: 'ai:inspiration', cause: selectedPromptId });
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
    // 生成时切回预览，流式内容以 Markdown 格式化实时呈现
    setResultEditing(false);
    
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
           const content = typeof k.content === 'string' ? k.content.substring(0, KNOWLEDGE_SNIPPET_TRUNCATE) : '';
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
          order: VIRTUAL_CHAPTER_ORDER, // 特殊顺序，放在最前面
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
        }, { agentId: 'ai:inspiration', cause: selectedPromptId });
        setIsStreaming(false);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        logger.debug('流式输出已停止');
      } else {
        dialogService.alert(t('steps:inspiration.generateFailedGeneric'));
        logger.error(e);
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
            logger.error("读取文件失败", err);
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
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <PenLine className="size-4 text-muted-foreground" />
            {t('steps:inspiration.stepTitle')}
          </h3>
          {(input || results) && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={handleClear}>
              <Trash2 className="size-3.5" />{t('steps:inspiration.clearContent')}
            </Button>
          )}
        </div>

        <Textarea
          value={input}
          onChange={(e) => {
             setInput(e.target.value);
             // Sync to project state immediately
             onUpdate({ inspiration: e.target.value });
          }}
          placeholder={t('steps:inspiration.inputPlaceholder')}
          className="min-h-40 resize-none leading-relaxed"
        />
        
        {/* Knowledge Base Selection */}
        <div className="mt-4 border-t border-border pt-4">
             <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BookOpenText className="size-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">{t('steps:inspiration.knowledgeRef')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                {(project?.knowledge || []).filter(k => k.category === 'inspiration').length > 0 && (
                   <>
                      <Button
                         variant="ghost"
                         size="sm"
                         className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                         onClick={selectAllKnowledge}
                         title={t('steps:common.selectAllTitle')}
                      >
                         <CheckCheck className="size-3" /> {t('steps:common.selectAll')}
                      </Button>
                      <Button
                         variant="ghost"
                         size="sm"
                         className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                         onClick={clearAllKnowledge}
                         title={t('steps:common.clearTitle')}
                      >
                         <XCircle className="size-3" /> {t('steps:common.clear')}
                      </Button>
                   </>
                )}
                <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <CloudUpload className="size-3.5" /> {t('steps:inspiration.uploadNew')}
                    <input type="file" multiple className="hidden" onChange={handleFileUpload} accept=".txt,.md,.json,.csv" />
                </label>
                </div>
             </div>

             {inspirationKnowledge.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
                   {t('steps:inspiration.noKnowledge')}<br/>
                   <span className="text-2xs opacity-70">{t('steps:inspiration.noKnowledgeHint')}</span>
                </div>
             ) : (
                <div className="max-h-48 overflow-y-auto pr-2">
                   <div className="flex flex-wrap gap-2">
                      {inspirationKnowledge.map(k => k && (
                         <Button
                           key={k.id}
                           variant="outline"
                           onClick={() => toggleKnowledge(k.id)}
                           className={cn(
                             'h-auto gap-2 px-2.5 py-1 text-xs font-normal',
                             selectedKnowledgeIds.has(k.id)
                               ? 'border-primary/40 bg-primary/5 text-foreground'
                               : 'text-muted-foreground'
                           )}
                         >
                            <span className={cn(
                              'flex size-3.5 items-center justify-center rounded-full border',
                              selectedKnowledgeIds.has(k.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
                            )}>
                               {selectedKnowledgeIds.has(k.id) && <Check className="size-2.5" />}
                            </span>
                            {k.name || t('steps:common.unnamedFile')}
                         </Button>
                      ))}
                   </div>
                </div>
             )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-normal text-muted-foreground">{t('steps:common.outputMode')}</Label>
              <Select
                value={outputMode}
                onChange={(e) => setOutputMode(e.target.value as OutputMode)}
                className="h-8 w-auto text-sm"
              >
                <option value="streaming">{t('steps:common.streaming')}</option>
                <option value="traditional">{t('steps:common.traditional')}</option>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm font-normal text-muted-foreground">{t('steps:common.promptTemplate')}</Label>
              <Select
                value={selectedPromptId}
                onChange={(e) => setSelectedPromptId(e.target.value)}
                className="h-8 w-auto text-sm"
              >
                {prompts.filter(p => p.category === 'inspiration').map(p => (
                  <option key={p.id} value={p.id}>{templateDisplayName(p)}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Token 信息显示 */}
            {(isStreaming && streamingTokens.total > 0) || (!isStreaming && traditionalTokens.total > 0) ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs">
                <span className="font-medium text-muted-foreground">Tokens:</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {isStreaming ? streamingTokens.total : traditionalTokens.total}
                </span>
                <span className="h-3 w-px bg-border" />
                <span className="text-muted-foreground">{t('steps:common.input')}</span>
                <span className="tabular-nums text-foreground">
                  {isStreaming ? streamingTokens.prompt : traditionalTokens.prompt}
                </span>
                <span className="h-3 w-px bg-border" />
                <span className="text-muted-foreground">{t('steps:common.output')}</span>
                <span className="tabular-nums text-foreground">
                  {isStreaming ? streamingTokens.completion : traditionalTokens.completion}
                </span>
              </div>
            ) : null}

            {/* 流式控制按钮 */}
            {isStreaming && (
              <>
                <Button variant="outline" size="sm" onClick={handlePauseResume}>
                  {isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                  {isPaused ? t('steps:common.resume') : t('steps:common.pause')}
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleStopStreaming}>
                  <Square className="size-3.5" />
                  {t('steps:common.stop')}
                </Button>
              </>
            )}

            {/* 生成按钮 */}
            <Button
              onClick={generate}
              disabled={loading || (!input && selectedKnowledgeIds.size === 0)}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
              {loading ? t('steps:inspiration.generating') : t('steps:inspiration.generateBtn')}
            </Button>
          </div>
        </div>
      </Card>

      {/* ===== 世界观设定（可选增强功能） ===== */}
      <Card>
        <button
          onClick={() => setShowWorldView(!showWorldView)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex size-9 items-center justify-center rounded-lg transition-colors',
              project?.worldView ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
            )}>
              <Globe className="size-4" />
            </div>
            <div>
              <h4 className="text-sm font-medium">{t('steps:inspiration.worldTitle')}</h4>
              <p className="text-xs text-muted-foreground">
                {project?.worldView
                  ? t('steps:inspiration.worldConfigured')
                  : t('steps:inspiration.worldOptional')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {project?.worldView && (
              <Badge variant="secondary">{t('steps:inspiration.enabled')}</Badge>
            )}
            {showWorldView ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </div>
        </button>

        {showWorldView && (
          <div className="border-t border-border p-4">
            <WorldViewEditor
              projectId={project?.id || ''}
              worldView={project?.worldView}
              onSave={(worldView) => {
                onUpdate({ worldView });
              }}
            />
          </div>
        )}
      </Card>

      {results ? (
        <Card className="overflow-hidden">
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
             <div className="flex items-center gap-2">
                <Bot className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">{t('steps:inspiration.aiPlan')}</h3>
                <Badge variant="secondary">{t('steps:common.editable')}</Badge>
             </div>
             <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                  onClick={() => setResultEditing(v => !v)}
                  disabled={!results}
                >
                  {resultEditing ? <Eye className="size-3.5" /> : <Pencil className="size-3.5" />}
                  {resultEditing ? t('steps:common.preview') : t('steps:common.edit')}
                </Button>
                <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1">
                  <span className="text-xs text-muted-foreground">{t('steps:inspiration.bookName')}</span>
                  <Input
                    placeholder={t('steps:inspiration.bookNamePlaceholder')}
                    className="h-6 w-40 border-none bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-0"
                    value={project?.title || ''}
                    onChange={(e) => onUpdate({ title: e.target.value })}
                  />
                </div>
             </div>
          </div>
          {resultEditing || !results ? (
            <Textarea
              className="min-h-[500px] rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 resize-y leading-loose whitespace-pre-wrap font-serif text-base"
              value={results}
              onChange={(e) => onUpdate({ intro: e.target.value })}
              placeholder={t('steps:inspiration.resultPlaceholder')}
              spellCheck={false}
            />
          ) : (
            <div className="custom-scrollbar min-h-[500px] overflow-y-auto p-6">
              <MarkdownView content={results} className="font-serif text-base" />
            </div>
          )}
        </Card>
      ) : (
        <EmptyState
          icon={Lightbulb}
          title={t('steps:inspiration.emptyHint')}
          className="py-16"
        />
      )}
    </div>
  );
};

export default StepInspiration;

