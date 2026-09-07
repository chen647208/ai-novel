/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { initI18n } from './config';

/**
 * 测试全局前置：以中文母版初始化 i18n 单例。
 * 服务层（适配器/aiService/json/retry）在调用时通过 i18n.t('ns:key') 取词，
 * 未初始化时 t() 会返回键名，导致断言真实文案的测试失败。initI18n 幂等，重复调用安全。
 */
await initI18n('zh');
