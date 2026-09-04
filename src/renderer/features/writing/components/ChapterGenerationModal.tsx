/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { templateDisplayName } from '@/i18n';
import { type OutputMode } from '../../../../shared/types';
import type { ChapterGenerationModalProps } from '../types';
import { Ban, BookOpen, Check, WandSparkles, X } from 'lucide-react';

const ChapterGenerationModal: React.FC<ChapterGenerationModalProps> = ({
  genModal,
  setGenModal,
  modalContextInfo,
  useOutline,
  setUseOutline,
  project,
  selectedCharacterIds,
  toggleCharacter,
  selectAllCharacters,
  clearAllCharacters,
  selectedChapterSummaryIds,
  toggleChapterSummary,
  selectAllChapterSummaries,
  clearAllChapterSummaries,
  editableSummary,
  setEditableSummary,
  selectedKnowledgeIds,
  toggleKnowledge,
  selectAllKnowledge,
  clearAllKnowledge,
  writingPrompts,
  selectedGenPromptId,
  setSelectedGenPromptId,
  targetWordCount,
  setTargetWordCount,
  batchMode,
  setBatchMode,
  activeModel,
  outputMode,
  setOutputMode,
  isStreaming,
  streamingTokens,
  traditionalTokens,
  isGenerating,
  handleEnterEditor,
  handleModalGenerate,
}) => {
  const { t } = useTranslation('writing');
  const prevTitlePart = modalContextInfo.prevChapter ? `《${modalContextInfo.prevChapter.title}》` : '';
  const nextTitlePart = modalContextInfo.nextChapter ? `《${modalContextInfo.nextChapter.title}》` : '';
  return (
      genModal.isOpen && genModal.chapter && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl border border-gray-100 overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-black text-gray-800 tracking-tight">{t('genModal.title')}</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Context-Aware Generation</p>
              </div>
              <button onClick={() => setGenModal({ isOpen: false, chapter: null })} className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all"><X className="size-4" /></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1">
              
              {/* 信息概览卡片 */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 border-b border-gray-200">
                  <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">{t('genModal.targetChapter')}</div>
                  <div className="col-span-9 p-4 text-sm font-bold text-gray-800 flex items-center bg-white justify-between">
                     <span>{t('genModal.chapterEntry', { num: genModal.chapter.order + 1, title: genModal.chapter.title })}</span>
                     <span className={`text-[10px] px-2 py-0.5 rounded border ${genModal.chapter.content.length > 50 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                        {genModal.chapter.content.length > 50 ? t('genModal.hasContent') : t('genModal.blankChapter')}
                     </span>
                  </div>
                </div>

                {/* 上下文连贯性检测面板 */}
                <div className="grid grid-cols-12 border-b border-gray-200">
                   <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-blue-500 uppercase flex items-start pt-5">{t('genModal.contextTitle')}</div>
                   <div className="col-span-9 p-4 bg-white">
                      <div className="space-y-2">
                         {modalContextInfo.prevContextText && modalContextInfo.prevContextText.length > 0 ? (
                            <div className="flex items-start gap-3">
                               <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black shrink-0">↑</div>
                               <div>
                                  <p className="text-xs font-bold text-blue-700">{t('genModal.prevTitle')}</p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">{t('genModal.prevHint', { chapter: prevTitlePart })}</p>
                               </div>
                            </div>
                         ) : (
                            <div className="flex items-start gap-3">
                               <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-black shrink-0">↑</div>
                               <div>
                                  <p className="text-xs font-bold text-gray-400">{t('genModal.noPrevTitle')}</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">{t('genModal.noPrevHint')}</p>
                               </div>
                            </div>
                         )}
                         {modalContextInfo.nextSummary && modalContextInfo.nextSummary.length > 0 ? (
                            <div className="flex items-start gap-3">
                               <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-black shrink-0">↓</div>
                               <div>
                                  <p className="text-xs font-bold text-green-700">{t('genModal.nextTitle')}</p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">{t('genModal.nextHint', { chapter: nextTitlePart })}</p>
                               </div>
                            </div>
                         ) : (
                            <div className="flex items-start gap-3">
                               <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-black shrink-0">↓</div>
                               <div>
                                  <p className="text-xs font-bold text-gray-400">{t('genModal.noNextTitle')}</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">{t('genModal.noNextHint')}</p>
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
                    <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">{t('genModal.sectionOutline')}</div>
                    <div className="col-span-9 p-4 bg-white">
                      <button 
                        onClick={() => setUseOutline(!useOutline)}
                        className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                          useOutline 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <BookOpen className="size-4" />
                        {useOutline ? t('genModal.outlineLinked') : t('genModal.outlineLink')}
                      </button>
                      <p className="text-[10px] text-gray-400 mt-2">
                        {t('genModal.outlineHint')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 区域B：角色选择器 */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="grid grid-cols-12 border-b border-gray-200">
                    <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">{t('genModal.sectionCharacters')}</div>
                    <div className="col-span-9 p-4 bg-white">
                      <div className="flex gap-3 mb-3">
                        <button
                          onClick={selectAllCharacters}
                          className="px-4 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          {t('genModal.selectAllCharacters')}
                        </button>
                        <button
                          onClick={clearAllCharacters}
                          className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          {t('genModal.clearSelection')}
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
                                {isSelected && <Check className="size-3" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <div className="text-sm font-bold text-gray-800">
                                    {character.name}
                                  </div>
                                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                                    isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {character.role || t('genModal.roleUnspecified')}
                                  </span>
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1 line-clamp-2">
                                  {character.personality || character.background || t('genModal.noCharacterDesc')}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {project.characters.length === 0 && (
                          <div className="text-center py-4 text-gray-400 text-sm">
                            {t('genModal.noCharacters')}
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] text-gray-400 mt-2">
                        {t('genModal.charactersHint')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 区域C：章节正文摘要选择器 */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="grid grid-cols-12 border-b border-gray-200">
                    <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">{t('genModal.sectionSummaries')}</div>
                    <div className="col-span-9 p-4 bg-white">
                      <div className="flex gap-3 mb-3">
                        <button
                          onClick={selectAllChapterSummaries}
                          className="px-4 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          {t('genModal.smartSelectFive')}
                        </button>
                        <button
                          onClick={clearAllChapterSummaries}
                          className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          {t('genModal.clearSelection')}
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
                                  {isCurrentChapter && <Ban className="size-2" />}
                                  {!isCurrentChapter && isSelected && <Check className="size-3" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                    <div className="text-sm font-bold text-gray-800">
                                      {t('genModal.chapterEntry', { num: chapter.order + 1, title: chapter.title })}
                                      {isCurrentChapter && <span className="ml-2 text-xs text-gray-500">{t('genModal.currentChapter')}</span>}
                                    </div>
                                    {!isCurrentChapter && (
                                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                                        isSelected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        {isSelected ? t('genModal.selectedState') : t('genModal.unselectedState')}
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
                            {t('genModal.noSummaries')}
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] text-gray-400 mt-2">
                        {t('genModal.summariesHint')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 区域D：细纲自由编辑 */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="grid grid-cols-12 border-b border-gray-200">
                    <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-start pt-5">{t('genModal.sectionDetail')}</div>
                    <div className="col-span-9 p-4 bg-white">
                      <textarea
                        value={editableSummary}
                        onChange={(e) => setEditableSummary(e.target.value)}
                        placeholder={t('genModal.detailPlaceholder')}
                        className="w-full bg-amber-50/50 border border-amber-100 text-gray-700 text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-200 resize-none h-32 custom-scrollbar"
                      />
                      <p className="text-[10px] text-gray-400 mt-2">
                        {t('genModal.detailHint')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 知识库选择区域 */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 border-b border-gray-200">
                  <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">{t('genModal.sectionKnowledge')}</div>
                  <div className="col-span-9 p-4 bg-white">
                    <div className="flex gap-3 mb-3">
                      <button onClick={selectAllKnowledge} className="px-4 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors">{t('genModal.selectAll')}</button>
                      <button onClick={clearAllKnowledge} className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors">{t('genModal.clear')}</button>
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                      {project.knowledge && project.knowledge.filter(k => k.category === 'writing').length > 0 ? (
                        project.knowledge.filter(k => k.category === 'writing').map(k => {
                          const isSelected = selectedKnowledgeIds.has(k.id);
                          return (
                            <div key={k.id} onClick={() => toggleKnowledge(k.id)} className={`flex items-center gap-3 p-3 rounded-lg mb-2 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}>
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300'}`}>
                                {isSelected && <Check className="size-3" />}
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
                          {t('genModal.noKnowledge')}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">
                      {t('genModal.knowledgeHint')}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* 生成模板选择区域 */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 border-b border-gray-200">
                  <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">{t('genModal.sectionTemplate')}</div>
                  <div className="col-span-9 p-4 bg-white">
                    <select 
                      value={selectedGenPromptId} 
                      onChange={(e) => setSelectedGenPromptId(e.target.value)}
                      className="w-full bg-blue-50/50 border border-blue-100 text-blue-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer hover:bg-blue-50 transition-colors"
                    >
                      {writingPrompts.map(p => (
                        <option key={p.id} value={p.id}>📝 {templateDisplayName(p)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
{/* 字数目标选择区域 */}
<div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
  <div className="grid grid-cols-12 border-b border-gray-200">
    <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">{t('genModal.sectionWordTarget')}</div>
    <div className="col-span-9 p-4 bg-white">
      <div className="flex items-center gap-4">
        <input 
          type="number" 
          min="1"
          value={targetWordCount}
          onChange={(e) => setTargetWordCount(parseInt(e.target.value) || 1)}
          className="flex-1 bg-blue-50/50 border border-blue-100 text-blue-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-200"
          placeholder={t('genModal.wordTargetPlaceholder')}
        />
        <div className="text-sm font-bold text-blue-600 min-w-[80px] text-right">
          {t('genModal.wordUnit')}
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-2">
        {t('genModal.wordTargetHint')}
      </p>
    </div>
  </div>
</div>
              
              {/* 批量生成模式选择区域 */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 border-b border-gray-200">
    <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">{t('genModal.sectionBatch')}</div>
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
          {t('genModal.batchSingle')}
        </button>
        <button
          onClick={() => setBatchMode('batch5')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            batchMode === 'batch5'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t('genModal.batchFive')}
        </button>
        <button
          onClick={() => setBatchMode('batch10')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            batchMode === 'batch10'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t('genModal.batchTen')}
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mt-2">
        {t('genModal.batchHint')}
      </p>
                  </div>
                </div>
              </div>
              
              {/* 输出模式选择区域 */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 border-b border-gray-200">
                  <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">{t('genModal.sectionOutputMode')}</div>
                  <div className="col-span-9 p-4 bg-white">
                    <select
                      value={outputMode}
                      onChange={(e) => setOutputMode(e.target.value as OutputMode)}
                      className="w-full bg-purple-50/50 border border-purple-100 text-purple-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer hover:bg-purple-50 transition-colors"
                    >
                      <option value="streaming">{t('output.streaming')}</option>
                      <option value="traditional">{t('output.traditional')}</option>
                    </select>

                    {/* 流式输出状态提示 */}
                    <div className="mt-3 p-3 bg-white/80 border border-purple-100 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${activeModel.supportsStreaming !== false ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                          <span className="text-xs font-bold text-gray-700">
                            {t('output.supportLabel')}
                          </span>
                        </div>
                        <span className={`text-xs font-black px-2 py-1 rounded ${activeModel.supportsStreaming !== false ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                          {activeModel.supportsStreaming !== false ? t('output.on') : t('output.off')}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2">
                        {activeModel.supportsStreaming !== false
                          ? t('output.onHint', { name: activeModel.name })
                          : t('output.offHint', { name: activeModel.name })
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
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('output.inputToken')}</div>
                      <div className="text-sm font-bold text-blue-600">
                        {isStreaming ? streamingTokens.prompt : traditionalTokens.prompt}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('output.outputToken')}</div>
                      <div className="text-sm font-bold text-green-600">
                        {isStreaming ? streamingTokens.completion : traditionalTokens.completion}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('output.total')}</div>
                      <div className="text-sm font-bold text-purple-600">
                        {isStreaming ? streamingTokens.total : traditionalTokens.total}
                      </div>
                    </div>
                    {isStreaming && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-gray-500">{t('output.generating')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <button onClick={handleEnterEditor} className="px-6 py-3 rounded-xl text-gray-500 font-bold text-sm hover:bg-gray-200 hover:text-gray-800 transition-all">{t('genModal.editorOnly')}</button>
                <button onClick={handleModalGenerate} className="px-8 py-3 bg-blue-600 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"><WandSparkles className="size-4" /> {t('genModal.confirmGenerate')}</button>
              </div>
            </div>
          </div>
        </div>
      )

  );
};

export default ChapterGenerationModal;

