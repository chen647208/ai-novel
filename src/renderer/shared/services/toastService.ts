/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 轻量全局 toast：解耦单例 + 订阅模型，任意组件/服务都能 `toast.success(...)`，
 * 由 <ToastHost/>（App 外壳挂载一次）渲染。与 dialogService 同构，但非阻塞、自动消失。
 */

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

type Listener = (toasts: ToastItem[]) => void;

class ToastService {
  private toasts: ToastItem[] = [];
  private listeners = new Set<Listener>();
  private nextId = 1;
  private static readonly DEFAULT_DURATION = 4000;

  push(kind: ToastKind, message: string, duration = ToastService.DEFAULT_DURATION): number {
    const id = this.nextId++;
    this.toasts = [...this.toasts, { id, kind, message }];
    this.emit();
    if (duration > 0) {
      window.setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  success(message: string, duration?: number) {
    return this.push('success', message, duration);
  }

  error(message: string, duration?: number) {
    return this.push('error', message, duration ?? 6000);
  }

  info(message: string, duration?: number) {
    return this.push('info', message, duration);
  }

  dismiss(id: number) {
    const before = this.toasts.length;
    this.toasts = this.toasts.filter(t => t.id !== id);
    if (this.toasts.length !== before) this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    for (const listener of this.listeners) listener(this.toasts);
  }
}

export const toast = new ToastService();
