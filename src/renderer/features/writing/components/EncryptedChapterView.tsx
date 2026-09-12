/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 加密章节视图：正文为 enc.v1 信封时替代编辑器。
 * 会话未解锁显示占位与解锁入口；解锁后透明解密为只读文本（避免在编辑器管线里反复重加密）。
 */
import { isEncryptedEnvelope } from '@core/crypto';
import { Lock } from 'lucide-react';
import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { useTranslation } from '@/i18n';
import { OPEN_PROTECTED_SESSION_EVENT } from '@/shared/constants/appEvents';
import { protectedSession } from '@/shared/services/protectedSessionService';
import { Button } from '@/shared/ui/Button';
import { logger } from '@/shared/utils/logger';

const EncryptedChapterView: React.FC<{ content: string }> = ({ content }) => {
  const { t } = useTranslation('writing');
  const subscribe = useCallback((notify: () => void) => protectedSession.subscribe(notify), []);
  const unlocked = useSyncExternalStore(subscribe, () => protectedSession.unlocked);
  const [plain, setPlain] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!unlocked || !isEncryptedEnvelope(content)) {
      setPlain(null);
      return;
    }
    let cancelled = false;
    void protectedSession
      .decrypt(content)
      .then((text) => {
        if (!cancelled) {
          setPlain(text);
          setError(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPlain(null);
          setError(true);
          logger.warn('章节解密失败：', err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [content, unlocked]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <Lock className="size-8 text-muted-foreground" />
      {!unlocked ? (
        <>
          <p className="text-sm text-muted-foreground">{t('canvas.encryptedLocked')}</p>
          <Button size="sm" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PROTECTED_SESSION_EVENT))}>
            {t('canvas.unlockSession')}
          </Button>
        </>
      ) : error ? (
        <p className="text-sm text-destructive">{t('canvas.encryptedDecryptFailed')}</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{t('canvas.encryptedUnlockedHint')}</p>
          <pre className="max-h-[60vh] w-full overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-4 text-left text-sm text-foreground">
            {plain ?? ''}
          </pre>
        </>
      )}
    </div>
  );
};

export default EncryptedChapterView;
