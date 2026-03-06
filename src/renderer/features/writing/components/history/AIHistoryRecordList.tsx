import React from 'react';
import { formatHistoryTimestamp, formatTokenUsage, getGenerationType, getProviderIcon } from '../../utils';
import type { AIHistoryRecordListProps, AIHistoryRecordWithChapter } from '../../types';

const renderTemplateBlock = (item: AIHistoryRecordWithChapter, compact: boolean) => {
  if (!item.record.metadata?.templateName) {
    return null;
  }

  return (
    <div className={`${compact ? 'rounded-xl p-4' : 'rounded-2xl p-5'} bg-blue-50/70 border border-blue-100`}>
      <div className={`${compact ? 'text-xs mb-2' : 'text-sm mb-3'} font-bold text-blue-600 uppercase tracking-widest`}>
        使用模板
      </div>
      <div className={`${compact ? 'text-sm' : 'text-base'} font-bold text-blue-800`}>
        {item.record.metadata.templateName}
      </div>
    </div>
  );
};

const renderTokenBlock = (item: AIHistoryRecordWithChapter, compact: boolean) => (
  <div className={`${compact ? 'rounded-xl p-4' : 'rounded-2xl p-5'} bg-gray-50`}>
    <div className={`${compact ? 'text-xs mb-2' : 'text-sm mb-3'} font-bold text-gray-500 uppercase tracking-widest`}>
      Token消耗
    </div>
    {item.record.tokens ? (
      <div className={`${compact ? 'space-y-2 text-sm' : 'space-y-3 text-base'}`}>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">输入:</span>
          <span className="font-bold text-blue-600">{item.record.tokens.prompt}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">输出:</span>
          <span className="font-bold text-green-600">{item.record.tokens.completion}</span>
        </div>
        <div className="flex justify-between items-center border-t border-gray-200 pt-2">
          <span className="font-bold text-gray-700">总计:</span>
          <span className="font-bold text-purple-600">{item.record.tokens.total}</span>
        </div>
      </div>
    ) : (
      <div className={`${compact ? 'text-sm' : 'text-base'} text-gray-400 italic`}>无Token数据</div>
    )}
  </div>
);

const renderActionBlock = (item: AIHistoryRecordWithChapter, compact: boolean) => (
  <div className={`${compact ? 'rounded-xl p-4' : 'rounded-2xl p-5'} bg-gray-50`}>
    <div className={`${compact ? 'text-xs mb-2' : 'text-sm mb-3'} font-bold text-gray-500 uppercase tracking-widest`}>
      操作
    </div>
    <div className="space-y-3">
      <button
        onClick={() => {
          navigator.clipboard.writeText(item.record.generatedContent);
          alert('已复制生成内容到剪贴板');
        }}
        className={`${compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'} w-full bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-xl font-bold transition-colors flex items-center justify-center gap-2`}
      >
        <i className="fas fa-copy"></i>
        复制内容
      </button>
      <button
        onClick={() => {
          alert(`完整提示词:\n\n${item.record.prompt}`);
        }}
        className={`${compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'} w-full bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl font-bold transition-colors flex items-center justify-center gap-2`}
      >
        <i className="fas fa-eye"></i>
        查看提示词
      </button>
    </div>
  </div>
);

