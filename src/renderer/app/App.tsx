/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */


import { logger } from '../shared/utils/logger';
import { isModelConfigured } from '../shared/utils/modelReadiness';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { type AppState, type AppLanguage, type Project } from '../../shared/types';
import { INITIAL_APP_STATE, normalizeImportedState, type ResetModalState } from './initialState';
import { repository } from '../shared/services/repository';
import { changeLanguage, getEffectiveLanguage, i18n, useTranslation } from '../i18n';
import { autoBackupService } from '../shared/services/autoBackupService';
import { vectorIntegrationService } from '../features/knowledge/services/vectorIntegrationService';
import Sidebar from './app-shell/Sidebar';
import DialogHost from './app-shell/DialogHost';
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
import { persistDiff } from './persistDiff';
import { dialogService } from '@/shared/services/dialogService';
import { Button } from '@/shared/ui/Button';

const App: React.FC = () => {
  const { t } = useTranslation(['app', 'common']);
  const [state, setState] = useState<AppState>(INITIAL_APP_STATE);
  const [isLoading, setIsLoading] = useState(true);
  // 上一次已落盘的状态快照，用于差分持久化；null 表示尚未建立基线（首帧走整体写）。
  const lastPersistedRef = useRef<AppState | null>(null);

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
        // 后端初始化（SQLite 建表迁移 + 首启从旧 JSON 导入）；JSON 后端无此步
        await repository.init?.();
        // 在Electron环境中，loadState()总是返回null，所以直接使用异步加载
        // 这样可以确保数据迁移函数被正确执行
        const saved = await repository.loadAll();
        if (saved) {
          logger.debug('成功加载应用状态，应用数据迁移');
          // 确保 embeddingModels 字段存在（向后兼容）
          const loaded: AppState = {
            ...INITIAL_APP_STATE,
            ...saved,
            embeddingModels: saved.embeddingModels || [],
            activeEmbeddingModelId: saved.activeEmbeddingModelId || null
          };
          // 建立差分基线：磁盘现状 == 刚加载的状态，避免首帧整体重写
          lastPersistedRef.current = loaded;
          setState(loaded);
          // 若已持久化用户语言，覆盖启动时的检测值
          if (loaded.language) changeLanguage(loaded.language);
        } else {
          logger.debug('没有找到保存的状态，使用初始状态');
          lastPersistedRef.current = INITIAL_APP_STATE;
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

  // 持久化存储：差分增量写（只落变化的项目/配置），再按存储子系统配置触发备份。
  // 备份策略与数据引擎解耦（SQLite/JSON 后端统一在此触发）。
  useEffect(() => {
    if (isLoading) return;
    void (async () => {
      try {
        const prev = lastPersistedRef.current;
        lastPersistedRef.current = state;
        if (prev === null) {
          await repository.saveAll(state);
        } else {
          await persistDiff(repository, prev, state);
        }
        const config = await repository.getStorageConfig();
        if (config.autoBackupEnabled) {
          await autoBackupService.performBackup(config, () => state);
        }
      } catch (error) {
        logger.error('持久化或自动备份失败:', error);
      }
    })();
  }, [state, isLoading]);

  const activeProject = state.projects.find(p => p.id === state.activeProjectId) || null;
  const activeModel = state.models.find(m => m.id === state.activeModelId) || state.models[0];

  // 界面语言切换：更新 AppState（经差分持久化落盘）并即时切换运行时语言。
  const handleLanguageChange = useCallback((language: AppLanguage) => {
    setState(prev => (prev.language === language ? prev : { ...prev, language }));
    changeLanguage(language);
  }, []);

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

  const handleBookDelete = useCallback(async (bookId: string) => {
    if (await dialogService.confirm({ message: i18n.t('app:book.deleteConfirm'), danger: true })) {
      setState(prev => ({
        ...prev,
        projects: prev.projects.filter(p => p.id !== bookId),
        activeProjectId: prev.activeProjectId === bookId ? 
          (prev.projects.length > 1 ? prev.projects[0]?.id ?? null : null) : 
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
      title: i18n.t('app:book.duplicateTitle', { title: sourceBook.title }),
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
      dialogService.alert(i18n.t('app:book.exportNeedSelect'));
      return;
    }
    
    repository.exportBook(activeProject);
  }, [activeProject]);

  // 新增：导入单个书籍
  const handleImportBook = useCallback(async () => {
    try {
      const importedBook = await repository.importBook();
      
      // 检查是否已存在相同标题的书籍
      const existingBook = state.projects.find(p => p.title === importedBook.title);
      if (existingBook) {
        // 如果存在相同标题，询问用户是否要重命名
        const newTitle = await dialogService.prompt({
          title: i18n.t('app:book.renameImportTitle'),
          message: i18n.t('app:book.renameImportMessage', { title: importedBook.title }),
          defaultValue: i18n.t('app:book.importedTitle', { title: importedBook.title }),
        });

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
      dialogService.alert(i18n.t('app:book.importSuccess', { title: importedBook.title }));
    } catch (error) {
      console.error('Failed to import book:', error);
      if (error instanceof Error && error.message !== '未选择文件') {
        dialogService.alert(i18n.t('app:book.importFailed', { message: error.message }));
      }
    }
  }, [state.projects]);

  const updateProject = useCallback((updates: Partial<Project>) => {
    setState(prev => {
      const { activeProjectId, projects } = prev;
      
      if (!activeProjectId) {
        const newProject: Project = {
          id: Date.now().toString(),
          title: i18n.t('app:book.defaultTitle'),
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
        await repository.clear();
      } else if (type === 'clear_projects') {
        // 2. 仅清空内容
        const currentData = repository.loadAllSync() || INITIAL_APP_STATE;
        const cleanData = {
          ...currentData,
          projects: [],
          activeProjectId: null
        };
        await repository.saveAll(cleanData);
      }
      // 3. 强制刷新页面 (核弹级重置)
      window.location.reload();
    } catch {
      dialogService.alert(i18n.t('app:reset.failed'));
      setResetModal({ isOpen: false, type: null });
    }
  };

  // 3. 仅重置当前项目内容 (普通操作，无需强制刷新)
  const handleResetCurrentProject = async () => {
    if (!activeProject) return;
    if (await dialogService.confirm({ message: i18n.t('app:book.clearConfirm', { title: activeProject.title }), danger: true })) {
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

  const handleDeleteCurrentProject = async () => {
    if (!activeProject) return;
    if (await dialogService.confirm({ title: i18n.t('app:book.deleteProjectTitle'), message: i18n.t('app:book.deleteProjectConfirm', { title: activeProject.title }), danger: true })) {
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
           <p className="font-bold">{t('empty.noProject')}</p>
           <Button onClick={() => setCurrentStep(0)} className="mt-4">{t('empty.goCreate')}</Button>
        </div>
      );
    }

    if (!activeModel || !isModelConfigured(activeModel)) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <i className="fas fa-plug text-4xl mb-4 text-gray-300"></i>
          <p className="font-bold">{activeModel ? t('model.notConfiguredKey') : t('model.noneConfigured')}</p>
          <Button onClick={() => setIsSettingsOpen(true)} className="mt-4">{t('model.goSettings')}</Button>
        </div>
      );
    }

    if (currentStep === 0) {
      return (
        <div className="p-8 overflow-y-auto h-full">
           <div className="mb-8 flex justify-between items-center">
              <div className="text-left">
                <h2 className="text-3xl font-black text-gray-800 tracking-tight">{t('home.title')}</h2>
                <p className="text-gray-500 mt-2">{t('home.subtitle')}</p>
              </div>
              <div className="flex gap-3">
                 {/* 全数据备份/导入按钮 */}
                 <button onClick={() => repository.exportAll(state)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">
                    <i className="fas fa-download mr-2"></i>{t('home.backup')}
                 </button>
                 <button 
                   onClick={async () => {
                     try {
                       logger.debug('开始导入全部数据...');
                       const newState = await repository.importAll();
                       logger.debug('导入的数据状态:', newState);
                       logger.debug('导入的projects数量:', newState?.projects?.length || 0);
                       logger.debug('导入的activeProjectId:', newState?.activeProjectId);
                       
                       // 验证导入的数据
                       if (!newState) {
                         throw new Error('导入的数据为空');
                       }

                       // 规范化并覆盖所有数据
                       const validatedState = normalizeImportedState(newState);
                       setState(validatedState);
                       setResetKey(prev => prev + 1);
                       logger.debug('全部数据导入完成，状态已覆盖');
                       dialogService.alert(i18n.t('app:importAll.success'));
                     } catch (err) {
                       console.error('导入失败:', err);
                       dialogService.alert(i18n.t('app:importAll.failed'));
                     }
                   }}
                   className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 text-sm font-medium cursor-pointer transition-colors shadow-lg"
                 >
                    <i className="fas fa-upload mr-2"></i>{t('home.importAll')}
                 </button>
                 
                 {/* 当前书籍导出/导入按钮 */}
                 {activeProject && (
                   <>
                     <div className="h-6 border-l border-gray-300 mx-1"></div>
                     <button 
                       onClick={handleExportCurrentBook}
                       className="px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors"
                       title={t('home.exportCurrentBook')}
                     >
                       <i className="fas fa-book-download mr-2"></i>{t('home.exportCurrentBook')}
                     </button>
                     <button 
                       onClick={handleImportBook}
                       className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium cursor-pointer transition-colors shadow-lg"
                       title={t('home.importSingleBookTip')}
                     >
                       <i className="fas fa-book-upload mr-2"></i>{t('home.importBook')}
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
      {/* 全局对话框宿主：承载 dialogService 的 alert/confirm 队列 */}
      <DialogHost />
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
                {resetModal.type === 'factory_reset' ? t('reset.factoryTitle') : t('reset.clearTitle')}
              </h3>
              
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                {resetModal.type === 'factory_reset'
                  ? t('reset.factoryDesc')
                  : t('reset.clearDesc')
                }
              </p>
              
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setResetModal({ isOpen: false, type: null })}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                >
                  {t('common:cancel')}
                </button>
                <button 
                  onClick={executeReset}
                  className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 ${
                    resetModal.type === 'factory_reset' 
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-200' 
                      : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
                  }`}
                >
                  {t('reset.confirmExecute')}
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
                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">{t('topbar.currentProject')}</span>
                <div className="flex items-center gap-2">
                   <h2 className="font-bold text-gray-800 truncate max-w-xs text-lg">{activeProject?.title || t('topbar.noBookSelected')}</h2>
                   {activeProject && (
                      <div className="flex gap-1 ml-2">
                        <button 
                          onClick={handleResetCurrentProject}
                          title={t('topbar.clearProjectTip')}
                          className="w-6 h-6 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors flex items-center justify-center"
                        >
                           <i className="fas fa-eraser text-xs"></i>
                        </button>
                        <button 
                          onClick={handleDeleteCurrentProject}
                          title={t('topbar.deleteProjectTip')}
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
                    v{__APP_VERSION__}
                  </div>
                  <button
                    onClick={() => setIsVersionCheckOpen(true)}
                    className="w-6 h-6 rounded-full hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors flex items-center justify-center"
                    title={t('topbar.checkUpdateTip')}
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
                      title={t('topbar.viewHistoryTip')}
                    >
                      <i className="fas fa-history mr-2 text-purple-500"></i>
                      <span className="font-medium text-purple-700">{t('topbar.history')}</span>
                    </button>
                  )
                )}
                <div 
                  className="flex items-center text-sm text-gray-500 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <i className="fas fa-microchip mr-2 text-blue-500"></i>
                  <span className="font-medium text-blue-700">{activeModel?.name || t('model.noneSelected')}</span>
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
          language={state.language ?? getEffectiveLanguage()}
          onLanguageChange={handleLanguageChange}
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







