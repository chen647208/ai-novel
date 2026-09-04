/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React from 'react';
import { useTranslation } from '@/i18n';
import type { DiagramType, Project } from '../../../../shared/types';
import { ChevronDown, ChevronUp, Clock, Flag, LayoutList, MapPinned, Network, ScrollText, Shield, WandSparkles } from 'lucide-react';


interface KnowledgeFeaturePanelsProps {
  project: Project;
  showLocationEditor: boolean;
  setShowLocationEditor: React.Dispatch<React.SetStateAction<boolean>>;
  showFactionEditor: boolean;
  setShowFactionEditor: React.Dispatch<React.SetStateAction<boolean>>;
  showTimelineEditor: boolean;
  setShowTimelineEditor: React.Dispatch<React.SetStateAction<boolean>>;
  showRuleSystemEditor: boolean;
  setShowRuleSystemEditor: React.Dispatch<React.SetStateAction<boolean>>;
  showEnhancedTimeline: boolean;
  setShowEnhancedTimeline: React.Dispatch<React.SetStateAction<boolean>>;
  showConsistencyChecker: boolean;
  setShowConsistencyChecker: React.Dispatch<React.SetStateAction<boolean>>;
  showSmartRecommender: boolean;
  setShowSmartRecommender: React.Dispatch<React.SetStateAction<boolean>>;
  setShowWorldViewGraph: React.Dispatch<React.SetStateAction<boolean>>;
  setGraphInitialType: React.Dispatch<React.SetStateAction<DiagramType>>;
}

const KnowledgeFeaturePanels: React.FC<KnowledgeFeaturePanelsProps> = ({
  project,
  showLocationEditor,
  setShowLocationEditor,
  showFactionEditor,
  setShowFactionEditor,
  showTimelineEditor,
  setShowTimelineEditor,
  showRuleSystemEditor,
  setShowRuleSystemEditor,
  showEnhancedTimeline,
  setShowEnhancedTimeline,
  showConsistencyChecker,
  setShowConsistencyChecker,
  showSmartRecommender,
  setShowSmartRecommender,
  setShowWorldViewGraph,
  setGraphInitialType,
}) => {
  const { t } = useTranslation('knowledge');
  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={() => {
            setShowLocationEditor(!showLocationEditor);
            setShowFactionEditor(false);
            setShowTimelineEditor(false);
          }}
          className={`flex-1 p-4 rounded-xl border transition-all text-left ${showLocationEditor ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200 hover:border-emerald-200'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${project.locations?.length ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                <MapPinned className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">{t('panel.locationTitle')}</h4>
                <p className="text-xs text-gray-500">{project.locations?.length ? t('panel.locationDefined', { count: project.locations.length }) : t('panel.locationHint')}</p>
              </div>
            </div>
            {showLocationEditor ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
          </div>
        </button>

        <button
          onClick={() => {
            setShowFactionEditor(!showFactionEditor);
            setShowLocationEditor(false);
            setShowTimelineEditor(false);
          }}
          className={`flex-1 p-4 rounded-xl border transition-all text-left ${showFactionEditor ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200 hover:border-amber-200'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${project.factions?.length ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                <Flag className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">{t('panel.factionTitle')}</h4>
                <p className="text-xs text-gray-500">{project.factions?.length ? t('panel.factionDefined', { count: project.factions.length }) : t('panel.factionHint')}</p>
              </div>
            </div>
            {showFactionEditor ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
          </div>
        </button>

        <button
          onClick={() => {
            setShowTimelineEditor(!showTimelineEditor);
            setShowLocationEditor(false);
            setShowFactionEditor(false);
            setShowRuleSystemEditor(false);
          }}
          className={`flex-1 p-4 rounded-xl border transition-all text-left ${showTimelineEditor ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:border-indigo-200'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${project.timeline?.events?.length ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                <Clock className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">{t('panel.timelineTitle')}</h4>
                <p className="text-xs text-gray-500">{project.timeline?.events?.length ? t('panel.timelineDefined', { count: project.timeline.events.length }) : t('panel.timelineHint')}</p>
              </div>
            </div>
            {showTimelineEditor ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
          </div>
        </button>

        <button
          onClick={() => {
            setShowRuleSystemEditor(!showRuleSystemEditor);
            setShowLocationEditor(false);
            setShowFactionEditor(false);
            setShowTimelineEditor(false);
          }}
          className={`flex-1 p-4 rounded-xl border transition-all text-left ${showRuleSystemEditor ? 'bg-rose-50 border-rose-200' : 'bg-white border-gray-200 hover:border-rose-200'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${project.ruleSystems?.length ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500'}`}>
                <ScrollText className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">{t('panel.ruleTitle')}</h4>
                <p className="text-xs text-gray-500">{project.ruleSystems?.length ? t('panel.ruleDefined', { count: project.ruleSystems.length }) : t('panel.ruleHint')}</p>
              </div>
            </div>
            {showRuleSystemEditor ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
          </div>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => {
            setGraphInitialType('mixed');
            setShowWorldViewGraph(true);
          }}
          className="p-4 rounded-xl border border-gray-200 hover:border-cyan-200 hover:bg-cyan-50/50 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${(project.characters?.length || project.factions?.length || project.locations?.length) ? 'bg-cyan-100 text-cyan-600' : 'bg-gray-100 text-gray-500'}`}>
              <Network className="size-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">{t('panel.graphTitle')}</h4>
              <p className="text-xs text-gray-500">{t('panel.graphHint')}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowEnhancedTimeline(!showEnhancedTimeline)}
          className={`p-4 rounded-xl border transition-all text-left ${showEnhancedTimeline ? 'bg-violet-50 border-violet-200' : 'bg-white border-gray-200 hover:border-violet-200'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-100 text-violet-600">
                <LayoutList className="size-5" />
              </div>
              <div>
              <h4 className="font-bold text-gray-800">{t('panel.enhancedTimelineTitle')}</h4>
              <p className="text-xs text-gray-500">{t('panel.enhancedTimelineHint')}</p>
              </div>
            </div>
            {showEnhancedTimeline ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
          </div>
        </button>

        <button
          onClick={() => setShowConsistencyChecker(!showConsistencyChecker)}
          className={`p-4 rounded-xl border transition-all text-left ${showConsistencyChecker ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 hover:border-red-200'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100 text-red-600">
                <Shield className="size-5" />
              </div>
              <div>
              <h4 className="font-bold text-gray-800">{t('panel.consistencyTitle')}</h4>
              <p className="text-xs text-gray-500">{t('panel.consistencyHint')}</p>
              </div>
            </div>
            {showConsistencyChecker ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => setShowSmartRecommender(!showSmartRecommender)}
          className={`p-4 rounded-xl border transition-all text-left ${showSmartRecommender ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-200 hover:border-purple-200'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-100 text-purple-600">
                <WandSparkles className="size-5" />
              </div>
              <div>
              <h4 className="font-bold text-gray-800">{t('panel.recommenderTitle')}</h4>
              <p className="text-xs text-gray-500">{t('panel.recommenderHint')}</p>
              </div>
            </div>
            {showSmartRecommender ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
          </div>
        </button>
      </div>
    </>
  );
};

export default KnowledgeFeaturePanels;

