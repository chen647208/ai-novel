/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 插件编辑器扩展宿主（design/22 §4）：null-origin iframe 内运行，
 * 经消息请求受控编辑器操作；声明 `permissions.network` 时可按消息请求受控 https 联网。
 */
import * as React from 'react';

import { emitEditorOps, validateEditorOps } from '../services/editorOps';
import { PluginFrame, type PluginFrameMessage, type PluginFrameRespond } from './PluginFrame';

export interface PluginEditorFrameProps {
  html: string;
  title?: string;
  className?: string;
  /** 插件是否声明了 network 权限（来自 manifest.permissions.network）。 */
  allowNetwork?: boolean;
}

interface FrameRequestBody {
  ops?: unknown;
  fetch?: { id?: unknown; url?: unknown };
}

export const PluginEditorFrame: React.FC<PluginEditorFrameProps> = ({ html, title, className, allowNetwork = false }) => {
  const handleMessage = React.useCallback(
    (message: PluginFrameMessage, respond: PluginFrameRespond): void => {
      if (message.type !== 'request') return;
      const payload = message.payload as FrameRequestBody | undefined;

      const ops = validateEditorOps(payload?.ops);
      if (ops.length) emitEditorOps(ops);

      const request = payload?.fetch;
      if (!request) return;
      const id = typeof request.id === 'string' ? request.id : undefined;
      const url = typeof request.url === 'string' ? request.url : '';
      if (!allowNetwork) {
        respond({ id, ok: false, error: '未声明 network 权限' });
        return;
      }
      const api = typeof window === 'undefined' ? undefined : window.electronAPI;
      if (!api?.pluginFetch) {
        respond({ id, ok: false, error: '当前环境不支持插件联网' });
        return;
      }
      void api
        .pluginFetch(url)
        .then((result) => respond({ id, ...result }))
        .catch((error: unknown) => respond({ id, ok: false, error: error instanceof Error ? error.message : String(error) }));
    },
    [allowNetwork],
  );

  return <PluginFrame html={html} title={title} className={className} onMessage={handleMessage} />;
};
