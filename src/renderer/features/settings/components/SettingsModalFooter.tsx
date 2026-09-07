/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React from 'react';
import { useTranslation } from '@/i18n';
import { Button } from '@/shared/ui/Button';
import type { SettingsModalFooterProps } from '../types';

const SettingsModalFooter: React.FC<SettingsModalFooterProps> = ({ onClose, onSave }) => {
  const { t } = useTranslation(['settings', 'common']);
  return (
    <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-4">
      <p className="text-xs italic text-muted-foreground">{t('footer.persistNote')}</p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onClose}>
          {t('common:cancel')}
        </Button>
        <Button onClick={onSave}>
          {t('footer.save')}
        </Button>
      </div>
    </div>
  );
};

export default SettingsModalFooter;
