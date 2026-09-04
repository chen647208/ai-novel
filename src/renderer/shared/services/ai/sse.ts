/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

/**
 * 增量 SSE（Server-Sent Events）解析器。
 *
 * 修复旧实现的关键缺陷：旧版对每个网络分片直接 split('\n')，
 * 当事件行恰好在分片边界被截断时（长响应下高频发生），
 * 残缺行会被丢弃或 JSON.parse 失败，导致流式内容丢失/乱码。
 * 本实现维护跨分片缓冲区，只消费完整行。
 */
export interface SSEParser {
  /** 推入一段解码后的文本（可为任意分片边界） */
  push(chunk: string): void;
  /** 流结束时调用，处理缓冲区中残留的最后一行（无换行结尾） */
  flush(): void;
}

/**
 * @param onData 每个 SSE 事件的 data 负载（已去掉 "data:" 前缀并做多行合并）
 *               终止标记 "[DONE]" 会原样传入，由调用方判断。
 */
export function createSSEParser(onData: (data: string) => void): SSEParser {
  let buffer = '';
  let dataLines: string[] = [];

  const dispatchEvent = (): void => {
    if (dataLines.length === 0) return;
    const payload = dataLines.join('\n');
    dataLines = [];
    onData(payload);
  };

  const consumeLine = (line: string): void => {
    // 兼容 CRLF
    if (line.endsWith('\r')) line = line.slice(0, -1);

    if (line === '') {
      // 空行 = 事件边界
      dispatchEvent();
      return;
    }
    if (line.startsWith(':')) {
      // 注释行（部分服务用于 keep-alive）
      return;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
    // 其他字段（event:/id:/retry:）对本场景无意义，忽略
  };

  return {
    push(chunk: string): void {
      buffer += chunk;
      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        consumeLine(line);
      }
    },
    flush(): void {
      if (buffer.length > 0) {
        consumeLine(buffer);
        buffer = '';
      }
      dispatchEvent();
    },
  };
}
