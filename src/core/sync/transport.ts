/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 同步传输接口（design/03 协议与传输解耦）。
 *
 * 渲染端 syncService 已实现「文件交换」传输（bundle JSON 手动/网盘拷贝）。
 * 云化（WebDAV/S3/自建服务）只需实现本接口并注册，协议与合并层零改动。
 */

import type { SyncBundle } from './protocol.js';

export interface SyncTransport {
  /** 传输实现名（'file-exchange' | 'webdav' | …） */
  readonly name: string;
  /** 推送一本书的同步包 */
  push(bookId: string, bundle: SyncBundle): Promise<void>;
  /** 拉取某本书在 since 之后生成的同步包 */
  pull(bookId: string, sinceMs?: number): Promise<SyncBundle[]>;
}

/** 内存传输（测试/单机回放）。 */
export class MemorySyncTransport implements SyncTransport {
  readonly name = 'memory';
  private readonly store = new Map<string, SyncBundle[]>();

  async push(bookId: string, bundle: SyncBundle): Promise<void> {
    const list = this.store.get(bookId) ?? [];
    list.push(bundle);
    this.store.set(bookId, list);
  }

  async pull(bookId: string, sinceMs?: number): Promise<SyncBundle[]> {
    return (this.store.get(bookId) ?? []).filter((b) => (sinceMs === undefined ? true : b.generatedAt > sinceMs));
  }
}
