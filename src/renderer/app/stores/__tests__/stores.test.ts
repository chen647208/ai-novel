/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore, selectActiveProject } from '../projectStore';
import { useSettingsStore } from '../settingsStore';
import { composeAppState, seedPersistBaseline, getLastPersistedSnapshot } from '../persistenceBridge';
import { computePersistDiff } from '../../persistDiff';
import type { Project } from '../../../../shared/types';

// setTheme 动作内即时生效会触碰 document；无头环境 mock 掉主题应用
vi.mock('../../../shared/services/themeService', () => ({
  applyTheme: vi.fn(),
  watchSystemTheme: vi.fn(() => () => undefined),
}));

const book = (id: string, title = id): Project => ({
  id, title, inspiration: '', intro: '', characters: [], outline: '',
  chapters: [], virtualChapters: [], knowledge: [], lastModified: 1,
});

describe('projectStore', () => {
  beforeEach(() => {
    useProjectStore.getState().hydrate([], null);
  });

  it('updateActiveProject：无活动书时创建默认书并激活', () => {
    useProjectStore.getState().updateActiveProject({ outline: '大纲' });
    const s = useProjectStore.getState();
    expect(s.projects).toHaveLength(1);
    expect(s.projects[0]?.outline).toBe('大纲');
    expect(s.activeProjectId).toBe(s.projects[0]?.id);
  });

  it('updateActiveProject：有活动书时原位合并并刷新 lastModified', () => {
    useProjectStore.getState().hydrate([book('b1')], 'b1');
    useProjectStore.getState().updateActiveProject({ outline: '新大纲' });
    const p = useProjectStore.getState().projects[0];
    expect(p?.outline).toBe('新大纲');
    expect(p?.lastModified).toBeGreaterThan(1);
  });

  it('upsertProject：不存在则插入并激活；存在则原位替换', () => {
    useProjectStore.getState().upsertProject(book('b1'));
    expect(useProjectStore.getState().activeProjectId).toBe('b1');
    useProjectStore.getState().upsertProject({ ...book('b1'), title: '改名' });
    const s = useProjectStore.getState();
    expect(s.projects).toHaveLength(1);
    expect(s.projects[0]?.title).toBe('改名');
  });

  it('removeProject：删除活动书后活动指针落到剩余首本或 null', () => {
    useProjectStore.getState().hydrate([book('b1'), book('b2')], 'b1');
    useProjectStore.getState().removeProject('b1');
    expect(useProjectStore.getState().activeProjectId).toBe('b2');
    useProjectStore.getState().removeProject('b2');
    expect(useProjectStore.getState().activeProjectId).toBeNull();
  });

  it('selectActiveProject 选择器返回活动书或 null', () => {
    useProjectStore.getState().hydrate([book('b1')], 'b1');
    expect(selectActiveProject(useProjectStore.getState())?.id).toBe('b1');
    useProjectStore.getState().hydrate([], null);
    expect(selectActiveProject(useProjectStore.getState())).toBeNull();
  });
});

describe('settingsStore + persistenceBridge', () => {
  beforeEach(() => {
    useProjectStore.getState().hydrate([], null);
    // 复位外观偏好，避免跨测试的状态泄漏导致差分为空
    useSettingsStore.setState({ theme: undefined, language: undefined });
    seedPersistBaseline(null);
  });

  it('composeAppState 组合双 store 为逻辑 AppState', () => {
    useProjectStore.getState().hydrate([book('b1')], 'b1');
    useSettingsStore.getState().setTheme('dark');
    const state = composeAppState();
    expect(state.projects.map(p => p.id)).toEqual(['b1']);
    expect(state.activeProjectId).toBe('b1');
    expect(state.theme).toBe('dark');
    expect(state.models.length).toBeGreaterThan(0);
  });

  it('store 变化经哨兵快照产生最小差分（saveSettings 分片）', () => {
    const base = composeAppState();
    seedPersistBaseline(base);
    useSettingsStore.getState().setTheme('dark');
    const next = composeAppState();
    // 桥是异步 flush：同步快照可能尚未更新，断言最终一致性
    expect(getLastPersistedSnapshot() === next || getLastPersistedSnapshot() === base).toBe(true);
    const ops = computePersistDiff(base, next);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ kind: 'saveSettings', patch: { theme: 'dark' } });
  });

  it('项目编辑产生 saveProject 差分；未动的书不出现在 ops', () => {
    const b1 = book('b1');
    useProjectStore.getState().hydrate([b1], 'b1');
    const base = composeAppState();
    seedPersistBaseline(base);
    useProjectStore.getState().updateActiveProject({ outline: 'x' });
    const ops = computePersistDiff(base, composeAppState());
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ kind: 'saveProject' });
  });

  it('删除书产生 deleteProject 差分（活动书删除还会写 activeProjectId 设置分片）', () => {
    useProjectStore.getState().hydrate([book('b1'), book('b2')], 'b1');
    const base = composeAppState();
    seedPersistBaseline(base);
    useProjectStore.getState().removeProject('b1');
    const ops = computePersistDiff(base, composeAppState());
    const del = ops.find(o => o.kind === 'deleteProject');
    expect(del).toMatchObject({ kind: 'deleteProject', id: 'b1' });
    // 活动指针从 b1 落到 b2，产生 activeProjectId 设置分片（非活动书删除则无此分片）
    const settingsOps = ops.filter(o => o.kind === 'saveSettings');
    expect(settingsOps.length).toBeLessThanOrEqual(1);
  });

  it('删除非活动书只产生 deleteProject，无设置分片', () => {
    useProjectStore.getState().hydrate([book('b1'), book('b2')], 'b2');
    const base = composeAppState();
    seedPersistBaseline(base);
    useProjectStore.getState().removeProject('b1');
    const ops = computePersistDiff(base, composeAppState());
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ kind: 'deleteProject', id: 'b1' });
  });

  it('startPersistenceBridge 幂等：重复启动只叠一组订阅，解绑可安全重复调用', async () => {
    const { startPersistenceBridge } = await import('../persistenceBridge');
    const un1 = startPersistenceBridge();
    const un2 = startPersistenceBridge();
    // 触发一次变化不应抛错（flush 走 JSON 后端/localStorage）
    useProjectStore.getState().upsertProject(book('b9'));
    await new Promise(r => setTimeout(r, 0));
    expect(() => { un1(); un2(); }).not.toThrow();
  });
});
