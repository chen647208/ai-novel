/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { type WorldView, type MagicSystem, type TechnologyLevel, type WorldHistory, type HistoryEvent, type MagicLevel } from '../../../shared/types';

interface WorldViewEditorProps {
  projectId: string;
  worldView?: WorldView;
  onSave: (worldView: WorldView) => void;
}

/**
 * 世界观编辑器组件
 * 
 * 功能：
 * - 魔法体系设定（名称、描述、规则、等级）
 * - 科技水平设定（时代、技术、限制）
 * - 历史背景设定（历法、关键事件）
 * 
 * 设计原则：
 * - 所有字段均为可选
 * - 渐进式展示，不强制填写
 * - 保持与现有UI风格一致
 */
export const WorldViewEditor: React.FC<WorldViewEditorProps> = ({
  projectId,
  worldView,
  onSave
}) => {
  const { t } = useTranslation('world');
  // 本地编辑状态
  const [localWorldView, setLocalWorldView] = useState<Partial<WorldView>>({});
  const [activeTab, setActiveTab] = useState<'magic' | 'tech' | 'history'>('magic');
  const [hasChanges, setHasChanges] = useState(false);

  // 初始化本地状态
  useEffect(() => {
    if (worldView) {
      setLocalWorldView(worldView);
    } else {
      // 创建新的空世界观
      setLocalWorldView({
        id: `worldview_${Date.now()}`,
        projectId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  }, [worldView, projectId]);

  // 保存更改
  const handleSave = () => {
    const toSave: WorldView = {
      id: localWorldView.id || `worldview_${Date.now()}`,
      projectId,
      magicSystem: localWorldView.magicSystem,
      technologyLevel: localWorldView.technologyLevel,
      history: localWorldView.history,
      createdAt: localWorldView.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    onSave(toSave);
    setHasChanges(false);
  };

  // 更新魔法体系
  const updateMagicSystem = (updates: Partial<MagicSystem>) => {
    setLocalWorldView(prev => ({
      ...prev,
      magicSystem: {
        ...prev.magicSystem,
        ...updates
      } as MagicSystem
    }));
    setHasChanges(true);
  };

  // 添加魔法等级
  const addMagicLevel = () => {
    const currentLevels = localWorldView.magicSystem?.levels || [];
    const newLevel: MagicLevel = {
      name: '',
      description: '',
      order: currentLevels.length
    };
    updateMagicSystem({
      levels: [...currentLevels, newLevel]
    });
  };

  // 更新魔法等级
  const updateMagicLevel = (index: number, updates: Partial<MagicLevel>) => {
    const levels = localWorldView.magicSystem?.levels || [];
    const current = levels[index];
    if (!current) return;
    levels[index] = { ...current, ...updates };
    updateMagicSystem({ levels });
  };

  // 删除魔法等级
  const removeMagicLevel = (index: number) => {
    const levels = localWorldView.magicSystem?.levels?.filter((_, i) => i !== index) || [];
    // 重新排序
    levels.forEach((level, i) => level.order = i);
    updateMagicSystem({ levels });
  };

  // 更新科技水平
  const updateTechLevel = (updates: Partial<TechnologyLevel>) => {
    setLocalWorldView(prev => ({
      ...prev,
      technologyLevel: {
        ...prev.technologyLevel,
        ...updates
      } as TechnologyLevel
    }));
    setHasChanges(true);
  };

  // 更新历史背景
  const updateHistory = (updates: Partial<WorldHistory>) => {
    setLocalWorldView(prev => ({
      ...prev,
      history: {
        ...prev.history,
        ...updates
      } as WorldHistory
    }));
    setHasChanges(true);
  };

  // 添加历史事件
  const addHistoryEvent = () => {
    const currentEvents = localWorldView.history?.keyEvents || [];
    const newEvent: HistoryEvent = {
      id: `event_${Date.now()}`,
      date: { year: 0 },
      title: '',
      description: ''
    };
    updateHistory({
      keyEvents: [...currentEvents, newEvent]
    });
  };

  // 更新历史事件
  const updateHistoryEvent = (index: number, updates: Partial<HistoryEvent>) => {
    const events = localWorldView.history?.keyEvents || [];
    const current = events[index];
    if (!current) return;
    events[index] = { ...current, ...updates };
    updateHistory({ keyEvents: events });
  };

  // 删除历史事件
  const removeHistoryEvent = (index: number) => {
    const events = localWorldView.history?.keyEvents?.filter((_, i) => i !== index) || [];
    updateHistory({ keyEvents: events });
  };

  // ===== 渲染子组件 =====

  const renderMagicSystemEditor = () => (
    <div className="space-y-4">
      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
        <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
          <i className="fas fa-wand-magic-sparkles"></i>
          {t('worldview.magic.title')}
        </h4>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">{t('worldview.magic.nameLabel')}</label>
            <input
              type="text"
              value={localWorldView.magicSystem?.name || ''}
              onChange={(e) => updateMagicSystem({ name: e.target.value })}
              placeholder={t('worldview.magic.namePlaceholder')}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">{t('worldview.magic.descLabel')}</label>
            <textarea
              value={localWorldView.magicSystem?.description || ''}
              onChange={(e) => updateMagicSystem({ description: e.target.value })}
              placeholder={t('worldview.magic.descPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">{t('worldview.magic.castingLabel')}</label>
            <input
              type="text"
              value={localWorldView.magicSystem?.castingMethod || ''}
              onChange={(e) => updateMagicSystem({ castingMethod: e.target.value })}
              placeholder={t('worldview.magic.castingPlaceholder')}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">{t('worldview.magic.limitationsLabel')}</label>
            <textarea
              value={localWorldView.magicSystem?.limitations || ''}
              onChange={(e) => updateMagicSystem({ limitations: e.target.value })}
              placeholder={t('worldview.magic.limitationsPlaceholder')}
              rows={2}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none resize-none"
            />
          </div>

          {/* 规则列表 */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">{t('worldview.magic.rulesLabel')}</label>
            <div className="space-y-2">
              {localWorldView.magicSystem?.rules?.map((rule, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={rule}
                    onChange={(e) => {
                      const rules = [...(localWorldView.magicSystem?.rules || [])];
                      rules[index] = e.target.value;
                      updateMagicSystem({ rules });
                    }}
                    placeholder={t('worldview.magic.rulePlaceholder', { num: index + 1 })}
                    className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                  <button
                    onClick={() => {
                      const rules = localWorldView.magicSystem?.rules?.filter((_, i) => i !== index) || [];
                      updateMagicSystem({ rules });
                    }}
                    className="px-2 py-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const rules = [...(localWorldView.magicSystem?.rules || []), ''];
                  updateMagicSystem({ rules });
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
              >
                <i className="fas fa-plus"></i> {t('worldview.magic.addRule')}
              </button>
            </div>
          </div>

          {/* 等级体系 */}
          <div className="border-t border-blue-100 pt-3">
            <label className="block text-xs font-bold text-gray-600 mb-2">{t('worldview.magic.levelsLabel')}</label>
            <div className="space-y-2">
              {localWorldView.magicSystem?.levels?.map((level, index) => (
                <div key={index} className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500">{t('worldview.magic.levelNum', { num: index + 1 })}</span>
                    <button
                      onClick={() => removeMagicLevel(index)}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={level.name}
                    onChange={(e) => updateMagicLevel(index, { name: e.target.value })}
                    placeholder={t('worldview.magic.levelNamePlaceholder')}
                    className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                  <textarea
                    value={level.description}
                    onChange={(e) => updateMagicLevel(index, { description: e.target.value })}
                    placeholder={t('worldview.magic.levelDescPlaceholder')}
                    rows={2}
                    className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                  />
                </div>
              ))}
              <button
                onClick={addMagicLevel}
                className="w-full py-2 border-2 border-dashed border-blue-200 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors"
              >
                <i className="fas fa-plus mr-1"></i> {t('worldview.magic.addLevel')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTechLevelEditor = () => (
    <div className="space-y-4">
      <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
        <h4 className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2">
          <i className="fas fa-microchip"></i>
          {t('worldview.tech.title')}
        </h4>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">{t('worldview.tech.eraLabel')}</label>
            <input
              type="text"
              value={localWorldView.technologyLevel?.era || ''}
              onChange={(e) => updateTechLevel({ era: e.target.value })}
              placeholder={t('worldview.tech.eraPlaceholder')}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">{t('worldview.tech.descLabel')}</label>
            <textarea
              value={localWorldView.technologyLevel?.description || ''}
              onChange={(e) => updateTechLevel({ description: e.target.value })}
              placeholder={t('worldview.tech.descPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-200 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">{t('worldview.tech.energyLabel')}</label>
              <input
                type="text"
                value={localWorldView.technologyLevel?.energySource || ''}
                onChange={(e) => updateTechLevel({ energySource: e.target.value })}
                placeholder={t('worldview.tech.energyPlaceholder')}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">{t('worldview.tech.transportLabel')}</label>
              <input
                type="text"
                value={localWorldView.technologyLevel?.transportation || ''}
                onChange={(e) => updateTechLevel({ transportation: e.target.value })}
                placeholder={t('worldview.tech.transportPlaceholder')}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-200 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">{t('worldview.tech.commLabel')}</label>
            <input
              type="text"
              value={localWorldView.technologyLevel?.communication || ''}
              onChange={(e) => updateTechLevel({ communication: e.target.value })}
              placeholder={t('worldview.tech.commPlaceholder')}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">{t('worldview.tech.limitationsLabel')}</label>
            <textarea
              value={localWorldView.technologyLevel?.limitations || ''}
              onChange={(e) => updateTechLevel({ limitations: e.target.value })}
              placeholder={t('worldview.tech.limitationsPlaceholder')}
              rows={2}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-200 outline-none resize-none"
            />
          </div>

          {/* 关键技术列表 */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">{t('worldview.tech.techLabel')}</label>
            <div className="space-y-2">
              {localWorldView.technologyLevel?.keyTechnologies?.map((tech, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={tech}
                    onChange={(e) => {
                      const technologies = [...(localWorldView.technologyLevel?.keyTechnologies || [])];
                      technologies[index] = e.target.value;
                      updateTechLevel({ keyTechnologies: technologies });
                    }}
                    placeholder={t('worldview.tech.techPlaceholder', { num: index + 1 })}
                    className="flex-1 px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-200 outline-none"
                  />
                  <button
                    onClick={() => {
                      const technologies = localWorldView.technologyLevel?.keyTechnologies?.filter((_, i) => i !== index) || [];
                      updateTechLevel({ keyTechnologies: technologies });
                    }}
                    className="px-2 py-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const technologies = [...(localWorldView.technologyLevel?.keyTechnologies || []), ''];
                  updateTechLevel({ keyTechnologies: technologies });
                }}
                className="text-xs text-green-600 hover:text-green-700 font-bold flex items-center gap-1"
              >
                <i className="fas fa-plus"></i> {t('worldview.tech.addTech')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHistoryEditor = () => (
    <div className="space-y-4">
      <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
        <h4 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
          <i className="fas fa-landmark"></i>
          {t('worldview.history.title')}
        </h4>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">{t('worldview.history.overviewLabel')}</label>
            <textarea
              value={localWorldView.history?.overview || ''}
              onChange={(e) => updateHistory({ overview: e.target.value })}
              placeholder={t('worldview.history.overviewPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-200 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">{t('worldview.history.calendarLabel')}</label>
            <input
              type="text"
              value={localWorldView.history?.calendarSystem || ''}
              onChange={(e) => updateHistory({ calendarSystem: e.target.value })}
              placeholder={t('worldview.history.calendarPlaceholder')}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-200 outline-none"
            />
          </div>

          {/* 历史事件列表 */}
          <div className="border-t border-amber-100 pt-3">
            <label className="block text-xs font-bold text-gray-600 mb-2">{t('worldview.history.eventsLabel')}</label>
            <div className="space-y-3">
              {localWorldView.history?.keyEvents?.map((event, index) => (
                <div key={event.id} className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500">{t('worldview.history.eventNum', { num: index + 1 })}</span>
                    <button
                      onClick={() => removeHistoryEvent(index)}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={event.title || ''}
                      onChange={(e) => updateHistoryEvent(index, { title: e.target.value })}
                      placeholder={t('worldview.history.eventNamePlaceholder')}
                      className="px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-amber-200 outline-none"
                    />
                    <input
                      type="text"
                      value={event.date?.display || event.date?.year?.toString() || ''}
                      onChange={(e) => updateHistoryEvent(index, {
                        date: { year: event.date?.year ?? 0, display: e.target.value }
                      })}
                      placeholder={t('worldview.history.eventDatePlaceholder')}
                      className="px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-amber-200 outline-none"
                    />
                  </div>

                  <textarea
                    value={event.description || ''}
                    onChange={(e) => updateHistoryEvent(index, { description: e.target.value })}
                    placeholder={t('worldview.history.eventDescPlaceholder')}
                    rows={2}
                    className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-amber-200 outline-none resize-none"
                  />

                  <textarea
                    value={event.impact || ''}
                    onChange={(e) => updateHistoryEvent(index, { impact: e.target.value })}
                    placeholder={t('worldview.history.eventImpactPlaceholder')}
                    rows={2}
                    className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-amber-200 outline-none resize-none bg-amber-50/30"
                  />
                </div>
              ))}
              <button
                onClick={addHistoryEvent}
                className="w-full py-2 border-2 border-dashed border-amber-200 text-amber-600 rounded-lg text-sm font-bold hover:bg-amber-50 transition-colors"
              >
                <i className="fas fa-plus mr-1"></i> {t('worldview.history.addEvent')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 标签页切换 */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('magic')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'magic'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <i className="fas fa-wand-magic-sparkles"></i>
          {t('worldview.tabMagic')}
        </button>
        <button
          onClick={() => setActiveTab('tech')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'tech'
              ? 'bg-green-100 text-green-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <i className="fas fa-microchip"></i>
          {t('worldview.tabTech')}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-amber-100 text-amber-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <i className="fas fa-landmark"></i>
          {t('worldview.tabHistory')}
        </button>
      </div>

      {/* 内容区域 */}
      <div className="min-h-[300px]">
        {activeTab === 'magic' && renderMagicSystemEditor()}
        {activeTab === 'tech' && renderTechLevelEditor()}
        {activeTab === 'history' && renderHistoryEditor()}
      </div>

      {/* 保存按钮 */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <i className="fas fa-save"></i>
            {t('worldview.save')}
          </button>
        </div>
      )}
    </div>
  );
};

export default WorldViewEditor;



