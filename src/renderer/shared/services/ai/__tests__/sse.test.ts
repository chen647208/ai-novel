/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import { describe, it, expect } from 'vitest';
import { createSSEParser } from '../sse';

/** 把字符串按任意边界切片喂给解析器，验证输出与切片方式无关 */
function feedInSlices(input: string, sliceSize: number): string[] {
  const events: string[] = [];
  const parser = createSSEParser((data) => events.push(data));
  for (let i = 0; i < input.length; i += sliceSize) {
    parser.push(input.slice(i, i + sliceSize));
  }
  parser.flush();
  return events;
}

describe('createSSEParser', () => {
  const sample = 'data: {"a":1}\n\ndata: {"b":2}\n\ndata: [DONE]\n\n';

  it('标准事件按序解析', () => {
    expect(feedInSlices(sample, 1000)).toEqual(['{"a":1}', '{"b":2}', '[DONE]']);
  });

  it('事件行在网络分片边界被截断时不丢数据（旧实现的核心缺陷）', () => {
    // 逐字符推送：每个 data 行都可能被截断
    expect(feedInSlices(sample, 1)).toEqual(['{"a":1}', '{"b":2}', '[DONE]']);
    expect(feedInSlices(sample, 3)).toEqual(['{"a":1}', '{"b":2}', '[DONE]']);
    expect(feedInSlices(sample, 7)).toEqual(['{"a":1}', '{"b":2}', '[DONE]']);
  });

  it('支持多行 data 合并为单个事件', () => {
    const events = feedInSlices('data: line1\ndata: line2\n\n', 4);
    expect(events).toEqual(['line1\nline2']);
  });

  it('忽略注释行（keep-alive）', () => {
    const events = feedInSlices(': ping\n\ndata: ok\n\n', 2);
    expect(events).toEqual(['ok']);
  });

  it('兼容 CRLF 行尾', () => {
    const events = feedInSlices('data: hello\r\n\r\n', 5);
    expect(events).toEqual(['hello']);
  });

  it('flush 处理无换行结尾的残留行', () => {
    const events: string[] = [];
    const parser = createSSEParser((d) => events.push(d));
    parser.push('data: tail-no-newline');
    parser.flush();
    expect(events).toEqual(['tail-no-newline']);
  });

  it('data: 前缀后的单个空格被去除，其余保留', () => {
    const events = feedInSlices('data:  two-leading-spaces\n\n', 100);
    expect(events).toEqual([' two-leading-spaces']);
  });
});
