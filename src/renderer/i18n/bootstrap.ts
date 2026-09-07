/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { initI18n } from './config';

/**
 * 在首次渲染前初始化 i18n。此处不传语言，交由检测器读取 navigator 得到初始语言，
 * 避免首帧闪烁；已持久化的用户语言在 App 加载状态后通过 changeLanguage 同步。
 */
export async function bootstrapI18n(): Promise<void> {
  await initI18n();
}
