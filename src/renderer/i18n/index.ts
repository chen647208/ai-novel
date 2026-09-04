/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

export {
  i18n,
  initI18n,
  changeLanguage,
  getEffectiveLanguage,
  normalizeLanguage,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  NAMESPACES,
  resources,
} from './config';
export { bootstrapI18n } from './bootstrap';
// 数据目录型（运行时组合键）取词助手：服务商名称/描述/提示、模板显示名等。
export { dt, dtList, dtObject, templateDisplayName } from './dynamic';
// 统一从 @/i18n 暴露 react-i18next 的取词入口，组件无需直接依赖第三方包路径。
export { useTranslation, Trans } from 'react-i18next';
