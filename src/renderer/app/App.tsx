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

import React, { useCallback, useEffect, useState } from 'react';
import type { Project } from '../../shared/types';
import { TooltipProvider } from '@/shared/ui/Tooltip';
import Bookshelf from './app-shell/Bookshelf';
import DialogHost from './app-shell/DialogHost';
import ToastHost from './app-shell/ToastHost';
import ResetAlertDialog from './app-shell/ResetAlertDialog';
import SettingsModalHost from './app-shell/SettingsModalHost';
import WorkspaceView from './app-shell/WorkspaceView';
import type { SectionId } from './app-shell/WorkspaceNav';
import GlobalAssistant from '../features/assistant/GlobalAssistant';
import ApprovalHost from '../features/assistant/components/ApprovalHost';
import AIHistoryViewer from '../features/writing/AIHistoryViewer';
import VersionCheckModal from '../features/version/VersionCheckModal';
import OnboardingModal, { isOnboardingDone, markOnboardingDone, type OnboardingPersona } from './app-shell/OnboardingModal';
import { useViewPreference } from '../shared/hooks/useViewPreference';
import { DEFAULT_EDITOR_FONT, DEFAULT_UI_FONT, resolveFontStack } from '../constants/fonts';
import { useProjectStore, selectActiveProject } from './stores/projectStore';
import { useSettingsStore, useUsableModel } from './stores/settingsStore';
import { useAppBootstrap } from './useAppBootstrap';
import { useFeatureAvailability } from './useFeatureAvailability';
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
  const [assistantLayout, setAssistantLayout] = useViewPreference<'docked' | 'floating'>('assistant.layout', 'docked');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 功能可用性（发行档）：当前分区被禁用时回退写作编辑器
  const availableFeatures = useFeatureAvailability();

  // 双 store 订阅
  const activeProject = useProjectStore(selectActiveProject);
  const projects = useProjectStore(s => s.projects);
  const activeBookId = useProjectStore(s => s.activeProjectId);
  const models = useSettingsStore(s => s.models);
  const activeModelId = useSettingsStore(s => s.activeModelId);
  const prompts = useSettingsStore(s => s.prompts);
  const theme = useSettingsStore(s => s.theme);
  const activeModel = useUsableModel();

  // 字体应用单点：界面字体写 body，正文字体挂 --font-reading 供画布/预览消费
  const uiFont = useSettingsStore(s => s.uiFont);
  const editorFont = useSettingsStore(s => s.editorFont);
  const customFonts = useSettingsStore(s => s.customFonts);
  useEffect(() => {
    try {
      document.body.style.fontFamily = resolveFontStack(uiFont, DEFAULT_UI_FONT, customFonts);
      document.documentElement.style.setProperty(
        '--font-reading',
        resolveFontStack(editorFont, DEFAULT_EDITOR_FONT, customFonts)
      );
    } catch {
      // 非 DOM 环境（测试）静默
    }
  }, [uiFont, editorFont, customFonts]);

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

  // 当前分区不可用（minimal 档禁 AI 功能）时回退写作编辑器
  useEffect(() => {
    const featureBySection: Record<SectionId, string> = {
      inspiration: 'core.inspiration',
      world: 'core.world',
      characters: 'core.characters',
      structure: 'core.chapters',
      writing: 'core.writing',
    };
    if (!availableFeatures.has(featureBySection[section] ?? 'core.writing')) {
      // structure 取并集：任一可用即留
      if (section === 'structure' && availableFeatures.has('core.outline')) return;
      setSection('writing');
    }
  }, [availableFeatures, section]);

  // 首启向导：无书且没走过向导时弹出，三类人群一次分流
  useEffect(() => {
    if (projects.length === 0 && !isOnboardingDone()) {
      setShowOnboarding(true);
    }
  }, [projects.length]);

  const handleOnboardingDone = useCallback((persona: OnboardingPersona, title: string) => {
    markOnboardingDone(persona);
    setShowOnboarding(false);
    if (persona === 'hand') {
      actions.createBook(title);
    } else {
      actions.createBook(title);
      setIsSettingsOpen(true);
    }
  }, [actions]);

  const assistantNode = availableFeatures.has('core.assistant') ? (
    <GlobalAssistant
      models={models}
      activeModelId={activeModelId}
      project={activeProject}
      prompts={prompts}
      onUpdate={updateProject}
      layout={assistantLayout}
      onToggleLayout={() => setAssistantLayout(assistantLayout === 'docked' ? 'floating' : 'docked')}
    />
  ) : null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative flex h-screen w-screen overflow-hidden bg-background">
        <DialogHost />
        <ToastHost />
        <ApprovalHost />

        <ResetAlertDialog open={resetOpen} type="factory_reset" onClose={() => setResetOpen(false)} />

        {assistantLayout === 'floating' && assistantNode}

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
              onImportAll={actions.importAllData}
            />
          </div>
        ) : (
          <div className="flex min-w-0 flex-1">
            <div className="flex min-w-0 flex-1">
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
            onDeleteProject={() => actions.deleteCurrentProject(() => { bumpReset(); setView('bookshelf'); })}
            onOpenHistory={() => setIsHistoryViewerOpen(true)}
            onOpenVersionCheck={() => setIsVersionCheckOpen(true)}
            onThemeChange={th => useSettingsStore.getState().setTheme(th)}
            onUpdateProject={updateProject}
            onRenameBook={actions.renameBook}
            onNavigateToCharacter={id => { setFocusCharacterId(id); setSection('characters'); }}
            onNavigateToChapter={id => { setEditingChapterId(id); setSection('writing'); }}
              />
            </div>
            {assistantLayout === 'docked' && (
              <div className="w-[380px] shrink-0 border-l border-border">
                {assistantNode}
              </div>
            )}
          </div>
        )}

        {showOnboarding && (
          <OnboardingModal
            open
            onDone={handleOnboardingDone}
            onOpenSettings={() => setIsSettingsOpen(true)}
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

export default App;
