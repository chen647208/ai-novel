/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 槽位渲染点：按注册顺序渲染该槽全部贡献。 */
import React, { Fragment, useSyncExternalStore } from 'react';

import { type SlotId,uiSlotRegistry } from '@/shared/services/uiSlots';

export const Slot: React.FC<{ id: SlotId }> = ({ id }) => {
  const contributions = useSyncExternalStore(
    (cb) => uiSlotRegistry.subscribe(cb),
    () => uiSlotRegistry.getSnapshot(id),
  );
  return (
    <>
      {contributions.map((c) => (
        <Fragment key={c.id}>{c.render()}</Fragment>
      ))}
    </>
  );
};

export default Slot;
