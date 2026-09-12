/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * MCP 服务器启动审批：渲染层可配置任意 command/args，若被控制即可拉起任意进程。
 * 因此在 spawn 前必须由用户经系统原生对话框显式批准，指纹持久化到 userData，
 * 已批准的同一命令不再重复询问（新增/改参即需重新批准）。
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { app } from 'electron';

const FILE_NAME = 'mcp-approved.json';

/** 命令指纹：命令 + 参数序列的稳定哈希。 */
export function mcpFingerprint(command: string, args: readonly string[]): string {
  return createHash('sha256').update(JSON.stringify([command, [...args]])).digest('hex');
}

function filePath(): string {
  return path.join(app.getPath('userData'), FILE_NAME);
}

function readApproved(): Set<string> {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath(), 'utf-8')) as unknown;
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

export function isMcpCommandApproved(fingerprint: string): boolean {
  return readApproved().has(fingerprint);
}

export function approveMcpCommand(fingerprint: string): void {
  const approved = readApproved();
  approved.add(fingerprint);
  try {
    fs.writeFileSync(filePath(), JSON.stringify([...approved]), 'utf-8');
  } catch {
    // 写入失败只影响下次仍需确认，不影响本次启动
  }
}
