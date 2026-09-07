/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React, { useState } from 'react';
import { useTranslation } from '@/i18n';
import { Button } from '@/shared/ui/Button';
import { Dialog, DialogContent } from '@/shared/ui/Dialog';
import { Input } from '@/shared/ui/Input';
import { cn } from '@/shared/utils/cn';
import { Bot, PenLine, Sparkles } from 'lucide-react';

export type OnboardingPersona = 'hand' | 'assisted' | 'ai';

interface OnboardingModalProps {
  open: boolean;
  onDone: (persona: OnboardingPersona, title: string) => void;
  onOpenSettings: () => void;
}

const PERSONAS: Array<{ id: OnboardingPersona; icon: typeof PenLine }> = [
  { id: 'hand', icon: PenLine },
  { id: 'assisted', icon: Sparkles },
  { id: 'ai', icon: Bot },
];

/**
 * 首启向导：三类人群一次分流。大而全但不一次全塞：选身份 → 按需配模型 → 起首书名。
 */
export const OnboardingModal: React.FC<OnboardingModalProps> = ({ open, onDone, onOpenSettings }) => {
  const { t } = useTranslation('onboarding');
  const [persona, setPersona] = useState<OnboardingPersona>('assisted');
  const [title, setTitle] = useState('');
  const personaText: Record<OnboardingPersona, { title: string; desc: string }> = {
    hand: { title: t('persona.hand.title'), desc: t('persona.hand.desc') },
    assisted: { title: t('persona.assisted.title'), desc: t('persona.assisted.desc') },
    ai: { title: t('persona.ai.title'), desc: t('persona.ai.desc') },
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent hideClose className="w-[92vw] max-w-lg gap-0 overflow-hidden p-0">
        <div className="border-b border-border bg-muted/30 px-6 py-4">
          <h3 className="font-serif text-lg font-medium text-foreground">{t('title')}</h3>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="space-y-5 p-6">
          <div className="grid grid-cols-3 gap-2">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPersona(p.id)}
                className={cn(
                  'rounded-lg border p-3 text-left transition-colors',
                  persona === p.id ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-accent/40'
                )}
              >
                <p.icon className={cn('mb-2 size-5', persona === p.id ? 'text-primary' : 'text-muted-foreground')} />
                <div className="text-sm font-medium text-foreground">{personaText[p.id].title}</div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{personaText[p.id].desc}</div>
              </button>
            ))}
          </div>
          {persona !== 'hand' && (
            <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
              {persona === 'assisted' ? t('suggestAssisted') : t('suggestAi')}
              <Button variant="link" onClick={onOpenSettings} className="ml-2 h-auto p-0 text-xs">
                {t('openSettings')}
              </Button>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('bookNameLabel')}</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('bookNamePlaceholder')} />
          </div>
        </div>
        <div className="flex justify-between gap-2 border-t border-border bg-muted/30 px-6 py-4">
          <Button variant="ghost" onClick={() => onDone('hand', t('defaultBookTitle'))}>{t('skip')}</Button>
          <Button onClick={() => onDone(persona, title.trim() || t('defaultBookTitle'))}>{t('start')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem('onboarding.done') === '1';
  } catch {
    return true;
  }
}

export function markOnboardingDone(persona: OnboardingPersona): void {
  try {
    localStorage.setItem('onboarding.done', '1');
    localStorage.setItem('onboarding.persona', persona);
  } catch {
    // 忽略
  }
}

export default OnboardingModal;
