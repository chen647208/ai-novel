/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 恢复出厂/清空内容确认弹窗（Radix AlertDialog，焦点管理内建）。
 * 确认后自持执行数据清除并强制刷新（核弹级重置），宿主只负责开与关。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { repository } from '../../shared/services/repository';
import { dialogService } from '@/shared/services/dialogService';
import { i18n } from '../../i18n';
import { INITIAL_APP_STATE } from '../initialState';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/AlertDialog';
import { Skull, Trash2 } from 'lucide-react';

export type ResetType = 'clear_projects' | 'factory_reset';

interface ResetAlertDialogProps {
  open: boolean;
  /** factory_reset=恢复出厂（清库）；clear_projects=仅清空内容。 */
  type: ResetType;
  onClose: () => void;
}

const ResetAlertDialog: React.FC<ResetAlertDialogProps> = ({ open, type, onClose }) => {
  const { t } = useTranslation(['app', 'common']);

  const executeReset = async () => {
    try {
      if (type === 'factory_reset') {
        await repository.clear();
      } else {
        const currentData = repository.loadAllSync() || INITIAL_APP_STATE;
        await repository.saveAll({ ...currentData, projects: [], activeProjectId: null });
      }
      window.location.reload();
    } catch {
      dialogService.alert(i18n.t('app:reset.failed'));
      onClose();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <AlertDialogContent className="max-w-md text-center">
        <div className={`mx-auto flex size-14 items-center justify-center rounded-full ${
          type === 'factory_reset' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
        }`}>
          {type === 'factory_reset' ? <Skull className="size-7" /> : <Trash2 className="size-7" />}
        </div>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {type === 'factory_reset' ? t('reset.factoryTitle') : t('reset.clearTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {type === 'factory_reset' ? t('reset.factoryDesc') : t('reset.clearDesc')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="justify-center">
          <AlertDialogCancel onClick={onClose}>{t('common:cancel')}</AlertDialogCancel>
          <AlertDialogAction danger onClick={executeReset}>{t('reset.confirmExecute')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ResetAlertDialog;
