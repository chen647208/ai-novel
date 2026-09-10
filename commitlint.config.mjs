/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 允许中文主题，不强制大小写/句末标点
    'subject-case': [0],
    'subject-full-stop': [0, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
};
