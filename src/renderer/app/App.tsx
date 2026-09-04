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
import { type AppState, type AppLanguage, type AppTheme, type Project } from '../../shared/types';
import { INITIAL_APP_STATE, normalizeImportedState, type ResetModalState } from './initialState';
import { repository } from '../shared/services/repository';
import { changeLanguage, getEffectiveLanguage, i18n, useTranslation } from '../i18n';
import { autoBackupService } from '../shared/services/autoBackupService';
import { vectorIntegrationService } from '../features/knowledge/services/vectorIntegrationService';
import Bookshelf from './app-shell/Bookshelf';
import WorkspaceNav, { type SectionId } from './app-shell/WorkspaceNav';
import WorkspaceTopbar from './app-shell/WorkspaceTopbar';
import DialogHost from './app-shell/DialogHost';
import ToastHost from './app-shell/ToastHost';
import SettingsModal from '../features/settings/SettingsModal';
import StepInspiration from '../features/inspiration/StepInspiration';
import StepKnowledgeEnhanced from '../features/knowledge/StepKnowledgeEnhanced';
import StepCharacters from '../features/characters/StepCharacters';
import StepOutline from '../features/outline/StepOutline';
import StepChapterOutline from '../features/chapters/StepChapterOutline';
import WritingEditor from '../features/writing/WritingEditor';
import GlobalAssistant from '../features/assistant/GlobalAssistant';
import AIHistoryViewer from '../features/writing/AIHistoryViewer';
import VersionCheckModal from '../features/version/VersionCheckModal';
import { persistDiff } from './persistDiff';
import { dialogService } from '@/shared/services/dialogService';
import { applyTheme, watchSystemTheme } from '@/shared/services/themeService';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { TooltipProvider } from '@/shared/ui/Tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/AlertDialog';
import { BookHeart, Plug, Skull, Trash2 } from 'lucide-react';

/** 顶层视图：书籍库首页 或 单书工作台。 */
type AppView = 'bookshelf' | 'workspace';

