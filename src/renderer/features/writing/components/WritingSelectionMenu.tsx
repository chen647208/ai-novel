/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WritingSelectionMenuProps } from '../types';
import { Button } from '@/shared/ui/Button';
import { WandSparkles, X } from 'lucide-react';

const WritingSelectionMenu: React.FC<WritingSelectionMenuProps> = ({
  menuPos,
  isEditModalOpen,
  hasModel,
  onOpenEditModal,
  onClearSelection,
}) => {
  const { t } = useTranslation('writing');
  if (!menuPos || isEditModalOpen) {
    return null;
  }

  return (
    <div
      className="fixed z-[100] flex items-center gap-1 rounded-lg border border-border bg-popover p-1 shadow-md"
      style={{ left: menuPos.x, top: menuPos.y }}
    >
      <Button size="sm" onClick={onOpenEditModal} disabled={!hasModel} title={!hasModel ? t('output.noModelHint') : undefined}>
        <WandSparkles className="size-3.5" /> {t('selectionMenu.polishExpand')}
      </Button>
      <div className="mx-0.5 h-5 w-px bg-border" />
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground"
        onClick={onClearSelection}
        title={t('selectionMenu.clearTitle')}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
};

export default WritingSelectionMenu;
