/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React, { useState } from 'react';
import { useTranslation } from '@/i18n';
import { type Character, type Project,} from '../../../shared/types';
import { Brain, Calculator, CalendarDays, Check, ChevronDown, ChevronRight, ChevronUp, Eye, Flag, Globe2, Home, IdCard, Layers, LineChart, MapPin, ScrollText, Share2, Shield, UserRound, X } from 'lucide-react';


interface CharacterModalProps {
  character: Character;
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<Character>) => void;
}

const CharacterModal: React.FC<CharacterModalProps> = ({ character, project, isOpen, onClose, onUpdate }) => {
  const { t } = useTranslation('characters');
  if (!isOpen) return null;

  // 根据角色类型获取颜色（匹配存储的角色数据值，不作翻译）
  const getRoleColor = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('主')) return 'text-amber-600';
    if (roleLower.includes('反')) return 'text-red-600';
    if (roleLower.includes('配')) return 'text-blue-600';
    return 'text-gray-600';
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackgroundClick}
    >
      <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[98vh] overflow-hidden shadow-2xl flex flex-col">
        {/* 模态窗口头部 - 固定高度不滚动 */}
        <div className="px-10 py-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-start flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <UserRound className="size-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <div className="mb-2">
                <label className="text-xs font-bold text-gray-500 block mb-1">{t('modal.nameLabel')}</label>
                <input
                  className="w-full text-lg font-black text-gray-900 bg-white px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  value={character.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder={t('modal.namePlaceholder')}
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 block mb-1">{t('modal.roleLabel')}</label>
                  <select 
                    className={`w-full text-xs font-black px-3 py-1.5 rounded-lg border ${getRoleColor(character.role)} bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300`}
                    value={character.role}
                    onChange={(e) => onUpdate({ role: e.target.value })}
                  >
                    {/* value 是存入角色档案的数据值（中文），保持字面；仅展示文案走 i18n */}
                    <option value="主角">{t('modal.roleOptions.protagonist')}</option>
                    <option value="反派">{t('modal.roleOptions.antagonist')}</option>
                    <option value="配角">{t('modal.roleOptions.supporting')}</option>
                    <option value="其他">{t('modal.roleOptions.other')}</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 block mb-1">{t('modal.genderLabel')}</label>
                  <select 
                    className="w-full text-xs font-black px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    value={character.gender}
                    onChange={(e) => onUpdate({ gender: e.target.value })}
                  >
                    <option value="男">{t('modal.genderOptions.male')}</option>
                    <option value="女">{t('modal.genderOptions.female')}</option>
                    <option value="其他">{t('modal.genderOptions.other')}</option>
                    <option value="未知">{t('modal.genderOptions.unknown')}</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 block mb-1">{t('modal.ageLabel')}</label>
                  <input
                    className="w-full text-xs text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
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
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 模态窗口内容 - 可滚动区域，自动填充剩余空间 */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 左侧列：基本信息和外观 */}
            <div className="space-y-8">
              {/* 基本信息卡片 */}
              <div className="bg-blue-50/20 p-6 rounded-3xl border border-blue-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <IdCard className="size-4 text-blue-400" />
                  <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{t('modal.basic.title')}</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t('modal.basic.occupation')}</label>
                    <input
                      className="w-full text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      value={character.occupation || ''}
                      onChange={(e) => onUpdate({ occupation: e.target.value })}
                      placeholder={t('modal.basic.occupationPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t('modal.basic.motivation')}</label>
                    <textarea
                      className="w-full h-24 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 resize-none"
                      value={character.motivation || ''}
                      onChange={(e) => onUpdate({ motivation: e.target.value })}
                      placeholder={t('modal.basic.motivationPlaceholder')}
                    />
                  </div>
                </div>
              </div>

              {/* 外观特征卡片 */}
              <div className="bg-purple-50/20 p-6 rounded-3xl border border-purple-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <Eye className="size-4 text-purple-400" />
                  <h3 className="text-[10px] font-black text-purple-600 uppercase tracking-widest">{t('modal.appearance.title')}</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t('modal.appearance.description')}</label>
                    <textarea
                      className="w-full h-32 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-100 focus:border-purple-300 resize-none"
                      value={character.appearance || ''}
                      onChange={(e) => onUpdate({ appearance: e.target.value })}
                      placeholder={t('modal.appearance.descriptionPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t('modal.appearance.features')}</label>
                    <textarea
                      className="w-full h-20 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-100 focus:border-purple-300 resize-none"
                      value={character.distinctiveFeatures || ''}
                      onChange={(e) => onUpdate({ distinctiveFeatures: e.target.value })}
                      placeholder={t('modal.appearance.featuresPlaceholder')}
                    />
                  </div>
                </div>
              </div>

              {/* 性格特征卡片 */}
              <div className="bg-amber-50/20 p-6 rounded-3xl border border-amber-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="size-4 text-amber-400" />
                  <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{t('modal.personality.title')}</h3>
                </div>
                <textarea
                  className="w-full h-40 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-100 focus:border-amber-300 resize-none"
                  value={character.personality || ''}
                  onChange={(e) => onUpdate({ personality: e.target.value })}
                  placeholder={t('modal.personality.placeholder')}
                />
              </div>
            </div>

            {/* 右侧列：背景和能力 */}
            <div className="space-y-8">
              {/* 背景设定卡片 */}
              <div className="bg-emerald-50/20 p-6 rounded-3xl border border-emerald-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <ScrollText className="size-4 text-emerald-400" />
                  <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('modal.background.title')}</h3>
                </div>
                <textarea
                  className="w-full h-40 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 resize-none"
                  value={character.background || ''}
                  onChange={(e) => onUpdate({ background: e.target.value })}
                  placeholder={t('modal.background.placeholder')}
                />
              </div>

              {/* 能力与弱点卡片 */}
              <div className="bg-red-50/20 p-6 rounded-3xl border border-red-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="size-4 text-red-400" />
                  <h3 className="text-[10px] font-black text-red-600 uppercase tracking-widest">{t('modal.abilities.title')}</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t('modal.abilities.strengths')}</label>
                    <textarea
                      className="w-full h-24 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-100 focus:border-red-300 resize-none"
                      value={character.strengths || ''}
                      onChange={(e) => onUpdate({ strengths: e.target.value })}
                      placeholder={t('modal.abilities.strengthsPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t('modal.abilities.weaknesses')}</label>
                    <textarea
                      className="w-full h-24 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-100 focus:border-red-300 resize-none"
                      value={character.weaknesses || ''}
                      onChange={(e) => onUpdate({ weaknesses: e.target.value })}
                      placeholder={t('modal.abilities.weaknessesPlaceholder')}
                    />
                  </div>
                </div>
              </div>

              {/* 关系网和成长弧线 */}
              <div className="grid grid-cols-1 gap-8">
                {/* 关系网卡片 */}
                <div className="bg-indigo-50/20 p-6 rounded-3xl border border-indigo-50/50">
                  <div className="flex items-center gap-3 mb-4">
                    <Share2 className="size-4 text-indigo-400" />
                    <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{t('modal.relations.title')}</h3>
                  </div>
                  <textarea
                    className="w-full h-32 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-none"
                    value={character.relationships || ''}
                    onChange={(e) => onUpdate({ relationships: e.target.value })}
                    placeholder={t('modal.relations.placeholder')}
                  />
                </div>

                {/* 成长弧线卡片 */}
                <div className="bg-cyan-50/20 p-6 rounded-3xl border border-cyan-50/50">
                  <div className="flex items-center gap-3 mb-4">
                    <LineChart className="size-4 text-cyan-400" />
                    <h3 className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">{t('modal.arc.title')}</h3>
                  </div>
                  <textarea
                    className="w-full h-32 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-100 focus:border-cyan-300 resize-none"
                    value={character.characterArc || ''}
                    onChange={(e) => onUpdate({ characterArc: e.target.value })}
                    placeholder={t('modal.arc.placeholder')}
                  />
                </div>
              </div>

              {/* 世界关联信息 - 跨两列显示 */}
              <WorldRelationEditor 
                character={character} 
                project={project} 
                onUpdate={onUpdate} 
              />
            </div>
          </div>
        </div>

        {/* 模态窗口底部 */}
        <div className="px-10 py-6 border-t border-gray-100 bg-gray-50/30 flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-gray-900 text-white rounded-xl text-sm font-black hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg"
          >
            <Check className="size-3.5" />
            {t('modal.saveAndClose')}
          </button>
        </div>
      </div>
    </div>
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
    <div className="mt-3 pt-3 border-t border-gray-100">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
      >
        {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <span>{t('birth.title')}</span>
        {birthInfo.date && <span className="text-indigo-500">{t('birth.set')}</span>}
      </button>

      {isExpanded && (
        <div className="mt-3 grid grid-cols-2 gap-3 animate-in fade-in">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">{t('birth.calcType')}</label>
            <select
              value={birthInfo.calculationType}
              onChange={(e) => updateBirthInfo({ calculationType: e.target.value as 'manual' | 'auto' })}
              className="w-full text-xs bg-white px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
            >
              <option value="manual">{t('birth.manual')}</option>
              <option value="auto">{t('birth.auto')}</option>
            </select>
          </div>

          {birthInfo.calculationType === 'manual' ? (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">{t('birth.currentAge')}</label>
              <input
                type="text"
                value={birthInfo.currentAge || character.age || ''}
                onChange={(e) => updateBirthInfo({ currentAge: e.target.value })}
                placeholder={t('modal.agePlaceholder')}
                className="w-full text-xs bg-white px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">{t('birth.storyTime')}</label>
              <input
                type="text"
                value={birthInfo.storyCurrentDate?.display || birthInfo.storyCurrentDate?.year?.toString() || ''}
                onChange={(e) => updateBirthInfo({
                  storyCurrentDate: { year: parseInt(e.target.value) || 0, display: e.target.value }
                })}
                placeholder={t('birth.storyTimePlaceholder')}
                className="w-full text-xs bg-white px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
              />
            </div>
          )}

          {/* 出生日期 */}
          <div className="col-span-2 bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
            <label className="block text-xs font-bold text-indigo-600 mb-2">{t('birth.date')}</label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('birth.year')}</label>
                <input
                  type="number"
                  value={birthInfo.date?.year || ''}
                  onChange={(e) => updateBirthInfo({
                    date: { ...birthInfo.date, year: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full text-xs bg-white px-2 py-1.5 rounded border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('birth.month')}</label>
                <input
                  type="number"
                  value={birthInfo.date?.month || ''}
                  onChange={(e) => updateBirthInfo({
                    date: { ...birthInfo.date, year: birthInfo.date?.year ?? 0, month: e.target.value ? parseInt(e.target.value) : undefined }
                  })}
                  className="w-full text-xs bg-white px-2 py-1.5 rounded border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('birth.day')}</label>
                <input
                  type="number"
                  value={birthInfo.date?.day || ''}
                  onChange={(e) => updateBirthInfo({
                    date: { ...birthInfo.date, year: birthInfo.date?.year ?? 0, day: e.target.value ? parseInt(e.target.value) : undefined }
                  })}
                  className="w-full text-xs bg-white px-2 py-1.5 rounded border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('birth.display')}</label>
                <input
                  type="text"
                  value={birthInfo.date?.display || ''}
                  onChange={(e) => updateBirthInfo({
                    date: { ...birthInfo.date, year: birthInfo.date?.year ?? 0, display: e.target.value }
                  })}
                  placeholder={t('birth.displayPlaceholder')}
                  className="w-full text-xs bg-white px-2 py-1.5 rounded border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                />
              </div>
            </div>
            
            {/* 年龄预览（自动计算模式下） */}
            {birthInfo.calculationType === 'auto' && birthInfo.date?.year !== undefined && birthInfo.storyCurrentDate?.year !== undefined && (
              <div className="mt-2 text-xs text-indigo-600">
                <Calculator className="size-4 mr-1" />
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
    <div className="col-span-1 lg:col-span-2 bg-gradient-to-r from-amber-50/30 via-orange-50/30 to-red-50/30 p-6 rounded-3xl border border-amber-200/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Globe2 className="size-5 text-amber-500" />
          <div>
            <h3 className="text-sm font-black text-gray-800">{t('world.title')}</h3>
            <p className="text-xs text-gray-500">
              {currentFaction || homeLocation || currentLocation
                ? t('world.linked', { names: [currentFaction?.name, homeLocation?.name].filter(Boolean).join(', ') })
                : t('world.hint')}
            </p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="size-4 text-gray-400 transition-transform" /> : <ChevronDown className="size-4 text-gray-400 transition-transform" />}
      </button>

      {isExpanded && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in">
          {/* 所属势力 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <Flag className="size-4 text-amber-500" />
              {t('world.faction')}
            </label>
            <select
              value={character.factionId || ''}
              onChange={(e) => onUpdate({ factionId: e.target.value || undefined })}
              className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-100 focus:border-amber-300"
            >
              <option value="">{t('world.none')}</option>
              {factions.map(faction => (
                <option key={faction.id} value={faction.id}>
                  {faction.name} ({faction.type})
                </option>
              ))}
            </select>
            {currentFaction && (
              <div className="text-xs text-gray-500 bg-white/50 p-2 rounded-lg">
                <div className="font-medium text-amber-700">{currentFaction.name}</div>
                <div className="text-gray-400 truncate">{currentFaction.description?.substring(0, 50)}...</div>
              </div>
            )}
          </div>

          {/* 出身地点 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <Home className="size-4 text-emerald-500" />
              {t('world.homeLocation')}
            </label>
            <select
              value={character.homeLocationId || ''}
              onChange={(e) => onUpdate({ homeLocationId: e.target.value || undefined })}
              className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300"
            >
              <option value="">{t('world.none')}</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.type})
                </option>
              ))}
            </select>
            {homeLocation && (
              <div className="text-xs text-gray-500 bg-white/50 p-2 rounded-lg">
                <div className="font-medium text-emerald-700">{homeLocation.name}</div>
                <div className="text-gray-400">{homeLocation.type}</div>
              </div>
            )}
          </div>

          {/* 当前地点 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <MapPin className="size-4 text-blue-500" />
              {t('world.currentLocation')}
            </label>
            <select
              value={character.currentLocationId || ''}
              onChange={(e) => onUpdate({ currentLocationId: e.target.value || undefined })}
              className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            >
              <option value="">{t('world.none')}</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.type})
                </option>
              ))}
            </select>
            {currentLocation && (
              <div className="text-xs text-gray-500 bg-white/50 p-2 rounded-lg">
                <div className="font-medium text-blue-700">{currentLocation.name}</div>
                <div className="text-gray-400">{currentLocation.type}</div>
              </div>
            )}
          </div>

          {/* 等级体系 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <Layers className="size-4 text-purple-500" />
              {t('world.ruleSystem')}
            </label>
            <div className="space-y-2">
              <select
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
                className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-100 focus:border-purple-300"
              >
                <option value="">{t('world.none')}</option>
                {ruleSystems.map(system => (
                  <option key={system.id} value={system.id}>
                    {system.name}
                  </option>
                ))}
              </select>
              
              {character.ruleSystemLevel?.systemId && currentRuleSystem && (
                <select
                  value={character.ruleSystemLevel.levelName || ''}
                  onChange={(e) => onUpdate({ 
                    ruleSystemLevel: {
                      systemId: currentRuleSystem.id,
                      levelName: e.target.value
                    }
                  })}
                  className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-100 focus:border-purple-300"
                >
                  <option value="">{t('world.selectLevel')}</option>
                  {currentRuleSystem.levels.map(level => (
                    <option key={level.order} value={level.name}>
                      {level.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {currentLevel && (
              <div className="text-xs text-gray-500 bg-white/50 p-2 rounded-lg">
                <div className="font-medium text-purple-700">{currentLevel.name}</div>
                <div className="text-gray-400 truncate">{currentLevel.description?.substring(0, 40)}...</div>
              </div>
            )}
          </div>

          {/* 出生日期 - 如果有时间线 */}
          {timeline && (
            <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-2 pt-4 border-t border-amber-200/30">
              <label className="text-xs font-bold text-gray-600 flex items-center gap-2 mb-3">
                <CalendarDays className="size-4 text-indigo-500" />
                {t('birth.dateWithCalendar', { calendar: timeline.config.calendarSystem })}
              </label>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('birth.year')}</label>
                  <input
                    type="number"
                    value={character.birthDate?.year || ''}
                    onChange={(e) => onUpdate({
                      birthDate: {
                        ...character.birthDate,
                        year: parseInt(e.target.value) || 0
                      }
                    })}
                    className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    placeholder={timeline.config.startYear?.toString() || '0'}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('birth.month')}</label>
                  <input
                    type="number"
                    value={character.birthDate?.month || ''}
                    onChange={(e) => onUpdate({
                      birthDate: {
                        ...character.birthDate,
                        year: character.birthDate?.year ?? timeline.config.startYear ?? 0,
                        month: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })}
                    className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    placeholder="1-12"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('birth.day')}</label>
                  <input
                    type="number"
                    value={character.birthDate?.day || ''}
                    onChange={(e) => onUpdate({
                      birthDate: {
                        ...character.birthDate,
                        year: character.birthDate?.year ?? timeline.config.startYear ?? 0,
                        day: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })}
                    className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    placeholder="1-31"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('birth.display')}</label>
                  <input
                    type="text"
                    value={character.birthDate?.display || ''}
                    onChange={(e) => onUpdate({
                      birthDate: {
                        ...character.birthDate,
                        year: character.birthDate?.year ?? timeline.config.startYear ?? 0,
                        display: e.target.value
                      }
                    })}
                    className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
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






