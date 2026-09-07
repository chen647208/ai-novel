/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React, { useState } from 'react';
import { useTranslation } from '@/i18n';
import { type Character, type Project } from '../../../shared/types';
import { normalizeGenderId, normalizeRoleId } from './characterKinds';
import { Button } from '@/shared/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/shared/ui/Dialog';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { Brain, Calculator, CalendarDays, Check, ChevronDown, ChevronRight, ChevronUp, Eye, Flag, Globe2, Home, IdCard, Layers, LineChart, MapPin, ScrollText, Share2, Shield, UserRound } from 'lucide-react';

interface CharacterModalProps {
  character: Character;
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<Character>) => void;
}

/** 分区标题：图标 + 大写小标签，中性色。 */
function SectionTitle({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      <Icon className="size-3.5" />
      {children}
    </h3>
  );
}

const CharacterModal: React.FC<CharacterModalProps> = ({ character, project, isOpen, onClose, onUpdate }) => {
  const { t } = useTranslation('characters');

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="flex h-[92dvh] w-[94vw] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">{character.name || t('modal.nameLabel')}</DialogTitle>
        {/* 头部：姓名与基础属性 */}
        <div className="shrink-0 border-b border-border px-6 py-4">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <UserRound className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-3">
                <Label className="mb-1 text-xs text-muted-foreground">{t('modal.nameLabel')}</Label>
                <Input
                  className="font-serif text-base"
                  value={character.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder={t('modal.namePlaceholder')}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label className="mb-1 text-xs text-muted-foreground">{t('modal.roleLabel')}</Label>
                  <Select
                    value={character.role}
                    onChange={(e) => onUpdate({ role: normalizeRoleId(e.target.value) })}
                  >
                    {/* value 存枚举 id，仅展示文案走 i18n */}
                    <option value="protagonist">{t('modal.roleOptions.protagonist')}</option>
                    <option value="antagonist">{t('modal.roleOptions.antagonist')}</option>
                    <option value="supporting">{t('modal.roleOptions.supporting')}</option>
                    <option value="other">{t('modal.roleOptions.other')}</option>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 text-xs text-muted-foreground">{t('modal.genderLabel')}</Label>
                  <Select
                    value={character.gender}
                    onChange={(e) => onUpdate({ gender: normalizeGenderId(e.target.value) })}
                  >
                    <option value="male">{t('modal.genderOptions.male')}</option>
                    <option value="female">{t('modal.genderOptions.female')}</option>
                    <option value="other">{t('modal.genderOptions.other')}</option>
                    <option value="unknown">{t('modal.genderOptions.unknown')}</option>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 text-xs text-muted-foreground">{t('modal.ageLabel')}</Label>
                  <Input
                    value={character.age}
                    onChange={(e) => onUpdate({ age: e.target.value })}
                    placeholder={t('modal.agePlaceholder')}
                  />
                </div>
              </div>

              {/* Phase 3: 出生信息（可选） */}
              <BirthInfoEditor character={character} onUpdate={onUpdate} />
            </div>
          </div>
        </div>

        {/* 内容：双列分区 */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">

            {/* 左侧列：基本信息和外观 */}
            <div className="space-y-8">
              <section>
                <SectionTitle icon={IdCard}>{t('modal.basic.title')}</SectionTitle>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-1 text-xs text-muted-foreground">{t('modal.basic.occupation')}</Label>
                    <Input
                      value={character.occupation || ''}
                      onChange={(e) => onUpdate({ occupation: e.target.value })}
                      placeholder={t('modal.basic.occupationPlaceholder')}
                    />
                  </div>
                  <div>
                    <Label className="mb-1 text-xs text-muted-foreground">{t('modal.basic.motivation')}</Label>
                    <Textarea
                      className="min-h-24 resize-none"
                      value={character.motivation || ''}
                      onChange={(e) => onUpdate({ motivation: e.target.value })}
                      placeholder={t('modal.basic.motivationPlaceholder')}
                    />
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle icon={Eye}>{t('modal.appearance.title')}</SectionTitle>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-1 text-xs text-muted-foreground">{t('modal.appearance.description')}</Label>
                    <Textarea
                      className="min-h-32 resize-none"
                      value={character.appearance || ''}
                      onChange={(e) => onUpdate({ appearance: e.target.value })}
                      placeholder={t('modal.appearance.descriptionPlaceholder')}
                    />
                  </div>
                  <div>
                    <Label className="mb-1 text-xs text-muted-foreground">{t('modal.appearance.features')}</Label>
                    <Textarea
                      className="min-h-20 resize-none"
                      value={character.distinctiveFeatures || ''}
                      onChange={(e) => onUpdate({ distinctiveFeatures: e.target.value })}
                      placeholder={t('modal.appearance.featuresPlaceholder')}
                    />
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle icon={Brain}>{t('modal.personality.title')}</SectionTitle>
                <Textarea
                  className="min-h-40 resize-none"
                  value={character.personality || ''}
                  onChange={(e) => onUpdate({ personality: e.target.value })}
                  placeholder={t('modal.personality.placeholder')}
                />
              </section>
            </div>

            {/* 右侧列：背景和能力 */}
            <div className="space-y-8">
              <section>
                <SectionTitle icon={ScrollText}>{t('modal.background.title')}</SectionTitle>
                <Textarea
                  className="min-h-40 resize-none"
                  value={character.background || ''}
                  onChange={(e) => onUpdate({ background: e.target.value })}
                  placeholder={t('modal.background.placeholder')}
                />
              </section>

              <section>
                <SectionTitle icon={Shield}>{t('modal.abilities.title')}</SectionTitle>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-1 text-xs text-muted-foreground">{t('modal.abilities.strengths')}</Label>
                    <Textarea
                      className="min-h-24 resize-none"
                      value={character.strengths || ''}
                      onChange={(e) => onUpdate({ strengths: e.target.value })}
                      placeholder={t('modal.abilities.strengthsPlaceholder')}
                    />
                  </div>
                  <div>
                    <Label className="mb-1 text-xs text-muted-foreground">{t('modal.abilities.weaknesses')}</Label>
                    <Textarea
                      className="min-h-24 resize-none"
                      value={character.weaknesses || ''}
                      onChange={(e) => onUpdate({ weaknesses: e.target.value })}
                      placeholder={t('modal.abilities.weaknessesPlaceholder')}
                    />
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle icon={Share2}>{t('modal.relations.title')}</SectionTitle>
                <Textarea
                  className="min-h-32 resize-none"
                  value={character.relationships || ''}
                  onChange={(e) => onUpdate({ relationships: e.target.value })}
                  placeholder={t('modal.relations.placeholder')}
                />
              </section>

              <section>
                <SectionTitle icon={LineChart}>{t('modal.arc.title')}</SectionTitle>
                <Textarea
                  className="min-h-32 resize-none"
                  value={character.characterArc || ''}
                  onChange={(e) => onUpdate({ characterArc: e.target.value })}
                  placeholder={t('modal.arc.placeholder')}
                />
              </section>

              {/* 世界关联信息 */}
              <WorldRelationEditor
                character={character}
                project={project}
                onUpdate={onUpdate}
              />
            </div>
          </div>
        </div>

        {/* 底部 */}
        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button onClick={onClose}>
            <Check className="size-4" />
            {t('modal.saveAndClose')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * 出生信息编辑器（Phase 3）
 */
interface BirthInfoEditorProps {
  character: Character;
  onUpdate: (updates: Partial<Character>) => void;
}

const BirthInfoEditor: React.FC<BirthInfoEditorProps> = ({ character, onUpdate }) => {
  const { t } = useTranslation('characters');
  const [isExpanded, setIsExpanded] = useState(false);

  const birthInfo = character.birthInfo || {
    calculationType: 'manual' as const
  };

  const updateBirthInfo = (updates: Partial<Character['birthInfo']>) => {
    onUpdate({
      birthInfo: { ...birthInfo, ...updates } as Character['birthInfo']
    });
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <span>{t('birth.title')}</span>
        {birthInfo.date && <span className="text-foreground">{t('birth.set')}</span>}
      </button>

      {isExpanded && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1 text-xs text-muted-foreground">{t('birth.calcType')}</Label>
            <Select
              value={birthInfo.calculationType}
              onChange={(e) => updateBirthInfo({ calculationType: e.target.value as 'manual' | 'auto' })}
              className="h-8 text-xs"
            >
              <option value="manual">{t('birth.manual')}</option>
              <option value="auto">{t('birth.auto')}</option>
            </Select>
          </div>

          {birthInfo.calculationType === 'manual' ? (
            <div>
              <Label className="mb-1 text-xs text-muted-foreground">{t('birth.currentAge')}</Label>
              <Input
                type="text"
                className="h-8 text-xs"
                value={birthInfo.currentAge || character.age || ''}
                onChange={(e) => updateBirthInfo({ currentAge: e.target.value })}
                placeholder={t('modal.agePlaceholder')}
              />
            </div>
          ) : (
            <div>
              <Label className="mb-1 text-xs text-muted-foreground">{t('birth.storyTime')}</Label>
              <Input
                type="text"
                className="h-8 text-xs"
                value={birthInfo.storyCurrentDate?.display || birthInfo.storyCurrentDate?.year?.toString() || ''}
                onChange={(e) => updateBirthInfo({
                  storyCurrentDate: { year: parseInt(e.target.value) || 0, display: e.target.value }
                })}
                placeholder={t('birth.storyTimePlaceholder')}
              />
            </div>
          )}

          {/* 出生日期 */}
          <div className="col-span-2 rounded-md border border-border bg-muted/40 p-3">
            <Label className="mb-2 block text-xs font-medium">{t('birth.date')}</Label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="mb-1 block text-2xs text-muted-foreground">{t('birth.year')}</Label>
                <Input
                  type="number"
                  className="h-7 text-xs"
                  value={birthInfo.date?.year || ''}
                  onChange={(e) => updateBirthInfo({
                    date: { ...birthInfo.date, year: parseInt(e.target.value) || 0 }
                  })}
                />
              </div>
              <div>
                <Label className="mb-1 block text-2xs text-muted-foreground">{t('birth.month')}</Label>
                <Input
                  type="number"
                  className="h-7 text-xs"
                  value={birthInfo.date?.month || ''}
                  onChange={(e) => updateBirthInfo({
                    date: { ...birthInfo.date, year: birthInfo.date?.year ?? 0, month: e.target.value ? parseInt(e.target.value) : undefined }
                  })}
                />
              </div>
              <div>
                <Label className="mb-1 block text-2xs text-muted-foreground">{t('birth.day')}</Label>
                <Input
                  type="number"
                  className="h-7 text-xs"
                  value={birthInfo.date?.day || ''}
                  onChange={(e) => updateBirthInfo({
                    date: { ...birthInfo.date, year: birthInfo.date?.year ?? 0, day: e.target.value ? parseInt(e.target.value) : undefined }
                  })}
                />
              </div>
              <div>
                <Label className="mb-1 block text-2xs text-muted-foreground">{t('birth.display')}</Label>
                <Input
                  type="text"
                  className="h-7 text-xs"
                  value={birthInfo.date?.display || ''}
                  onChange={(e) => updateBirthInfo({
                    date: { ...birthInfo.date, year: birthInfo.date?.year ?? 0, display: e.target.value }
                  })}
                  placeholder={t('birth.displayPlaceholder')}
                />
              </div>
            </div>

            {/* 年龄预览（自动计算模式下） */}
            {birthInfo.calculationType === 'auto' && birthInfo.date?.year !== undefined && birthInfo.storyCurrentDate?.year !== undefined && (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Calculator className="size-3.5" />
                {t('birth.calculatedAge', { age: birthInfo.storyCurrentDate.year - birthInfo.date.year })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 世界关联信息编辑器（Phase 1 Integration）
 * 用于编辑角色与世界观数据的关联
 */
interface WorldRelationEditorProps {
  character: Character;
  project: Project;
  onUpdate: (updates: Partial<Character>) => void;
}

const WorldRelationEditor: React.FC<WorldRelationEditorProps> = ({ character, project, onUpdate }) => {
  const { t } = useTranslation('characters');
  const [isExpanded, setIsExpanded] = useState(false);

  const factions = project.factions || [];
  const locations = project.locations || [];
  const ruleSystems = project.ruleSystems || [];
  const timeline = project.timeline;

  // 获取角色当前所属的势力
  const currentFaction = factions.find(f => f.id === character.factionId);

  // 获取角色出身地点
  const homeLocation = locations.find(l => l.id === character.homeLocationId);

  // 获取角色当前地点
  const currentLocation = locations.find(l => l.id === character.currentLocationId);

  // 获取角色当前的规则系统
  const currentRuleSystem = ruleSystems.find(r => r.id === character.ruleSystemLevel?.systemId);

  // 获取当前等级
  const currentLevel = currentRuleSystem?.levels.find(
    l => l.name === character.ruleSystemLevel?.levelName
  );

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Globe2 className="size-4 text-muted-foreground" />
          <div className="text-left">
            <h3 className="text-sm font-medium">{t('world.title')}</h3>
            <p className="text-xs text-muted-foreground">
              {currentFaction || homeLocation || currentLocation
                ? t('world.linked', { names: [currentFaction?.name, homeLocation?.name].filter(Boolean).join(', ') })
                : t('world.hint')}
            </p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* 所属势力 */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Flag className="size-3.5" />
              {t('world.faction')}
            </Label>
            <Select
              value={character.factionId || ''}
              onChange={(e) => onUpdate({ factionId: e.target.value || undefined })}
              className="h-8 text-xs"
            >
              <option value="">{t('world.none')}</option>
              {factions.map(faction => (
                <option key={faction.id} value={faction.id}>
                  {faction.name} ({faction.type})
                </option>
              ))}
            </Select>
            {currentFaction && (
              <div className="rounded border border-border bg-card p-2 text-xs">
                <div className="font-medium">{currentFaction.name}</div>
                <div className="truncate text-muted-foreground">{currentFaction.description?.substring(0, 50)}...</div>
              </div>
            )}
          </div>

          {/* 出身地点 */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Home className="size-3.5" />
              {t('world.homeLocation')}
            </Label>
            <Select
              value={character.homeLocationId || ''}
              onChange={(e) => onUpdate({ homeLocationId: e.target.value || undefined })}
              className="h-8 text-xs"
            >
              <option value="">{t('world.none')}</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.type})
                </option>
              ))}
            </Select>
            {homeLocation && (
              <div className="rounded border border-border bg-card p-2 text-xs">
                <div className="font-medium">{homeLocation.name}</div>
                <div className="text-muted-foreground">{homeLocation.type}</div>
              </div>
            )}
          </div>

          {/* 当前地点 */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              {t('world.currentLocation')}
            </Label>
            <Select
              value={character.currentLocationId || ''}
              onChange={(e) => onUpdate({ currentLocationId: e.target.value || undefined })}
              className="h-8 text-xs"
            >
              <option value="">{t('world.none')}</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.type})
                </option>
              ))}
            </Select>
            {currentLocation && (
              <div className="rounded border border-border bg-card p-2 text-xs">
                <div className="font-medium">{currentLocation.name}</div>
                <div className="text-muted-foreground">{currentLocation.type}</div>
              </div>
            )}
          </div>

          {/* 等级体系 */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="size-3.5" />
              {t('world.ruleSystem')}
            </Label>
            <div className="space-y-2">
              <Select
                value={character.ruleSystemLevel?.systemId || ''}
                onChange={(e) => {
                  const systemId = e.target.value || undefined;
                  onUpdate({
                    ruleSystemLevel: systemId ? {
                      systemId,
                      levelName: ''
                    } : undefined
                  });
                }}
                className="h-8 text-xs"
              >
                <option value="">{t('world.none')}</option>
                {ruleSystems.map(system => (
                  <option key={system.id} value={system.id}>
                    {system.name}
                  </option>
                ))}
              </Select>

              {character.ruleSystemLevel?.systemId && currentRuleSystem && (
                <Select
                  value={character.ruleSystemLevel.levelName || ''}
                  onChange={(e) => onUpdate({
                    ruleSystemLevel: {
                      systemId: currentRuleSystem.id,
                      levelName: e.target.value
                    }
                  })}
                  className="h-8 text-xs"
                >
                  <option value="">{t('world.selectLevel')}</option>
                  {currentRuleSystem.levels.map(level => (
                    <option key={level.order} value={level.name}>
                      {level.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            {currentLevel && (
              <div className="rounded border border-border bg-card p-2 text-xs">
                <div className="font-medium">{currentLevel.name}</div>
                <div className="truncate text-muted-foreground">{currentLevel.description?.substring(0, 40)}...</div>
              </div>
            )}
          </div>

          {/* 出生日期 - 如果有时间线 */}
          {timeline && (
            <div className="col-span-1 border-t border-border pt-3 md:col-span-2 lg:col-span-4">
              <Label className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5" />
                {t('birth.dateWithCalendar', { calendar: timeline.config.calendarSystem })}
              </Label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="mb-1 block text-2xs text-muted-foreground">{t('birth.year')}</Label>
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    value={character.birthDate?.year || ''}
                    onChange={(e) => onUpdate({
                      birthDate: {
                        ...character.birthDate,
                        year: parseInt(e.target.value) || 0
                      }
                    })}
                    placeholder={timeline.config.startYear?.toString() || '0'}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-2xs text-muted-foreground">{t('birth.month')}</Label>
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    value={character.birthDate?.month || ''}
                    onChange={(e) => onUpdate({
                      birthDate: {
                        ...character.birthDate,
                        year: character.birthDate?.year ?? timeline.config.startYear ?? 0,
                        month: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })}
                    placeholder="1-12"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-2xs text-muted-foreground">{t('birth.day')}</Label>
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    value={character.birthDate?.day || ''}
                    onChange={(e) => onUpdate({
                      birthDate: {
                        ...character.birthDate,
                        year: character.birthDate?.year ?? timeline.config.startYear ?? 0,
                        day: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })}
                    placeholder="1-31"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-2xs text-muted-foreground">{t('birth.display')}</Label>
                  <Input
                    type="text"
                    className="h-7 text-xs"
                    value={character.birthDate?.display || ''}
                    onChange={(e) => onUpdate({
                      birthDate: {
                        ...character.birthDate,
                        year: character.birthDate?.year ?? timeline.config.startYear ?? 0,
                        display: e.target.value
                      }
                    })}
                    placeholder={t('birth.displayExample')}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CharacterModal;
