/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React from 'react';
import { Brain, Cpu, Database, GraduationCap, Puzzle, SlidersHorizontal, Stethoscope, Terminal, WandSparkles, type LucideIcon } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { cn } from '@/shared/utils/cn';
import type { SettingsTab } from '../types';

interface SettingsTabNavProps {
  activeTab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

const tabItems: Array<{ id: SettingsTab; icon: LucideIcon; labelKey: 'tab.general' | 'tab.models' | 'tab.prompts' | 'tab.cardPrompts' | 'tab.consistencyPrompts' | 'tab.system' | 'tab.storage' | 'tab.embedding' | 'tab.plugins' }> = [
  { id: 'general', icon: SlidersHorizontal, labelKey: 'tab.general' },
  { id: 'models', icon: Cpu, labelKey: 'tab.models' },
  { id: 'prompts', icon: Terminal, labelKey: 'tab.prompts' },
  { id: 'card-prompts', icon: WandSparkles, labelKey: 'tab.cardPrompts' },
  { id: 'consistency-prompts', icon: Stethoscope, labelKey: 'tab.consistencyPrompts' },
  { id: 'system', icon: GraduationCap, labelKey: 'tab.system' },
  { id: 'storage', icon: Database, labelKey: 'tab.storage' },
  { id: 'embedding', icon: Brain, labelKey: 'tab.embedding' },
  { id: 'plugins', icon: Puzzle, labelKey: 'tab.plugins' },
];

const SettingsTabNav: React.FC<SettingsTabNavProps> = ({ activeTab, onChange }) => {
  const { t } = useTranslation('settings');
  return (
    <div className="flex flex-wrap gap-2">
      {tabItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap',
            activeTab === item.id
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <item.icon className="size-4" /> {t(item.labelKey)}
        </button>
      ))}
    </div>
  );
};

export default SettingsTabNav;
