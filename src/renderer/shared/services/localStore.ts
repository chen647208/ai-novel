/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { logger } from '../utils/logger';

/**
 * localStorage 的唯一封装出口（渲染层）。
 *
 * 直接调用 localStorage 在隐私模式、配额耗尽等场景会抛异常；本模块统一 try/catch 并记录日志，
 * 语义与原生 API 一致（字符串键值）。键名统一取自 `@shared/constants/storageKeys`。
 */
export const localStore = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      logger.warn('localStore.getItem failed:', error);
      return null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      logger.warn('localStore.setItem failed:', error);
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logger.warn('localStore.removeItem failed:', error);
    }
  },
};
