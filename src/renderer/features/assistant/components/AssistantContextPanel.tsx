import React from 'react';
import type { Project, PromptTemplate } from '../../../../shared/types';
import type { AssistantCategory } from '../types';

interface AssistantContextPanelProps {
  project: Project | null;
  activeCategory: AssistantCategory;
  subSelectionId: string;
  analysisPromptId: string;
  prompts: PromptTemplate[];
  contextContent: string;
  isLoading: boolean;
  onCategoryChange: (category: AssistantCategory) => void;
  onSubSelectionChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onAnalyze: () => void;
}

const categoryItems: Array<{ id: AssistantCategory; icon: string; label: string }> = [
  { id: 'inspiration', icon: 'fa-lightbulb', label: '灵感' },
  { id: 'knowledge', icon: 'fa-book-atlas', label: '知识库' },
  { id: 'characters', icon: 'fa-users', label: '角色' },
  { id: 'outline', icon: 'fa-sitemap', label: '大纲' },
  { id: 'chapters', icon: 'fa-list-ol', label: '章节' },
];

const AssistantContextPanel: React.FC<AssistantContextPanelProps> = ({
  project,
  activeCategory,
  subSelectionId,
  analysisPromptId,
  prompts,
  contextContent,
  isLoading,
  onCategoryChange,
  onSubSelectionChange,
  onPromptChange,
  onAnalyze,
}) => {
  return (
    <div className="flex-1 flex flex-col bg-gray-50 z-10 overflow-hidden animate-in slide-in-from-right duration-200 absolute inset-0 top-[88px]">
      <div className="flex bg-white border-b overflow-x-auto no-scrollbar shrink-0">
        {categoryItems.map((category) => (
          <button
            key={category.id}
            onClick={() => {
              onCategoryChange(category.id);
              onSubSelectionChange('all');
            }}
            className={`flex-1 min-w-[60px] py-3 flex flex-col items-center gap-1 text-[10px] border-b-2 transition-colors ${
              activeCategory === category.id ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <i className={`fas ${category.icon}`}></i>
            <span>{category.label}</span>
          </button>
        ))}
      </div>

      {(activeCategory === 'knowledge' || activeCategory === 'chapters') && project && (
        <div className="px-4 py-2 bg-white border-b shrink-0">
          <select
            value={subSelectionId}
            onChange={(e) => onSubSelectionChange(e.target.value)}
            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none"
          >
            <option value="all">-- 查看全部列表 --</option>
            {activeCategory === 'knowledge' && project.knowledge?.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
            {activeCategory === 'chapters' && project.chapters?.sort((a, b) => a.order - b.order).map((chapter) => (
              <option key={chapter.id} value={chapter.id}>第{chapter.order + 1}章：{chapter.title}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <textarea
          readOnly
          className="w-full h-full bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-600 leading-relaxed resize-none outline-none focus:ring-1 focus:ring-blue-100"
          value={contextContent}
        />
      </div>

      <div className="p-3 bg-white border-t border-gray-200 shrink-0 space-y-2">
        <div className="flex gap-2">
          <select
            value={analysisPromptId}
            onChange={(e) => onPromptChange(e.target.value)}
            className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 outline-none"
          >
            <option value="">-- 选择分析提示词 --</option>
            {prompts.map((prompt) => (
              <option key={prompt.id} value={prompt.id}>[{prompt.category}] {prompt.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onAnalyze}
          disabled={isLoading || !project}
          className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <i className="fas fa-wand-magic-sparkles"></i> AI 一键分析优化
        </button>
      </div>
    </div>
  );
};

export default AssistantContextPanel;

