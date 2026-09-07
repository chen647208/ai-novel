/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { logger } from '@/shared/utils/logger';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/i18n';
import type { StorageSettingsPanelProps } from '../types';
import { dialogService } from '@/shared/services/dialogService';
import { autoBackupService } from '@/shared/services/autoBackupService';
import { composeAppState, seedPersistBaseline } from '@/app/stores/persistenceBridge';
import { hydrateStoresFromState } from '@/app/useAppBootstrap';
import { normalizeImportedState, checkImportVersion } from '@/app/initialState';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { Input } from '@/shared/ui/Input';
import { AlertTriangle, ArrowLeftRight, Clock, Database, FolderOpen, History, Info, Save, Settings, Trash2 } from 'lucide-react';

/** 存储设置区块的小标题 */
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
    {children}
  </div>
);

/** 状态徽章 */
const StatusBadge: React.FC<{ tone: 'primary' | 'success' | 'muted'; children: React.ReactNode }> = ({ tone, children }) => (
  <span
    className={
      tone === 'primary'
        ? 'rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary'
        : tone === 'success'
          ? 'rounded border border-success/30 bg-success/10 px-2 py-0.5 text-xs text-success'
          : 'rounded border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground'
    }
  >
    {children}
  </span>
);

const StorageSettingsPanel: React.FC<StorageSettingsPanelProps> = ({
  storageConfig,
  setStorageConfig,
  isLoadingStorage,
  setIsLoadingStorage,
  migrationStatus,
  setMigrationStatus,
  onClearData,
}) => {
  const { t, i18n } = useTranslation('settings');
  const [backups, setBackups] = useState<Array<{ fileName: string; filePath: string; size: number; timestamp: number }>>([]);
  const [backupBusy, setBackupBusy] = useState(false);

  const reloadBackups = useCallback(() => {
    void autoBackupService.getBackupHistory(storageConfig).then(setBackups).catch(() => setBackups([]));
  }, [storageConfig]);
  useEffect(() => {
    reloadBackups();
  }, [reloadBackups]);

  const handleManualBackup = async (): Promise<void> => {
    setBackupBusy(true);
    try {
      const ok = await autoBackupService.performBackup(storageConfig, () => composeAppState());
      dialogService.alert(t(ok ? 'storage.backupDone' : 'storage.backupFailed'));
      reloadBackups();
    } catch (error) {
      logger.error('手动备份失败:', error);
      dialogService.alert(t('storage.backupFailed'));
    } finally {
      setBackupBusy(false);
    }
  };

  const handleRestoreBackup = async (filePath: string): Promise<void> => {
    const ok = await dialogService.confirm({ message: t('storage.restoreConfirm'), danger: true });
    if (!ok) return;
    const snapshot = await autoBackupService.readBackup(filePath);
    if (!snapshot) {
      dialogService.alert(t('storage.restoreFailed'));
      return;
    }
    if (checkImportVersion(snapshot) === 'too-new') {
      dialogService.alert(t('storage.restoreTooNew'));
      return;
    }
    hydrateStoresFromState(normalizeImportedState(snapshot));
    seedPersistBaseline(composeAppState());
    dialogService.alert(t('storage.restoreDone'));
  };
  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Database className="size-6" />
        </div>
        <div>
          <h3 className="font-serif text-xl font-medium text-foreground">{t('storage.title')}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('storage.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 当前存储信息 */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <Info className="size-4 text-muted-foreground" />
            {t('storage.currentStatus')}
          </h4>

          <div className="space-y-4">
            <div>
              <FieldLabel>{t('storage.pathLabel')}</FieldLabel>
              <div className="truncate rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs text-foreground">
                {storageConfig.dataPath || t('storage.defaultPath')}
              </div>
            </div>

            <div>
              <FieldLabel>{t('storage.modeLabel')}</FieldLabel>
              <div className="flex items-center gap-2">
                <StatusBadge tone={storageConfig.useCustomPath ? 'primary' : 'muted'}>
                  {storageConfig.useCustomPath ? t('storage.customPathTag') : t('storage.defaultPathTag')}
                </StatusBadge>
                {storageConfig.lastMigration && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    {t('storage.lastMigration', { date: new Date(storageConfig.lastMigration).toLocaleDateString(i18n.language) })}
                  </div>
                )}
              </div>
            </div>

            <div>
              <FieldLabel>{t('storage.dataFileLabel')}</FieldLabel>
              <div className="font-mono text-xs text-foreground">novalist-data.json</div>
            </div>

            {/* 自动备份状态 */}
            <div>
              <FieldLabel>{t('storage.autoBackupStatus')}</FieldLabel>
              <div className="flex items-center gap-2">
                <StatusBadge tone={storageConfig.autoBackupEnabled ? 'success' : 'muted'}>
                  {storageConfig.autoBackupEnabled ? t('storage.enabled') : t('storage.disabled')}
                </StatusBadge>
                {storageConfig.lastAutoBackup && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <History className="size-3.5" />
                    {t('storage.lastBackup', { time: new Date(storageConfig.lastAutoBackup).toLocaleTimeString(i18n.language) })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 存储配置 */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <Settings className="size-4 text-muted-foreground" />
            {t('storage.configTitle')}
          </h4>

          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="mb-0.5 text-sm text-foreground">{t('storage.useCustomLabel')}</div>
                <p className="text-xs text-muted-foreground">{t('storage.useCustomHint')}</p>
              </div>
              <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={storageConfig.useCustomPath}
                  onChange={(e) => setStorageConfig({ ...storageConfig, useCustomPath: e.target.checked })}
                />
                <span className="h-6 w-11 rounded-full bg-muted transition-colors after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:bg-background after:shadow after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-5" />
              </label>
            </div>

            {storageConfig.useCustomPath && (
              <div>
                <FieldLabel>{t('storage.customPathLabel')}</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    className="flex-1 font-mono text-xs"
                    value={storageConfig.dataPath}
                    onChange={(e) => setStorageConfig({ ...storageConfig, dataPath: e.target.value })}
                    placeholder={t('storage.pathPlaceholder')}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      // 使用Electron API选择目录
                      if (window.electronAPI) {
                        try {
                          const result = await window.electronAPI.openDirectoryDialog({
                            title: t('storage.dialogTitle'),
                            defaultPath: storageConfig.dataPath || ''
                          });
                          if (!result.canceled && result.filePaths.length > 0) {
                            setStorageConfig({ ...storageConfig, dataPath: result.filePaths[0] ?? '' });
                          }
                        } catch (error) {
                          logger.error('选择目录失败:', error);
                        }
                      } else {
                        dialogService.alert(t('storage.electronUnavailable'));
                      }
                    }}
                  >
                    <FolderOpen className="size-3.5" />
                    {t('storage.selectDir')}
                  </Button>
                </div>
              </div>
            )}

            {/* 自动备份配置 */}
            <div className="space-y-5 border-t border-border pt-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="mb-0.5 text-sm text-foreground">{t('storage.autoBackupLabel')}</div>
                  <p className="text-xs text-muted-foreground">{t('storage.autoBackupHint')}</p>
                </div>
                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={storageConfig.autoBackupEnabled || false}
                    onChange={(e) => setStorageConfig({
                      ...storageConfig,
                      autoBackupEnabled: e.target.checked,
                      autoBackupInterval: e.target.checked ? (storageConfig.autoBackupInterval || 10) : undefined
                    })}
                  />
                  <span className="h-6 w-11 rounded-full bg-muted transition-colors after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:bg-background after:shadow after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-5" />
                </label>
              </div>

              {storageConfig.autoBackupEnabled && (
                <div className="space-y-4 border-l-2 border-primary/20 pl-4">
                  <div>
                    <FieldLabel>{t('storage.intervalLabel')}</FieldLabel>
                    <div className="flex gap-2">
                      {[5, 10, 30].map((interval) => (
                        <button
                          key={interval}
                          type="button"
                          onClick={() => setStorageConfig({ ...storageConfig, autoBackupInterval: interval })}
                          className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                            storageConfig.autoBackupInterval === interval
                              ? 'border-primary/40 bg-primary/5 text-primary'
                              : 'border-border text-muted-foreground hover:bg-accent/40'
                          }`}
                        >
                          {t('storage.intervalSeconds', { interval })}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{t('storage.intervalHint')}</p>
                  </div>

                  <div>
                    <FieldLabel>{t('storage.backupStateLabel')}</FieldLabel>
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={storageConfig.lastAutoBackup ? 'success' : 'muted'}>
                        {storageConfig.lastAutoBackup
                          ? t('storage.lastBackup', { time: new Date(storageConfig.lastAutoBackup).toLocaleTimeString(i18n.language) })
                          : t('storage.notBackedUp')
                        }
                      </StatusBadge>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleManualBackup()}
                        disabled={backupBusy}
                      >
                        <Save className="size-3.5" />
                        {t('storage.backupNow')}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <FieldLabel>{t('storage.policyLabel')}</FieldLabel>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t('storage.policyLine1')}<br />
                      {t('storage.policyLine2')}<br />
                      {t('storage.policyLine3')}<br />
                      {t('storage.policyLine4')}
                    </p>
                  </div>

                  <div>
                    <FieldLabel>{t('storage.historyTitle')}</FieldLabel>
                    {backups.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">{t('storage.historyEmpty')}</p>
                    ) : (
                      <div className="space-y-2">
                        {backups.map((b) => (
                          <div key={b.filePath} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                            <div className="min-w-0">
                              <div className="truncate font-mono text-xs text-foreground">{b.fileName}</div>
                              <div className="text-2xs tabular-nums text-muted-foreground">
                                {new Date(b.timestamp).toLocaleString(i18n.language)} · {(b.size / 1024).toFixed(1)} KB
                              </div>
                            </div>
                            <Button size="sm" variant="outline" className="shrink-0" onClick={() => void handleRestoreBackup(b.filePath)}>
                              {t('storage.restore')}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 数据操作 */}
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-5">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
          <AlertTriangle className="size-4 text-destructive" />
          {t('storage.dangerTitle')}
        </h4>

        <div className="space-y-4">
          <div>
            <FieldLabel>{t('storage.migrationLabel')}</FieldLabel>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  setIsLoadingStorage(true);
                  setMigrationStatus(t('storage.migrationChecking'));
                  try {
                    // 这里需要调用数据迁移逻辑
                    // 暂时先模拟
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    setMigrationStatus(t('storage.migrationDone'));
                  } catch (error) {
                    setMigrationStatus(t('storage.migrationFailed', { message: (error as Error).message }));
                  } finally {
                    setIsLoadingStorage(false);
                  }
                }}
                disabled={isLoadingStorage}
              >
                {isLoadingStorage ? <Spinner className="size-3.5" /> : <ArrowLeftRight className="size-3.5" />}
                {t('storage.checkMigration')}
              </Button>
              {migrationStatus && (
                <span className="text-xs text-muted-foreground">{migrationStatus}</span>
              )}
            </div>
          </div>

          <div>
            <FieldLabel>{t('storage.clearLabel')}</FieldLabel>
            <p className="mb-2 text-xs text-muted-foreground">{t('storage.clearHint')}</p>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={async () => {
                if (await dialogService.confirm({ message: t('storage.clearConfirm'), danger: true })) {
                  onClearData();
                }
              }}
            >
              <Trash2 className="size-3.5" />
              {t('storage.clearLabel')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageSettingsPanel;
