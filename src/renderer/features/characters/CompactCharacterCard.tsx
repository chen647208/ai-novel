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
import { type Character } from '../../../shared/types';
import { roleLabel, genderLabel } from './displayLabels';
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
      return { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Crown };
    }
    if (roleLower.includes('反')) {
      return { color: 'bg-red-100 text-red-700 border-red-200', icon: Skull };
    }
    if (roleLower.includes('配')) {
      return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Users };
    }
    return { color: 'bg-gray-100 text-gray-600 border-gray-200', icon: User };
  };

  const roleConfig = getRoleConfig(character.role);
  const roleText = roleLabel(character.role);
  const genderText = genderLabel(character.gender);

  return (
    <div 
      className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col"
      onClick={onClick}
    >
      {/* 顶部：角色名称和类型 */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-black text-gray-900 truncate">{character.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${roleConfig.color} flex items-center gap-1.5`}>
              <roleConfig.icon className="size-2" />
              {roleText}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              {genderText}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              {character.age ? t('card.ageSuffix', { age: character.age }) : t('card.ageUnknown')}
            </span>
          </div>
        </div>
        <div className="text-gray-300 hover:text-gray-600 transition-colors">
          <ChevronRight className="size-4" />
        </div>
      </div>

      {/* 外观描述 */}
      <div className="mb-4 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="size-3.5 text-blue-400" />
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{t('card.appearanceTitle')}</span>
        </div>
        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
          {character.appearance || t('card.noAppearance')}
        </p>
      </div>

      {/* 标志性特征 */}
      <div className="pt-4 border-t border-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <Star className="size-3.5 text-amber-400" />
          <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{t('card.featuresTitle')}</span>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
          {character.distinctiveFeatures || t('card.noFeatures')}
        </p>
      </div>

      {/* 底部提示 */}
      <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
        <span className="text-[9px] text-gray-400 font-medium">{t('card.clickHint')}</span>
        <span className="text-[9px] text-gray-300">
          <Info className="size-4 mr-1" />
          {t('card.detail')}
        </span>
      </div>
    </div>
  );
};

export default CompactCharacterCard;






