/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 协作会话：以作品为房间，Y.Doc 为协作副本，同机多窗口经 BroadcastChannel 交换增量。
 * 持久化仍走既有 projectStore → sqlite 链路，Y.Doc 不落第二个存储。
 */
import { STORAGE_KEYS } from '@shared/constants/storageKeys';
import { useEffect } from 'react';
import type * as Y from 'yjs';
import { create } from 'zustand';

import { type CollaborationTransport,createBroadcastTransport } from '@/features/collaboration/broadcastTransport';
import { applyProjectToDoc, createProjectDoc, docToProjectPatch } from '@/features/collaboration/projectDoc';
import { localStore } from '@/shared/services/localStore';

import { useProjectStore } from '../stores/projectStore';

interface CollaborationSession {
  projectId: string;
  room: string;
  doc: Y.Doc;
  transport: CollaborationTransport;
  unsubscribe: () => void;
}

interface CollaborationState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

let session: CollaborationSession | null = null;
let applyingRemote = false;

function readEnabled(): boolean {
  try {
    return localStore.getItem(STORAGE_KEYS.collabEnabled) === '1';
  } catch {
    return false;
  }
}

export const useCollaborationStore = create<CollaborationState>()((set) => ({
  enabled: readEnabled(),
  setEnabled: (enabled) => {
    set({ enabled });
    localStore.setItem(STORAGE_KEYS.collabEnabled, enabled ? '1' : '0');
  },
}));

export function isCollaborationEnabled(): boolean {
  return useCollaborationStore.getState().enabled;
}

export function getCollaborationSession(): { projectId: string; room: string } | null {
  return session ? { projectId: session.projectId, room: session.room } : null;
}

export function startCollaboration(projectId: string): void {
  if (session?.projectId === projectId) return;
  stopCollaboration();
  const project = useProjectStore.getState().projects.find((item) => item.id === projectId);
  if (!project) return;

  const room = `book:${projectId}`;
  const doc = createProjectDoc(project);
  const transport = createBroadcastTransport(doc, room);

  const onDocUpdate = (_update: Uint8Array, origin: unknown): void => {
    if (origin === 'local-project' || origin === 'seed') return;
    applyingRemote = true;
    try {
      useProjectStore.getState().updateProject(projectId, docToProjectPatch(doc));
    } finally {
      applyingRemote = false;
    }
  };
  doc.on('update', onDocUpdate);

  const unsubscribe = useProjectStore.subscribe((state) => {
    if (applyingRemote || state.activeProjectId !== projectId) return;
    const local = state.projects.find((item) => item.id === projectId);
    if (!local) return;
    applyProjectToDoc(doc, local, 'local-project');
  });

  session = { projectId, room, doc, transport, unsubscribe };
}

export function stopCollaboration(): void {
  if (!session) return;
  session.unsubscribe();
  session.transport.destroy();
  session.doc.destroy();
  session = null;
}

/** App 层接线：开关与当前作品变化时启停协作会话。 */
export function useCollaborationSync(): void {
  const enabled = useCollaborationStore((state) => state.enabled);
  const activeProjectId = useProjectStore((state) => state.activeProjectId);

  useEffect(() => {
    if (enabled && activeProjectId) startCollaboration(activeProjectId);
    else stopCollaboration();
  }, [enabled, activeProjectId]);
}
