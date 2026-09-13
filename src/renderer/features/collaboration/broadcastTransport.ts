/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 同机多窗口传输：用原生 BroadcastChannel 交换 Yjs 增量与在线状态。
 * 不引入网络依赖，不走 WebSocket；跨机器传输由主进程通道另行接入。
 */
import * as Y from 'yjs';

export interface CollaborationPeer {
  id: string;
  name: string;
  /** 最近一次心跳时间戳。 */
  at: number;
}

export interface CollaborationTransport {
  readonly room: string;
  getPeers(): CollaborationPeer[];
  destroy(): void;
}

interface TransportMessage {
  type: 'update' | 'sync-request' | 'presence';
  update?: number[];
  peer?: { id: string; name: string; at: number };
}

const HEARTBEAT_MS = 4000;
const PEER_TTL_MS = 12000;

/** 剔除超时未心跳的对端。 */
export function prunePeers(peers: CollaborationPeer[], now: number, ttl = PEER_TTL_MS): CollaborationPeer[] {
  return peers.filter((peer) => now - peer.at <= ttl);
}

export interface BroadcastTransportOptions {
  name?: string;
  onPresence?: (peers: CollaborationPeer[]) => void;
  /** 收到并应用远端增量时回调（用于判定是否已有对端，决定是否本端播种）。 */
  onRemoteUpdate?: () => void;
}

export function createBroadcastTransport(doc: Y.Doc, room: string, options: BroadcastTransportOptions = {}): CollaborationTransport {
  const channelName = `hongyue-collab:${room}`;
  if (typeof BroadcastChannel === 'undefined') {
    return { room, getPeers: () => [], destroy: () => undefined };
  }
  const channel = new BroadcastChannel(channelName);
  const remoteOrigin = { source: channelName };
  const clientId = `peer:${crypto.randomUUID()}`;
  const name = options.name?.trim() || `用户-${clientId.slice(5, 9)}`;
  let peers: CollaborationPeer[] = [];

  const notify = () => {
    options.onPresence?.(peers);
  };

  const heartbeat = () => {
    const at = Date.now();
    peers = prunePeers([...peers, { id: clientId, name, at }], at);
    notify();
    channel.postMessage({ type: 'presence', peer: { id: clientId, name, at } } satisfies TransportMessage);
  };

  const onLocalUpdate = (update: Uint8Array, origin: unknown): void => {
    if (origin === remoteOrigin) return;
    channel.postMessage({ type: 'update', update: Array.from(update) } satisfies TransportMessage);
  };

  channel.onmessage = (event: MessageEvent<TransportMessage>) => {
    const data = event.data;
    if (data?.type === 'update' && data.update) {
      Y.applyUpdate(doc, new Uint8Array(data.update), remoteOrigin);
      options.onRemoteUpdate?.();
    } else if (data?.type === 'sync-request') {
      channel.postMessage({ type: 'update', update: Array.from(Y.encodeStateAsUpdate(doc)) } satisfies TransportMessage);
      heartbeat();
    } else if (data?.type === 'presence' && data.peer) {
      const incoming = data.peer;
      peers = prunePeers([...peers.filter((peer) => peer.id !== incoming.id), incoming], Date.now());
      notify();
    }
  };

  doc.on('update', onLocalUpdate);
  channel.postMessage({ type: 'sync-request' } satisfies TransportMessage);
  heartbeat();
  const timer = setInterval(heartbeat, HEARTBEAT_MS);

  return {
    room,
    getPeers: () => peers,
    destroy: () => {
      clearInterval(timer);
      doc.off('update', onLocalUpdate);
      channel.close();
    },
  };
}
