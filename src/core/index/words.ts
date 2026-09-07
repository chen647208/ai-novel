/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 中日韩感知的字数统计：CJK 逐字计数 + 拉丁词按空白分词。
 * 全应用唯一字数口径（导出统计/写作面板/索引共用，消灭现状三处各算各的）。
 */
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/;
const CJK_RUN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g;
const LATIN_WORD = /[A-Za-z0-9À-ɏ]+(?:['’-][A-Za-z0-9]+)*/g;

export function countWords(text: string): number {
  if (!text) return 0;
  const cjkMatches = text.match(CJK_RUN);
  const cjk = cjkMatches ? cjkMatches.length : 0;
  const latin = text.replace(CJK_RUN, ' ').match(LATIN_WORD);
  return cjk + (latin ? latin.length : 0);
}

/** 是否含 CJK 字符（分词/检索路径选择用） */
export function hasCjk(text: string): boolean {
  return CJK.test(text);
}
