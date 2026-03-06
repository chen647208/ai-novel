
import React from 'react';
import { Project } from '../../../shared/types';
import BookManager from '../../features/books/BookManager';

interface SidebarProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  activeProject: boolean;
  onOpenSettings: () => void;
  onFactoryReset: () => void;
  // 新增书籍管理相关属性
  books: Project[];
  activeBookId: string | null;
  onBookSelect: (bookId: string) => void;
  onBookCreate: (title: string, description?: string, templateType?: 'blank' | 'duplicate' | 'example', sourceBookId?: string) => void;
  onBookRename: (bookId: string, newTitle: string) => void;
  onBookDelete: (bookId: string) => void;
  onBookDuplicate: (bookId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentStep, 
  onStepChange, 
  activeProject, 
  onOpenSettings, 
  onFactoryReset,
  // 新增书籍管理相关属性
  books,
  activeBookId,
  onBookSelect,
  onBookCreate,
  onBookRename,
  onBookDelete,
  onBookDuplicate
}) => {
  // 调整步骤 ID，世界构建中心整合了知识库与世界观管理
  const steps = [
    { id: 0, icon: 'fa-brain', label: '灵感生成' },
    { id: 1, icon: 'fa-globe', label: '世界构建中心' }, // 整合知识库与世界观
    { id: 2, icon: 'fa-users', label: '角色与势力' },
    { id: 3, icon: 'fa-sitemap', label: '小说大纲' },
    { id: 4, icon: 'fa-list-ol', label: '章节细纲' }
  ];

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full border-r border-gray-800 shadow-2xl z-20 shrink-0">
      <div className="p-6 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <i className="fas fa-feather-alt text-white"></i>
           </div>
           <h1 className="text-xl font-black tracking-tight text-white">NovaLocal</h1>
        </div>
      </div>

      {/* 书籍管理区域 */}
      <div className="px-4 pt-4">
        <div className="text-[10px] text-gray-600 font-black uppercase tracking-widest px-2 mb-2">书籍管理</div>
        <div className="bg-gray-800/30 rounded-xl p-2 border border-gray-800/50">
          <div className="text-xs text-gray-400 mb-1 px-2">多书籍创作</div>
          <div className="text-[10px] text-gray-500 px-2 mb-3">管理你的所有小说项目</div>
          
          <BookManager
            books={books}
            activeBookId={activeBookId}
            onBookSelect={onBookSelect}
            onBookCreate={onBookCreate}
            onBookRename={onBookRename}
            onBookDelete={onBookDelete}
            onBookDuplicate={onBookDuplicate}
          />
        </div>
      </div>

      <nav className="flex-1 mt-4">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            disabled={!activeProject && step.id !== 0}
            onClick={() => onStepChange(step.id)}
            className={`w-full flex items-center px-6 py-4 transition-all duration-200 border-l-4 ${
              currentStep === step.id 
                ? 'bg-blue-600/10 text-blue-400 border-blue-600' 
                : 'text-gray-400 border-transparent hover:bg-gray-800 hover:text-gray-200'
            } ${(!activeProject && step.id !== 0) ? 'opacity-20 cursor-not-allowed' : ''}`}
          >
            <i className={`fas ${step.icon} w-6 text-lg`}></i>
            <span className="ml-4 font-bold tracking-wide">{step.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto border-t border-gray-800 bg-gray-900/50">
        <button 
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center px-6 py-4 text-gray-400 hover:bg-gray-800 hover:text-white transition-all group border-b border-gray-800 cursor-pointer"
        >
          <i className="fas fa-sliders-h w-5 group-hover:rotate-180 transition-transform duration-500"></i>
          <span className="ml-4 text-sm font-bold">系统设置 (API)</span>
        </button>
        
        <div className="p-4 space-y-2">
          <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest px-2 mb-1">数据管理</p>
          
          <button 
             type="button"
             onClick={onFactoryReset}
             className="w-full flex items-center px-3 py-2 text-gray-500 hover:bg-red-900/20 hover:text-red-500 rounded-lg transition-all group cursor-pointer"
             title="删除所有数据，包括 API Key"
          >
             <div className="w-6 flex justify-center"><i className="fas fa-skull-crossbones"></i></div>
             <span className="ml-2 text-xs font-bold">恢复出厂设置</span>
          </button>
        </div>
        
        <div className="px-6 py-3 border-t border-gray-800 text-center">
           <span className="text-[10px] text-gray-700 font-mono">v1.1.0 KnowledgeBase</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;