const AIHistoryRecordCard: React.FC<{
  item: AIHistoryRecordWithChapter;
  isSelected: boolean;
  compact: boolean;
  onToggle: (id: string) => void;
  getChapterDisplayTitle: (chapter: AIHistoryRecordWithChapter['chapter']) => string;
}> = ({ item, isSelected, compact, onToggle, getChapterDisplayTitle }) => {
  const generationType = getGenerationType(item.record);

  return (
    <div
      className={`bg-white ${compact ? 'rounded-2xl' : 'rounded-3xl'} border overflow-hidden transition-all hover:shadow-lg ${
        isSelected ? 'border-blue-300 shadow-lg shadow-blue-100' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div
        className={`${compact ? 'p-4' : 'p-6'} border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center cursor-pointer`}
        onClick={() => onToggle(item.record.id)}
      >
        <div className={`flex items-center ${compact ? 'gap-4' : 'gap-5'}`}>
          <div className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} rounded border flex items-center justify-center ${
            isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300'
          }`}>
            {isSelected && <i className={`fas fa-check ${compact ? 'text-xs' : 'text-sm'}`}></i>}
          </div>

          <div className={`flex items-center ${compact ? 'gap-3' : 'gap-4'}`}>
            <i className={`${getProviderIcon(item.record.modelConfig.provider)} ${compact ? '' : 'text-lg'}`}></i>
            <div>
              <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
                <span className={`${compact ? 'text-sm' : 'text-base'} font-bold text-gray-800`}>
                  {item.record.modelConfig.modelName}
                </span>
                <span className={`${compact ? 'text-xs px-2 py-0.5' : 'text-xs px-3 py-1'} rounded bg-gray-100 text-gray-600 font-bold`}>
                  {generationType}
                </span>
              </div>
              <div className={`${compact ? 'text-xs mt-0.5' : 'text-sm mt-1'} text-gray-500`}>
                {getChapterDisplayTitle(item.chapter)}
              </div>
            </div>
          </div>
        </div>

        <div className={`flex items-center ${compact ? 'gap-4' : 'gap-5'}`}>
          <div className="text-right">
            <div className={`${compact ? 'text-xs' : 'text-sm'} font-bold text-gray-700`}>
              {formatHistoryTimestamp(item.record.timestamp)}
            </div>
            <div className={`${compact ? 'text-[10px] mt-0.5' : 'text-xs mt-1'} text-gray-400`}>
              {item.record.tokens ? `${item.record.tokens.total} tokens` : 'N/A tokens'}
            </div>
          </div>
          <i className={`fas fa-chevron-right text-gray-300 transition-transform ${isSelected ? 'rotate-90' : ''}`}></i>
        </div>
      </div>

      {isSelected && (
        <div className={`${compact ? 'p-5 space-y-5' : 'p-6 space-y-6'} animate-in fade-in duration-200`}>
          {renderTemplateBlock(item, compact)}

          <div className={compact ? 'space-y-5' : 'grid grid-cols-2 gap-6'}>
            <div className={`${compact ? 'rounded-xl p-4' : 'rounded-2xl p-5'} bg-gray-50`}>
              <div className={`${compact ? 'text-xs mb-2' : 'text-sm mb-3'} font-bold text-gray-500 uppercase tracking-widest`}>
                完整提示词
              </div>
              <div className={`${compact ? 'max-h-40 text-xs' : 'max-h-64 text-sm'} overflow-y-auto whitespace-pre-wrap text-gray-700 leading-relaxed custom-scrollbar`}>
                {item.record.prompt}
              </div>
            </div>

            <div className={`${compact ? 'rounded-xl p-4' : 'rounded-2xl p-5'} bg-gray-50`}>
              <div className={`${compact ? 'text-xs mb-2' : 'text-sm mb-3'} font-bold text-gray-500 uppercase tracking-widest`}>
                生成内容
              </div>
              <div className={`${compact ? 'max-h-40 text-xs' : 'max-h-64 text-sm'} overflow-y-auto whitespace-pre-wrap text-gray-700 leading-relaxed custom-scrollbar`}>
                {item.record.generatedContent}
              </div>
            </div>
          </div>

          {compact ? (
            <div className="grid grid-cols-1 gap-4">
              {renderTokenBlock(item, compact)}
              {renderActionBlock(item, compact)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="rounded-2xl p-5 bg-gray-50">
                  <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
                    摘要信息
                  </div>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div>章节：{getChapterDisplayTitle(item.chapter)}</div>
                    <div>类型：{generationType}</div>
                    <div>时间：{formatHistoryTimestamp(item.record.timestamp)}</div>
                    <div>Token：{formatTokenUsage(item.record.tokens)}</div>
                  </div>
                </div>
                {renderTokenBlock(item, compact)}
              </div>
              <div className="space-y-6">
                {renderActionBlock(item, compact)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AIHistoryRecordList: React.FC<AIHistoryRecordListProps> = ({
  variant,
  records,
  selectedHistoryIds,
  searchQuery,
  viewMode,
  selectedChapterId,
  onToggleSelectAll,
  onToggleHistorySelection,
  getChapterDisplayTitle,
}) => {
  const compact = variant === 'sidebar';
  const allSelected = selectedHistoryIds.size === records.length && records.length > 0;

  return (
    <>
      {compact && onToggleSelectAll && (
        <div className="px-4 pb-1 bg-white border-b border-gray-100 shrink-0">
          <div className="flex justify-between items-center pt-1">
            <div className="flex items-center gap-2">
              <div onClick={onToggleSelectAll} className="flex items-center gap-1 cursor-pointer select-none">
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${allSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300'}`}>
                  {allSelected && <i className="fas fa-check text-[10px]"></i>}
                </div>
                <span className="text-xs font-bold text-gray-700">{allSelected ? '取消全选' : '全选'}</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">{records.length}条</div>
          </div>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto ${compact ? 'p-6' : 'p-8'} bg-gray-50/30 custom-scrollbar`}>
        {records.length === 0 ? (
          <div className={`text-center ${compact ? 'py-16' : 'py-20'}`}>
            <div className={`${compact ? 'w-20 h-20 mb-6' : 'w-24 h-24 mb-8'} bg-gray-100 rounded-full flex items-center justify-center mx-auto`}>
              <i className={`fas fa-history ${compact ? 'text-3xl' : 'text-4xl'} text-gray-300`}></i>
            </div>
            <h4 className={`${compact ? 'text-lg mb-2' : 'text-xl mb-3'} font-bold text-gray-400`}>暂无历史记录</h4>
            <p className={`${compact ? 'text-sm max-w-md' : 'text-base max-w-lg'} text-gray-400 mx-auto`}>
              {searchQuery.trim()
                ? '没有找到匹配的搜索内容，请尝试其他关键词。'
                : viewMode === 'chapter' && !selectedChapterId
                  ? '请选择一个章节查看其历史记录。'
                  : 'AI生成的内容将在这里显示历史记录。'}
            </p>
          </div>
        ) : (
          <div className={compact ? 'space-y-4' : 'space-y-6'}>
            {records.map((item) => (
              <AIHistoryRecordCard
                key={item.record.id}
                item={item}
                compact={compact}
                isSelected={selectedHistoryIds.has(item.record.id)}
                onToggle={onToggleHistorySelection}
                getChapterDisplayTitle={getChapterDisplayTitle}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default AIHistoryRecordList;



