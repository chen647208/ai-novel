/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { STORAGE_KEYS } from '@shared/constants/storageKeys';
import type { UpdaterStatus } from '@shared/types';
import { AlertCircle, AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, Rocket, Tag } from 'lucide-react';
import React, { useCallback, useEffect, useRef,useState } from 'react';

import { i18n,useTranslation } from '@/i18n';
import { dialogService } from '@/shared/services/dialogService';
import { localStore } from '@/shared/services/localStore';
import { Button } from '@/shared/ui/Button';
import { ModalShell } from '@/shared/ui/ModalShell';
import { Spinner } from '@/shared/ui/Spinner';
import { Switch } from '@/shared/ui/Switch';
import { cn } from '@/shared/utils/cn';
import { formatDate } from '@/shared/utils/format';
import { logger } from '@/shared/utils/logger';

import { hasNativeUpdater, nativeCheckForUpdate, nativeDownloadUpdate, nativeInstallUpdate, onUpdaterStatus } from './services/updateService';
import { checkForUpdates, formatVersion, getCurrentVersionInfo, getVersionHistory, type UpdateCheckResult } from './services/versionService';


interface VersionCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** 区块小标题 */
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{children}</h4>
);

const VersionCheckModal: React.FC<VersionCheckModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation('version');
  const [isChecking, setIsChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  // 原生更新（打包版）：下载进度、已下载版本、错误
  const native = hasNativeUpdater();
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null);
  const [downloadedVersion, setDownloadedVersion] = useState<string | null>(null);
  const [nativeError, setNativeError] = useState<string | null>(null);
  const [currentVersionInfo, setCurrentVersionInfo] = useState(getCurrentVersionInfo());
  const [versionHistory, setVersionHistory] = useState(getVersionHistory());
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(() => {
    try {
      return localStore.getItem(STORAGE_KEYS.versionAutoCheck) !== '0';
    } catch {
      return true;
    }
  });
  // 跳过的版本：下次检查到同一版不再打扰（localStorage，换机不跟随）
  const [skippedVersion, setSkippedVersion] = useState<string | null>(() => {
    try {
      return localStore.getItem(STORAGE_KEYS.versionSkipped) || null;
    } catch {
      return null;
    }
  });

  const handleAutoCheck = useCallback(async () => {
    try {
      const result = await checkForUpdates();
      setUpdateResult(result);
    } catch (error) {
      logger.error('自动检查更新失败:', error);
    }
  }, []);

  // 读取自动检查开关的最新值，但不作为 effect 依赖（避免切换开关时重新触发检查）
  const autoCheckEnabledRef = useRef(autoCheckEnabled);
  autoCheckEnabledRef.current = autoCheckEnabled;

  useEffect(() => {
    if (isOpen) {
      setCurrentVersionInfo(getCurrentVersionInfo());
      setVersionHistory(getVersionHistory());

      // 自动检查更新（如果启用）
      if (autoCheckEnabledRef.current) {
        void handleAutoCheck();
      }
    }
  }, [isOpen, handleAutoCheck]);

  // 打包版：订阅主进程更新状态（进度/已下载/错误）
  useEffect(() => {
    if (!isOpen || !native) return;
    return onUpdaterStatus((status: UpdaterStatus) => {
      if (status.t === 'progress') {
        setDownloadPercent(status.percent);
      } else if (status.t === 'downloaded') {
        setDownloadedVersion(status.version);
        setDownloadPercent(null);
      } else if (status.t === 'error') {
        setNativeError(status.message);
        setDownloadPercent(null);
      }
    });
  }, [isOpen, native]);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    try {
      const result = await checkForUpdates();
      setUpdateResult(result);
    } catch (error) {
      logger.error('检查更新失败:', error);
      setUpdateResult({
        success: false,
        versionInfo: currentVersionInfo,
        error: t('checkError')
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    // 打包版走原生：先检查（拿到 updateInfo）再下载；进度经状态事件回填
    if (native) {
      setNativeError(null);
      setDownloadPercent(0);
      try {
        await nativeCheckForUpdate();
        await nativeDownloadUpdate();
      } catch (error) {
        setNativeError(error instanceof Error ? error.message : String(error));
        setDownloadPercent(null);
      }
      return;
    }
    const url = updateResult?.versionInfo.releaseUrl;
    if (!updateResult?.success || !url) return;
    // 无桌面原生更新：走外部浏览器下载页手动安装
    try {
      if (window.electronAPI?.openExternal) {
        await window.electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank', 'noopener');
      }
    } catch (error) {
      logger.error('打开下载页失败:', error);
      dialogService.alert(t('openUrlFailed'));
    }
  };

  const handleSkipVersion = (version: string) => {
    try {
      localStore.setItem(STORAGE_KEYS.versionSkipped, version);
    } catch {
      // 存储不可用则本次生效
    }
    setSkippedVersion(version);
  };

  const handleToggleAutoCheck = (enabled: boolean) => {
    setAutoCheckEnabled(enabled);
    try {
      localStore.setItem(STORAGE_KEYS.versionAutoCheck, enabled ? '1' : '0');
    } catch {
      // 存储不可用则本次生效
    }
  };

  return (
    <ModalShell
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      bare
      contentClassName="flex max-h-[85vh] w-[92vw] max-w-2xl flex-col gap-0 overflow-hidden p-0"
    >
        {/* 标题栏 */}
        <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Rocket className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-serif text-lg font-medium text-foreground">{t('modal.title')}</h3>
            <p className="text-xs text-muted-foreground">{t('modal.subtitle')}</p>
          </div>
        </div>

        {/* 内容区域 */}
        <div className=" flex-1 space-y-6 overflow-y-auto p-6">
          {/* 当前版本信息 */}
          <div>
            <SectionLabel>{t('modal.currentVersion')}</SectionLabel>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-serif text-2xl font-medium tabular-nums text-foreground">{formatVersion(currentVersionInfo.current)}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{t('modal.appName')}</div>
                </div>
                <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {t('modal.latestVersion')}
                </span>
              </div>
              <div className="whitespace-pre-line text-sm text-muted-foreground">
                {currentVersionInfo.releaseNotes}
              </div>
            </div>
          </div>

          {/* 更新检查区域 */}
          <div>
            <SectionLabel>{t('modal.checkUpdate')}</SectionLabel>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-foreground">{t('modal.autoCheck')}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{t('modal.autoCheckDesc')}</div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <Switch
                    checked={autoCheckEnabled}
                    onCheckedChange={handleToggleAutoCheck}
                    aria-label={t('modal.autoCheck')}
                  />
                  <Button size="sm" onClick={handleCheckForUpdates} disabled={isChecking}>
                    {isChecking ? <Spinner className="size-3.5" /> : <RefreshCw className="size-3.5" />}
                    {isChecking ? t('modal.checking') : t('modal.checkNow')}
                  </Button>
                </div>
              </div>

              {updateResult && (
                <div className={cn(
                  'mt-4 rounded-lg border p-4',
                  updateResult.success ? 'border-success/20 bg-success/5' : 'border-warning/20 bg-warning/5'
                )}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {updateResult.success
                        ? <CheckCircle2 className="size-5 text-success" />
                        : <AlertTriangle className="size-5 text-warning" />}
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {updateResult.success
                            ? (updateResult.versionInfo.hasUpdate ? t('modal.foundNew') : t('modal.upToDate'))
                            : t('modal.checkFailed')
                          }
                        </div>
                        {updateResult.success && updateResult.versionInfo.publishedAt && (
                          <div className="text-xs text-muted-foreground">
                            {t('modal.publishedAt')} {formatDate(updateResult.versionInfo.publishedAt, i18n.language)}
                          </div>
                        )}
                      </div>
                    </div>
                    {updateResult.success && updateResult.versionInfo.hasUpdate && (
                      <span className="shrink-0 rounded border border-success/30 bg-success/10 px-2 py-0.5 text-xs text-success">
                        {t('modal.updateAvailable')}
                      </span>
                    )}
                  </div>

                  {updateResult.success && updateResult.versionInfo.latest && (
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-border bg-background px-3 py-2">
                          <div className="text-2xs uppercase tracking-wider text-muted-foreground">{t('modal.currentVersion')}</div>
                          <div className="font-serif text-lg font-medium tabular-nums text-foreground">{formatVersion(updateResult.versionInfo.current)}</div>
                        </div>
                        <div className="rounded-lg border border-border bg-background px-3 py-2">
                          <div className="text-2xs uppercase tracking-wider text-muted-foreground">{t('modal.latestVersion')}</div>
                          <div className="font-serif text-lg font-medium tabular-nums text-success">{formatVersion(updateResult.versionInfo.latest)}</div>
                        </div>
                      </div>

                      {updateResult.versionInfo.releaseNotes && (
                        <div className="rounded-lg border border-border bg-background px-3 py-2">
                          <div className="mb-1 text-2xs uppercase tracking-wider text-muted-foreground">{t('modal.releaseNotes')}</div>
                          <div className="whitespace-pre-line text-sm text-foreground">
                            {updateResult.versionInfo.releaseNotes}
                          </div>
                        </div>
                      )}

                      {(() => {
                        const latest = updateResult.versionInfo.latest;
                        if (!updateResult.versionInfo.hasUpdate || !latest) return null;
                        return (
                          <div>
                            {skippedVersion === latest ? (
                              <p className="text-xs text-muted-foreground">{t('modal.skippedHint', { version: formatVersion(latest) })}</p>
                            ) : native && downloadedVersion ? (
                              <Button className="w-full" size="sm" onClick={() => void nativeInstallUpdate()}>
                                <Rocket className="size-3.5" />
                                {t('modal.restartInstall')}
                              </Button>
                            ) : (
                              <div className="flex gap-2">
                                <Button className="flex-1" size="sm" onClick={handleDownloadUpdate} disabled={downloadPercent !== null}>
                                  {native ? <RefreshCw className="size-3.5" /> : <ExternalLink className="size-3.5" />}
                                  {native
                                    ? (downloadPercent !== null
                                        ? t('modal.downloading', { percent: Math.round(downloadPercent) })
                                        : t('modal.downloadInstall'))
                                    : t('modal.goDownloadPage')}
                                </Button>
                                <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground" onClick={() => handleSkipVersion(latest)}>
                                  {t('modal.skipThisVersion')}
                                </Button>
                              </div>
                            )}
                            {native && downloadedVersion && (
                              <p className="mt-2 text-xs text-success">{t('modal.updateReady')}</p>
                            )}
                            {nativeError && (
                              <p className="mt-2 text-xs text-destructive">{t('modal.nativeFailed', { message: nativeError })}</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {updateResult.error && (
                    <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-destructive">
                        <AlertCircle className="size-3.5" />
                        {t('modal.errorInfo')}
                      </div>
                      <div className="text-xs text-muted-foreground">{updateResult.error}</div>
                      <div className="mt-2 text-xs text-muted-foreground">{t('modal.errorHint')}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 版本历史 */}
          <div>
            <SectionLabel>{t('modal.history')}</SectionLabel>
            <div className="space-y-3">
              {versionHistory.map((item, index) => (
                <div
                  key={item.version}
                  className={cn(
                    'rounded-lg border p-4',
                    index === 0 ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full',
                        index === 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      )}>
                        <Tag className="size-4" />
                      </div>
                      <div>
                        <div className="font-serif text-sm font-medium tabular-nums text-foreground">{formatVersion(item.version)}</div>
                        <div className="text-xs text-muted-foreground">{item.date}</div>
                      </div>
                    </div>
                    {index === 0 && (
                      <span className="shrink-0 rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {t('modal.currentVersion')}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end border-t border-border bg-muted/30 px-6 py-4">
          <Button variant="secondary" size="sm" onClick={onClose}>{t('modal.close')}</Button>
        </div>
    </ModalShell>
  );
};

export default VersionCheckModal;
