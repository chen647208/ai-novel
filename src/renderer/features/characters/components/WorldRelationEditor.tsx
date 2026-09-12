/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 世界关联信息编辑器（从 CharacterModal 抽出）：势力/地点/等级体系与时间线出生日期。 */
import { CalendarDays, ChevronDown, ChevronUp, Flag, Globe2, Home, Layers, MapPin } from 'lucide-react';
import React, { useState } from 'react';

import { useTranslation } from '@/i18n';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Select } from '@/shared/ui/Select';

import type { Character, Project } from '../../../../shared/types';

export interface WorldRelationEditorProps {
  character: Character;
  project: Project;
  onUpdate: (updates: Partial<Character>) => void;
}

export const WorldRelationEditor: React.FC<WorldRelationEditorProps> = ({ character, project, onUpdate }) => {
  const { t } = useTranslation('characters');
  const [isExpanded, setIsExpanded] = useState(false);

  const factions = project.factions || [];
  const locations = project.locations || [];
  const ruleSystems = project.ruleSystems || [];
  const timeline = project.timeline;

  const currentFaction = factions.find(f => f.id === character.factionId);
  const homeLocation = locations.find(l => l.id === character.homeLocationId);
  const currentLocation = locations.find(l => l.id === character.currentLocationId);
  const currentRuleSystem = ruleSystems.find(r => r.id === character.ruleSystemLevel?.systemId);
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
