/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 单书工作台视图：导航栏 + 顶栏 + 分区内容路由（灵感/世界/角色/大纲/细纲/写作）。
 * 从 App.tsx 收编而来；写作分区为全屏沉浸模式，隐藏导航栏与顶栏。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { type AppTheme, type ModelConfig, type Project, type PromptTemplate } from '../../../shared/types';
import { isModelConfigured } from '../../shared/utils/modelReadiness';
import WorkspaceNav, { type SectionId } from './WorkspaceNav';
import WorkspaceTopbar from './WorkspaceTopbar';
import StepInspiration from '../../features/inspiration/StepInspiration';
import StepKnowledgeEnhanced from '../../features/knowledge/StepKnowledgeEnhanced';
import StepCharacters from '../../features/characters/StepCharacters';
import StepOutline from '../../features/outline/StepOutline';
import StepChapterOutline from '../../features/chapters/StepChapterOutline';
import WritingEditor from '../../features/writing/WritingEditor';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { BookHeart, Plug } from 'lucide-react';

export interface WorkspaceViewProps {
  section: SectionId;
  activeProject: Project | null;
  activeModel: ModelConfig | undefined;
  prompts: PromptTemplate[];
  resetKey: number;
  theme: AppTheme | undefined;
  focusCharacterId: string | null;
  editingChapterId: string | null;
  onSectionChange: (next: SectionId) => void;
  onOpenBookshelf: () => void;
  onOpenSettings: () => void;
  onClearProject: () => void;
  onDeleteProject: () => void;
  onOpenHistory: () => void;
  onOpenVersionCheck: () => void;
  onThemeChange: (theme: AppTheme) => void;
  onUpdateProject: (updates: Partial<Project>) => void;
  onRenameBook: (bookId: string, newTitle: string) => void;
  onNavigateToCharacter: (id: string) => void;
  onNavigateToChapter: (id: string) => void;
}

const WorkspaceSection: React.FC<WorkspaceViewProps> = ({
  section, activeProject, activeModel, prompts, focusCharacterId, editingChapterId,
  onSectionChange, onOpenBookshelf, onOpenSettings, onUpdateProject,
  onNavigateToCharacter, onNavigateToChapter,
}) => {
  const { t } = useTranslation(['app', 'common']);

  if (!activeProject) {
    return (
      <EmptyState
        className="h-full"
        icon={BookHeart}
        title={t('empty.noProject')}
        action={<Button onClick={onOpenBookshelf}>{t('empty.goCreate')}</Button>}
      />
    );
  }

  if (!activeModel || !isModelConfigured(activeModel)) {
    return (
      <EmptyState
        className="h-full"
        icon={Plug}
        title={activeModel ? t('model.notConfiguredKey') : t('model.noneConfigured')}
        action={<Button onClick={onOpenSettings}>{t('model.goSettings')}</Button>}
      />
    );
  }

  switch (section) {
    case 'inspiration':
      return (
        <div className="h-full overflow-y-auto p-8">
          <StepInspiration project={activeProject} prompts={prompts} activeModel={activeModel} onUpdate={onUpdateProject} />
        </div>
      );
    case 'world':
      return (
        <StepKnowledgeEnhanced
          project={activeProject}
          onUpdate={onUpdateProject}
          activeModel={activeModel}
          onNavigateToCharacter={onNavigateToCharacter}
          onNavigateToChapter={onNavigateToChapter}
        />
      );
    case 'characters':
      return (
        <StepCharacters
          project={activeProject}
          prompts={prompts}
          activeModel={activeModel}
          onUpdate={onUpdateProject}
          onOpenSettings={onOpenSettings}
          focusCharacterId={focusCharacterId}
          onFocusHandled={() => onNavigateToCharacter('')}
        />
      );
    case 'outline':
      return (
        <StepOutline
          project={activeProject}
          prompts={prompts}
          activeModel={activeModel}
          onUpdate={onUpdateProject}
          onOpenSettings={onOpenSettings}
        />
      );
    case 'chapters':
      return (
        <StepChapterOutline
          project={activeProject}
          prompts={prompts}
          activeModel={activeModel}
          onUpdate={onUpdateProject}
          onOpenSettings={onOpenSettings}
          onEnterWriting={(id) => onNavigateToChapter(id)}
        />
      );
    case 'writing':
      return (
        <WritingEditor
          project={activeProject}
          prompts={prompts}
          activeModel={activeModel}
          onUpdate={onUpdateProject}
          initialChapterId={editingChapterId}
          onBack={() => onSectionChange('chapters')}
        />
      );
    default:
      return null;
  }
};

const WorkspaceView: React.FC<WorkspaceViewProps> = (props) => {
  const {
    section, activeProject, activeModel, resetKey, theme,
    onSectionChange, onOpenBookshelf, onOpenSettings,
    onClearProject, onDeleteProject, onOpenHistory, onOpenVersionCheck,
    onThemeChange, onRenameBook,
  } = props;

  return (
    <>
      {/* 写作分区为全屏沉浸模式，隐藏导航栏与顶栏 */}
      {section !== 'writing' && (
        <WorkspaceNav
          activeSection={section}
          onSectionChange={onSectionChange}
          onOpenBookshelf={onOpenBookshelf}
          onOpenSettings={onOpenSettings}
          project={activeProject}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        {section !== 'writing' && activeModel && (
          <WorkspaceTopbar
            project={activeProject}
            activeModel={activeModel}
            theme={theme}
            section={section}
            onSectionChange={onSectionChange}
            onRenameBook={onRenameBook}
            onThemeChange={onThemeChange}
            onOpenBookshelf={onOpenBookshelf}
            onOpenSettings={onOpenSettings}
            onClearProject={onClearProject}
            onDeleteProject={onDeleteProject}
            onOpenHistory={onOpenHistory}
            onOpenVersionCheck={onOpenVersionCheck}
          />
        )}

        <div className="relative min-h-0 flex-1 overflow-hidden bg-background" key={resetKey}>
          <WorkspaceSection {...props} />
        </div>
      </main>
    </>
  );
};

export default WorkspaceView;
