/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { type WorldView, type MagicSystem, type TechnologyLevel, type WorldHistory, type HistoryEvent, type MagicLevel } from '../../../shared/types';
import { cn } from '@/shared/utils/cn';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Textarea } from '@/shared/ui/Textarea';
import { Cpu, Landmark, Plus, Save, Trash2, WandSparkles, X } from 'lucide-react';

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
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <WandSparkles className="size-4 text-muted-foreground" />
          {t('worldview.magic.title')}
        </h4>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('worldview.magic.nameLabel')}</Label>
            <Input
              type="text"
              value={localWorldView.magicSystem?.name || ''}
              onChange={(e) => updateMagicSystem({ name: e.target.value })}
              placeholder={t('worldview.magic.namePlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('worldview.magic.descLabel')}</Label>
            <Textarea
              value={localWorldView.magicSystem?.description || ''}
              onChange={(e) => updateMagicSystem({ description: e.target.value })}
              placeholder={t('worldview.magic.descPlaceholder')}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('worldview.magic.castingLabel')}</Label>
            <Input
              type="text"
              value={localWorldView.magicSystem?.castingMethod || ''}
              onChange={(e) => updateMagicSystem({ castingMethod: e.target.value })}
              placeholder={t('worldview.magic.castingPlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('worldview.magic.limitationsLabel')}</Label>
            <Textarea
              value={localWorldView.magicSystem?.limitations || ''}
              onChange={(e) => updateMagicSystem({ limitations: e.target.value })}
              placeholder={t('worldview.magic.limitationsPlaceholder')}
              rows={2}
            />
          </div>

          {/* 规则列表 */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('worldview.magic.rulesLabel')}</Label>
            <div className="space-y-2">
              {localWorldView.magicSystem?.rules?.map((rule, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="text"
                    value={rule}
                    onChange={(e) => {
                      const rules = [...(localWorldView.magicSystem?.rules || [])];
                      rules[index] = e.target.value;
                      updateMagicSystem({ rules });
                    }}
                    placeholder={t('worldview.magic.rulePlaceholder', { num: index + 1 })}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      const rules = localWorldView.magicSystem?.rules?.filter((_, i) => i !== index) || [];
                      updateMagicSystem({ rules });
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary"
                onClick={() => {
                  const rules = [...(localWorldView.magicSystem?.rules || []), ''];
                  updateMagicSystem({ rules });
                }}
              >
                <Plus className="size-4" /> {t('worldview.magic.addRule')}
              </Button>
            </div>
          </div>

          {/* 等级体系 */}
          <div className="space-y-1.5 border-t border-border pt-3">
            <Label className="text-xs text-muted-foreground">{t('worldview.magic.levelsLabel')}</Label>
            <div className="space-y-2">
              {localWorldView.magicSystem?.levels?.map((level, index) => (
                <div key={index} className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{t('worldview.magic.levelNum', { num: index + 1 })}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeMagicLevel(index)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <Input
                    type="text"
                    value={level.name}
                    onChange={(e) => updateMagicLevel(index, { name: e.target.value })}
                    placeholder={t('worldview.magic.levelNamePlaceholder')}
                    className="h-8 text-sm"
                  />
                  <Textarea
                    value={level.description}
                    onChange={(e) => updateMagicLevel(index, { description: e.target.value })}
                    placeholder={t('worldview.magic.levelDescPlaceholder')}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                block
                onClick={addMagicLevel}
                className="border-dashed py-2 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                <Plus className="mr-1 inline size-4" /> {t('worldview.magic.addLevel')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTechLevelEditor = () => (
    <div className="space-y-4">
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Cpu className="size-4 text-muted-foreground" />
          {t('worldview.tech.title')}
        </h4>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('worldview.tech.eraLabel')}</Label>
            <Input
              type="text"
              value={localWorldView.technologyLevel?.era || ''}
              onChange={(e) => updateTechLevel({ era: e.target.value })}
              placeholder={t('worldview.tech.eraPlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('worldview.tech.descLabel')}</Label>
            <Textarea
              value={localWorldView.technologyLevel?.description || ''}
              onChange={(e) => updateTechLevel({ description: e.target.value })}
              placeholder={t('worldview.tech.descPlaceholder')}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('worldview.tech.energyLabel')}</Label>
              <Input
                type="text"
                value={localWorldView.technologyLevel?.energySource || ''}
                onChange={(e) => updateTechLevel({ energySource: e.target.value })}
                placeholder={t('worldview.tech.energyPlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('worldview.tech.transportLabel')}</Label>
              <Input
                type="text"
                value={localWorldView.technologyLevel?.transportation || ''}
                onChange={(e) => updateTechLevel({ transportation: e.target.value })}
                placeholder={t('worldview.tech.transportPlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('worldview.tech.commLabel')}</Label>
            <Input
              type="text"
              value={localWorldView.technologyLevel?.communication || ''}
              onChange={(e) => updateTechLevel({ communication: e.target.value })}
              placeholder={t('worldview.tech.commPlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('worldview.tech.limitationsLabel')}</Label>
            <Textarea
              value={localWorldView.technologyLevel?.limitations || ''}
              onChange={(e) => updateTechLevel({ limitations: e.target.value })}
              placeholder={t('worldview.tech.limitationsPlaceholder')}
              rows={2}
            />
          </div>

          {/* 关键技术列表 */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('worldview.tech.techLabel')}</Label>
            <div className="space-y-2">
              {localWorldView.technologyLevel?.keyTechnologies?.map((tech, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="text"
                    value={tech}
                    onChange={(e) => {
                      const technologies = [...(localWorldView.technologyLevel?.keyTechnologies || [])];
                      technologies[index] = e.target.value;
                      updateTechLevel({ keyTechnologies: technologies });
                    }}
                    placeholder={t('worldview.tech.techPlaceholder', { num: index + 1 })}
                    className="h-8 flex-1 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      const technologies = localWorldView.technologyLevel?.keyTechnologies?.filter((_, i) => i !== index) || [];
                      updateTechLevel({ keyTechnologies: technologies });
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary"
                onClick={() => {
                  const technologies = [...(localWorldView.technologyLevel?.keyTechnologies || []), ''];
                  updateTechLevel({ keyTechnologies: technologies });
                }}
              >
                <Plus className="size-4" /> {t('worldview.tech.addTech')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHistoryEditor = () => (
    <div className="space-y-4">
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Landmark className="size-4 text-muted-foreground" />
          {t('worldview.history.title')}
        </h4>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('worldview.history.overviewLabel')}</Label>
            <Textarea
              value={localWorldView.history?.overview || ''}
              onChange={(e) => updateHistory({ overview: e.target.value })}
              placeholder={t('worldview.history.overviewPlaceholder')}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('worldview.history.calendarLabel')}</Label>
            <Input
              type="text"
              value={localWorldView.history?.calendarSystem || ''}
              onChange={(e) => updateHistory({ calendarSystem: e.target.value })}
              placeholder={t('worldview.history.calendarPlaceholder')}
            />
          </div>

          {/* 历史事件列表 */}
          <div className="space-y-1.5 border-t border-border pt-3">
            <Label className="text-xs text-muted-foreground">{t('worldview.history.eventsLabel')}</Label>
            <div className="space-y-3">
              {localWorldView.history?.keyEvents?.map((event, index) => (
                <div key={event.id} className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{t('worldview.history.eventNum', { num: index + 1 })}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeHistoryEvent(index)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="text"
                      value={event.title || ''}
                      onChange={(e) => updateHistoryEvent(index, { title: e.target.value })}
                      placeholder={t('worldview.history.eventNamePlaceholder')}
                      className="h-8 text-sm"
                    />
                    <Input
                      type="text"
                      value={event.date?.display || event.date?.year?.toString() || ''}
                      onChange={(e) => updateHistoryEvent(index, {
                        date: { year: event.date?.year ?? 0, display: e.target.value }
                      })}
                      placeholder={t('worldview.history.eventDatePlaceholder')}
                      className="h-8 text-sm"
                    />
                  </div>

                  <Textarea
                    value={event.description || ''}
                    onChange={(e) => updateHistoryEvent(index, { description: e.target.value })}
                    placeholder={t('worldview.history.eventDescPlaceholder')}
                    rows={2}
                    className="text-sm"
                  />

                  <Textarea
                    value={event.impact || ''}
                    onChange={(e) => updateHistoryEvent(index, { impact: e.target.value })}
                    placeholder={t('worldview.history.eventImpactPlaceholder')}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                block
                onClick={addHistoryEvent}
                className="border-dashed py-2 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                <Plus className="mr-1 inline size-4" /> {t('worldview.history.addEvent')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'magic' as const, icon: WandSparkles, label: t('worldview.tabMagic') },
    { id: 'tech' as const, icon: Cpu, label: t('worldview.tabTech') },
    { id: 'history' as const, icon: Landmark, label: t('worldview.tabHistory') },
  ];

  return (
    <div className="space-y-4">
      {/* 标签页切换 */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              '-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              activeTab === id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="min-h-[300px]">
        {activeTab === 'magic' && renderMagicSystemEditor()}
        {activeTab === 'tech' && renderTechLevelEditor()}
        {activeTab === 'history' && renderHistoryEditor()}
      </div>

      {/* 保存按钮 */}
      {hasChanges && (
        <div className="flex justify-end border-t border-border pt-4">
          <Button onClick={handleSave} size="sm">
            <Save className="size-4" />
            {t('worldview.save')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default WorldViewEditor;
