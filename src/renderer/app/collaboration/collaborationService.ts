/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 协作会话：以作品为房间，Y.Doc 为协作副本。
 * 同机多窗口走 BroadcastChannel；填了中转地址则经主进程 WebSocket 跨设备同步。
 * 持久化仍走既有 projectStore → sqlite 链路，Y.Doc 不落第二个存储。
 */
import { STORAGE_KEYS } from '@shared/constants/storageKeys';
import { useEffect } from 'react';
import * as Y from 'yjs';
import { create } from 'zustand';

import { type CollaborationPeer, type CollaborationTransport,createBroadcastTransport } from '@/features/collaboration/broadcastTransport';
import { createIpcTransport } from '@/features/collaboration/ipcTransport';
import { applyProjectToDoc, docToProjectPatch } from '@/features/collaboration/projectDoc';
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
  peers: CollaborationPeer[];
  serverUrl: string;
  setEnabled: (enabled: boolean) => void;
  setServerUrl: (url: string) => void;
}

let session: CollaborationSession | null = null;
let applyingRemote = false;

/** 播种前的等待时间：给对端一个回包窗口，避免各自播种。 */
const SEED_GRACE_MS = 400;

function readEnabled(): boolean {
  try {
    return localStore.getItem(STORAGE_KEYS.collabEnabled) === '1';
  } catch {
    return false;
  }
}

function readServerUrl(): string {
  try {
    return localStore.getItem(STORAGE_KEYS.collabServerUrl) ?? '';
  } catch {
    return '';
  }
}

export const useCollaborationStore = create<CollaborationState>()((set) => ({
  enabled: readEnabled(),
  peers: [],
  serverUrl: readServerUrl(),
  setEnabled: (enabled) => {
    set({ enabled });
    localStore.setItem(STORAGE_KEYS.collabEnabled, enabled ? '1' : '0');
  },
  setServerUrl: (url) => {
    set({ serverUrl: url });
    localStore.setItem(STORAGE_KEYS.collabServerUrl, url);
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
  const doc = new Y.Doc();
  let receivedRemote = false;
  const serverUrl = useCollaborationStore.getState().serverUrl.trim();
  const transportOptions = {
    onPresence: (peers: CollaborationPeer[]) => useCollaborationStore.setState({ peers }),
    onRemoteUpdate: () => {
      receivedRemote = true;
    },
  };
  const transport = serverUrl
    ? createIpcTransport(doc, room, { ...transportOptions, url: serverUrl })
    : createBroadcastTransport(doc, room, transportOptions);

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

  const current: CollaborationSession = { projectId, room, doc, transport, unsubscribe };
  session = current;

  // 播种握手：等待片刻确认没有对端后再用本地作品初始化，避免两端各自播种产生重复章节。
  setTimeout(() => {
    if (session !== current || receivedRemote) return;
    applyProjectToDoc(doc, project, 'seed');
  }, SEED_GRACE_MS);
}

export function stopCollaboration(): void {
  if (!session) return;
  session.unsubscribe();
  session.transport.destroy();
  session.doc.destroy();
  session = null;
  useCollaborationStore.setState({ peers: [] });
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
