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
import type { SettingsModalFooterProps } from '../types';

const SettingsModalFooter: React.FC<SettingsModalFooterProps> = ({ onClose, onSave }) => {
  const { t } = useTranslation(['settings', 'common']);
  return (
    <div className="p-10 border-t border-gray-100 bg-white flex justify-between items-center">
      <p className="text-xs text-gray-400 font-medium italic">{t('footer.persistNote')}</p>
      <div className="flex gap-4">
        <button onClick={onClose} className="px-8 py-3 text-sm font-black text-gray-400 hover:text-gray-600">
          {t('common:cancel')}
        </button>
        <button
          onClick={onSave}
          className="px-10 py-3 bg-blue-600 text-white text-sm font-black rounded-2xl hover:bg-blue-700 shadow-2xl shadow-blue-100 active:scale-95 transition-all"
        >
          {t('footer.save')}
        </button>
      </div>
    </div>
  );
};

export default SettingsModalFooter;
