/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 插件编辑器扩展宿主（design/22 §4）：null-origin iframe 内运行，只能经消息请求受控编辑器操作。 */
import * as React from 'react';

import { emitEditorOps, validateEditorOps } from '../services/editorOps';
import { PluginFrame,type PluginFrameMessage } from './PluginFrame';

export interface PluginEditorFrameProps {
  html: string;
  title?: string;
  className?: string;
}

export const PluginEditorFrame: React.FC<PluginEditorFrameProps> = ({ html, title, className }) => {
  const handleMessage = React.useCallback((message: PluginFrameMessage) => {
    if (message.type !== 'request') return;
    const payload = message.payload as { ops?: unknown } | undefined;
    const ops = validateEditorOps(payload?.ops);
    if (ops.length) emitEditorOps(ops);
  }, []);

  return <PluginFrame html={html} title={title} className={className} onMessage={handleMessage} />;
};
