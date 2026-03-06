import React from 'react';
import { OutputMode } from '../../../../shared/types';
import type { ChapterGenerationModalProps } from '../types';

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
  isBatchGenerating,
  batchProgress,
  activeModel,
  outputMode,
  setOutputMode,
  isStreaming,
  streamingTokens,
  traditionalTokens,
  isGenerating,
  handleEnterEditor,
  handleModalGenerate,
  stopBatchGeneration,
}) => {
  return (
      genModal.isOpen && genModal.chapter && (
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
      )

  );
};

export default ChapterGenerationModal;

