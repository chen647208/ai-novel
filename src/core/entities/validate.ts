/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type {
  AttributeEntity,
  AttributeType,
  BlobEntity,
  EdgeEntity,
  EdgeKind,
  NodeEntity,
  RevisionEntity,
  AttachmentEntity,
} from './types';

/**
 * 实体校验 —— 返回错误列表（空数组 = 合法）。
 * 写路径（Store.apply / 迁移导入 / 插件贡献）统一在入口调用，
 * 错误信息带实体名与字段名，供故障隔离与用户提示。
 */

const EDGE_KINDS: readonly EdgeKind[] = ['contain', 'link-hard', 'ref-soft'];
const ATTRIBUTE_TYPES: readonly AttributeType[] = ['label', 'relation'];

function isNonEmpty(s: unknown): s is string {
  return typeof s === 'string' && s.length > 0;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

export function validateNode(node: NodeEntity): string[] {
  const errors: string[] = [];
  if (!isNonEmpty(node.id)) errors.push('nodes.id 不能为空');
  if (!isNonEmpty(node.type)) errors.push(`nodes[${node.id}].type 不能为空`);
  if (!isNonEmpty(node.bookId)) errors.push(`nodes[${node.id}].bookId 不能为空`);
  if (typeof node.body !== 'string') errors.push(`nodes[${node.id}].body 必须是字符串`);
  if (!isFiniteNumber(node.createdAt) || !isFiniteNumber(node.updatedAt)) {
    errors.push(`nodes[${node.id}] 时间戳必须是有限数字`);
  }
  return errors;
}

export function validateEdge(edge: EdgeEntity): string[] {
  const errors: string[] = [];
  if (!isNonEmpty(edge.id)) errors.push('edges.id 不能为空');
  if (!isNonEmpty(edge.fromId) || !isNonEmpty(edge.toId)) {
    errors.push(`edges[${edge.id}] 两端 id 不能为空`);
  }
  if (!EDGE_KINDS.includes(edge.kind)) errors.push(`edges[${edge.id}].kind 非法: ${String(edge.kind)}`);
  if (!isFiniteNumber(edge.position)) errors.push(`edges[${edge.id}].position 必须是有限数字`);
  if (!isNonEmpty(edge.bookId)) errors.push(`edges[${edge.id}].bookId 不能为空`);
  return errors;
}

export function validateAttribute(attr: AttributeEntity): string[] {
  const errors: string[] = [];
  if (!isNonEmpty(attr.id)) errors.push('attrs.id 不能为空');
  if (!isNonEmpty(attr.nodeId)) errors.push(`attrs[${attr.id}].nodeId 不能为空`);
  if (!ATTRIBUTE_TYPES.includes(attr.type)) errors.push(`attrs[${attr.id}].type 非法: ${String(attr.type)}`);
  if (!isNonEmpty(attr.name)) errors.push(`attrs[${attr.id}].name 不能为空`);
  if (typeof attr.value !== 'string') errors.push(`attrs[${attr.id}].value 必须是字符串`);
  if (!isFiniteNumber(attr.position)) errors.push(`attrs[${attr.id}].position 必须是有限数字`);
  return errors;
}

export function validateRevision(rev: RevisionEntity): string[] {
  const errors: string[] = [];
  if (!isNonEmpty(rev.id)) errors.push('revisions.id 不能为空');
  if (!isNonEmpty(rev.nodeId)) errors.push(`revisions[${rev.id}].nodeId 不能为空`);
  if (!isFiniteNumber(rev.seq) || rev.seq < 0) errors.push(`revisions[${rev.id}].seq 必须是非负整数`);
  if (typeof rev.body !== 'string') errors.push(`revisions[${rev.id}].body 必须是字符串`);
  if (!isNonEmpty(rev.author)) errors.push(`revisions[${rev.id}].author 不能为空`);
  return errors;
}

export function validateAttachment(att: AttachmentEntity): string[] {
  const errors: string[] = [];
  if (!isNonEmpty(att.id)) errors.push('attachments.id 不能为空');
  if (!isNonEmpty(att.nodeId)) errors.push(`attachments[${att.id}].nodeId 不能为空`);
  if (!isNonEmpty(att.blobId)) errors.push(`attachments[${att.id}].blobId 不能为空`);
  if (!isNonEmpty(att.mime)) errors.push(`attachments[${att.id}].mime 不能为空`);
  return errors;
}

export function validateBlob(blob: BlobEntity): string[] {
  const errors: string[] = [];
  if (!isNonEmpty(blob.id)) errors.push('blobs.id 不能为空');
  if (!(blob.bytes instanceof Uint8Array)) errors.push(`blobs[${blob.id}].bytes 必须是 Uint8Array`);
  return errors;
}
