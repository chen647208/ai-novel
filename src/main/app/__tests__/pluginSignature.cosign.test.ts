/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * cosign 真机校验（需要外部 cosign 工具链）：
 * 生成钥匙对 → sign-blob --bundle → 用 verifyCosignBlob 校验通过；篡改内容失败。
 * 无 cosign 时整组跳过；可用 `HONGYUE_COSIGN_BIN` 指定可执行文件。
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { cosignAvailable, resolveCosignBin, verifyCosignBlob } from '../pluginSignature.js';

const describeCosign = cosignAvailable() ? describe : describe.skip;

describeCosign('pluginSignature（cosign 真机）', () => {
  it('key 模式：sign-blob --bundle 校验通过，篡改失败', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hy-cosign-test-'));
    try {
      const bin = resolveCosignBin();
      const env = { ...process.env, COSIGN_PASSWORD: 'testpass' };
      const run = (args: string[]) => spawnSync(bin, args, { env, stdio: 'ignore' });

      const keyPrefix = join(dir, 'cosign');
      expect(run(['generate-key-pair', '--output-key-prefix', keyPrefix]).status, 'generate-key-pair').toBe(0);

      const content = '{"id":"com.example.plugin"}';
      const blob = join(dir, 'plugin.json');
      writeFileSync(blob, content);
      const bundlePath = join(dir, 'plugin.bundle');
      expect(
        run(['sign-blob', '--key', `${keyPrefix}.key`, '--yes', '--bundle', bundlePath, blob]).status,
        'sign-blob',
      ).toBe(0);

      const bundle = readFileSync(bundlePath).toString('base64');
      const publicKey = readFileSync(`${keyPrefix}.pub`, 'utf8');
      expect(verifyCosignBlob(content, { bundle, publicKey })).toBe(true);
      expect(verifyCosignBlob('{"id":"tampered"}', { bundle, publicKey })).toBe(false);
      expect(verifyCosignBlob(content, { bundle })).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
