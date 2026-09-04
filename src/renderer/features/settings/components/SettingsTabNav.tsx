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
import type { SettingsTab } from '../types';

interface SettingsTabNavProps {
  activeTab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

const tabItems: Array<{ id: SettingsTab; icon: string; labelKey: 'tab.general' | 'tab.models' | 'tab.prompts' | 'tab.cardPrompts' | 'tab.consistencyPrompts' | 'tab.system' | 'tab.storage' | 'tab.embedding'; activeClassName: string }> = [
  { id: 'general', icon: 'fa-sliders-h', labelKey: 'tab.general', activeClassName: 'bg-gray-900 text-white shadow-xl shadow-gray-200' },
  { id: 'models', icon: 'fa-microchip', labelKey: 'tab.models', activeClassName: 'bg-gray-900 text-white shadow-xl shadow-gray-200' },
  { id: 'prompts', icon: 'fa-terminal', labelKey: 'tab.prompts', activeClassName: 'bg-gray-900 text-white shadow-xl shadow-gray-200' },
  { id: 'card-prompts', icon: 'fa-magic', labelKey: 'tab.cardPrompts', activeClassName: 'bg-amber-600 text-white shadow-xl shadow-amber-200' },
  { id: 'consistency-prompts', icon: 'fa-stethoscope', labelKey: 'tab.consistencyPrompts', activeClassName: 'bg-rose-600 text-white shadow-xl shadow-rose-200' },
  { id: 'system', icon: 'fa-graduation-cap', labelKey: 'tab.system', activeClassName: 'bg-purple-50 text-purple-600 shadow-xl shadow-purple-100' },
  { id: 'storage', icon: 'fa-database', labelKey: 'tab.storage', activeClassName: 'bg-green-50 text-green-600 shadow-xl shadow-green-100' },
  { id: 'embedding', icon: 'fa-brain', labelKey: 'tab.embedding', activeClassName: 'bg-indigo-50 text-indigo-600 shadow-xl shadow-indigo-100' },
];

const SettingsTabNav: React.FC<SettingsTabNavProps> = ({ activeTab, onChange }) => {
  const { t } = useTranslation('settings');
  return (
    <div className="flex gap-3 flex-wrap">
      {tabItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`px-5 py-2.5 text-sm font-black rounded-xl transition-all whitespace-nowrap ${
            activeTab === item.id ? item.activeClassName : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
        >
          <i className={`fas ${item.icon} mr-2`}></i> {t(item.labelKey)}
        </button>
      ))}
    </div>
  );
};

export default SettingsTabNav;
