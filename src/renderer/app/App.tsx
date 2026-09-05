/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 应用组合根：书籍库 ⇄ 单书工作台的顶层路由 + 全局浮层宿主。
 * 数据态在双 store（projectStore/settingsStore），持久化走 persistenceBridge，
 * 书籍/项目动作在 useBookActions，引导在 useAppBootstrap——本文件只做装配。
 */

import React, { useCallback, useState } from 'react';
import type { Project } from '../../shared/types';
import { repository } from '../shared/services/repository';
import { TooltipProvider } from '@/shared/ui/Tooltip';
import Bookshelf from './app-shell/Bookshelf';
import DialogHost from './app-shell/DialogHost';
import ToastHost from './app-shell/ToastHost';
import ResetAlertDialog from './app-shell/ResetAlertDialog';
import SettingsModalHost from './app-shell/SettingsModalHost';
import WorkspaceView from './app-shell/WorkspaceView';
import type { SectionId } from './app-shell/WorkspaceNav';
import GlobalAssistant from '../features/assistant/GlobalAssistant';
import AIHistoryViewer from '../features/writing/AIHistoryViewer';
import VersionCheckModal from '../features/version/VersionCheckModal';
import { useProjectStore, selectActiveProject } from './stores/projectStore';
import { useSettingsStore } from './stores/settingsStore';
import { composeAppState } from './stores/persistenceBridge';
import { useAppBootstrap } from './useAppBootstrap';
import { useBookActions } from './useBookActions';

const App: React.FC = () => {
  useAppBootstrap();

  // 纯 UI 态（不落盘）
  const [view, setView] = useState<'bookshelf' | 'workspace'>('bookshelf');
  const [section, setSection] = useState<SectionId>('inspiration');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [focusCharacterId, setFocusCharacterId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryViewerOpen, setIsHistoryViewerOpen] = useState(false);
  const [isVersionCheckOpen, setIsVersionCheckOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  // 双 store 订阅
  const activeProject = useProjectStore(selectActiveProject);
  const projects = useProjectStore(s => s.projects);
  const activeBookId = useProjectStore(s => s.activeProjectId);
  const models = useSettingsStore(s => s.models);
  const activeModelId = useSettingsStore(s => s.activeModelId);
  const prompts = useSettingsStore(s => s.prompts);
  const theme = useSettingsStore(s => s.theme);
  const activeModel = models.find(m => m.id === activeModelId) || models[0];

  const enterWorkspace = useCallback(() => {
    setSection('inspiration'); setEditingChapterId(null); setView('workspace');
  }, []);
  const bumpReset = useCallback(() => {
    setSection('inspiration'); setEditingChapterId(null); setResetKey(k => k + 1);
  }, []);
  const actions = useBookActions(enterWorkspace);
  const updateProject = useCallback((updates: Partial<Project>) => {
    useProjectStore.getState().updateActiveProject(updates);
  }, []);
  const handleSectionChange = useCallback((next: SectionId) => {
    setSection(next);
    if (next !== 'writing') setEditingChapterId(null);
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative flex h-screen w-screen overflow-hidden bg-background">
        <DialogHost />
        <ToastHost />
        <GlobalAssistant
          models={models}
          activeModelId={activeModelId}
          project={activeProject}
          prompts={prompts}
          onUpdate={updateProject}
        />

        <ResetAlertDialog open={resetOpen} type="factory_reset" onClose={() => setResetOpen(false)} />

        {view === 'bookshelf' ? (
          <div className="min-w-0 flex-1">
            <Bookshelf
              books={projects}
              activeBookId={activeBookId}
              onOpenBook={actions.openBook}
              onCreateBook={actions.createBook}
              onCreateQuickBook={actions.createQuickBook}
              onRenameBook={actions.renameBook}
              onDeleteBook={actions.deleteBook}
              onDuplicateBook={actions.duplicateBook}
              onExportBook={actions.exportBook}
              onImportBook={actions.importBook}
              onExportAll={exportAllData}
              onImportAll={actions.importAllData}
            />
          </div>
        ) : (
          <WorkspaceView
            section={section}
            activeProject={activeProject}
            activeModel={activeModel}
            prompts={prompts}
            resetKey={resetKey}
            theme={theme}
            focusCharacterId={focusCharacterId}
            editingChapterId={editingChapterId}
            onSectionChange={handleSectionChange}
            onOpenBookshelf={() => setView('bookshelf')}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onClearProject={() => actions.clearCurrentProject(bumpReset)}
            onDeleteProject={() => actions.deleteCurrentProject(() => { bumpReset(); setView('bookshelf'); })}
            onOpenHistory={() => setIsHistoryViewerOpen(true)}
            onOpenVersionCheck={() => setIsVersionCheckOpen(true)}
            onThemeChange={th => useSettingsStore.getState().setTheme(th)}
            onUpdateProject={updateProject}
            onRenameBook={actions.renameBook}
            onNavigateToCharacter={id => { setFocusCharacterId(id); setSection('characters'); }}
            onNavigateToChapter={id => { setEditingChapterId(id); setSection('writing'); }}
          />
        )}

        {isSettingsOpen && (
          <SettingsModalHost onClose={() => setIsSettingsOpen(false)} onClearData={() => setResetOpen(true)} />
        )}

        {isHistoryViewerOpen && activeProject && (
          <AIHistoryViewer project={activeProject} onUpdate={updateProject} onClose={() => setIsHistoryViewerOpen(false)} />
        )}
        <VersionCheckModal isOpen={isVersionCheckOpen} onClose={() => setIsVersionCheckOpen(false)} />
      </div>
    </TooltipProvider>
  );
};

/** 设置切片快照（导出全量数据用）：组合双 store 即逻辑 AppState。 */
function exportAllData() {
  void repository.exportAll(composeAppState());
}

export default App;
