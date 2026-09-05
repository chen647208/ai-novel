/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React from 'react';
import { i18n } from '@/i18n';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** 出错区域名称，用于日志与界面提示 */
  scope?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 全局错误边界：捕获渲染期异常，避免整棵组件树白屏。
 * 提供"重试渲染"与"重新加载应用"两级恢复手段。
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(`[ErrorBoundary:${this.props.scope ?? 'app'}]`, error, info.componentStack);
    try {
      // 保留最近 20 条崩溃记录，便于在设置面板/日志中排查
      const KEY = 'novelocal_error_logs';
      const raw = localStorage.getItem(KEY);
      const logs: Array<{ time: number; scope: string; message: string }> = raw ? JSON.parse(raw) : [];
      logs.push({ time: Date.now(), scope: this.props.scope ?? 'app', message: error.message });
      localStorage.setItem(KEY, JSON.stringify(logs.slice(-20)));
    } catch {
      // localStorage 不可用时忽略
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-900 text-neutral-100">
        <div className="max-w-lg rounded-xl border border-neutral-700 bg-neutral-800 p-8 shadow-2xl">
          <h1 className="mb-2 text-xl font-bold text-red-400">{i18n.t('errorBoundary.title')}</h1>
          <p className="mb-4 text-sm text-neutral-400">
            {this.props.scope
              ? i18n.t('errorBoundary.regionError', { scope: this.props.scope })
              : i18n.t('errorBoundary.appError')}
          </p>
          <pre className="mb-6 max-h-32 overflow-auto rounded bg-neutral-900 p-3 text-xs text-neutral-500">
            {this.state.error?.message ?? i18n.t('errorBoundary.unknown')}
          </pre>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
            >
              {i18n.t('errorBoundary.retry')}
            </button>
            <button
              onClick={this.handleReload}
              className="flex-1 rounded-lg border border-neutral-600 px-4 py-2 text-sm font-medium hover:bg-neutral-700"
            >
              {i18n.t('errorBoundary.reload')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
