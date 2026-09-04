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
import type { WritingEditorStatusOverlayProps } from '../types';
import { Square } from 'lucide-react';

const WritingEditorStatusOverlay: React.FC<WritingEditorStatusOverlayProps> = ({
  isGenerating,
  isStreaming,
  isBatchGenerating,
  targetWordCount,
  selectedKnowledgeCount,
  streamingContentLength,
  batchProgress,
  onStopStreaming,
  onStopBatchGeneration,
}) => {
  const { t } = useTranslation('writing');
  return (
    <>
      {isGenerating && !isStreaming && (
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-20">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 flex flex-col items-center animate-in zoom-in duration-300">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-blue-600 font-black text-xs tracking-widest uppercase">{t('statusOverlay.generating')}</p>
            <p className="text-gray-400 text-[10px] mt-2">{t('statusOverlay.targetWords', { count: targetWordCount })}</p>
            <p className="text-gray-300 text-[9px] mt-1">{t('statusOverlay.contextInjected', { count: selectedKnowledgeCount })}</p>
          </div>
        </div>
      )}

      {isStreaming && (
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-20">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 flex flex-col items-center animate-in zoom-in duration-300">
            <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-green-600 font-black text-xs tracking-widest uppercase">{t('statusOverlay.streaming')}</p>
            <p className="text-gray-400 text-[10px] mt-2">{t('statusOverlay.generatedSoFar', { count: streamingContentLength })}</p>
            <p className="text-gray-300 text-[9px] mt-1">{t('statusOverlay.streamingHint')}</p>
            <button
              onClick={onStopStreaming}
              className="mt-4 px-4 py-2 bg-red-100 text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
            >
              <Square className="size-4" /> {t('statusOverlay.stop')}
            </button>
          </div>
        </div>
      )}

      {isBatchGenerating && (
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-20">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 flex flex-col items-center animate-in zoom-in duration-300 max-w-md">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-blue-600 font-black text-xs tracking-widest uppercase">{t('statusOverlay.batchInProgress')}</p>

            <div className="w-full mt-4 mb-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-gray-700">
                  {t('statusOverlay.batchProgress', { current: batchProgress.current, total: batchProgress.total })}
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
            <p className="text-gray-400 text-[10px]">{t('statusOverlay.currentChapter')}</p>

            <button
              onClick={onStopBatchGeneration}
              className="mt-6 px-6 py-3 bg-red-100 text-red-600 text-sm font-bold rounded-xl hover:bg-red-200 transition-colors flex items-center gap-2"
            >
              <Square className="size-4" /> {t('statusOverlay.stopBatch')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default WritingEditorStatusOverlay;
