/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 受保护会话对话框（M4.5b）：解锁/锁定 + 逐章加密/解密。
 * 加密即把章节正文替换为 enc.v1 信封（不可逆——没有口令无法还原）；
 * 解密需要已解锁的同口令会话。
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/Dialog';
import { Input } from '@/shared/ui/Input';
import { dialogService } from '@/shared/services/dialogService';
import { protectedSession } from '@/shared/services/protectedSessionService';
import { useProjectStore } from '../stores/projectStore';

export const ProtectedSessionDialog: React.FC = () => {
  const { t } = useTranslation('app');
  const [open, setOpen] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  const project = useProjectStore((s) => (s.activeProjectId ? s.projects.find((p) => p.id === s.activeProjectId) ?? null : null));
  const unlocked = protectedSession.unlocked;

  const refresh = (): void => setTick((v) => v + 1);

  const handleUnlock = async (): Promise<void> => {
    setBusy(true);
    try {
      await protectedSession.unlock(passphrase);
      setPassphrase('');
      refresh();
    } catch (err) {
      dialogService.alert({ title: t('protected.unlockFailed'), message: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  const encryptChapter = async (chapterId: string, content: string): Promise<void> => {
    try {
      const envelope = await protectedSession.encrypt(content);
      useProjectStore.getState().updateActiveProject({
        chapters: project!.chapters.map((c) => (c.id === chapterId ? { ...c, content: envelope } : c)),
      } as never);
      refresh();
    } catch (err) {
      dialogService.alert({ title: t('protected.encryptFailed'), message: err instanceof Error ? err.message : String(err) });
    }
  };

  const decryptChapter = async (chapterId: string, envelope: string): Promise<void> => {
    try {
      const plain = await protectedSession.decrypt(envelope);
      useProjectStore.getState().updateActiveProject({
        chapters: project!.chapters.map((c) => (c.id === chapterId ? { ...c, content: plain } : c)),
      } as never);
      refresh();
    } catch (err) {
      dialogService.alert({ title: t('protected.decryptFailed'), message: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        title={t('protected.title')}
      >
        <Shield className={`size-4 ${unlocked ? 'text-success' : ''}`} />
      </Button>

      {open && (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('protected.title')}</DialogTitle>
              <DialogDescription>{t('protected.description')}</DialogDescription>
            </DialogHeader>

            {!unlocked ? (
              <div className="space-y-2">
                <Input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder={t('protected.passphrasePlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('protected.unlockHint')}</p>
              </div>
            ) : (
              <div className="max-h-72 space-y-2 overflow-auto">
                {(project?.chapters ?? []).map((c) => {
                  const encrypted = c.content?.startsWith('enc.v1:') ?? false;
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
                      <span className="truncate">{c.title}</span>
                      {encrypted ? (
                        <Button size="sm" variant="outline" onClick={() => void decryptChapter(c.id, c.content!)} disabled={busy}>
                          {t('protected.decrypt')}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            dialogService.confirm({
                              title: t('protected.encryptConfirmTitle'),
                              message: t('protected.encryptConfirmMessage', { title: c.title }),
                            }).then((ok) => {
                              if (ok) void encryptChapter(c.id, c.content ?? '');
                            });
                          }}
                          disabled={busy}
                        >
                          {t('protected.encrypt')}
                        </Button>
                      )}
                    </div>
                  );
                })}
                {!project?.chapters.length && <p className="text-sm text-muted-foreground">{t('protected.noChapters')}</p>}
              </div>
            )}

            <DialogFooter>
              {unlocked && (
                <Button
                  variant="outline"
                  onClick={() => {
                    protectedSession.lock();
                    refresh();
                  }}
                >
                  {t('protected.lock')}
                </Button>
              )}
              {!unlocked && (
                <Button onClick={handleUnlock} disabled={busy || !passphrase}>
                  {t('protected.unlock')}
                </Button>
              )}
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t('protected.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ProtectedSessionDialog;
