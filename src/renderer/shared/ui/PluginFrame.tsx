/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 插件 UI 沙箱宿主（docs/design/21 §6 S3）：null-origin `sandbox="allow-scripts"` iframe，
 * 只经 postMessage 通信；宿主只接受来自本 iframe 且形状合法的消息。
 */
import * as React from 'react';

export interface PluginFrameMessage {
  type: string;
  payload?: unknown;
}

/** 校验来自插件 UI 的消息形状：对象且 type 为非空字符串。 */
export function isPluginFrameMessage(data: unknown): data is PluginFrameMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as { type?: unknown }).type === 'string' &&
    (data as { type: string }).type.length > 0
  );
}

export type PluginFrameRespond = (payload: unknown) => void;

export interface PluginFrameProps {
  /** 插件 UI 的 HTML 文本（内联脚本可运行，但无同源权限）。 */
  html: string;
  title?: string;
  className?: string;
  /** 收到插件 UI 消息时回调（已过滤来源与形状）；respond 用于回消息给 iframe。 */
  onMessage?: (message: PluginFrameMessage, respond: PluginFrameRespond) => void;
}

export function PluginFrame({ html, title = 'Plugin UI', className, onMessage }: PluginFrameProps): React.ReactElement {
  const frameRef = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    if (!onMessage) return;
    const respond: PluginFrameRespond = (payload) => {
      frameRef.current?.contentWindow?.postMessage({ type: 'response', payload }, '*');
    };
    const handler = (event: MessageEvent): void => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (!isPluginFrameMessage(event.data)) return;
      onMessage(event.data, respond);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onMessage]);

  return (
    <iframe
      ref={frameRef}
      title={title}
      className={className}
      // 只给 allow-scripts：null origin，无法触达宿主 DOM/存储，也不同源
      sandbox="allow-scripts"
      srcDoc={html}
    />
  );
}
