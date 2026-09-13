/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 跨设备协作中转服务：按 room 广播消息，不做持久化。
 * 启动：node scripts/collab-server.mjs（端口用 COLLAB_PORT 覆盖，默认 1234）。
 * 客户端在设置里填 ws://<主机>:<端口>，消息协议见 renderer 的 ipcTransport.ts。
 */
import { WebSocketServer } from 'ws';

const port = Number(process.env.COLLAB_PORT || 1234);
const rooms = new Map();

const wss = new WebSocketServer({ port });

wss.on('connection', (ws) => {
  let room = null;
  ws.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!message || typeof message.room !== 'string') return;
    room = message.room;
    let members = rooms.get(room);
    if (!members) {
      members = new Set();
      rooms.set(room, members);
    }
    members.add(ws);
    for (const peer of members) {
      if (peer !== ws && peer.readyState === 1) peer.send(JSON.stringify(message));
    }
  });
  ws.on('close', () => {
    if (room) rooms.get(room)?.delete(ws);
  });
  ws.on('error', () => undefined);
});

console.log(`collab relay listening on ws://localhost:${port}`);
