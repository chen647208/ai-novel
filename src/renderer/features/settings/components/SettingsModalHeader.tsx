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
import SettingsTabNav from './SettingsTabNav';
import type { SettingsModalHeaderProps } from '../types';

const SettingsModalHeader: React.FC<SettingsModalHeaderProps> = ({ activeTab, onChange, onClose }) => {
  const { t } = useTranslation('settings');
  return (
    <div className="border-b border-gray-100 px-10 pt-8 pb-4 flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter">{t('title')}</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{t('subtitle')}</p>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
          <i className="fas fa-times text-gray-400"></i>
        </button>
      </div>

      <SettingsTabNav activeTab={activeTab} onChange={onChange} />
    </div>
  );
};

export default SettingsModalHeader;
