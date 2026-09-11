/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 命令面板触发（槽位贡献）：派发事件由应用壳打开面板，避免贡献点直接依赖 App 状态。 */
import { Command } from 'lucide-react';
import React from 'react';

import { useTranslation } from '@/i18n';
import { COMMAND_PALETTE_EVENT } from '@/shared/constants/appEvents';
import { IconButton } from '@/shared/ui/IconButton';

export const CommandPaletteButton: React.FC = () => {
  const { t } = useTranslation('app');
  return (
    <IconButton
      tone="muted"
      label={t('command.openPalette', '命令面板')}
      onClick={() => window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_EVENT))}
    >
      <Command className="size-4" />
    </IconButton>
  );
};

export default CommandPaletteButton;
