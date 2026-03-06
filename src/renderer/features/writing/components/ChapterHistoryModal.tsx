import React from 'react';
import type { Chapter } from '../../../../shared/types';
import { formatHistoryTimestamp, getGenerationType, getProviderIcon } from '../utils';

interface ChapterHistoryModalProps {
  isOpen: boolean;
  chapter: Chapter | null;
  onClose: () => void;
  onApplyContent: (content: string) => void;
  onClearHistory: () => void;
}

const ChapterHistoryModal: React.FC<ChapterHistoryModalProps> = ({
  isOpen,
  chapter,
  onClose,
  onApplyContent,
  onClearHistory,
}) => {
  if (!isOpen || !chapter) {
    return null;
  }

  const sortedHistory = [...(chapter.history || [])].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="fixed inset-0 z-[300] bg-gray-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-2xl font-black text-gray-800 tracking-tight">AI 生成历史记录</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">第{chapter.order + 1}章: {chapter.title}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
          {sortedHistory.length > 0 ? (
            <div className="space-y-4">
              {sortedHistory.map((record) => (
                <div key={record.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all hover:shadow-lg">
                  <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <i className={getProviderIcon(record.modelConfig.provider)}></i>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800">{record.modelConfig.modelName}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-bold">
                            {getGenerationType(record)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {record.metadata?.templateName || '自定义生成'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-700">{formatHistoryTimestamp(record.timestamp)}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {record.tokens ? `${record.tokens.total} tokens` : 'N/A tokens'}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">提示词</div>
                      <div className="bg-gray-50 text-gray-700 text-sm p-4 rounded-xl border border-gray-100 whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                        {record.prompt}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">生成内容</div>
                      <div className="bg-emerald-50/50 text-gray-800 text-sm p-4 rounded-xl border border-emerald-100 whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar">
                        {record.generatedContent}
                      </div>
                      <div className="text-xs text-gray-400 mt-2 text-right">
                        长度: {record.generatedContent.length} 字符
                      </div>
                    </div>

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
                          <div className="text-sm text-gray-700"><span className="font-bold">输入:</span> {record.tokens?.prompt || 'N/A'}</div>
                          <div className="text-sm text-gray-700"><span className="font-bold">输出:</span> {record.tokens?.completion || 'N/A'}</div>
                          <div className="text-sm text-gray-700"><span className="font-bold">总计:</span> {record.tokens?.total || 'N/A'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(record.generatedContent);
                          alert('已复制生成内容到剪贴板');
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                      >
                        <i className="fas fa-copy"></i> 复制内容
                      </button>
                      <button
                        onClick={() => {
                          onApplyContent(record.generatedContent);
                          onClose();
                        }}
                        className="px-4 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                      >
                        <i className="fas fa-redo"></i> 重新应用
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <i className="fas fa-history text-4xl text-gray-300 mb-4"></i>
              <p className="text-gray-500 font-medium">暂无AI生成历史记录</p>
              <p className="text-gray-400 text-sm mt-2">使用AI生成功能后，历史记录将显示在这里</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
          <div className="text-xs text-gray-500">共 {chapter.history?.length || 0} 条记录</div>
          <div className="flex gap-3">
            <button onClick={onClearHistory} className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2">
              <i className="fas fa-trash"></i> 清空历史
            </button>
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-300 transition-colors">
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterHistoryModal;

