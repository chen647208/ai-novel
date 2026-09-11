/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 内置槽位贡献：应用壳启动时注册，与插件贡献走同一注册表。 */
import VersionBadge from '@/features/version/components/VersionBadge';
import { uiSlotRegistry } from '@/shared/services/uiSlots';

import { CommandPaletteButton } from './CommandPaletteButton';
import { StatusBarStats } from './StatusBarStats';

export function registerCoreSlots(): void {
  uiSlotRegistry.register({
    id: 'core.version-badge',
    slot: 'topbar.actions',
    order: 0,
    render: () => <VersionBadge />,
  });
  for (const slot of ['nav.actions', 'sidebar.actions', 'editor.toolbar'] as const) {
    uiSlotRegistry.register({
      id: `core.command-palette.${slot}`,
      slot,
      order: 0,
      render: () => <CommandPaletteButton />,
    });
  }
  uiSlotRegistry.register({
    id: 'core.status-bar.stats',
    slot: 'status-bar',
    order: 0,
    render: () => <StatusBarStats />,
  });
}