const App: React.FC = () => {
  const { t } = useTranslation(['app', 'common']);
  const [state, setState] = useState<AppState>(INITIAL_APP_STATE);
  const [isLoading, setIsLoading] = useState(true);
  // 上一次已落盘的状态快照，用于差分持久化；null 表示尚未建立基线（首帧走整体写）。
  const lastPersistedRef = useRef<AppState | null>(null);

  const [view, setView] = useState<AppView>('bookshelf');
  const [section, setSection] = useState<SectionId>('inspiration');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  // 跨分区导航：世界构建中心「跳转到编辑」角色时，切到角色区并聚焦该角色
  const [focusCharacterId, setFocusCharacterId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [isHistoryViewerOpen, setIsHistoryViewerOpen] = useState(false);
  const [isVersionCheckOpen, setIsVersionCheckOpen] = useState(false);

  // 重置确认弹窗状态（factory_reset / clear_projects），经 AlertDialog 呈现
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

  // 界面主题切换：更新 AppState（经差分持久化落盘）并即时应用到 <html>。
  const handleThemeChange = useCallback((theme: AppTheme) => {
    setState(prev => (prev.theme === theme ? prev : { ...prev, theme }));
    applyTheme(theme);
  }, []);

  // 启动/偏好变化时应用主题；偏好为 system 时跟随系统深浅变化。
  useEffect(() => {
    applyTheme(state.theme);
    if ((state.theme ?? 'light') !== 'system') return;
    return watchSystemTheme(() => applyTheme('system'));
  }, [state.theme]);

  // 打开一本书并进入工作台（默认落在灵感分区）
  const openBook = useCallback((bookId: string) => {
    setState(prev => ({ ...prev, activeProjectId: bookId }));
    setSection('inspiration');
    setEditingChapterId(null);
    setView('workspace');
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

    setSection('inspiration');
    setView('workspace');
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
      const wasActive = state.activeProjectId === bookId;
      const remaining = state.projects.filter(p => p.id !== bookId);
      setState(prev => ({
        ...prev,
        projects: prev.projects.filter(p => p.id !== bookId),
        activeProjectId: wasActive ? (remaining[0]?.id ?? null) : prev.activeProjectId
      }));
      // 删除后已无书籍：回到书籍库空态
      if (wasActive && remaining.length === 0) {
        setView('bookshelf');
      }
    }
  }, [state.activeProjectId, state.projects]);

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
    setSection('inspiration');
    setView('workspace');
  }, [state.projects]);

  // 导出当前书籍（书籍库卡片菜单与工作台共用）
  const handleExportBook = useCallback((book: Project) => {
    repository.exportBook(book);
  }, []);

  // 导入单个书籍
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

      dialogService.alert(i18n.t('app:book.importSuccess', { title: importedBook.title }));
    } catch (error) {
      console.error('Failed to import book:', error);
      if (error instanceof Error && error.message !== '未选择文件') {
        dialogService.alert(i18n.t('app:book.importFailed', { message: error.message }));
      }
    }
  }, [state.projects]);

  // 全量数据导入（书籍库顶栏入口）
  const handleImportAll = useCallback(async () => {
    logger.debug('开始导入全部数据...');
    const newState = await repository.importAll();
    if (!newState) {
      throw new Error('导入的数据为空');
    }
    // 规范化并覆盖所有数据
    const validatedState = normalizeImportedState(newState);
    setState(validatedState);
    setResetKey(prev => prev + 1);
    logger.debug('全部数据导入完成，状态已覆盖');
    dialogService.alert(i18n.t('app:importAll.success'));
  }, []);

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
          virtualChapters: [],
          knowledge: [],
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

  // --- 触发逻辑：点击按钮只打开确认弹窗 ---
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

  // 仅清空当前项目内容（普通操作，无需强制刷新）
  const handleResetCurrentProject = async () => {
    if (!activeProject) return;
    if (await dialogService.confirm({ message: i18n.t('app:book.clearConfirm', { title: activeProject.title }), danger: true })) {
      updateProject({
        inspiration: '',
        intro: '',
        characters: [],
        outline: '',
        chapters: [],
        virtualChapters: [],
        knowledge: []
      });
      setSection('inspiration');
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
      setSection('inspiration');
      setEditingChapterId(null);
      setResetKey(prev => prev + 1);
      setView('bookshelf');
    }
  };

  const handleSectionChange = (next: SectionId) => {
    setSection(next);
    if (next !== 'writing') setEditingChapterId(null);
  };

  const renderSection = () => {
    if (!activeProject) {
      return (
        <EmptyState
          className="h-full"
          icon={BookHeart}
          title={t('empty.noProject')}
          action={<Button onClick={() => setView('bookshelf')}>{t('empty.goCreate')}</Button>}
        />
      );
    }

    if (!activeModel || !isModelConfigured(activeModel)) {
      return (
        <EmptyState
          className="h-full"
          icon={Plug}
          title={activeModel ? t('model.notConfiguredKey') : t('model.noneConfigured')}
          action={<Button onClick={() => setIsSettingsOpen(true)}>{t('model.goSettings')}</Button>}
        />
      );
    }

    switch (section) {
      case 'inspiration':
        return (
          <div className="h-full overflow-y-auto p-8">
            <StepInspiration
              project={activeProject}
              prompts={state.prompts}
              activeModel={activeModel}
              onUpdate={updateProject}
            />
          </div>
        );
      case 'world':
        return (
          <StepKnowledgeEnhanced
            project={activeProject}
            onUpdate={updateProject}
            activeModel={activeModel}
            onNavigateToCharacter={(id) => {
              setFocusCharacterId(id);
              setSection('characters');
            }}
            onNavigateToChapter={(id) => {
              setEditingChapterId(id);
              setSection('writing');
            }}
          />
        );
      case 'characters':
        return (
          <StepCharacters
            project={activeProject}
            prompts={state.prompts}
            activeModel={activeModel}
            onUpdate={updateProject}
            onOpenSettings={() => setIsSettingsOpen(true)}
            focusCharacterId={focusCharacterId}
            onFocusHandled={() => setFocusCharacterId(null)}
          />
        );
      case 'outline':
        return (
          <StepOutline
            project={activeProject}
            prompts={state.prompts}
            activeModel={activeModel}
            onUpdate={updateProject}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        );
      case 'chapters':
        return (
          <StepChapterOutline
            project={activeProject}
            prompts={state.prompts}
            activeModel={activeModel}
            onUpdate={updateProject}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onEnterWriting={(id) => {
              setEditingChapterId(id);
              setSection('writing');
            }}
          />
        );
      case 'writing':
        return (
          <WritingEditor
            project={activeProject}
            prompts={state.prompts}
            activeModel={activeModel}
            onUpdate={updateProject}
            initialChapterId={editingChapterId}
            onBack={() => handleSectionChange('chapters')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="relative flex h-screen w-screen overflow-hidden bg-background">
      {/* 全局对话框/轻提示宿主：承载 dialogService 队列与 toast */}
      <DialogHost />
      <ToastHost />

      {/* 全局助手悬浮层 */}
      <GlobalAssistant
        models={state.models}
        activeModelId={state.activeModelId}
        project={activeProject}
        prompts={state.prompts}
        onUpdate={updateProject}
      />

      {/* 重置确认专用弹窗（Radix AlertDialog，焦点管理内建） */}
      <AlertDialog
        open={resetModal.isOpen}
        onOpenChange={open => { if (!open) setResetModal({ isOpen: false, type: null }); }}
      >
        <AlertDialogContent className="max-w-md text-center">
          <div className={`mx-auto flex size-14 items-center justify-center rounded-full ${
            resetModal.type === 'factory_reset' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
          }`}>
            {resetModal.type === 'factory_reset' ? <Skull className="size-7" /> : <Trash2 className="size-7" />}
          </div>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {resetModal.type === 'factory_reset' ? t('reset.factoryTitle') : t('reset.clearTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {resetModal.type === 'factory_reset' ? t('reset.factoryDesc') : t('reset.clearDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center">
            <AlertDialogCancel onClick={() => setResetModal({ isOpen: false, type: null })}>
              {t('common:cancel')}
            </AlertDialogCancel>
            <AlertDialogAction danger onClick={executeReset}>
              {t('reset.confirmExecute')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {view === 'bookshelf' ? (
        <div className="min-w-0 flex-1">
          <Bookshelf
            books={state.projects}
            activeBookId={state.activeProjectId}
            onOpenBook={openBook}
            onCreateBook={handleBookCreate}
            onRenameBook={handleBookRename}
            onDeleteBook={handleBookDelete}
            onDuplicateBook={handleBookDuplicate}
            onExportBook={handleExportBook}
            onImportBook={handleImportBook}
            onExportAll={() => repository.exportAll(state)}
            onImportAll={handleImportAll}
          />
        </div>
      ) : (
        <>
          {/* 写作分区为全屏沉浸模式，隐藏导航栏与顶栏 */}
          {section !== 'writing' && (
            <WorkspaceNav
              activeSection={section}
              onSectionChange={handleSectionChange}
              onOpenBookshelf={() => setView('bookshelf')}
              onOpenSettings={() => setIsSettingsOpen(true)}
              project={activeProject}
            />
          )}

          <main className="flex min-w-0 flex-1 flex-col">
            {section !== 'writing' && (
              <WorkspaceTopbar
                project={activeProject}
                activeModel={activeModel}
                theme={state.theme}
                onThemeChange={handleThemeChange}
                onOpenBookshelf={() => setView('bookshelf')}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onClearProject={handleResetCurrentProject}
                onDeleteProject={handleDeleteCurrentProject}
                onOpenHistory={() => setIsHistoryViewerOpen(true)}
                onOpenVersionCheck={() => setIsVersionCheckOpen(true)}
              />
            )}

            <div className="relative min-h-0 flex-1 overflow-hidden bg-background" key={resetKey}>
              {renderSection()}
            </div>
          </main>
        </>
      )}

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
          theme={state.theme ?? 'light'}
          onThemeChange={handleThemeChange}
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
    </TooltipProvider>
  );
};

export default App;
