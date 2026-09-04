/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation, i18n } from '@/i18n';
import { checkForUpdates, getCurrentVersionInfo, getVersionHistory, formatVersion, type UpdateCheckResult } from './services/versionService';
import { dialogService } from '@/shared/services/dialogService';
import { AlertCircle, AlertTriangle, CheckCircle2, Download, ExternalLink, Loader2, RefreshCw, Rocket, Tag, X } from 'lucide-react';


interface VersionCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
      console.error('自动检查更新失败:', error);
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
      console.error('检查更新失败:', error);
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
      console.error('下载更新失败:', error);
      setIsDownloading(false);
      setUpdateResult({
        ...updateResult,
        success: false,
        error: t('downloadError')
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* 标题栏 */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Rocket className="size-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">{t('modal.title')}</h3>
              <p className="text-gray-500 text-sm">{t('modal.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* 当前版本信息 */}
          <div className="mb-8">
            <h4 className="text-lg font-bold text-gray-800 mb-4">{t('modal.currentVersion')}</h4>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-2xl font-black text-gray-900">{formatVersion(currentVersionInfo.current)}</div>
                  <div className="text-gray-500 text-sm mt-1">{t('modal.appName')}</div>
                </div>
                <div className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold">
                  {t('modal.latestVersion')}
                </div>
              </div>
              <div className="text-gray-700 whitespace-pre-line">
                {currentVersionInfo.releaseNotes}
              </div>
            </div>
          </div>

          {/* 更新检查区域 */}
          <div className="mb-8">
            <h4 className="text-lg font-bold text-gray-800 mb-4">{t('modal.checkUpdate')}</h4>
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="font-medium text-gray-800">{t('modal.autoCheck')}</div>
                  <div className="text-gray-500 text-sm mt-1">{t('modal.autoCheckDesc')}</div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setAutoCheckEnabled(!autoCheckEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${autoCheckEnabled ? 'bg-green-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${autoCheckEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <button
                    onClick={handleCheckForUpdates}
                    disabled={isChecking}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {isChecking ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" />
                        {t('modal.checking')}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="size-4 mr-2" />
                        {t('modal.checkNow')}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {updateResult && (
                <div className={`mt-4 p-6 rounded-2xl border ${updateResult.success ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {updateResult.success ? <CheckCircle2 className="size-6 text-green-600" /> : <AlertTriangle className="size-6 text-amber-600" />}
                      <div>
                        <div className="font-bold text-gray-800 text-lg">
                          {updateResult.success 
                            ? (updateResult.versionInfo.hasUpdate ? t('modal.foundNew') : t('modal.upToDate'))
                            : t('modal.checkFailed')
                          }
                        </div>
                        {updateResult.success && updateResult.versionInfo.publishedAt && (
                          <div className="text-gray-500 text-sm">
                            {t('modal.publishedAt')} {new Date(updateResult.versionInfo.publishedAt).toLocaleDateString(i18n.language)}
                          </div>
                        )}
                      </div>
                    </div>
                    {updateResult.success && updateResult.versionInfo.hasUpdate && (
                      <div className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full text-sm font-bold animate-pulse">
                        {t('modal.updateAvailable')}
                      </div>
                    )}
                  </div>
                  
                  {updateResult.success && updateResult.versionInfo.latest && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200">
                          <div className="text-gray-500 text-sm mb-1">{t('modal.currentVersion')}</div>
                          <div className="text-2xl font-black text-gray-900">{formatVersion(updateResult.versionInfo.current)}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200">
                          <div className="text-gray-500 text-sm mb-1">{t('modal.latestVersion')}</div>
                          <div className="text-2xl font-black text-green-600">{formatVersion(updateResult.versionInfo.latest)}</div>
                        </div>
                      </div>
                      
                      {updateResult.versionInfo.releaseNotes && (
                        <div className="bg-white p-4 rounded-xl border border-gray-200">
                          <div className="text-gray-500 text-sm mb-2">{t('modal.releaseNotes')}</div>
                          <div className="text-gray-700 whitespace-pre-line">
                            {updateResult.versionInfo.releaseNotes}
                          </div>
                        </div>
                      )}
                      
                      {updateResult.versionInfo.hasUpdate && (
                        <div className="space-y-4">
                          {isDownloading ? (
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">{t('modal.downloading')}</span>
                                <span className="font-bold text-blue-600">{downloadProgress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                                  style={{ width: `${downloadProgress}%` }}
                                ></div>
                              </div>
                              <div className="text-gray-500 text-sm">
                                {t('modal.downloadHint')}
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-3">
                              <button
                                onClick={handleDownloadUpdate}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                              >
                                <Download className="size-4" />
                                {t('modal.autoInstall')}
                              </button>
                              <a 
                                href={updateResult.versionInfo.releaseUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                              >
                                <ExternalLink className="size-4" />
                                {t('modal.manualDownload')}
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {updateResult.error && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-red-200">
                      <div className="flex items-center gap-2 text-red-600 mb-2">
                        <AlertCircle className="size-4" />
                        <div className="font-medium">{t('modal.errorInfo')}</div>
                      </div>
                      <div className="text-sm text-gray-600">{updateResult.error}</div>
                      <div className="mt-3 text-sm text-gray-500">
                        {t('modal.errorHint')}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 版本历史 */}
          <div>
            <h4 className="text-lg font-bold text-gray-800 mb-4">{t('modal.history')}</h4>
            <div className="space-y-4">
              {versionHistory.map((item, index) => (
                <div 
                  key={item.version} 
                  className={`p-5 rounded-2xl border ${index === 0 ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${index === 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                        <Tag className="size-4" />
                      </div>
                      <div>
                        <div className="font-black text-gray-900">{formatVersion(item.version)}</div>
                        <div className="text-gray-500 text-sm">{item.date}</div>
                      </div>
                    </div>
                    {index === 0 && (
                      <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold">
                        {t('modal.currentVersion')}
                      </div>
                    )}
                  </div>
                  <div className="text-gray-700">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-8 py-6 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
          >
            {t('modal.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionCheckModal;




