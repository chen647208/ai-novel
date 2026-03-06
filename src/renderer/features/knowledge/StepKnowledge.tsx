
import React, { useState, useEffect } from 'react';
import { Project, KnowledgeItem, KnowledgeCategory } from '../../../shared/types';

interface StepKnowledgeProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

const StepKnowledge: React.FC<StepKnowledgeProps> = ({ project, onUpdate }) => {
  const [dragActive, setDragActive] = useState(false);
  const [viewingItem, setViewingItem] = useState<KnowledgeItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | 'all'>('all');

  // 编辑状态
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<KnowledgeCategory>('writing');
  const [isDirty, setIsDirty] = useState(false);

  // 当切换查看的条目时，重置编辑内容
  useEffect(() => {
    if (viewingItem) {
      setEditContent(viewingItem.content);
      setEditName(viewingItem.name);
      setEditCategory(viewingItem.category);
      setIsDirty(false);
    }
  }, [viewingItem]);

  // 获取分类显示名称
  const getCategoryDisplayName = (category: KnowledgeCategory | 'all'): string => {
    const categoryNames: Record<KnowledgeCategory | 'all', string> = {
      'all': '全部',
      'inspiration': '灵感生成',
      'character': '世界与角色',
      'outline': '小说大纲',
      'chapter': '章节细纲',
      'writing': '正文'
    };
    return categoryNames[category];
  };

  // 获取过滤后的知识库列表
  const getFilteredKnowledge = (): KnowledgeItem[] => {
    const knowledge = project.knowledge || [];
    if (selectedCategory === 'all') {
      return knowledge;
    }
    return knowledge.filter(item => item.category === selectedCategory);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
    // Clear value to allow re-uploading the same file if needed
    e.target.value = '';
  };

  const handleFiles = async (files: FileList) => {
    const newItems: KnowledgeItem[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
        try {
          const text = await file.text();
          // generate a more unique ID
          const uniqueId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9) + '_' + i;
          newItems.push({
            id: uniqueId,
            name: file.name,
            content: text,
            type: file.name.split('.').pop() || 'txt',
            size: file.size,
            addedAt: Date.now(),
            category: selectedCategory === 'all' ? 'writing' : selectedCategory
          });
        } catch (err) {
          console.error("Failed to read file", file.name, err);
          alert(`读取文件 ${file.name} 失败`);
        }
      } else {
        alert(`文件 ${file.name} 格式不支持。目前仅支持 txt, md, json 等纯文本格式。请将 Word 文档另存为 txt 后上传。`);
      }
    }

    if (newItems.length > 0) {
      onUpdate({ knowledge: [...(project.knowledge || []), ...newItems] });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleteConfirmId === id) {
      // Confirmed delete
      const newList = (project.knowledge || []).filter(k => k.id !== id);
      onUpdate({ knowledge: newList });
      if (viewingItem?.id === id) setViewingItem(null);
      setDeleteConfirmId(null);
    } else {
      // First click - ask for confirmation
      setDeleteConfirmId(id);
      // Auto-reset confirmation after 3 seconds
      setTimeout(() => {
        setDeleteConfirmId(prev => (prev === id ? null : prev));
      }, 3000);
    }
  };

  const handleSave = () => {
    if (!viewingItem) return;
    
    const updatedList = (project.knowledge || []).map(item => {
      if (item.id === viewingItem.id) {
        return { 
          ...item, 
          content: editContent, 
          name: editName,
          category: editCategory,
          size: new Blob([editContent]).size // Update size estimate
        };
      }
      return item;
    });
    
    onUpdate({ knowledge: updatedList });
    
    // Update viewing item to reflect saved state
    setViewingItem(prev => prev ? ({ ...prev, content: editContent, name: editName, category: editCategory }) : null);
    setIsDirty(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-7xl mx-auto h-full p-8 flex flex-col gap-6 overflow-hidden">
      <div className="flex justify-between items-end border-b pb-6 border-gray-100">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">世界知识库 (Knowledge Base)</h2>
          <p className="text-gray-500 mt-1 italic font-medium">上传设定集、魔法体系、历史年表等资料。AI 在写作时可参考这些内容。</p>
        </div>
      </div>

      {/* 分类筛选器 */}
      <div className="flex flex-wrap gap-2 mb-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          全部
        </button>
        {(['inspiration', 'character', 'outline', 'chapter', 'writing'] as KnowledgeCategory[]).map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
              selectedCategory === category
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {getCategoryDisplayName(category)}
          </button>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
        {/* Upload & List Area */}
        <div className="lg:col-span-4 flex flex-col h-full overflow-hidden">
          {/* Drop Zone */}
          <div 
            className={`border-2 border-dashed rounded-[2rem] p-8 text-center transition-all mb-6 flex flex-col items-center justify-center gap-4 ${
              dragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-200 bg-gray-50 hover:border-blue-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-500 text-2xl">
              <i className="fas fa-cloud-upload-alt"></i>
            </div>
            <div>
              <p className="font-black text-gray-700">拖拽文件到这里</p>
              <p className="text-xs text-gray-400 mt-1">支持 .txt, .md, .json (建议 &lt; 2MB)</p>
            </div>
            <label className="px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 active:scale-95">
              选择文件
              <input type="file" multiple className="hidden" onChange={handleChange} accept=".txt,.md,.json,.csv" />
            </label>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {getFilteredKnowledge().length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm italic">
                {selectedCategory === 'all' ? '暂无知识库文件' : `暂无${getCategoryDisplayName(selectedCategory)}分类的文件`}
              </div>
            ) : (
              getFilteredKnowledge().map(item => (
                <div 
                  key={item.id}
                  onClick={() => {
                     // Simple check for unsaved changes could be added here
                     setViewingItem(item);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group relative ${
                    viewingItem?.id === item.id 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' 
                      : 'bg-white border-gray-100 text-gray-700 hover:border-blue-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                     <div className="flex items-center gap-3 overflow-hidden">
                        <i className={`fas ${item.type === 'json' ? 'fa-code' : 'fa-file-alt'} ${viewingItem?.id === item.id ? 'text-blue-200' : 'text-gray-300'}`}></i>
                        <div className="flex flex-col">
                          <h4 className="font-bold text-sm truncate">{item.name}</h4>
                          <span className="text-[9px] text-gray-400 mt-0.5">
                            {getCategoryDisplayName(item.category)}
                          </span>
                        </div>
                     </div>
                     <button 
                       onClick={(e) => handleDeleteClick(e, item.id)}
                       className={`h-7 px-2 rounded-lg flex items-center justify-center transition-all ${
                          deleteConfirmId === item.id
                            ? 'bg-red-500 text-white w-auto shadow-sm animate-pulse'
                            : (viewingItem?.id === item.id 
                                ? 'text-blue-200 hover:bg-blue-500 hover:text-white w-7' 
                                : 'text-gray-300 hover:bg-red-50 hover:text-red-500 w-7')
                       }`}
                       title={deleteConfirmId === item.id ? "点击确认删除" : "删除文件"}
                     >
                       {deleteConfirmId === item.id ? (
                         <span className="text-[10px] font-bold whitespace-nowrap px-1">确认?</span>
                       ) : (
                         <i className="fas fa-times"></i>
                       )}
                     </button>
                  </div>
                  <div className={`text-[10px] flex justify-between ${viewingItem?.id === item.id ? 'text-blue-200' : 'text-gray-400'}`}>
                    <span>{formatSize(item.size)}</span>
                    <span>{new Date(item.addedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Preview & Edit Area */}
        <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-gray-200 shadow-sm flex flex-col overflow-hidden relative">
          {viewingItem ? (
            <>
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                    <i className={`fas ${viewingItem.type === 'json' ? 'fa-code' : 'fa-file-alt'}`}></i>
                  </div>
                  <div className="flex-1 mr-4">
                     <input 
                       value={editName}
                       onChange={(e) => { setEditName(e.target.value); setIsDirty(true); }}
                       className="font-black text-gray-800 bg-transparent border-none focus:ring-0 p-0 w-full text-lg placeholder-gray-300"
                       placeholder="文件名"
                     />
                     <p className="text-[10px] text-gray-400 font-mono">ID: {viewingItem.id.substring(0,8)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-2">
                     <select
                       value={editCategory}
                       onChange={(e) => { setEditCategory(e.target.value as KnowledgeCategory); setIsDirty(true); }}
                       className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                     >
                       {(['inspiration', 'character', 'outline', 'chapter', 'writing'] as KnowledgeCategory[]).map(category => (
                         <option key={category} value={category}>
                           {getCategoryDisplayName(category)}
                         </option>
                       ))}
                     </select>
                   </div>
                   <div className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-lg border border-gray-200">
                      {editContent.length} 字符
                   </div>
                   <button 
                     onClick={handleSave}
                     disabled={!isDirty}
                     className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                        isDirty 
                          ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-200' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                     }`}
                   >
                     <i className="fas fa-save"></i> 保存修改
                   </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden relative bg-white">
                <textarea 
                   className="w-full h-full p-8 text-sm text-gray-600 leading-relaxed outline-none resize-none font-mono custom-scrollbar"
                   value={editContent}
                   onChange={(e) => { setEditContent(e.target.value); setIsDirty(true); }}
                   placeholder="在此处编辑内容..."
                   spellCheck={false}
                />
              </div>
            </>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-300">
               <i className="fas fa-book-open text-6xl mb-6 opacity-20"></i>
               <p className="font-bold text-gray-400">点击左侧文件查看或编辑内容</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepKnowledge;





