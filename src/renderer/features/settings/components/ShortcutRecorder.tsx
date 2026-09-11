/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React, { useEffect, useState } from 'react';

import { useSettingsStore } from '@/app/stores/settingsStore';
import { useTranslation } from '@/i18n';
import { Button } from '@/shared/ui/Button';
import { Label } from '@/shared/ui/Label';

import type { KeybindingActionId } from '../../../../shared/types';
import {
  DEFAULT_KEYBINDINGS,
  eventToKeybinding,
  findConflicts,
  formatKeybinding,
  type KeybindingMap,
  resolveKeybindings,
} from '../services/keybindings';

const ACTIONS = Object.keys(DEFAULT_KEYBINDINGS) as KeybindingActionId[];

/** 快捷键录制区（docs/design/15）：点动作→按组合即录入，冲突拒绝保存。 */
const ShortcutRecorder: React.FC = () => {
  const { t } = useTranslation('settings');
  const overrides = useSettingsStore((s) => s.keybindings);
  const store = useSettingsStore.getState();
  const [recording, setRecording] = useState<KeybindingActionId | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const resolved = resolveKeybindings(overrides);
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent);

  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setRecording(null);
        return;
      }
      const binding = eventToKeybinding(e);
      if (!binding) return;
      const current: KeybindingMap = { ...resolved };
      const hits = findConflicts(current, recording, binding);
      if (hits.length > 0) {
        const name = hits[0] as KeybindingActionId;
        setConflict(t('general.shortcutConflict', { action: t(`general.shortcutActions.${name}`) }));
        return;
      }
      store.setKeybinding(recording, binding);
      setConflict(null);
      setRecording(null);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [recording, resolved, store, t]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button variant="ghost" size="sm" onClick={() => { store.resetKeybindings(); setConflict(null); }}>
          {t('general.shortcutReset')}
        </Button>
      </div>
      {ACTIONS.map((action) => (
        <div key={action} className="flex items-center justify-between gap-3">
          <Label>{t(`general.shortcutActions.${action}`)}</Label>
          <Button
            variant={recording === action ? 'default' : 'outline'}
            size="sm"
            className="min-w-36 font-mono"
            onClick={() => { setConflict(null); setRecording(action); }}
            title={t('general.shortcutRecord')}
          >
            {recording === action
              ? t('general.shortcutRecording')
              : formatKeybinding(resolved[action] ?? DEFAULT_KEYBINDINGS[action], isMac)}
          </Button>
        </div>
      ))}
      {conflict && <p className="text-xs text-destructive">{conflict}</p>}
    </div>
  );
};

export default ShortcutRecorder;
