/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
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
import { useTranslation } from 'react-i18next';
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
import { eventToKeybinding, resolveKeybindings } from '../features/settings/services/keybindings';
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
import { isSectionVisible } from './sectionFeatures';
import { Bot } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

/** 分区快捷键顺序：Ctrl/Cmd+1..5（模块级常量，避免 effect 依赖抖动）。 */
const SECTION_ORDER: SectionId[] = ['inspiration', 'world', 'characters', 'structure', 'writing'];

const App: React.FC = () => {
  useAppBootstrap();
  const { t } = useTranslation('app');

  // 纯 UI 态（不落盘）
  const [view, setView] = useState<'bookshelf' | 'workspace'>('bookshelf');
  const [section, setSection] = useState<SectionId>('inspiration');
  const [structureSub, setStructureSub] = useState<'outline' | 'chapters' | undefined>(undefined);
  // 手写豁免（D1）：App 层持有，重挂切分区不丢；仅重置/删书时清除
  const [handwriteBypass, setHandwriteBypass] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [focusCharacterId, setFocusCharacterId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryViewerOpen, setIsHistoryViewerOpen] = useState(false);
  const [isVersionCheckOpen, setIsVersionCheckOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [assistantOpenPref, setAssistantOpenPref] = useViewPreference<'open' | 'closed'>('assistant.open', 'open');
  const [assistantWidthPref, setAssistantWidthPref] = useViewPreference<string>('assistant.width', '380');
  const assistantOpen = assistantOpenPref !== 'closed';
  const assistantWidth = Math.min(560, Math.max(300, Number.parseInt(assistantWidthPref, 10) || 380));
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
  const uiFontSize = useSettingsStore(s => s.uiFontSize) ?? 14;
  const editorFontSize = useSettingsStore(s => s.editorFontSize) ?? 18;
  const editorLineHeight = useSettingsStore(s => s.editorLineHeight) ?? 1.9;
  useEffect(() => {
    try {
      document.body.style.fontFamily = resolveFontStack(uiFont, DEFAULT_UI_FONT, customFonts);
      document.body.style.fontSize = `${uiFontSize}px`;
      const root = document.documentElement.style;
      root.setProperty(
        '--font-reading',
        resolveFontStack(editorFont, DEFAULT_EDITOR_FONT, customFonts)
      );
      root.setProperty('--font-reading-size', `${editorFontSize}px`);
      root.setProperty('--font-reading-lh', String(editorLineHeight));
    } catch {
      // 非 DOM 环境（测试）静默
    }
  }, [uiFont, editorFont, customFonts, uiFontSize, editorFontSize, editorLineHeight]);

  const toggleAssistant = useCallback(() => {
    setAssistantOpenPref(assistantOpen ? 'closed' : 'open');
  }, [assistantOpen, setAssistantOpenPref]);

  // IDE 式开关：默认 Ctrl/Cmd+J 随时显隐 AI 侧边栏（设置页可改键）
  const keybindingOverrides = useSettingsStore(s => s.keybindings);
  const bindings = resolveKeybindings(keybindingOverrides);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (eventToKeybinding(e) === bindings.toggleAssistant) {
        e.preventDefault();
        toggleAssistant();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleAssistant, bindings.toggleAssistant]);
  const enterWorkspace = useCallback(() => {
    setSection('inspiration'); setEditingChapterId(null); setView('workspace');
  }, []);
  const bumpReset = useCallback(() => {
    setSection('inspiration'); setEditingChapterId(null); setHandwriteBypass(false); setResetKey(k => k + 1);
  }, []);
  const actions = useBookActions(enterWorkspace);
  const updateProject = useCallback((updates: Partial<Project>) => {
    useProjectStore.getState().updateActiveProject(updates);
  }, []);
  const handleSectionChange = useCallback((next: SectionId, sub?: 'outline' | 'chapters') => {
    setSection(next);
    if (next === 'structure' && sub) setStructureSub(sub);
    // 切离写作不清空活动章节：往返保留上下文，进书/重置时才清
  }, []);

  // 分区快捷键：默认 Ctrl/Cmd+1..5（工作台内有效，设置页可改键，与 USER_GUIDE 对齐）
  useEffect(() => {
    const onSectionKey = (e: KeyboardEvent) => {
      if (view !== 'workspace') return;
      const pressed = eventToKeybinding(e);
      if (!pressed) return;
      const idx = [bindings.section1, bindings.section2, bindings.section3, bindings.section4, bindings.section5].indexOf(pressed);
      if (idx < 0) return;
      const next = SECTION_ORDER[idx];
      if (next) {
        e.preventDefault();
        handleSectionChange(next);
      }
    };
    window.addEventListener('keydown', onSectionKey);
    return () => window.removeEventListener('keydown', onSectionKey);
  }, [view, handleSectionChange, bindings.section1, bindings.section2, bindings.section3, bindings.section4, bindings.section5]);

  // 当前分区不可用（minimal 档禁 AI 功能）时回退写作编辑器（映射单源见 sectionFeatures）
  useEffect(() => {
    if (!isSectionVisible(section, (id) => availableFeatures.has(id))) {
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
      width={assistantWidth}
      onClose={() => setAssistantOpenPref('closed')}
      onWidthChange={(w) => setAssistantWidthPref(String(Math.min(560, Math.max(300, Math.round(w)))))}
    />
  ) : null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative flex h-screen w-screen overflow-hidden bg-background">
        <DialogHost />
        <ToastHost />
        <ApprovalHost />

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
              onTagBook={actions.tagBook}
              onDeleteBook={actions.deleteBook}
              onDuplicateBook={actions.duplicateBook}
              onExportBook={actions.exportBook}
              onImportBook={actions.importBook}
              onImportAll={actions.importAllData}
              onRestoreTrash={actions.restoreTrashBook}
              onPurgeTrash={actions.purgeTrashBook}
            />
          </div>
        ) : (
          <div className="flex min-w-0 flex-1">
            <div className="flex min-w-0 flex-1">
              <WorkspaceView
            section={section}
            structureSub={structureSub}
            handwriteBypass={handwriteBypass}
            onHandwriteBypass={() => setHandwriteBypass(true)}
            activeProject={activeProject}
            activeModel={activeModel}
            prompts={prompts}
            resetKey={resetKey}
            theme={theme}
            focusCharacterId={focusCharacterId}
            editingChapterId={editingChapterId}
            assistantOpen={assistantOpen}
            onToggleAssistant={toggleAssistant}
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
            {assistantNode && assistantOpen ? (
              <div className="shrink-0 border-l border-border" style={{ width: assistantWidth }}>
                {assistantNode}
              </div>
            ) : (
              assistantNode && (
                <div className="flex w-10 shrink-0 items-start justify-center border-l border-border bg-card pt-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAssistantOpenPref('open')}
                    className="size-8 text-muted-foreground hover:text-foreground"
                    title={t('topbar.expandAssistant')}
                  >
                    <Bot className="size-4" />
                  </Button>
                </div>
              )
            )}
          </div>
        )}

        {showOnboarding && (
          <OnboardingModal
            open
            onDone={handleOnboardingDone}
            onOpenSettings={() => {
              // 设置接管屏幕：先收起向导避双模态层叠，设置关闭后若未完成则回来
              setShowOnboarding(false);
              setIsSettingsOpen(true);
            }}
          />
        )}

        {isSettingsOpen && (
          <SettingsModalHost onClose={() => {
            setIsSettingsOpen(false);
            if (!isOnboardingDone()) setShowOnboarding(true);
          }} onClearData={() => setResetOpen(true)} />
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
