/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 文件选择对话框取消的哨兵错误。
 *
 * 用户取消选择不是失败：调用方据类型判定并静默返回，避免拿本地化文案做字符串比较
 * （英文界面下会误判为失败）。
 */
export class FileDialogCanceledError extends Error {
  readonly code = 'FILE_DIALOG_CANCELED';

  constructor() {
    super('FILE_DIALOG_CANCELED');
    this.name = 'FileDialogCanceledError';
  }
}

export function isFileDialogCanceled(error: unknown): boolean {
  if (error instanceof FileDialogCanceledError) return true;
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'FILE_DIALOG_CANCELED'
  );
}
