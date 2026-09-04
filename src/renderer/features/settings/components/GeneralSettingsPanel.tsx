/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React from 'react';
import { useTranslation, SUPPORTED_LANGUAGES } from '@/i18n';
import type { AppLanguage } from '@shared/types';
import type { GeneralSettingsPanelProps } from '../types';

const GeneralSettingsPanel: React.FC<GeneralSettingsPanelProps> = ({ language, onLanguageChange }) => {
  const { t } = useTranslation('settings');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <i className="fas fa-language text-blue-500"></i>
          <h3 className="text-lg font-black text-gray-900">{t('general.title')}</h3>
        </div>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-6">{t('general.subtitle')}</p>

        <div className="space-y-3 max-w-sm">
          <label
            htmlFor="app-language"
            className="block text-[10px] font-black text-gray-400 uppercase tracking-widest"
          >
            {t('general.languageLabel')}
          </label>
          <select
            id="app-language"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as AppLanguage)}
            className="w-full border-none rounded-2xl px-5 py-3.5 text-sm bg-gray-50 font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {t(`general.language.${lang}`)}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">{t('general.languageHint')}</p>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettingsPanel;
