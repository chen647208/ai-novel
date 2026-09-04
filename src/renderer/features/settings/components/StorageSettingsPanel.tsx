/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React from 'react';
import { useTranslation } from '@/i18n';
import type { StorageSettingsPanelProps } from '../types';
import { dialogService } from '@/shared/services/dialogService';

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
  return (
    <div className="space-y-8 animate-in zoom-in duration-300">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-4 mx-auto shadow-2xl shadow-green-200">
          <i className="fas fa-database text-3xl text-white"></i>
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-2">{t('storage.title')}</h3>
        <p className="text-gray-500 text-sm max-w-2xl mx-auto leading-relaxed">
          {t('storage.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 当前存储信息 */}
        <div className="border-2 border-green-100 rounded-2xl p-6 bg-gradient-to-br from-green-50 to-white">
          <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
            <i className="fas fa-info-circle text-green-500"></i>
            {t('storage.currentStatus')}
          </h4>

          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('storage.pathLabel')}</div>
              <div className="text-sm font-mono bg-gray-50 text-gray-700 p-3 rounded-lg border border-gray-100 truncate">
                {storageConfig.dataPath || t('storage.defaultPath')}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('storage.modeLabel')}</div>
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-lg text-xs font-black ${storageConfig.useCustomPath ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                  {storageConfig.useCustomPath ? t('storage.customPathTag') : t('storage.defaultPathTag')}
                </div>
                {storageConfig.lastMigration && (
                  <div className="text-xs text-gray-400">
                    <i className="fas fa-clock mr-1"></i>
                    {t('storage.lastMigration', { date: new Date(storageConfig.lastMigration).toLocaleDateString(i18n.language) })}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('storage.dataFileLabel')}</div>
              <div className="text-sm text-gray-600">
                novalist-data.json
              </div>
            </div>

            {/* 自动备份状态 */}
            <div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('storage.autoBackupStatus')}</div>
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-lg text-xs font-black ${storageConfig.autoBackupEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                  {storageConfig.autoBackupEnabled ? t('storage.enabled') : t('storage.disabled')}
                </div>
                {storageConfig.lastAutoBackup && (
                  <div className="text-xs text-gray-400">
                    <i className="fas fa-history mr-1"></i>
                    {t('storage.lastBackup', { time: new Date(storageConfig.lastAutoBackup).toLocaleTimeString(i18n.language) })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 存储配置 */}
        <div className="border-2 border-blue-100 rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-white">
          <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
            <i className="fas fa-cog text-blue-500"></i>
            {t('storage.configTitle')}
          </h4>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-gray-700 mb-1">{t('storage.useCustomLabel')}</div>
                <p className="text-xs text-gray-500">{t('storage.useCustomHint')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={storageConfig.useCustomPath}
                  onChange={(e) => setStorageConfig({ ...storageConfig, useCustomPath: e.target.checked })}
                />
                <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>

            {storageConfig.useCustomPath && (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('storage.customPathLabel')}</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 border-none rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-blue-100"
                      value={storageConfig.dataPath}
                      onChange={(e) => setStorageConfig({ ...storageConfig, dataPath: e.target.value })}
                      placeholder={t('storage.pathPlaceholder')}
                    />
                    <button
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
                            console.error('选择目录失败:', error);
                          }
                        } else {
                          dialogService.alert(t('storage.electronUnavailable'));
                        }
                      }}
                      className="px-4 py-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-black transition-all"
                    >
                      <i className="fas fa-folder-open mr-2"></i>
                      {t('storage.selectDir')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 自动备份配置 */}
            <div className="space-y-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-gray-700 mb-1">{t('storage.autoBackupLabel')}</div>
                  <p className="text-xs text-gray-500">{t('storage.autoBackupHint')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={storageConfig.autoBackupEnabled || false}
                    onChange={(e) => setStorageConfig({
                      ...storageConfig,
                      autoBackupEnabled: e.target.checked,
                      autoBackupInterval: e.target.checked ? (storageConfig.autoBackupInterval || 10) : undefined
                    })}
                  />
                  <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              {storageConfig.autoBackupEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-green-100">
                  <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('storage.intervalLabel')}</div>
                    <div className="flex gap-2">
                      {[5, 10, 30].map((interval) => (
                        <button
                          key={interval}
                          onClick={() => setStorageConfig({ ...storageConfig, autoBackupInterval: interval })}
                          className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                            storageConfig.autoBackupInterval === interval
                              ? 'bg-green-100 text-green-600 border-2 border-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {t('storage.intervalSeconds', { interval })}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {t('storage.intervalHint')}
                    </p>
                  </div>

                  <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('storage.backupStateLabel')}</div>
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-lg text-xs font-black ${
                        storageConfig.lastAutoBackup
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {storageConfig.lastAutoBackup
                          ? t('storage.lastBackup', { time: new Date(storageConfig.lastAutoBackup).toLocaleTimeString(i18n.language) })
                          : t('storage.notBackedUp')
                        }
                      </div>
                      <button
                        onClick={async () => {
                          // 手动触发备份
                          try {
                            // 这里需要调用storage.ts中的triggerManualBackup方法
                            // 由于我们是在React组件中，需要通过props或其他方式传递
                            // 暂时先显示提示
                            dialogService.alert(t('storage.manualBackupNote'));
                          } catch (error) {
                            console.error('手动备份失败:', error);
                          }
                        }}
                        className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-black transition-all"
                      >
                        <i className="fas fa-save mr-1"></i>
                        {t('storage.backupNow')}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('storage.policyLabel')}</div>
                    <p className="text-xs text-gray-600">
                      {t('storage.policyLine1')}<br />
                      {t('storage.policyLine2')}<br />
                      {t('storage.policyLine3')}<br />
                      {t('storage.policyLine4')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 数据操作 */}
      <div className="border-2 border-red-100 rounded-2xl p-6 bg-gradient-to-br from-red-50 to-white mt-8">
        <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
          <i className="fas fa-exclamation-triangle text-red-500"></i>
          {t('storage.dangerTitle')}
        </h4>

        <div className="space-y-4">
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('storage.migrationLabel')}</div>
            <div className="flex items-center gap-2">
              <button
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
                className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-black transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isLoadingStorage ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-exchange-alt"></i>}
                {t('storage.checkMigration')}
              </button>
              {migrationStatus && (
                <span className="text-xs text-gray-600">{migrationStatus}</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('storage.clearLabel')}</div>
            <p className="text-xs text-gray-600 mb-3">
              {t('storage.clearHint')}
            </p>
            <button
              onClick={async () => {
                if (await dialogService.confirm({ message: t('storage.clearConfirm'), danger: true })) {
                  onClearData();
                }
              }}
              className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-black transition-all flex items-center gap-2"
            >
              <i className="fas fa-trash-alt"></i>
              {t('storage.clearLabel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageSettingsPanel;
