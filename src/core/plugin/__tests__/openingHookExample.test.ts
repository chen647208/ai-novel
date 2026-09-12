/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect,it } from 'vitest';

import { parseSkillMd } from '../../ai/skills.js';
import { satisfiesRange, validateManifest } from '../manifest.js';

const ROOT = join(process.cwd(), 'examples', 'plugins', 'opening-hook');
const TEMPLATE = join(process.cwd(), 'examples', 'plugins', '_template');

interface RawManifest {
  id: string;
  host: string;
  contributes: {
    skills: string[];
    logic: string[];
    editor: string[];
    types: string[];
    hooks: string;
  };
}

function readManifest(root: string): RawManifest {
  return JSON.parse(readFileSync(join(root, 'plugin.json'), 'utf-8')) as RawManifest;
}

describe('示例插件 opening-hook（全贡献点）', () => {
  it('manifest 通过校验且 host 匹配', () => {
    const manifest = readManifest(ROOT);
    const result = validateManifest(manifest);
    expect(result.ok, result.ok ? '' : JSON.stringify(result.issues)).toBe(true);
    expect(satisfiesRange('1.0.0', manifest.host)).toBe(true);
  });

  it('贡献路径存在', () => {
    const { contributes } = readManifest(ROOT);
    for (const rel of [...contributes.skills, ...contributes.logic, ...contributes.editor, ...contributes.types]) {
      expect(existsSync(join(ROOT, rel)), rel).toBe(true);
    }
    expect(existsSync(join(ROOT, contributes.hooks))).toBe(true);
  });

  it('技能与逻辑轨 handler 可解析', () => {
    const md = readFileSync(join(ROOT, 'skills', 'opening-hook', 'SKILL.md'), 'utf-8');
    const { skill } = parseSkillMd(md, 'plugin');
    expect(skill?.name).toBe('opening-hook');
    expect(readFileSync(join(ROOT, 'skills', 'opening-hook', 'handler.js'), 'utf-8')).toContain('function run');
  });

  it('hooks 含声明式注入与逻辑调用', () => {
    const parsed = JSON.parse(readFileSync(join(ROOT, 'hooks.json'), 'utf-8')) as {
      hooks: Array<{ do: string; fn?: string }>;
    };
    expect(parsed.hooks.some((h) => h.do === 'inject')).toBe(true);
    const logic = parsed.hooks.find((h) => h.do === 'logic');
    expect(logic?.fn).toBe('injectOpeningRules');
    expect(readFileSync(join(ROOT, 'logic', 'hooks.js'), 'utf-8')).toContain('function injectOpeningRules');
  });

  it('编辑器扩展提供 index.html', () => {
    expect(existsSync(join(ROOT, 'editor', 'index.html'))).toBe(true);
  });

  it('模板 manifest 通过校验', () => {
    const result = validateManifest(readManifest(TEMPLATE));
    expect(result.ok, result.ok ? '' : JSON.stringify(result.issues)).toBe(true);
  });
});
