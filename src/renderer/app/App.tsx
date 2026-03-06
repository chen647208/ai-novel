
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, Project, ModelConfig } from '../../shared/types';
import { INITIAL_APP_STATE, ResetModalState } from './initialState';
import { storage } from '../shared/services/storage';
import { embeddingModelService } from '../features/settings/services/embeddingModelService';
import { vectorIntegrationService } from '../features/knowledge/services/vectorIntegrationService';
import Sidebar from './app-shell/Sidebar';
import SettingsModal from '../features/settings/SettingsModal';
import StepInspiration from '../features/inspiration/StepInspiration';
import StepKnowledgeEnhanced from '../features/knowledge/StepKnowledgeEnhanced'; // 新增导入：增强版知识库组件
import StepCharacters from '../features/characters/StepCharacters';
import StepOutline from '../features/outline/StepOutline';
import StepChapterOutline from '../features/chapters/StepChapterOutline';
import WritingEditor from '../features/writing/WritingEditor';
import GlobalAssistant from '../features/assistant/GlobalAssistant'; // 导入全局助手
import AIHistoryViewer from '../features/writing/AIHistoryViewer'; // 新增导入：AI历史记录查看器
import VersionCheckModal from '../features/version/VersionCheckModal'; // 新增导入：版本检查模态框

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_APP_STATE);
  const [isLoading, setIsLoading] = useState(true);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [isHistoryViewerOpen, setIsHistoryViewerOpen] = useState(false); // 新增：历史记录查看器状态
  const [isVersionCheckOpen, setIsVersionCheckOpen] = useState(false); // 新增：版本检查模态框状态

  // --- 新增：自定义确认弹窗状态 ---
  // 用于替代 window.confirm，防止浏览器拦截导致无反应
  const [resetModal, setResetModal] = useState<ResetModalState>({ isOpen: false, type: null });

  // 加载初始状态
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        // 在Electron环境中，loadState()总是返回null，所以直接使用异步加载
        // 这样可以确保数据迁移函数被正确执行
        const saved = await storage.loadStateAsync();
        if (saved) {
          console.log('成功加载应用状态，应用数据迁移');
          // 确保 embeddingModels 字段存在（向后兼容）
          setState({
            ...INITIAL_APP_STATE,
            ...saved,
            embeddingModels: saved.embeddingModels || [],
            activeEmbeddingModelId: saved.activeEmbeddingModelId || null
          });
        } else {
          console.log('没有找到保存的状态，使用初始状态');
        }
        
        // 初始化向量集成服务（包括Embedding服务）
        await vectorIntegrationService.initialize();
      } catch (error) {
        console.error('Failed to load initial state:', error);
        // 即使加载失败，也继续渲染应用
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialState();
  }, []);

  // 持久化存储
  useEffect(() => {
    if (!isLoading) {
      storage.saveState(state);
    }
  }, [state, isLoading]);

  const activeProject = state.projects.find(p => p.id === state.activeProjectId) || null;
  const activeModel = state.models.find(m => m.id === state.activeModelId) || state.models[0];
  
  // 书籍管理相关函数
  const handleBookSelect = useCallback((bookId: string) => {
    setState(prev => ({
      ...prev,
      activeProjectId: bookId
    }));
    // 切换到灵感生成步骤（步骤0）
    setCurrentStep(0);
  }, []);

  const handleBookCreate = useCallback((title: string, description?: string, templateType?: 'blank' | 'duplicate' | 'example', sourceBookId?: string) => {
    const newBook: Project = {
      id: Date.now().toString(),
      title: title,
      inspiration: '',
      intro: '',
      characters: [],
      outline: '',
      chapters: [],
      virtualChapters: [],
      knowledge: [],
      lastModified: Date.now()
    };

    // 如果是复制现有书籍
    if (templateType === 'duplicate' && sourceBookId) {
      const sourceBook = state.projects.find(p => p.id === sourceBookId);
      if (sourceBook) {
        newBook.inspiration = sourceBook.inspiration;
        newBook.intro = sourceBook.intro;
        newBook.characters = [...sourceBook.characters];
        newBook.outline = sourceBook.outline;
        newBook.chapters = [...sourceBook.chapters];
        newBook.virtualChapters = [...sourceBook.virtualChapters];
        newBook.knowledge = [...sourceBook.knowledge];
      }
    }

    setState(prev => ({
      ...prev,
      projects: [...prev.projects, newBook],
      activeProjectId: newBook.id
    }));
    
    // 切换到灵感生成步骤
    setCurrentStep(0);
  }, [state.projects]);

  const handleBookRename = useCallback((bookId: string, newTitle: string) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => 
        p.id === bookId 
          ? { ...p, title: newTitle, lastModified: Date.now() } 
          : p
      )
    }));
  }, []);

  const handleBookDelete = useCallback((bookId: string) => {
    if (window.confirm(`确定要删除这本书籍吗？此操作不可撤销。`)) {
      setState(prev => ({
        ...prev,
        projects: prev.projects.filter(p => p.id !== bookId),
        activeProjectId: prev.activeProjectId === bookId ? 
          (prev.projects.length > 1 ? prev.projects[0].id : null) : 
          prev.activeProjectId
      }));
      
      // 如果没有活动项目了，切换到灵感生成步骤
      if (state.activeProjectId === bookId && state.projects.length === 1) {
        setCurrentStep(0);
      }
    }
  }, [state.activeProjectId, state.projects.length]);

  const handleBookDuplicate = useCallback((bookId: string) => {
    const sourceBook = state.projects.find(p => p.id === bookId);
    if (!sourceBook) return;

    const newBook: Project = {
      id: Date.now().toString(),
      title: `${sourceBook.title} (副本)`,
      inspiration: sourceBook.inspiration,
      intro: sourceBook.intro,
      characters: [...sourceBook.characters],
      outline: sourceBook.outline,
      chapters: [...sourceBook.chapters],
      virtualChapters: [...sourceBook.virtualChapters],
      knowledge: [...sourceBook.knowledge],
      lastModified: Date.now()
    };

    setState(prev => ({
      ...prev,
      projects: [...prev.projects, newBook],
      activeProjectId: newBook.id
    }));
    
    // 切换到灵感生成步骤
    setCurrentStep(0);
  }, [state.projects]);

  // 新增：导出当前书籍
  const handleExportCurrentBook = useCallback(() => {
    if (!activeProject) {
      alert('请先选择一个书籍进行导出');
      return;
    }
    
    storage.exportCurrentBook(activeProject);
  }, [activeProject]);

  // 新增：导入单个书籍
  const handleImportBook = useCallback(async () => {
    try {
      const importedBook = await storage.importBook();
      
      // 检查是否已存在相同标题的书籍
      const existingBook = state.projects.find(p => p.title === importedBook.title);
      if (existingBook) {
        // 如果存在相同标题，询问用户是否要重命名
        const newTitle = prompt(
          `已存在名为《${importedBook.title}》的书籍。\n请输入新的书籍名称：`,
          `${importedBook.title} (导入)`
        );
        
        if (newTitle === null) {
          return; // 用户取消
        }
        
        importedBook.title = newTitle;
      }
      
      setState(prev => ({
        ...prev,
        projects: [...prev.projects, importedBook],
        activeProjectId: importedBook.id
      }));
      
      // 切换到灵感生成步骤
      setCurrentStep(0);
      alert(`书籍《${importedBook.title}》导入成功！`);
    } catch (error) {
      console.error('Failed to import book:', error);
      if (error instanceof Error && error.message !== '未选择文件') {
        alert(`导入失败：${error.message}`);
      }
    }
  }, [state.projects]);

  const updateProject = useCallback((updates: Partial<Project>) => {
    setState(prev => {
      const { activeProjectId, projects } = prev;
      
      if (!activeProjectId) {
        const newProject: Project = {
          id: Date.now().toString(),
          title: '新小说',
          inspiration: '',
          intro: '',
          characters: [],
          outline: '',
          chapters: [],
          virtualChapters: [], // 新增：初始化虚拟章节数组
          knowledge: [], // 初始化
          lastModified: Date.now(),
          ...updates
        };
        return {
          ...prev,
          projects: [...projects, newProject],
          activeProjectId: newProject.id
        };
      } else {
        return {
          ...prev,
          projects: projects.map(p => 
            p.id === activeProjectId 
              ? { ...p, ...updates, lastModified: Date.now() } 
              : p
          )
        };
      }
    });
  }, []);

  // --- 触发逻辑：点击按钮只打开自定义弹窗 ---
  const triggerFactoryReset = () => {
    setResetModal({ isOpen: true, type: 'factory_reset' });
  };

  // --- 执行逻辑：真正的数据清除 ---
  const executeReset = async () => {
    const type = resetModal.type;
    
    try {
      if (type === 'factory_reset') {
        // 1. 恢复出厂设置
        await storage.clearState();
      } else if (type === 'clear_projects') {
        // 2. 仅清空内容
        const currentData = storage.loadState() || INITIAL_APP_STATE;
        const cleanData = {
          ...currentData,
          projects: [],
          activeProjectId: null
        };
        await storage.saveState(cleanData);
      }
      // 3. 强制刷新页面 (核弹级重置)
      window.location.reload();
    } catch (e) {
      alert("操作异常，请尝试手动清除浏览器缓存。");
      setResetModal({ isOpen: false, type: null });
    }
  };

  // 3. 仅重置当前项目内容 (普通操作，无需强制刷新)
  const handleResetCurrentProject = () => {
    if (!activeProject) return;
    if (window.confirm(`⚠️ 确定要清空小说《${activeProject.title}》的所有内容吗？\n保留项目，但清除灵感、大纲和章节。`)) {
      updateProject({
        inspiration: '',
        intro: '',
        characters: [],
        outline: '',
        chapters: [],
        virtualChapters: [], // 清空虚拟章节
        knowledge: [] // 清空知识库
      });
      setCurrentStep(0);
      setEditingChapterId(null);
      setResetKey(prev => prev + 1);
    }
  };

  const handleDeleteCurrentProject = () => {
    if (!activeProject) return;
    if (window.confirm(`删除项目警告\n\n确定要删除《${activeProject.title}》吗？`)) {
      setState(prev => ({
        ...prev,
        projects: prev.projects.filter(p => p.id !== activeProject.id),
        activeProjectId: null
      }));
      setCurrentStep(0);
      setResetKey(prev => prev + 1);
    }
  };

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
    if (step !== 5) setEditingChapterId(null); // 编辑器步骤现在是 5
  };

  const renderStepContent = () => {
    if (!activeProject && currentStep !== 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
           <i className="fas fa-book-medical text-4xl mb-4 text-gray-300"></i>
           <p className="font-bold">请先开始一个新的创作项目</p>
           <button onClick={() => setCurrentStep(0)} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">去创建</button>
        </div>
      );
    }

    if (currentStep === 0) {
      return (
        <div className="p-8 overflow-y-auto h-full">
           <div className="mb-8 flex justify-between items-center">
              <div className="text-left">
                <h2 className="text-3xl font-black text-gray-800 tracking-tight">创作中心</h2>
                <p className="text-gray-500 mt-2">从一段小小的灵感开始，构建你的宏大世界。</p>
              </div>
              <div className="flex gap-3">
                 {/* 全数据备份/导入按钮 */}
                 <button onClick={() => storage.exportData(state)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">
                    <i className="fas fa-download mr-2"></i>备份
                 </button>
                 <button 
                   onClick={async () => {
                     try {
                       console.log('开始导入全部数据...');
                       const newState = await storage.importData();
                       console.log('导入的数据状态:', newState);
                       console.log('导入的projects数量:', newState?.projects?.length || 0);
                       console.log('导入的activeProjectId:', newState?.activeProjectId);
                       
                       // 验证导入的数据
                       if (!newState) {
                         throw new Error('导入的数据为空');
                       }
                       
                       // 确保数据结构完整
                       const validatedState: AppState = {
                         projects: Array.isArray(newState.projects) ? newState.projects : [],
                         activeProjectId: newState.activeProjectId || null,
                         models: Array.isArray(newState.models) ? newState.models : INITIAL_APP_STATE.models,
                         prompts: Array.isArray(newState.prompts) ? newState.prompts : INITIAL_APP_STATE.prompts,
                         activeModelId: newState.activeModelId || 'default-gemini',
                         embeddingModels: Array.isArray(newState.embeddingModels) ? newState.embeddingModels : [],
                         activeEmbeddingModelId: newState.activeEmbeddingModelId || null
                       };
                       
                       // 确保至少有一个项目被选中
                       if (validatedState.projects.length > 0) {
                         // 如果没有activeProjectId，设置第一个项目为活动项目
                         if (!validatedState.activeProjectId || !validatedState.projects.some(p => p.id === validatedState.activeProjectId)) {
                           console.log('设置第一个项目为活动项目');
                           validatedState.activeProjectId = validatedState.projects[0].id;
                         }
                       } else {
                         // 如果没有项目，清空activeProjectId
                         validatedState.activeProjectId = null;
                       }
                       
                       // 直接覆盖所有数据
                       setState(validatedState);
                       setResetKey(prev => prev + 1);
                       console.log('全部数据导入完成，状态已覆盖');
                       alert("全部数据导入成功！");
                     } catch (err) {
                       console.error('导入失败:', err);
                       alert("导入失败或已取消。");
                     }
                   }}
                   className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 text-sm font-medium cursor-pointer transition-colors shadow-lg"
                 >
                    <i className="fas fa-upload mr-2"></i>导入全部数据
                 </button>
                 
                 {/* 当前书籍导出/导入按钮 */}
                 {activeProject && (
                   <>
                     <div className="h-6 border-l border-gray-300 mx-1"></div>
                     <button 
                       onClick={handleExportCurrentBook}
                       className="px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors"
                       title="导出当前书籍"
                     >
                       <i className="fas fa-book-download mr-2"></i>导出当前书籍
                     </button>
                     <button 
                       onClick={handleImportBook}
                       className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium cursor-pointer transition-colors shadow-lg"
                       title="导入单个书籍"
                     >
                       <i className="fas fa-book-upload mr-2"></i>导入书籍
                     </button>
                   </>
                 )}
              </div>
           </div>
           <StepInspiration 
             project={activeProject} 
             prompts={state.prompts} 
             activeModel={activeModel} 
             onUpdate={updateProject} 
           />
        </div>
      );
    }

    // Step 1: Knowledge Base (Enhanced with ChromaDB + Sentence-BERT)
    if (currentStep === 1 && activeProject) {
       return (
         <StepKnowledgeEnhanced 
            project={activeProject}
            onUpdate={updateProject}
            activeModel={activeModel}
         />
       );
    }

    // Step 2: Characters
    if (currentStep === 2 && activeProject) {
      return (
        <StepCharacters 
          project={activeProject}
          prompts={state.prompts}
          activeModel={activeModel}
          onUpdate={updateProject}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      );
    }

    // Step 3: Outline
    if (currentStep === 3 && activeProject) {
      return (
        <StepOutline 
          project={activeProject}
          prompts={state.prompts}
          activeModel={activeModel}
          onUpdate={updateProject}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      );
    }

    // Step 4: Chapter Outline
    if (currentStep === 4 && activeProject) {
      return (
        <StepChapterOutline 
          project={activeProject}
          prompts={state.prompts}
          activeModel={activeModel}
          onUpdate={updateProject}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onEnterWriting={(id) => {
            setEditingChapterId(id);
            setCurrentStep(5); // Switch to writing editor
          }}
        />
      );
    }

    // Step 5: Writing Editor
    if (currentStep === 5 && activeProject) {
      return (
        <WritingEditor 
          project={activeProject} 
          prompts={state.prompts} 
          activeModel={activeModel}
          onUpdate={updateProject}
          initialChapterId={editingChapterId}
          onBack={() => setCurrentStep(4)} // Back to chapter list
        />
      );
    }

    return null;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 relative">
      {/* 
         GLOBAL ASSISTANT 
         This floats above everything else.
      */}
      <GlobalAssistant 
        models={state.models} 
        activeModelId={state.activeModelId}
        project={activeProject} // Pass active project for context awareness
        prompts={state.prompts} // Pass prompts for analysis features
        onUpdate={updateProject} // 新增：传递数据更新回调
      />

      {/* 重置确认专用模态框 */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-gray-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${resetModal.type === 'factory_reset' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                 <i className={`fas ${resetModal.type === 'factory_reset' ? 'fa-skull-crossbones' : 'fa-trash-can'} text-3xl`}></i>
              </div>
              
              <h3 className="text-2xl font-black text-gray-900 mb-2">
                {resetModal.type === 'factory_reset' ? '恢复出厂设置' : '清空所有生成内容'}
              </h3>
              
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                {resetModal.type === 'factory_reset' 
                  ? '此操作将删除【全部数据】，包括您的 API Key 和所有设置。应用将强制重启。此操作不可撤销！' 
                  : '此操作将删除所有小说项目和草稿。您的 API Key 和模型配置将被保留。应用将刷新以应用更改。'
                }
              </p>
              
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setResetModal({ isOpen: false, type: null })}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={executeReset}
                  className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 ${
                    resetModal.type === 'factory_reset' 
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-200' 
                      : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
                  }`}
                >
                  确认执行
                </button>
              </div>
           </div>
        </div>
      )}

      {currentStep !== 5 && ( // 注意这里的 5
        <Sidebar 
          currentStep={currentStep} 
          onStepChange={handleStepChange} 
          activeProject={!!activeProject}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onFactoryReset={triggerFactoryReset}
          // 书籍管理相关props
          books={state.projects}
          activeBookId={state.activeProjectId}
          onBookSelect={handleBookSelect}
          onBookCreate={handleBookCreate}
          onBookRename={handleBookRename}
          onBookDelete={handleBookDelete}
          onBookDuplicate={handleBookDuplicate}
        />
      )}
      
      <main className="flex-1 flex flex-col min-w-0">
        {currentStep !== 5 && ( // 注意这里的 5
          <header className="h-16 border-b bg-white flex items-center justify-between px-8 shadow-sm z-10 shrink-0">
             <div className="flex items-center gap-3 text-left">
                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">当前项目</span>
                <div className="flex items-center gap-2">
                   <h2 className="font-bold text-gray-800 truncate max-w-xs text-lg">{activeProject?.title || '未选择小说'}</h2>
                   {activeProject && (
                      <div className="flex gap-1 ml-2">
                        <button 
                          onClick={handleResetCurrentProject}
                          title="清空当前项目所有生成内容"
                          className="w-6 h-6 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors flex items-center justify-center"
                        >
                           <i className="fas fa-eraser text-xs"></i>
                        </button>
                        <button 
                          onClick={handleDeleteCurrentProject}
                          title="删除当前项目"
                          className="w-6 h-6 rounded hover:bg-red-50 text-gray-300 hover:text-red-600 transition-colors flex items-center justify-center"
                        >
                           <i className="fas fa-trash-can text-xs"></i>
                        </button>
                      </div>
                   )}
                </div>
             </div>
             
             <div className="flex items-center gap-4">
                {activeProject && (
                  <div className="text-xs text-gray-400 font-medium">
                     <span className="mr-3"><i className="fas fa-book mr-1"></i>{activeProject.knowledge?.length || 0}</span>
                     <span className="mr-3"><i className="fas fa-user-group mr-1"></i>{activeProject.characters.length}</span>
                     <span className="mr-3"><i className="fas fa-list mr-1"></i>{activeProject.chapters.length}</span>
                  </div>
                )}
                {/* 版本号显示和检查按钮 */}
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded border border-gray-200">
                    v1.4.5
                  </div>
                  <button
                    onClick={() => setIsVersionCheckOpen(true)}
                    className="w-6 h-6 rounded-full hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors flex items-center justify-center"
                    title="检查更新"
                  >
                    <i className="fas fa-sync-alt text-xs"></i>
                  </button>
                </div>
                {/* 历史记录按钮 */}
                {activeProject && (
                  (activeProject.chapters.some(chapter => chapter.history && chapter.history.length > 0) ||
                   (activeProject.virtualChapters && activeProject.virtualChapters.some(chapter => chapter.history && chapter.history.length > 0))
                  ) && (
                    <button
                      onClick={() => setIsHistoryViewerOpen(true)}
                      className="flex items-center text-sm text-gray-500 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors"
                      title="查看AI生成历史记录"
                    >
                      <i className="fas fa-history mr-2 text-purple-500"></i>
                      <span className="font-medium text-purple-700">历史记录</span>
                    </button>
                  )
                )}
                <div 
                  className="flex items-center text-sm text-gray-500 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <i className="fas fa-microchip mr-2 text-blue-500"></i>
                  <span className="font-medium text-blue-700">{activeModel?.name || '未选模型'}</span>
                </div>
             </div>
          </header>
        )}

        <div className="flex-1 overflow-hidden relative bg-gray-50" key={resetKey}>
          {renderStepContent()}
        </div>
      </main>

      {isSettingsOpen && (
        <SettingsModal 
          models={state.models}
          activeModelId={state.activeModelId}
          prompts={state.prompts}
          cardPrompts={state.cardPrompts || []}
          consistencyPrompts={state.consistencyPrompts || []}
          consistencyCheckConfig={state.consistencyCheckConfig}
          onClose={async () => {
            setIsSettingsOpen(false);
            // 刷新 Embedding 服务配置
            try {
              await vectorIntegrationService.refreshEmbeddingConfig();
            } catch (error) {
              console.error('Failed to refresh embedding config:', error);
            }
          }}
          onClearData={triggerFactoryReset}
          onSaveModels={(models, activeId) => {
            setState(prev => ({ ...prev, models, activeModelId: activeId }));
          }}
          onSavePrompts={(prompts) => {
            setState(prev => ({ ...prev, prompts }));
          }}
          onSaveCardPrompts={(cardPrompts) => {
            setState(prev => ({ ...prev, cardPrompts }));
          }}
          onSaveConsistencyPrompts={(consistencyPrompts) => {
            setState(prev => ({ ...prev, consistencyPrompts }));
          }}
          onSaveConsistencyConfig={(consistencyCheckConfig) => {
            setState(prev => ({ ...prev, consistencyCheckConfig }));
          }}
        />
      )}

      {/* AI历史记录查看器 */}
      {isHistoryViewerOpen && activeProject && (
        <AIHistoryViewer 
          project={activeProject}
          onUpdate={updateProject}
          onClose={() => setIsHistoryViewerOpen(false)}
        />
      )}

      {/* 版本检查模态框 */}
      <VersionCheckModal 
        isOpen={isVersionCheckOpen}
        onClose={() => setIsVersionCheckOpen(false)}
      />
    </div>
  );
};

export default App;







