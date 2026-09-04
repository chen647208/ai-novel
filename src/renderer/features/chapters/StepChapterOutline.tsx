/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React, { useState, useMemo } from 'react';
import { useTranslation, i18n, templateDisplayName } from '@/i18n';
import { type Project, type PromptTemplate, type ModelConfig, type Chapter } from '../../../shared/types';
import { AIService } from '../assistant/services/aiService';
import { dialogService } from '@/shared/services/dialogService';
import { cn } from '@/shared/utils/cn';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { MarkdownView } from '@/shared/ui/Markdown';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { BookOpen, BookOpenText, Check, CheckCheck, ChevronDown, ChevronRight, Clock, FastForward, FileOutput, Flag, Globe2, Layers, LayoutList, ListOrdered, Loader2, MapPin, PenTool, Trash2, WandSparkles, XCircle } from 'lucide-react';

interface StepChapterOutlineProps {
  project: Project;
  prompts: PromptTemplate[];
  activeModel: ModelConfig;
  onUpdate: (updates: Partial<Project>) => void;
  onOpenSettings: () => void;
  onEnterWriting: (chapterId: string) => void;
}

const StepChapterOutline: React.FC<StepChapterOutlineProps> = ({ project, prompts, activeModel, onUpdate, onEnterWriting }) => {
  const { t } = useTranslation(['steps', 'common']);
  const [loading, setLoading] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);
  
  // 传统输出token状态
  const [traditionalTokens, setTraditionalTokens] = useState({ prompt: 0, completion: 0, total: 0 });
  
  const chapterPrompts = useMemo(() => prompts.filter(p => p.category === 'chapter'), [prompts]);
  const [selectedPromptId, setSelectedPromptId] = useState(chapterPrompts[0]?.id || '');
  
  // Knowledge Base Selection State
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<Set<string>>(new Set());
  const [showKnowledgeSelector, setShowKnowledgeSelector] = useState(false);

  // 解析 AI 输出的章节文本
  const parseChapters = (text: string, startIndex: number): Chapter[] => {
    const chapterRegex = /第\s*([0-9一二三四五六七八九十百]+)\s*章[:：]?\s*([^\n]+)([\s\S]*?)(?=第\s*[0-9一二三四五六七八九十百]+\s*章|---|$(?![\s\S]))/gi;
    const matches = Array.from(text.matchAll(chapterRegex));
    
    return matches.map((match, idx) => {
      const titleRaw = match[2]?.trim() ?? '';
      const bodyRaw = match[3]?.trim() ?? '';
      const title = titleRaw.replace(/[#*]/g, '').trim();

      let summary = bodyRaw;
      const summaryMarkers = ['剧情细纲[:：]', '内容[:：]', '情节[:：]', '本章细纲[:：]'];
      for (const marker of summaryMarkers) {
        const regex = new RegExp(marker, 'i');
        const markerMatch = bodyRaw.match(regex);
        if (markerMatch && markerMatch.index !== undefined) {
          summary = bodyRaw.substring(markerMatch.index + markerMatch[0].length).trim();
          break;
        }
      }
      summary = summary.split('---')[0]?.trim() ?? '';

      return {
        id: Math.random().toString(36).substr(2, 9),
        title: title || t('steps:chapters.defaultChapterTitle', { num: startIndex + idx + 1 }),
        summary: summary || t('steps:chapters.defaultSummary'),
        content: '',
        order: startIndex + idx
      };
    });
  };

  const exportChaptersToTxt = async () => {
    if (project.chapters.length === 0) {
      dialogService.alert(t('steps:chapters.noChaptersExport'));
      return;
    }

    try {
      // 生成文件内容
      let content = t('steps:chapters.exportHeader', { title: project.title || t('steps:chapters.unnamedProject') }) + '\n';
      content += `${'='.repeat(50)}\n\n`;
      content += `${t('steps:chapters.exportTime', { time: new Date().toLocaleString(i18n.language) })}\n`;
      content += `${t('steps:chapters.exportCount', { count: project.chapters.length })}\n\n`;
      content += `${'='.repeat(50)}\n\n`;

      project.chapters.sort((a, b) => a.order - b.order).forEach((chap, idx) => {
        content += `${t('steps:chapters.exportChapter', { num: idx + 1, title: chap.title })}\n`;
        content += `${'-'.repeat(30)}\n`;
        content += `${t('steps:chapters.exportSummary')}\n${chap.summary || t('steps:chapters.exportNoSummary')}\n\n`;
      });

      // 调用 Electron 保存对话框
      const defaultFileName = `${project.title || t('steps:chapters.exportFileName')}_${new Date().toISOString().slice(0, 10)}.txt`;
      const api = window.electronAPI;
      if (!api) {
        throw new Error(t('steps:chapters.electronUnavailable'));
      }
      const result = await api.saveFileDialog({
        title: t('steps:chapters.saveDialogTitle'),
        defaultPath: defaultFileName,
        filters: [
          { name: t('steps:chapters.filterText'), extensions: ['txt'] },
          { name: t('steps:chapters.filterAll'), extensions: ['*'] }
        ]
      });

      if (!result.canceled && result.filePath) {
        // 写入文件
        await api.writeFile(result.filePath, content);
        dialogService.alert(t('steps:chapters.exportSuccess'));
      }
    } catch (error) {
      console.error('导出失败:', error);
      dialogService.alert(t('steps:chapters.exportFailed', { error: error instanceof Error ? error.message : t('steps:common.unknownError') }));
    }
  };

  const generateChapters = async (isContinue: boolean = false) => {
    if (!project.outline) {
      dialogService.alert(t('steps:chapters.noOutline'));
      return;
    }
    
    // 重置token状态
    setTraditionalTokens({ prompt: 0, completion: 0, total: 0 });
    
    if (isContinue) setContinueLoading(true);
    else setLoading(true);

    try {
      let finalPrompt = "";
      const template = prompts.find(p => p.id === selectedPromptId)?.content || '';

      if (isContinue && project.chapters.length > 0) {
        // 续写模式：构建包含上下文的提示词
        const existingInfo = project.chapters
          .slice(-5) // 取最后5章作为上下文，防止提示词过长
          .map(c => `第${c.order + 1}章：${c.title}\n细纲：${c.summary.substring(0, 100)}...`)
          .join('\n\n');
        
        // 寻找专门的续写模板，如果没有则手动组合
        const continueTemplate = prompts.find(p => p.id === 'p4-continue')?.content || 
          "根据大纲：{outline}。目前已完成到第{count}章。请紧接着从'第{next_count}章'开始续写后续章节细纲。格式：\n第N章：[标题]\n剧情细纲：[描述]\n---";
        
        finalPrompt = continueTemplate
          .replace('{outline}', project.outline)
          .replace('{count}', project.chapters.length.toString())
          .replace('{next_count}', (project.chapters.length + 1).toString())
          .replace('{existing_chapters}', existingInfo);
      } else {
        // 全量生成模式
        finalPrompt = template.replace('{outline}', project.outline);
      }
      
      // Inject Knowledge
      if (selectedKnowledgeIds.size > 0) {
         const kContent = project.knowledge
           .filter(k => selectedKnowledgeIds.has(k.id))
           .map(k => `【参考资料：${k.name}】\n${k.content.substring(0, 8000)}`)
           .join('\n\n');
         if (kContent) finalPrompt += `\n\n### 必须参考的世界观/设定资料 (Knowledge Base)\n请参考以下资料规划章节剧情：\n${kContent}`;
      }

      // 使用传统调用
      const result = await AIService.call(activeModel, finalPrompt);
      if (result.error) {
        dialogService.alert(t('steps:common.generateFailed', { error: result.error }));
        return;
      }
      const startIndex = isContinue ? project.chapters.length : 0;
      const parsedChapters = parseChapters(result.content, startIndex);

      if (parsedChapters.length > 0) {
        if (isContinue) {
          onUpdate({ chapters: [...project.chapters, ...parsedChapters] });
        } else {
          onUpdate({ chapters: parsedChapters });
        }
      } else {
        dialogService.alert(t('steps:chapters.unrecognized'));
      }
      
      // 保存传统输出模式的token信息
      if (result.tokens) {
        setTraditionalTokens(result.tokens);
      }
      
      // 创建AI历史记录
      const historyRecord = AIService.buildHistoryRecordData(
        'chapter-outline-virtual-chapter', // 虚拟章节ID
        finalPrompt,
        result.content,
        activeModel,
        result,
        {
          templateName: templateDisplayName(prompts.find(p => p.id === selectedPromptId) ?? { name: t('steps:chapters.defaultTemplateName') }),
          batchGeneration: false,
          chapterTitle: isContinue ? t('steps:chapters.chapterTitleContinue') : t('steps:chapters.chapterTitleGen'),
          generatedChapterCount: parsedChapters.length
        }
      );
      
      // 将历史记录添加到虚拟章节（使用virtualChapters数组）
      const updatedVirtualChapters = project.virtualChapters || [];
      const chapterOutlineChapter = updatedVirtualChapters.find(c => c.id === 'chapter-outline-virtual-chapter') || {
        id: 'chapter-outline-virtual-chapter',
        title: t('steps:chapters.chapterTitleGen'),
        summary: t('steps:chapters.historySummary'),
        content: '',
        order: -100, // 特殊顺序，放在最前面
        history: []
      };
      
      const existingHistory = chapterOutlineChapter.history || [];
      const updatedChapterOutlineChapter = {
        ...chapterOutlineChapter,
        history: [...existingHistory, historyRecord]
      };
      
      // 更新虚拟章节列表
      const finalVirtualChapters = updatedVirtualChapters.filter(c => c.id !== 'chapter-outline-virtual-chapter');
      finalVirtualChapters.unshift(updatedChapterOutlineChapter);
      
      // 更新项目数据，包含更新后的虚拟章节
      onUpdate({ 
        virtualChapters: finalVirtualChapters
      });
    } catch (err) {
      console.error(err);
      dialogService.alert(t('steps:chapters.generateErrorGeneric'));
    } finally {
      setLoading(false);
      setContinueLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 overflow-hidden p-8">
      <Card className="z-20 flex shrink-0 flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <ListOrdered className="size-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-medium tracking-tight">{t('steps:chapters.title')}</h2>
            <p className="text-xs text-muted-foreground">{t('steps:chapters.subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           {/* Knowledge Selector Toggle */}
           <div className="relative">
              <Button
                 variant={selectedKnowledgeIds.size > 0 ? 'secondary' : 'outline'}
                 size="icon"
                 onClick={() => setShowKnowledgeSelector(!showKnowledgeSelector)}
                 title={t('steps:chapters.knowledgeToggleTitle')}
              >
                 <BookOpenText className="size-4" />
                 {selectedKnowledgeIds.size > 0 && (
                   <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground">
                     {selectedKnowledgeIds.size}
                   </span>
                 )}
              </Button>

              {showKnowledgeSelector && (
                 <div className="absolute right-0 top-11 z-50 w-72 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg">
                    <div className="mb-2 flex items-center justify-between">
                       <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('steps:chapters.knowledgeSelectTitle')}</h5>
                       <div className="flex gap-1">
                          <Button
                             variant="ghost"
                             size="sm"
                             className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                             onClick={() => {
                                const allIds = (project.knowledge || [])
                                  .filter(k => k.category === 'chapter')
                                  .map(k => k.id);
                                setSelectedKnowledgeIds(new Set(allIds));
                             }}
                             title={t('steps:common.selectAllTitle')}
                          >
                             <CheckCheck className="size-3" /> {t('steps:common.selectAll')}
                          </Button>
                          <Button
                             variant="ghost"
                             size="sm"
                             className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                             onClick={() => setSelectedKnowledgeIds(new Set())}
                             title={t('steps:common.clearTitle')}
                          >
                             <XCircle className="size-3" /> {t('steps:common.clear')}
                          </Button>
                       </div>
                    </div>
                    <div className="max-h-60 space-y-1 overflow-y-auto">
                       {(project.knowledge || []).filter(k => k.category === 'chapter').length === 0 ? <p className="text-xs italic text-muted-foreground">{t('steps:common.noMaterial')}</p> :
                          project.knowledge.filter(k => k.category === 'chapter').map(k => (
                             <div
                                key={k.id}
                                onClick={() => {
                                   const newSet = new Set(selectedKnowledgeIds);
                                   if (newSet.has(k.id)) newSet.delete(k.id); else newSet.add(k.id);
                                   setSelectedKnowledgeIds(newSet);
                                }}
                                className={cn(
                                  'flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-colors',
                                  selectedKnowledgeIds.has(k.id) ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:bg-muted'
                                )}
                             >
                                <span className={cn(
                                  'flex size-3.5 shrink-0 items-center justify-center rounded border',
                                  selectedKnowledgeIds.has(k.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
                                )}>
                                   {selectedKnowledgeIds.has(k.id) && <Check className="size-2.5" />}
                                </span>
                                <span className={cn('flex-1 truncate text-left text-xs', selectedKnowledgeIds.has(k.id) ? 'font-medium text-foreground' : 'text-muted-foreground')}>{k.name}</span>
                             </div>
                          ))
                       }
                    </div>
                 </div>
              )}
           </div>

          <Select
            value={selectedPromptId}
            onChange={(e) => setSelectedPromptId(e.target.value)}
            className="h-10 w-auto"
          >
            {chapterPrompts.map(p => <option key={p.id} value={p.id}>{templateDisplayName(p)}</option>)}
          </Select>
          <div className="flex items-center gap-2">
            <Button onClick={() => generateChapters(false)} disabled={loading || continueLoading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
              {loading ? t('steps:chapters.generating') : t('steps:chapters.regenerate')}
            </Button>

            {project.chapters.length > 0 && (
              <Button variant="outline" onClick={() => generateChapters(true)} disabled={loading || continueLoading}>
                {continueLoading ? <Loader2 className="size-4 animate-spin" /> : <FastForward className="size-4" />}
                {continueLoading ? t('steps:chapters.continuing') : t('steps:chapters.continueBtn')}
              </Button>
            )}
          </div>

        </div>
      </Card>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden lg:grid-cols-4">
        <Card className="flex min-h-0 flex-col overflow-hidden p-5 lg:col-span-1">
          <h4 className="mb-3 flex shrink-0 items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <BookOpen className="size-3.5" /> {t('steps:chapters.outlineRefTitle')}
          </h4>
          <div className="custom-scrollbar flex-1 overflow-y-auto pr-1 text-xs text-muted-foreground">
            {project.outline ? <MarkdownView content={project.outline} className="text-xs [&_*]:text-current" /> : t('steps:chapters.outlineEmpty')}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden rounded-lg p-0 lg:col-span-3">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <LayoutList className="size-3.5" /> {t('steps:chapters.chapterListPreview', { count: project.chapters.length })}
            </span>
            <div className="flex items-center gap-2">
              {/* Token消耗显示 */}
              {traditionalTokens.total > 0 && (
                <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs tabular-nums">
                  <span className="text-muted-foreground">{t('steps:chapters.inputToken')} <span className="font-medium text-foreground">{traditionalTokens.prompt}</span></span>
                  <span className="text-muted-foreground">{t('steps:chapters.outputToken')} <span className="font-medium text-foreground">{traditionalTokens.completion}</span></span>
                  <span className="text-muted-foreground">{t('steps:chapters.totalLabel')} <span className="font-medium text-foreground">{traditionalTokens.total}</span></span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdate({ chapters: [...project.chapters, { id: Date.now().toString(), title: t('steps:chapters.defaultNewChapter', { num: project.chapters.length + 1 }), summary: '', content: '', order: project.chapters.length }] })}
              >
                {t('steps:chapters.manualAdd')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportChaptersToTxt}
                disabled={project.chapters.length === 0}
              >
                <FileOutput className="size-3.5" />
                {t('steps:chapters.exportTxt')}
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {(() => {
              // 过滤掉虚拟章节（order < 0的章节）
              const regularChapters = project.chapters.filter(chapter => chapter.order >= 0);
              const sortedChapters = regularChapters.sort((a,b) => a.order - b.order);

              if (sortedChapters.length === 0) {
                return (
                  <EmptyState
                    className="h-full"
                    icon={Layers}
                    title={t('steps:chapters.emptyTitle')}
                    description={t('steps:chapters.emptyHint')}
                  />
                );
              }

              return sortedChapters.map((chap, idx) => (
                <div key={chap.id} className="group rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30">
                  <div className="mb-4 flex items-center gap-4 border-b border-border pb-4">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Input
                        className="h-auto border-none bg-transparent p-0 font-serif text-base font-medium shadow-none focus-visible:ring-0"
                        value={chap.title}
                        onChange={(e) => {
                          const newChaps = project.chapters.map(c => c.id === chap.id ? { ...c, title: e.target.value } : c);
                          onUpdate({ chapters: newChaps });
                        }}
                        placeholder={t('steps:chapters.titlePlaceholder')}
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="sm" onClick={() => onEnterWriting(chap.id)}>
                        <PenTool className="size-3.5" /> {t('steps:chapters.writeThis')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        onClick={() => onUpdate({ chapters: project.chapters.filter(c => c.id !== chap.id) })}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mb-1">
                    <Label className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">{t('steps:chapters.summaryLabel')}</Label>
                    <Textarea
                      className="min-h-24 resize-none bg-muted/40 leading-relaxed"
                      value={chap.summary}
                      onChange={(e) => {
                        const newChaps = project.chapters.map(c => c.id === chap.id ? { ...c, summary: e.target.value } : c);
                        onUpdate({ chapters: newChaps });
                      }}
                      placeholder={t('steps:chapters.summaryPlaceholder')}
                    />
                  </div>

                  {/* 世界关联信息编辑器 */}
                  <ChapterWorldRelationEditor
                    chapter={chap}
                    project={project}
                    onUpdate={(updates) => {
                      const newChaps = project.chapters.map(c => c.id === chap.id ? { ...c, ...updates } : c);
                      onUpdate({ chapters: newChaps });
                    }}
                  />
                </div>
              ));
            })()}
          </div>
        </Card>
      </div>
    </div>
  );
};

/**
 * 章节世界关联信息编辑器
 * 用于编辑章节与世界观数据的关联
 */
interface ChapterWorldRelationEditorProps {
  chapter: Chapter;
  project: Project;
  onUpdate: (updates: Partial<Chapter>) => void;
}

const ChapterWorldRelationEditor: React.FC<ChapterWorldRelationEditorProps> = ({
  chapter,
  project,
  onUpdate
}) => {
  const { t } = useTranslation(['steps', 'common']);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const locations = project.locations || [];
  const factions = project.factions || [];
  const timeline = project.timeline;
  
  // 获取当前选中的地点
  const mainLocation = locations.find(l => l.id === chapter.mainLocationId);
  
  // 获取当前选中的势力
  const involvedFactions = factions.filter(f => 
    chapter.involvedFactionIds?.includes(f.id)
  );
  
  // 切换势力选择
  const toggleFaction = (factionId: string) => {
    const currentIds = chapter.involvedFactionIds || [];
    const newIds = currentIds.includes(factionId)
      ? currentIds.filter(id => id !== factionId)
      : [...currentIds, factionId];
    onUpdate({ involvedFactionIds: newIds });
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <span className="flex items-center gap-1.5">
          <Globe2 className="size-3.5" />
          {t('steps:chapters.worldRelation')}
          {(mainLocation || involvedFactions.length > 0) && (
            <span className="text-foreground">
              ({[mainLocation?.name, involvedFactions.length > 0 && t('steps:chapters.factionsCount', { count: involvedFactions.length })].filter(Boolean).join(', ')})
            </span>
          )}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* 主要发生地点 */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              {t('steps:chapters.mainLocation')}
            </Label>
            <Select
              value={chapter.mainLocationId || ''}
              onChange={(e) => onUpdate({ mainLocationId: e.target.value || undefined })}
              className="h-8 text-xs"
            >
              <option value="">{t('steps:chapters.noneOption')}</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.type})
                </option>
              ))}
            </Select>
            {mainLocation && (
              <div className="rounded border border-border bg-muted/40 p-2 text-xs">
                <div className="font-medium">{mainLocation.name}</div>
                <div className="truncate text-muted-foreground">{mainLocation.description?.substring(0, 40)}...</div>
              </div>
            )}
          </div>

          {/* 涉及势力 */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Flag className="size-3.5" />
              {t('steps:chapters.involvedFactions')}
            </Label>
            <div className="max-h-32 space-y-0.5 overflow-y-auto rounded-md border border-border bg-muted/30 p-1.5">
              {factions.length === 0 ? (
                <span className="text-xs italic text-muted-foreground">{t('steps:chapters.noFactions')}</span>
              ) : (
                factions.map(faction => (
                  <label
                    key={faction.id}
                    className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-xs transition-colors hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={chapter.involvedFactionIds?.includes(faction.id) || false}
                      onChange={() => toggleFaction(faction.id)}
                      className="size-3.5 accent-primary"
                    />
                    <span className="truncate">{faction.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* 故事时间点 */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {t('steps:chapters.storyTime')}
              {timeline && <span className="font-normal text-muted-foreground/70">({timeline.config.calendarSystem})</span>}
            </Label>

            {timeline ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="mb-1 block text-[10px] text-muted-foreground">{t('steps:chapters.yearLabel')}</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={chapter.storyDate?.year || ''}
                      onChange={(e) => onUpdate({
                        storyDate: {
                          ...chapter.storyDate,
                          year: parseInt(e.target.value) || 0
                        }
                      })}
                      placeholder={timeline.config.startYear?.toString() || '0'}
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-[10px] text-muted-foreground">{t('steps:chapters.displayLabel')}</Label>
                    <Input
                      type="text"
                      className="h-8 text-xs"
                      value={chapter.storyDate?.display || ''}
                      onChange={(e) => onUpdate({
                        storyDate: {
                          ...chapter.storyDate,
                          year: chapter.storyDate?.year ?? timeline.config.startYear ?? 0,
                          display: e.target.value
                        }
                      })}
                      placeholder={t('steps:chapters.displayPlaceholder')}
                    />
                  </div>
                </div>

                {/* 关联时间线事件 */}
                {timeline.events?.length > 0 && (
                  <div>
                    <Label className="mb-1 block text-[10px] text-muted-foreground">{t('steps:chapters.linkedEvent')}</Label>
                    <Select
                      value={chapter.timelineEventId || ''}
                      onChange={(e) => onUpdate({ timelineEventId: e.target.value || undefined })}
                      className="h-8 text-xs"
                    >
                      <option value="">{t('steps:chapters.noneOption')}</option>
                      {timeline.events.map(event => (
                        <option key={event.id} value={event.id}>
                          {event.title} ({event.date?.display || event.date?.year})
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-border bg-muted/30 p-2.5 text-xs italic text-muted-foreground">
                {t('steps:chapters.noTimeline')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepChapterOutline;

