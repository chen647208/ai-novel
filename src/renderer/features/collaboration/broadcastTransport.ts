/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 同机多窗口传输：用原生 BroadcastChannel 交换 Yjs 增量更新。
 * 不引入网络依赖，不走 WebSocket；跨机器传输由主进程通道另行接入。
 */
import * as Y from 'yjs';

export interface CollaborationTransport {
  readonly room: string;
  destroy(): void;
}

interface TransportMessage {
  type: 'update' | 'sync-request';
  update?: number[];
}

export function createBroadcastTransport(doc: Y.Doc, room: string): CollaborationTransport {
  const channelName = `hongyue-collab:${room}`;
  if (typeof BroadcastChannel === 'undefined') {
    return { room, destroy: () => undefined };
  }
  const channel = new BroadcastChannel(channelName);
  const remoteOrigin = { source: channelName };

  const onLocalUpdate = (update: Uint8Array, origin: unknown): void => {
    if (origin === remoteOrigin) return;
    channel.postMessage({ type: 'update', update: Array.from(update) } satisfies TransportMessage);
  };

  channel.onmessage = (event: MessageEvent<TransportMessage>) => {
    const data = event.data;
    if (data?.type === 'update' && data.update) {
      Y.applyUpdate(doc, new Uint8Array(data.update), remoteOrigin);
    } else if (data?.type === 'sync-request') {
      channel.postMessage({ type: 'update', update: Array.from(Y.encodeStateAsUpdate(doc)) } satisfies TransportMessage);
    }
  };

  doc.on('update', onLocalUpdate);
  channel.postMessage({ type: 'sync-request' } satisfies TransportMessage);

  return {
    room,
    destroy: () => {
      doc.off('update', onLocalUpdate);
      channel.close();
    },
  };
}
