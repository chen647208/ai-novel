/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 出生信息编辑器（从 CharacterModal 抽出）：手动/自动计算与出生日期。 */
import { Calculator, ChevronDown, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';

import { useTranslation } from '@/i18n';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Select } from '@/shared/ui/Select';

import type { Character } from '../../../../shared/types';

export interface BirthInfoEditorProps {
  character: Character;
  onUpdate: (updates: Partial<Character>) => void;
}

export const BirthInfoEditor: React.FC<BirthInfoEditorProps> = ({ character, onUpdate }) => {
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
