import React from 'react';
import type { DiagramType, Project } from '../../../../shared/types';

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
                <i className="fas fa-map-marked-alt text-lg"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">地点管理</h4>
                <p className="text-xs text-gray-500">{project.locations?.length ? `已定义 ${project.locations.length} 个地点` : '定义小说中的地理场景'}</p>
              </div>
            </div>
            <i className={`fas fa-chevron-${showLocationEditor ? 'up' : 'down'} text-gray-400`}></i>
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
                <i className="fas fa-flag text-lg"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">势力管理</h4>
                <p className="text-xs text-gray-500">{project.factions?.length ? `已定义 ${project.factions.length} 个势力` : '定义小说中的派系与组织'}</p>
              </div>
            </div>
            <i className={`fas fa-chevron-${showFactionEditor ? 'up' : 'down'} text-gray-400`}></i>
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
                <i className="fas fa-clock text-lg"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">时间线</h4>
                <p className="text-xs text-gray-500">{project.timeline?.events?.length ? `已记录 ${project.timeline.events.length} 个事件` : '管理故事时间脉络'}</p>
              </div>
            </div>
            <i className={`fas fa-chevron-${showTimelineEditor ? 'up' : 'down'} text-gray-400`}></i>
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
                <i className="fas fa-scroll text-lg"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">规则系统</h4>
                <p className="text-xs text-gray-500">{project.ruleSystems?.length ? `已定义 ${project.ruleSystems.length} 套规则` : '设定世界运行法则'}</p>
              </div>
            </div>
            <i className={`fas fa-chevron-${showRuleSystemEditor ? 'up' : 'down'} text-gray-400`}></i>
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
              <i className="fas fa-project-diagram text-lg"></i>
            </div>
            <div>
              <h4 className="font-bold text-gray-800">世界观图谱</h4>
              <p className="text-xs text-gray-500">可视化关系网络</p>
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
                <i className="fas fa-stream text-lg"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">增强时间线</h4>
                <p className="text-xs text-gray-500">多维度时间轴视图</p>
              </div>
            </div>
            <i className={`fas fa-chevron-${showEnhancedTimeline ? 'up' : 'down'} text-gray-400`}></i>
          </div>
        </button>

        <button
          onClick={() => setShowConsistencyChecker(!showConsistencyChecker)}
          className={`p-4 rounded-xl border transition-all text-left ${showConsistencyChecker ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 hover:border-red-200'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100 text-red-600">
                <i className="fas fa-shield-alt text-lg"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">一致性检查</h4>
                <p className="text-xs text-gray-500">检测剧情与设定冲突</p>
              </div>
            </div>
            <i className={`fas fa-chevron-${showConsistencyChecker ? 'up' : 'down'} text-gray-400`}></i>
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
                <i className="fas fa-magic text-lg"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">智能推荐</h4>
                <p className="text-xs text-gray-500">基于当前内容推荐相关设定和建议</p>
              </div>
            </div>
            <i className={`fas fa-chevron-${showSmartRecommender ? 'up' : 'down'} text-gray-400`}></i>
          </div>
        </button>
      </div>
    </>
  );
};

export default KnowledgeFeaturePanels;

