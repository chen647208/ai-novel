/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { AnyEntity, EntityName } from './types';

/**
 * 实体哈希 —— EntityChange.hash 的计算规范（Trilium hashedProperties 模式）：
 * 每个实体类自描述参与哈希的字段集，字段按声明序以不可打印分隔符拼接后取 SHA-256。
 * 不参与哈希的字段（createdAt/updatedAt/seq/id 等）变化不产生变更行。
 */
export const HASHED_PROPERTIES: Record<EntityName, readonly string[]> = {
  nodes: ['type', 'title', 'bookId', 'body', 'path', 'erased'],
  edges: ['fromId', 'toId', 'kind', 'role', 'position', 'bookId', 'erased'],
  attrs: ['nodeId', 'type', 'name', 'value', 'inheritable', 'position', 'erased'],
  revisions: ['nodeId', 'seq', 'body', 'author', 'cause'],
  attachments: ['nodeId', 'role', 'mime', 'blobId', 'erased'],
  blobs: [], // 特例：直接哈希字节
};

/** 字段值规范化：undefined/null → 空串；boolean → 1/0；其余 String() */
function normalizeValue(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return String(v);
}

/** SHA-256（Web Crypto，桌面 Node22 / 浏览器 / vitest 均可用） */
export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 计算实体的变更哈希。blobs 直接哈希字节，其余按 HASHED_PROPERTIES 字段拼接。 */
export async function hashEntity(entityName: EntityName, entity: AnyEntity): Promise<string> {
  if (entityName === 'blobs') {
    const blob = entity as { bytes: Uint8Array; enc?: string };
    return sha256Hex(blob.bytes);
  }
  const fields = HASHED_PROPERTIES[entityName];
  const record = entity as unknown as Record<string, unknown>;
  const joined = fields.map((f) => `${f}=${normalizeValue(record[f])}`).join('\u001f');
  return sha256Hex(`${entityName}\u001e${entity.id}\u001e${joined}`);
}
