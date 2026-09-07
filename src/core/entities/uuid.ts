/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * UUIDv7（RFC 9562）—— 时间有序，利于索引局部性与书架排序。
 * 依赖 globalThis.crypto（桌面 Node22 / 浏览器 / vitest 均提供）。
 */
export function uuidv7(): string {
  const ts = Date.now();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // 前 48 位 = unix 毫秒时间戳
  bytes[0] = Math.floor(ts / 2 ** 40) & 0xff;
  bytes[1] = Math.floor(ts / 2 ** 32) & 0xff;
  bytes[2] = Math.floor(ts / 2 ** 24) & 0xff;
  bytes[3] = Math.floor(ts / 2 ** 16) & 0xff;
  bytes[4] = Math.floor(ts / 2 ** 8) & 0xff;
  bytes[5] = ts & 0xff;
  // ver=7
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  // variant=10
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** 进程级实例 id：启动时生成一次，写入所有 EntityChange.instanceId */
let instanceId: string | null = null;
export function getInstanceId(): string {
  if (!instanceId) instanceId = uuidv7();
  return instanceId;
}
