/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { logger } from '@/shared/utils/logger';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation, i18n } from '@/i18n';
import { checkForUpdates, getCurrentVersionInfo, getVersionHistory, formatVersion, type UpdateCheckResult } from './services/versionService';
import { dialogService } from '@/shared/services/dialogService';
import { Button, buttonVariants } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { Dialog, DialogContent } from '@/shared/ui/Dialog';
import { cn } from '@/shared/utils/cn';
import { AlertCircle, AlertTriangle, CheckCircle2, Download, ExternalLink, RefreshCw, Rocket, Tag } from 'lucide-react';


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
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [currentVersionInfo, setCurrentVersionInfo] = useState(getCurrentVersionInfo());
  const [versionHistory, setVersionHistory] = useState(getVersionHistory());
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);

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
        handleAutoCheck();
      }
    }
  }, [isOpen, handleAutoCheck]);

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
    if (!updateResult?.success || !updateResult.versionInfo.releaseUrl) return;

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // 模拟下载进度
      const interval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 5;
        });
      }, 200);

      // 在实际应用中，这里会调用Electron的自动更新API
      // 暂时使用模拟下载
      await new Promise(resolve => setTimeout(resolve, 3000));

      clearInterval(interval);
      setDownloadProgress(100);

      // 显示安装提示
      setTimeout(() => {
        dialogService.alert(t('downloadComplete'));
        setIsDownloading(false);
      }, 1000);

    } catch (error) {
      logger.error('下载更新失败:', error);
      setIsDownloading(false);
      setUpdateResult({
        ...updateResult,
        success: false,
        error: t('downloadError')
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[85vh] w-[92vw] max-w-2xl flex-col gap-0 overflow-hidden p-0">
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
        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
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
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={autoCheckEnabled}
                      onChange={(e) => setAutoCheckEnabled(e.target.checked)}
                    />
                    <span className="h-6 w-11 rounded-full bg-muted transition-colors after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:bg-background after:shadow after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-5" />
                  </label>
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
                            {t('modal.publishedAt')} {new Date(updateResult.versionInfo.publishedAt).toLocaleDateString(i18n.language)}
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

                      {updateResult.versionInfo.hasUpdate && (
                        <div>
                          {isDownloading ? (
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{t('modal.downloading')}</span>
                                <span className="font-medium tabular-nums text-primary">{downloadProgress}%</span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-1.5 rounded-full bg-primary transition-all duration-300"
                                  style={{ width: `${downloadProgress}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-muted-foreground">{t('modal.downloadHint')}</div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button className="flex-1" size="sm" onClick={handleDownloadUpdate}>
                                <Download className="size-3.5" />
                                {t('modal.autoInstall')}
                              </Button>
                              <a
                                href={updateResult.versionInfo.releaseUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'flex-1')}
                              >
                                <ExternalLink className="size-3.5" />
                                {t('modal.manualDownload')}
                              </a>
                            </div>
                          )}
                        </div>
                      )}
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
      </DialogContent>
    </Dialog>
  );
};

export default VersionCheckModal;
