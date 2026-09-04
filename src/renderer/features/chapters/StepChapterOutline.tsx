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
    <div className="max-w-7xl mx-auto h-full p-8 flex flex-col gap-6 overflow-hidden">
      <div className="flex justify-between items-center bg-white p-6 px-10 rounded-[2rem] border border-gray-100 shadow-sm z-20">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <i className="fas fa-list-ol text-xl"></i>
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">{t('steps:chapters.title')}</h2>
            <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-widest font-black">AI Driven Chapter Orchestration</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
           {/* Knowledge Selector Toggle */}
           <div className="relative">
              <button 
                 onClick={() => setShowKnowledgeSelector(!showKnowledgeSelector)}
                 className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${selectedKnowledgeIds.size > 0 ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'}`}
                 title={t('steps:chapters.knowledgeToggleTitle')}
              >
                 <i className="fas fa-book-atlas"></i>
                 {selectedKnowledgeIds.size > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[9px] flex items-center justify-center rounded-full font-bold">{selectedKnowledgeIds.size}</span>}
              </button>
              
              {showKnowledgeSelector && (
                 <div className="absolute top-12 right-0 bg-white border border-gray-100 shadow-xl rounded-2xl p-4 w-72 z-50 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-3">
                       <h5 className="text-xs font-black text-gray-500 uppercase tracking-widest">{t('steps:chapters.knowledgeSelectTitle')}</h5>
                       <div className="flex gap-1">
                          <button 
                             onClick={() => {
                                const allIds = (project.knowledge || [])
                                  .filter(k => k.category === 'chapter')
                                  .map(k => k.id);
                                setSelectedKnowledgeIds(new Set(allIds));
                             }}
                             className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-[9px] font-bold transition-all flex items-center gap-1"
                             title={t('steps:common.selectAllTitle')}
                          >
                             <i className="fas fa-check-double text-[8px]"></i> {t('steps:common.selectAll')}
                          </button>
                          <button 
                             onClick={() => setSelectedKnowledgeIds(new Set())}
                             className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-[9px] font-bold transition-all flex items-center gap-1"
                             title={t('steps:common.clearTitle')}
                          >
                             <i className="fas fa-times-circle text-[8px]"></i> {t('steps:common.clear')}
                          </button>
                       </div>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                       {(project.knowledge || []).filter(k => k.category === 'chapter').length === 0 ? <p className="text-xs text-gray-300 italic">{t('steps:common.noMaterial')}</p> :
                          project.knowledge.filter(k => k.category === 'chapter').map(k => (
                             <div 
                                key={k.id}
                                onClick={() => {
                                   const newSet = new Set(selectedKnowledgeIds);
                                   if (newSet.has(k.id)) newSet.delete(k.id); else newSet.add(k.id);
                                   setSelectedKnowledgeIds(newSet);
                                }}
                                className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
                                   selectedKnowledgeIds.has(k.id) ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                                }`}
                             >
                                <div className={`w-3 h-3 rounded border flex items-center justify-center ${selectedKnowledgeIds.has(k.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-300'}`}>
                                   {selectedKnowledgeIds.has(k.id) && <i className="fas fa-check text-[6px]"></i>}
                                </div>
                                <span className={`text-[10px] font-bold truncate flex-1 text-left ${selectedKnowledgeIds.has(k.id) ? 'text-emerald-800' : 'text-gray-600'}`}>{k.name}</span>
                             </div>
                          ))
                       }
                    </div>
                 </div>
              )}
           </div>

          
          <select 
            value={selectedPromptId}
            onChange={(e) => setSelectedPromptId(e.target.value)}
            className="text-xs font-bold border-2 border-gray-100 rounded-xl px-4 py-2 outline-none focus:border-blue-500 transition-all bg-gray-50 h-10"
          >
            {chapterPrompts.map(p => <option key={p.id} value={p.id}>{templateDisplayName(p)}</option>)}
          </select>
          <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
            <button 
              onClick={() => generateChapters(false)}
              disabled={loading || continueLoading}
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                loading ? 'bg-gray-200 text-gray-400' : 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-200 active:scale-95'
              }`}
            >
              {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
              {loading ? t('steps:chapters.generating') : t('steps:chapters.regenerate')}
            </button>
            
            {project.chapters.length > 0 && (
              <button 
                onClick={() => generateChapters(true)}
                disabled={loading || continueLoading}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                  continueLoading ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100 active:scale-95'
                }`}
              >
                {continueLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-forward-step"></i>}
                {continueLoading ? t('steps:chapters.continuing') : t('steps:chapters.continueBtn')}
              </button>
            )}
          </div>
          
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8 overflow-hidden z-10">
        <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <i className="fas fa-book-open"></i> {t('steps:chapters.outlineRefTitle')}
          </h4>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar text-xs text-gray-500 leading-relaxed italic opacity-80 whitespace-pre-wrap text-left">
            {project.outline || t('steps:chapters.outlineEmpty')}
          </div>
        </div>

        <div className="lg:col-span-3 bg-gray-50/30 rounded-[2.5rem] border border-gray-200/50 overflow-hidden flex flex-col">
          <div className="p-6 border-b bg-white flex justify-between items-center px-10">
            <span className="text-xs font-black text-gray-400 uppercase flex items-center gap-2">
              <i className="fas fa-stream"></i> {t('steps:chapters.chapterListPreview', { count: project.chapters.length })}
            </span>
            <div className="flex items-center gap-4">
              {/* Token消耗显示 */}
              {traditionalTokens.total > 0 && (
                <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-3 shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('steps:chapters.inputToken')}</div>
                      <div className="text-sm font-bold text-blue-600">
                        {traditionalTokens.prompt}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('steps:chapters.outputToken')}</div>
                      <div className="text-sm font-bold text-green-600">
                        {traditionalTokens.completion}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('steps:chapters.totalLabel')}</div>
                      <div className="text-sm font-bold text-purple-600">
                        {traditionalTokens.total}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <button 
                onClick={() => onUpdate({ chapters: [...project.chapters, { id: Date.now().toString(), title: t('steps:chapters.defaultNewChapter', { num: project.chapters.length + 1 }), summary: '', content: '', order: project.chapters.length }] })}
                className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-black transition-all"
              >
                {t('steps:chapters.manualAdd')}
              </button>
              <button 
                onClick={exportChaptersToTxt}
                disabled={project.chapters.length === 0}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                  project.chapters.length === 0 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }`}
              >
                <i className="fas fa-file-export"></i>
                {t('steps:chapters.exportTxt')}
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {(() => {
              // 过滤掉虚拟章节（order < 0的章节）
              const regularChapters = project.chapters.filter(chapter => chapter.order >= 0);
              const sortedChapters = regularChapters.sort((a,b) => a.order - b.order);
              
              if (sortedChapters.length === 0) {
                return (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20">
                    <i className="fas fa-layer-group text-6xl mb-6 opacity-10"></i>
                    <p className="font-black text-gray-400">{t('steps:chapters.emptyTitle')}</p>
                    <p className="text-xs mt-2 text-center max-w-xs">{t('steps:chapters.emptyHint')}</p>
                  </div>
                );
              }
              
              return sortedChapters.map((chap, idx) => (
                <div key={chap.id} className="bg-white border border-gray-100 rounded-[1.5rem] p-8 shadow-sm group hover:shadow-md hover:border-blue-100 transition-all animate-in slide-in-from-right-4">
                  <div className="flex items-center gap-5 mb-5 border-b border-gray-50 pb-5">
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {idx + 1}
                    </div>
                    <div className="flex-1 text-left">
                      <input 
                        className="w-full font-black text-lg text-gray-800 bg-transparent border-none focus:ring-0 p-0"
                        value={chap.title}
                        onChange={(e) => {
                          const newChaps = project.chapters.map(c => c.id === chap.id ? { ...c, title: e.target.value } : c);
                          onUpdate({ chapters: newChaps });
                        }}
                        placeholder={t('steps:chapters.titlePlaceholder')}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onEnterWriting(chap.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <i className="fas fa-pen-nib"></i> {t('steps:chapters.writeThis')}
                      </button>
                      <button 
                        onClick={() => onUpdate({ chapters: project.chapters.filter(c => c.id !== chap.id) })}
                        className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-left mb-4">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 block">{t('steps:chapters.summaryLabel')}</span>
                    <textarea 
                      className="w-full text-sm text-gray-600 bg-gray-50/50 rounded-2xl p-4 border-none focus:ring-2 focus:ring-blue-100 resize-none leading-relaxed min-h-[100px]"
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
        </div>
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
    <div className="mt-4 pt-4 border-t border-gray-100">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-amber-600 transition-colors"
      >
        <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
        <span className="flex items-center gap-2">
          <i className="fas fa-globe-asia text-amber-500"></i>
          {t('steps:chapters.worldRelation')}
          {(mainLocation || involvedFactions.length > 0) && (
            <span className="text-amber-600 font-medium">
              ({[mainLocation?.name, involvedFactions.length > 0 && t('steps:chapters.factionsCount', { count: involvedFactions.length })].filter(Boolean).join(', ')})
            </span>
          )}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in">
          {/* 主要发生地点 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <i className="fas fa-map-marker-alt text-emerald-500"></i>
              {t('steps:chapters.mainLocation')}
            </label>
            <select
              value={chapter.mainLocationId || ''}
              onChange={(e) => onUpdate({ mainLocationId: e.target.value || undefined })}
              className="w-full text-xs bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300"
            >
              <option value="">{t('steps:chapters.noneOption')}</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.type})
                </option>
              ))}
            </select>
            {mainLocation && (
              <div className="text-xs text-gray-500 bg-emerald-50/50 p-2 rounded-lg">
                <div className="font-medium text-emerald-700">{mainLocation.name}</div>
                <div className="text-gray-400 truncate">{mainLocation.description?.substring(0, 40)}...</div>
              </div>
            )}
          </div>

          {/* 涉及势力 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <i className="fas fa-flag text-amber-500"></i>
              {t('steps:chapters.involvedFactions')}
            </label>
            <div className="max-h-32 overflow-y-auto space-y-1 bg-gray-50 rounded-xl p-2">
              {factions.length === 0 ? (
                <span className="text-xs text-gray-400 italic">{t('steps:chapters.noFactions')}</span>
              ) : (
                factions.map(faction => (
                  <label 
                    key={faction.id} 
                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white p-1.5 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={chapter.involvedFactionIds?.includes(faction.id) || false}
                      onChange={() => toggleFaction(faction.id)}
                      className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="truncate">{faction.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* 故事时间点 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <i className="fas fa-clock text-indigo-500"></i>
              {t('steps:chapters.storyTime')}
              {timeline && <span className="text-gray-400 font-normal">({timeline.config.calendarSystem})</span>}
            </label>
            
            {timeline ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">{t('steps:chapters.yearLabel')}</label>
                    <input
                      type="number"
                      value={chapter.storyDate?.year || ''}
                      onChange={(e) => onUpdate({
                        storyDate: {
                          ...chapter.storyDate,
                          year: parseInt(e.target.value) || 0
                        }
                      })}
                      className="w-full text-xs bg-white px-2 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                      placeholder={timeline.config.startYear?.toString() || '0'}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">{t('steps:chapters.displayLabel')}</label>
                    <input
                      type="text"
                      value={chapter.storyDate?.display || ''}
                      onChange={(e) => onUpdate({
                        storyDate: {
                          ...chapter.storyDate,
                          year: chapter.storyDate?.year ?? timeline.config.startYear ?? 0,
                          display: e.target.value
                        }
                      })}
                      className="w-full text-xs bg-white px-2 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                      placeholder={t('steps:chapters.displayPlaceholder')}
                    />
                  </div>
                </div>
                
                {/* 关联时间线事件 */}
                {timeline.events?.length > 0 && (
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">{t('steps:chapters.linkedEvent')}</label>
                    <select
                      value={chapter.timelineEventId || ''}
                      onChange={(e) => onUpdate({ timelineEventId: e.target.value || undefined })}
                      className="w-full text-xs bg-white px-2 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    >
                      <option value="">{t('steps:chapters.noneOption')}</option>
                      {timeline.events.map(event => (
                        <option key={event.id} value={event.id}>
                          {event.title} ({event.date?.display || event.date?.year})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-lg">
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








