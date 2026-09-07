/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import { PromptAssembler, truncateText, type PromptSection } from '../promptAssembler.js';
import {
  registerBuiltinSections,
  renderIndexDigest,
  renderWorldDigest,
  userTaskSection,
} from '../builtinSections.js';
import type { IndexSnapshot } from '../../index';
import type { Project } from '../../../shared/types';

const section = (id: string, order: number, body: string | undefined, title = id): PromptSection => ({
  id,
  title,
  order,
  render: () => body,
});

describe('PromptAssembler', () => {
  it('按 order 排序装配，render undefined 的段落跳过', () => {
    const asm = new PromptAssembler();
    asm.register(section('c', 30, '正文三'));
    asm.register(section('a', 10, '正文一'));
    asm.register(section('skip', 20, undefined));
    asm.register(section('b', 15, '正文二'));

    const result = asm.assemble({});
    expect(result.sections).toEqual(['a', 'b', 'c']);
    expect(result.prompt).toContain('【a】\n正文一');
    expect(result.prompt).not.toContain('skip');
    expect(result.prompt.indexOf('正文一')).toBeLessThan(result.prompt.indexOf('正文二'));
    expect(result.truncated).toBe(false);
  });

  it('超预算时从尾部整段丢弃，保住高优 section', () => {
    const asm = new PromptAssembler();
    asm.register(section('head', 10, 'H'.repeat(40)));
    asm.register(section('mid', 20, 'M'.repeat(40)));
    asm.register(section('tail', 30, 'T'.repeat(40)));

    const result = asm.assemble({ charBudget: 100 });
    expect(result.sections).toEqual(['head', 'mid']);
    expect(result.prompt).not.toContain('TTTT');
    expect(result.truncated).toBe(true);
  });

  it('预算紧张时先丢可再生段，任务与工具段永不丢弃', () => {
    const asm = new PromptAssembler();
    asm.register(section('identity', 10, 'I'.repeat(20)));
    asm.register(section('worldDigest', 30, 'W'.repeat(80)));
    asm.register(section('toolSchemas', 60, 'T'.repeat(20)));
    asm.register(section('userTask', 100, '查第三章'));

    const result = asm.assemble({ charBudget: 90 });
    expect(result.sections).toContain('userTask');
    expect(result.sections).toContain('toolSchemas');
    expect(result.sections).not.toContain('worldDigest');
    expect(result.prompt).toContain('查第三章');
    expect(result.truncated).toBe(true);
  });

  it('单段超预算时截断该段文本', () => {
    const asm = new PromptAssembler();
    asm.register(section('only', 10, 'x'.repeat(200)));

    const result = asm.assemble({ charBudget: 50 });
    expect(result.sections).toEqual(['only']);
    expect(result.prompt).toContain('[内容已截断...]');
    expect(result.truncated).toBe(true);
  });

  it('插件 section 可动态注册与注销', () => {
    const asm = new PromptAssembler();
    asm.register(section('builtin', 10, '内置'));
    asm.register(section('plugin.x', 15, '插件内容'));
    expect(asm.list()).toEqual(['builtin', 'plugin.x']);

    expect(asm.unregister('plugin.x')).toBe(true);
    const result = asm.assemble({});
    expect(result.sections).toEqual(['builtin']);
    expect(result.prompt).not.toContain('插件内容');
  });

  it('registerBuiltinSections 后 identity 在 userTask 之前', () => {
    const asm = new PromptAssembler();
    registerBuiltinSections(asm);
    const result = asm.assemble({ userTask: '写一个雨夜追杀场景' });
    expect(result.sections).toContain('identity');
    expect(result.sections).toContain('userTask');
    expect(result.prompt.indexOf('身份')).toBeLessThan(result.prompt.indexOf('写一个雨夜追杀场景'));
    expect(userTaskSection.render({ userTask: '  ' })).toBeUndefined();
  });
});

describe('truncateText', () => {
  it('短文本原样返回', () => {
    expect(truncateText('短文本', 100)).toBe('短文本');
  });

  it('优先在换行处截断', () => {
    const text = `${'a'.repeat(30)}\n${'b'.repeat(30)}`;
    const out = truncateText(text, 40);
    expect(out).toContain('[内容已截断...]');
    expect(out).not.toContain('b'.repeat(30));
  });
});

describe('renderWorldDigest', () => {
  it('渲染世界观/地点/势力/规则体系', () => {
    const project = {
      title: '星尘之恋',
      worldView: {
        magicSystem: { name: '星辉术', description: '以星辰之力驱动', rules: ['夜間增强', '消耗心神'] },
      },
      locations: [{ id: 'l1', name: '观星台', type: '建筑', description: '城中最高处，可俯瞰全城'.padEnd(120, '。') }],
      factions: [{ id: 'f1', name: '守夜人', type: '组织', description: '维护历法与星象记录' }],
      ruleSystems: [{ id: 'r1', name: '星辉阶位', type: '等级', levels: [{ name: '见星' }, { name: '摘星' }] }],
    } as unknown as Project;

    const text = renderWorldDigest(project);
    expect(text).toContain('【作品标题】星尘之恋');
    expect(text).toContain('星辉术');
    expect(text).toContain('观星台');
    expect(text).toContain('守夜人');
    expect(text).toContain('2个等级');
  });
});

describe('renderIndexDigest', () => {
  it('渲染标签热度/线索/伏笔/未解析引用', () => {
    const index: IndexSnapshot = {
      bookId: 'b1',
      tags: new Map([['星辉', { nodeId: 'n1', displayName: '星辉术', aliases: [], kind: 'implicit' }]]),
      refs: new Map([['星辉', [{ nodeId: 'n2', role: 'mention', keyword: '星辉', target: '星辉' }]]]),
      hardLinks: new Map(),
      backlinks: new Map(),
      wordCounts: new Map([['n1', 1200], ['n2', 800]]),
      strandProgress: new Map([['主线', { strandTag: '主线', sceneCount: 6, wordCount: 2000 }]]),
      foreshadowOpen: [{ nodeId: 'n3', title: '断掉的剑穗', importance: 'high', plantedChapterOrder: 2, ageChapters: 11, overdue: true }],
      unresolved: [{ nodeId: 'n4', role: 'mention', keyword: '北境', target: '北境' }],
      builtAt: 0,
      revision: 1,
    };

    const text = renderIndexDigest(index);
    expect(text).toContain('星辉术(1)');
    expect(text).toContain('主线（6 场景/约 2000 字）');
    expect(text).toContain('《断掉的剑穗》埋于第 2 章、已 11 章（超期）');
    expect(text).toContain('未解析引用 1 处：北境');
    expect(text).toContain('约 2000');
  });
});
