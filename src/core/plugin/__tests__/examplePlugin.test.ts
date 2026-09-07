/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateManifest, satisfiesRange, typeTemplateId } from '../manifest.js';
import { installTypeTemplates } from '../contributions.js';
import { TypeRegistry } from '../../types-registry/registry.js';
import { parseSkillMd } from '../../ai/skills.js';
import { PluginHost } from '../runtime.js';

/**
 * 示例插件端到端（examples/plugins/magic-system）：
 * 走真实管线 validateManifest → loadRaw → activate → 命名空间注册，
 * 证明"v0 资源型贡献不改内核可用"，对外宣称插件可用即以此测试为凭。
 * 生产宿主版本 = APP_VERSION（aiRuntime 续注），此处锁 1.0.0。
 */
const ROOT = join(process.cwd(), 'examples', 'plugins', 'magic-system');
const HOST_VERSION = '1.0.0';
const PLUGIN_ID = 'com.novalocal.example-magic';

const FIELD_TYPES = [
  'text',
  'number',
  'boolean',
  'date',
  'list',
  'ref',
  'image',
  'richtext',
  'enum',
  'json',
] as const;

function files(): Record<string, string> {
  return {
    'types/magic-system.json': readFileSync(join(ROOT, 'types', 'magic-system.json'), 'utf-8'),
    'skills/magic-design/SKILL.md': readFileSync(join(ROOT, 'skills', 'magic-design', 'SKILL.md'), 'utf-8'),
  };
}

describe('示例插件', () => {
  it('manifest 合法且宿主区间与生产版本兼容', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'plugin.json'), 'utf-8'));
    const result = validateManifest(manifest);
    expect(result.ok, result.ok ? '' : JSON.stringify(result.issues)).toBe(true);
    expect(satisfiesRange(HOST_VERSION, manifest.host)).toBe(true);
  });

  it('贡献路径真实存在', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'plugin.json'), 'utf-8')) as {
      contributes: { types: string[]; skills: string[] };
    };
    for (const rel of [...manifest.contributes.types, ...manifest.contributes.skills]) {
      expect(existsSync(join(ROOT, rel)), rel).toBe(true);
    }
  });

  it('loadRaw→activate 落为 active，模板带命名空间前缀可用', () => {
    const registry = new TypeRegistry();
    const skillNames: string[] = [];
    const host = new PluginHost({ hostVersion: HOST_VERSION }, (plugin) => {
      const disposables: Array<{ dispose(): void }> = [];
      for (const rel of plugin.manifest.contributes?.types ?? []) {
        const prefix = `${rel.replace(/^\.\//, '').replace(/\/+$/, '')}/`;
        for (const [file, content] of Object.entries(plugin.files)) {
          if (!file.startsWith(prefix) || !file.endsWith('.json')) continue;
          const templates = JSON.parse(content) as Array<Record<string, unknown>>;
          disposables.push(...installTypeTemplates(plugin.manifest.id, templates, registry, typeTemplateId));
        }
      }
      for (const rel of plugin.manifest.contributes?.skills ?? []) {
        const prefix = `${rel.replace(/^\.\//, '').replace(/\/+$/, '')}/`;
        for (const [file, content] of Object.entries(plugin.files)) {
          if (!file.startsWith(prefix) || !file.endsWith('.md')) continue;
          const parsed = parseSkillMd(content, 'plugin', `${plugin.manifest.id}/${file}`);
          if (parsed.skill) skillNames.push(parsed.skill.name);
        }
      }
      return disposables;
    });

    const manifest = JSON.parse(readFileSync(join(ROOT, 'plugin.json'), 'utf-8'));
    host.loadRaw(PLUGIN_ID, manifest, files());
    host.activate(PLUGIN_ID);
    expect(host.list().find((s) => s.id === PLUGIN_ID)?.state).toBe('active');

    const system = registry.get('example-magic.magic-system');
    expect(system).toBeDefined();
    for (const field of system?.fields ?? []) {
      expect(FIELD_TYPES as readonly string[]).toContain(field.type);
      if (field.type === 'enum') expect(field.enum?.length ?? 0).toBeGreaterThan(0);
      if (field.type === 'ref') expect(field.refType).toBeTruthy();
    }
    expect(registry.get('example-magic.magic-spell')).toBeDefined();
    expect(skillNames).toContain('magic-design');
  });

  it('unwind：dispose 后模板干净消失', () => {
    const registry = new TypeRegistry();
    const raw = JSON.parse(
      readFileSync(join(ROOT, 'types', 'magic-system.json'), 'utf-8')
    ) as Array<Record<string, unknown>>;
    const disposables = installTypeTemplates(PLUGIN_ID, raw, registry, typeTemplateId);
    expect(registry.get('example-magic.magic-system')).toBeDefined();
    for (const d of disposables) d.dispose();
    expect(registry.get('example-magic.magic-system')).toBeUndefined();
    expect(registry.get('example-magic.magic-spell')).toBeUndefined();
  });
});
