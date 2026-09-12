/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 写法技能管理（docs/design/05 §3）：内置技能只读，用户技能可导入/删除（SKILL.md 即数据）。 */
import { BookOpen, Upload, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslation } from '@/i18n';
import { assistantRuntime, type UserSkillInfo } from '@/shared/services/assistantRuntime';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';

const UserSkillsCard: React.FC = () => {
  const { t } = useTranslation('settings');
  const [userSkills, setUserSkills] = useState<UserSkillInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const runtime = assistantRuntime();
  const builtin = runtime?.listBuiltinSkills() ?? [];

  const reload = useCallback(() => {
    if (!runtime) {
      setUserSkills([]);
      return;
    }
    void runtime.listUserSkills().then(setUserSkills).catch(() => setUserSkills([]));
  }, [runtime]);
  useEffect(() => { reload(); }, [reload]);

  const handleFile = async (file: File | undefined) => {
    if (!file || !runtime) return;
    setBusy(true);
    setError(null);
    try {
      const md = await file.text();
      const result = await runtime.importUserSkill(md);
      if (!result.ok) setError(t('skills.importFailed', { reason: result.error }));
      reload();
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="size-4 text-muted-foreground" />
          {t('skills.title')}
        </CardTitle>
        <CardDescription>{t('skills.hint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('skills.builtinTitle')}</div>
          <div className="flex flex-wrap gap-2">
            {builtin.map((s) => (
              <Badge key={s.name} variant="secondary" title={s.description}>{s.name}</Badge>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('skills.userTitle')}</span>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
              <Upload className="size-3.5" /> {busy ? t('skills.importing') : t('skills.import')}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".md,text/markdown"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          </div>
          {userSkills.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">{t('skills.empty')}</p>
          ) : (
            <div className="space-y-2">
              {userSkills.map((s) => (
                <div key={s.slug} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{s.name}</div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.description}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                    title={t('skills.remove')}
                    onClick={() => { void runtime?.deleteUserSkill(s.slug, s.name).then(reload); }}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserSkillsCard;
