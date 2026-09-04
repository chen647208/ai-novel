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
import type { WritingEditModalProps } from '../types';
import { WandSparkles, X } from 'lucide-react';

const WritingEditModal: React.FC<WritingEditModalProps> = ({
  isOpen,
  selectedText,
  editPrompts,
  selectedEditPromptId,
  customEditPrompt,
  outputMode,
  activeModel,
  isStreaming,
  isGenerating,
  streamingTokens,
  traditionalTokens,
  onClose,
  onSelectedEditPromptChange,
  onCustomEditPromptChange,
  onOutputModeChange,
  onSubmit,
}) => {
  const { t } = useTranslation('writing');
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-gray-800 tracking-tight">{t('editModal.title')}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Text Polish & Expansion</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 border-b border-gray-200">
              <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-start pt-5">{t('editModal.sectionSelected')}</div>
              <div className="col-span-9 p-4 bg-white relative group">
                <div className="max-h-48 overflow-y-auto custom-scrollbar text-sm text-gray-600 leading-relaxed whitespace-pre-wrap italic bg-gray-50/50 p-3 rounded-lg border border-gray-100">{selectedText}</div>
              </div>
            </div>
            <div className="grid grid-cols-12 border-b border-gray-200">
              <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">{t('editModal.sectionStrategy')}</div>
              <div className="col-span-9 p-4 bg-white">
                <select
                  value={selectedEditPromptId}
                  onChange={(event) => onSelectedEditPromptChange(event.target.value)}
                  className="w-full bg-blue-50/50 border border-blue-100 text-blue-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  {editPrompts.map((prompt) => (
                    <option key={prompt.id} value={prompt.id}>✨ {templateDisplayName(prompt)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-12 border-b border-gray-200">
              <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-start pt-5">{t('editModal.sectionCustom')}</div>
              <div className="col-span-9 p-4 bg-white">
                <textarea
                  value={customEditPrompt}
                  onChange={(event) => onCustomEditPromptChange(event.target.value)}
                  placeholder={t('editModal.customPlaceholder')}
                  className="w-full bg-amber-50/50 border border-amber-100 text-gray-700 text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-200 resize-none h-32 custom-scrollbar"
                />
                <p className="text-[10px] text-gray-400 mt-2">
                  {t('editModal.customHint')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-12">
              <div className="col-span-3 bg-gray-50 p-4 text-xs font-black text-gray-500 uppercase flex items-center">{t('editModal.sectionOutputMode')}</div>
              <div className="col-span-9 p-4 bg-white">
                <select
                  value={outputMode}
                  onChange={(event) => onOutputModeChange(event.target.value as typeof outputMode)}
                  className="w-full bg-purple-50/50 border border-purple-100 text-purple-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer hover:bg-purple-50 transition-colors"
                >
                  <option value="streaming">{t('output.streaming')}</option>
                  <option value="traditional">{t('output.traditional')}</option>
                </select>

                <div className="mt-3 p-3 bg-white/80 border border-purple-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${activeModel.supportsStreaming !== false ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                      <span className="text-xs font-bold text-gray-700">{t('output.supportLabel')}</span>
                    </div>
                    <span className={`text-xs font-black px-2 py-1 rounded ${activeModel.supportsStreaming !== false ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                      {activeModel.supportsStreaming !== false ? t('output.on') : t('output.off')}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">
                    {activeModel.supportsStreaming !== false
                      ? t('output.onHint', { name: activeModel.name })
                      : t('output.offHint', { name: activeModel.name })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {(isStreaming || isGenerating || streamingTokens.total >= 0 || traditionalTokens.total >= 0) && (
              <div className="flex items-center gap-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-3 shadow-sm">
                <div className="text-center">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('output.inputToken')}</div>
                  <div className="text-sm font-bold text-blue-600">{isStreaming ? streamingTokens.prompt : traditionalTokens.prompt}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('output.outputToken')}</div>
                  <div className="text-sm font-bold text-green-600">{isStreaming ? streamingTokens.completion : traditionalTokens.completion}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('output.total')}</div>
                  <div className="text-sm font-bold text-purple-600">{isStreaming ? streamingTokens.total : traditionalTokens.total}</div>
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
            <button onClick={onClose} className="px-6 py-3 rounded-xl text-gray-500 font-bold text-sm hover:bg-gray-200 hover:text-gray-800 transition-all">{t('editModal.cancel')}</button>
            <button onClick={onSubmit} className="px-8 py-3 bg-purple-600 text-white font-black text-sm rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 active:scale-95 transition-all flex items-center gap-2">
              <WandSparkles className="size-4" /> {t('editModal.runNow')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WritingEditModal;
