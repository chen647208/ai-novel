/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 知识库中心的世界要素编辑器集合：地点/势力/规则/时间线/一致性/智能推荐/关系图。 */
import React from 'react';

import { type CommitOptions } from '@/app/stores/projectStore';
import { useTranslation } from '@/i18n';
import { dialogService } from '@/shared/services/dialogService';
import { FeaturePanel } from '@/shared/ui/FeaturePanel';

import type { ConsistencyCheckConfig, ConsistencyCheckPromptTemplate, DiagramType, EmbeddingModelConfig, ModelConfig, Project } from '../../../../shared/types';

interface KnowledgeFeatureEditorsProps {
  project: Project;
  navTarget: { type: string; id: string } | null;
  onUpdate: (updates: Partial<Project>, opts?: CommitOptions) => void;
  activeModel: ModelConfig | null;
  activeEmbeddingConfig: EmbeddingModelConfig | null;
  consistencyPrompts: ConsistencyCheckPromptTemplate[];
  consistencyConfig: ConsistencyCheckConfig | null;
  graphInitialType: DiagramType;
  showLocationEditor: boolean;
  showFactionEditor: boolean;
  showTimelineEditor: boolean;
  showRuleSystemEditor: boolean;
  showEnhancedTimeline: boolean;
  showConsistencyChecker: boolean;
  showSmartRecommender: boolean;
  showWorldViewGraph: boolean;
  showDataViews: boolean;
  showDualTimeline: boolean;
  onCloseWorldViewGraph: () => void;
  onNavigateToChapter?: (id: string) => void;
  onNavigateToItem: (type: string, id: string) => void;
}

export const KnowledgeFeatureEditors: React.FC<KnowledgeFeatureEditorsProps> = ({
  project,
  navTarget,
  onUpdate,
  activeModel,
  activeEmbeddingConfig,
  consistencyPrompts,
  consistencyConfig,
  graphInitialType,
  showLocationEditor,
  showFactionEditor,
  showTimelineEditor,
  showRuleSystemEditor,
  showEnhancedTimeline,
  showConsistencyChecker,
  showSmartRecommender,
  showWorldViewGraph,
  showDataViews,
  showDualTimeline,
  onCloseWorldViewGraph,
  onNavigateToChapter,
  onNavigateToItem,
}) => {
  const { t } = useTranslation('knowledge');

  return (
    <>
      {showLocationEditor && (
        <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border bg-card p-6">
          <FeaturePanel
            id="world.locationEditor"
            projectId={project.id}
            locations={project.locations || []}
            factions={project.factions || []}
            initialSelectedId={navTarget?.type === 'location' ? navTarget.id : null}
            onSave={(locations: Project['locations']) => {
              onUpdate({ locations });
            }}
          />
        </div>
      )}

      {showTimelineEditor && (
        <div className="max-h-[600px] overflow-y-auto rounded-lg border border-border bg-card p-6">
          <FeaturePanel
            id="timeline.editor"
            projectId={project.id}
            timeline={project.timeline}
            characters={project.characters || []}
            locations={project.locations || []}
            factions={project.factions || []}
            chapters={project.chapters || []}
            onSave={(timeline: Project['timeline']) => {
              onUpdate({ timeline });
            }}
          />
        </div>
      )}

      {showRuleSystemEditor && (
        <div className="max-h-[600px] overflow-y-auto rounded-lg border border-border bg-card p-6">
          <FeaturePanel
            id="world.ruleSystemEditor"
            projectId={project.id}
            ruleSystems={project.ruleSystems || []}
            characters={project.characters || []}
            initialSelectedId={navTarget?.type === 'rule' ? navTarget.id : null}
            onSave={(ruleSystems: Project['ruleSystems']) => {
              onUpdate({ ruleSystems });
            }}
          />
        </div>
      )}

      {showEnhancedTimeline && (
        <FeaturePanel
          id="timeline.enhanced"
          project={project}
          selectedEventId={navTarget?.type === 'timeline' ? navTarget.id : undefined}
          onEventClick={(event: { id: string }) => {
            onNavigateToItem('timeline', event.id);
          }}
          onChapterClick={(chapter: { id: string }) => {
            onNavigateToChapter?.(chapter.id);
          }}
          showChapters={true}
        />
      )}

      {showConsistencyChecker && (
        <FeaturePanel
          id="consistency.checker"
          project={project}
          model={activeModel}
          embeddingConfig={activeEmbeddingConfig || undefined}
          consistencyPrompts={consistencyPrompts}
          consistencyConfig={consistencyConfig || undefined}
          onFixIssues={(fixedProject: Project) => {
            onUpdate(fixedProject);
            dialogService.alert(t('center.autoFixed'));
          }}
          onNavigateToItem={onNavigateToItem}
        />
      )}

      {showSmartRecommender && (
        <FeaturePanel
          id="assistant.smartRecommender"
          project={project}
          context={{
            selectedCharacters: project.characters?.slice(0, 2).map(c => c.id),
            selectedLocation: project.locations?.[0]?.id,
            currentContent: '',
          }}
          onSelectItem={(item: { type: string; id: string }) => {
            onNavigateToItem(item.type, item.id);
          }}
          onViewItem={onNavigateToItem}
        />
      )}

      {showFactionEditor && (
        <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border bg-card p-6">
          <FeaturePanel
            id="world.factionEditor"
            projectId={project.id}
            factions={project.factions || []}
            locations={project.locations || []}
            characters={project.characters || []}
            initialSelectedId={navTarget?.type === 'faction' ? navTarget.id : null}
            onSave={(factions: Project['factions']) => {
              onUpdate({ factions });
            }}
          />
        </div>
      )}

      {showWorldViewGraph && (
        <FeaturePanel
          id="world.worldViewGraph"
          characters={project.characters || []}
          locations={project.locations || []}
          factions={project.factions || []}
          timeline={project.timeline}
          ruleSystems={project.ruleSystems || []}
          worldView={project.worldView}
          initialType={graphInitialType}
          onClose={onCloseWorldViewGraph}
          onSelectNode={() => undefined}
        />
      )}

      {showDataViews && (
        <FeaturePanel id="view.entities" project={project} onSelectItem={onNavigateToItem} />
      )}

      {showDualTimeline && (
        <FeaturePanel
          id="timeline.dual"
          project={project}
          onUpdate={(updates: Partial<Project>) => onUpdate(updates)}
          onNavigateToChapter={onNavigateToChapter}
          onSelectEvent={(id: string) => onNavigateToItem('timeline', id)}
        />
      )}
    </>
  );
};
