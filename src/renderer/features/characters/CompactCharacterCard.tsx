/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React from 'react';
import { useTranslation } from '@/i18n';
import { type Character } from '../../../shared/types';
import { roleLabel, genderLabel } from './displayLabels';
import { cn } from '@/shared/utils/cn';
import { ChevronRight, Crown, Eye, Info, Skull, Star, User, Users, type LucideIcon } from 'lucide-react';

interface CompactCharacterCardProps {
  character: Character;
  onClick: () => void;
}

const CompactCharacterCard: React.FC<CompactCharacterCardProps> = ({ character, onClick }) => {
  const { t } = useTranslation('characters');
  // 根据角色类型获取颜色和图标（数据值匹配，显示名走 displayLabels 助手）
  const getRoleConfig = (role: string): { color: string; icon: LucideIcon } => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('主')) {
      return { color: 'border-chart-2/25 bg-chart-2/10 text-chart-2', icon: Crown };
    }
    if (roleLower.includes('反')) {
      return { color: 'border-destructive/25 bg-destructive/10 text-destructive', icon: Skull };
    }
    if (roleLower.includes('配')) {
      return { color: 'border-chart-1/25 bg-chart-1/10 text-chart-1', icon: Users };
    }
    return { color: 'border-border bg-muted text-muted-foreground', icon: User };
  };

  const roleConfig = getRoleConfig(character.role);
  const roleText = roleLabel(character.role);
  const genderText = genderLabel(character.gender);

  return (
    <div
      className="flex h-full cursor-pointer flex-col rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
      onClick={onClick}
    >
      {/* 顶部：角色名称和类型 */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-lg font-medium">{character.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium', roleConfig.color)}>
              <roleConfig.icon className="size-2.5" />
              {roleText}
            </span>
            <span className="text-2xs text-muted-foreground">
              {genderText}
            </span>
            <span className="text-2xs text-muted-foreground">
              {character.age ? t('card.ageSuffix', { age: character.age }) : t('card.ageUnknown')}
            </span>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </div>

      {/* 外观描述 */}
      <div className="mb-3 flex-1">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Eye className="size-3 text-muted-foreground" />
          <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{t('card.appearanceTitle')}</span>
        </div>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {character.appearance || t('card.noAppearance')}
        </p>
      </div>

      {/* 标志性特征 */}
      <div className="border-t border-border pt-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Star className="size-3 text-muted-foreground" />
          <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{t('card.featuresTitle')}</span>
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {character.distinctiveFeatures || t('card.noFeatures')}
        </p>
      </div>

      {/* 底部提示 */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-2xs text-muted-foreground">
        <span>{t('card.clickHint')}</span>
        <span className="flex items-center gap-1 opacity-70">
          <Info className="size-3" />
          {t('card.detail')}
        </span>
      </div>
    </div>
  );
};

export default CompactCharacterCard;






