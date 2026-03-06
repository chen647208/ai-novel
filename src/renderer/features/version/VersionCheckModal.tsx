import React, { useState, useEffect } from 'react';
import { checkForUpdates, getCurrentVersionInfo, getVersionHistory, formatVersion, UpdateCheckResult } from './services/versionService';

interface VersionCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VersionCheckModal: React.FC<VersionCheckModalProps> = ({ isOpen, onClose }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [currentVersionInfo, setCurrentVersionInfo] = useState(getCurrentVersionInfo());
  const [versionHistory, setVersionHistory] = useState(getVersionHistory());
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setCurrentVersionInfo(getCurrentVersionInfo());
      setVersionHistory(getVersionHistory());
      
      // 自动检查更新（如果启用）
      if (autoCheckEnabled) {
        handleAutoCheck();
      }
    }
  }, [isOpen]);

  const handleAutoCheck = async () => {
    try {
      const result = await checkForUpdates();
      setUpdateResult(result);
    } catch (error) {
      console.error('自动检查更新失败:', error);
    }
  };

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
        error: '检查更新时发生错误'
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
        alert('更新下载完成！请重启应用以安装新版本。');
        setIsDownloading(false);
      }, 1000);
      
    } catch (error) {
      console.error('下载更新失败:', error);
      setIsDownloading(false);
      setUpdateResult({
        ...updateResult,
        success: false,
        error: '下载更新时发生错误'
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
              <i className="fas fa-rocket text-blue-600 text-lg"></i>
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">版本检查与更新</h3>
              <p className="text-gray-500 text-sm">检查新版本并查看版本历史</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* 当前版本信息 */}
          <div className="mb-8">
            <h4 className="text-lg font-bold text-gray-800 mb-4">当前版本</h4>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-2xl font-black text-gray-900">{formatVersion(currentVersionInfo.current)}</div>
                  <div className="text-gray-500 text-sm mt-1">AI小说家桌面应用</div>
                </div>
                <div className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold">
                  最新版本
                </div>
              </div>
              <div className="text-gray-700 whitespace-pre-line">
                {currentVersionInfo.releaseNotes}
              </div>
            </div>
          </div>

          {/* 更新检查区域 */}
          <div className="mb-8">
            <h4 className="text-lg font-bold text-gray-800 mb-4">检查更新</h4>
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="font-medium text-gray-800">自动检查新版本</div>
                  <div className="text-gray-500 text-sm mt-1">应用启动时自动检查GitHub发布</div>
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
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        检查中...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sync-alt mr-2"></i>
                        立即检查
                      </>
                    )}
                  </button>
                </div>
              </div>

              {updateResult && (
                <div className={`mt-4 p-6 rounded-2xl border ${updateResult.success ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <i className={`fas text-2xl ${updateResult.success ? 'fa-check-circle text-green-600' : 'fa-exclamation-triangle text-amber-600'}`}></i>
                      <div>
                        <div className="font-bold text-gray-800 text-lg">
                          {updateResult.success 
                            ? (updateResult.versionInfo.hasUpdate ? '🎉 发现新版本！' : '✅ 已是最新版本')
                            : '⚠️ 检查更新失败'
                          }
                        </div>
                        {updateResult.success && updateResult.versionInfo.publishedAt && (
                          <div className="text-gray-500 text-sm">
                            发布于: {new Date(updateResult.versionInfo.publishedAt).toLocaleDateString('zh-CN')}
                          </div>
                        )}
                      </div>
                    </div>
                    {updateResult.success && updateResult.versionInfo.hasUpdate && (
                      <div className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full text-sm font-bold animate-pulse">
                        有更新可用
                      </div>
                    )}
                  </div>
                  
                  {updateResult.success && updateResult.versionInfo.latest && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200">
                          <div className="text-gray-500 text-sm mb-1">当前版本</div>
                          <div className="text-2xl font-black text-gray-900">{formatVersion(updateResult.versionInfo.current)}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200">
                          <div className="text-gray-500 text-sm mb-1">最新版本</div>
                          <div className="text-2xl font-black text-green-600">{formatVersion(updateResult.versionInfo.latest)}</div>
                        </div>
                      </div>
                      
                      {updateResult.versionInfo.releaseNotes && (
                        <div className="bg-white p-4 rounded-xl border border-gray-200">
                          <div className="text-gray-500 text-sm mb-2">更新内容</div>
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
                                <span className="text-gray-600">下载更新中...</span>
                                <span className="font-bold text-blue-600">{downloadProgress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                                  style={{ width: `${downloadProgress}%` }}
                                ></div>
                              </div>
                              <div className="text-gray-500 text-sm">
                                下载完成后应用将自动重启安装更新
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-3">
                              <button
                                onClick={handleDownloadUpdate}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                              >
                                <i className="fas fa-download"></i>
                                自动下载并安装
                              </button>
                              <a 
                                href={updateResult.versionInfo.releaseUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                              >
                                <i className="fas fa-external-link-alt"></i>
                                手动下载
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
                        <i className="fas fa-exclamation-circle"></i>
                        <div className="font-medium">错误信息:</div>
                      </div>
                      <div className="text-sm text-gray-600">{updateResult.error}</div>
                      <div className="mt-3 text-sm text-gray-500">
                        请检查网络连接或稍后重试。您也可以访问GitHub仓库手动检查更新。
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 版本历史 */}
          <div>
            <h4 className="text-lg font-bold text-gray-800 mb-4">版本历史</h4>
            <div className="space-y-4">
              {versionHistory.map((item, index) => (
                <div 
                  key={item.version} 
                  className={`p-5 rounded-2xl border ${index === 0 ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${index === 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                        <i className="fas fa-tag"></i>
                      </div>
                      <div>
                        <div className="font-black text-gray-900">{formatVersion(item.version)}</div>
                        <div className="text-gray-500 text-sm">{item.date}</div>
                      </div>
                    </div>
                    {index === 0 && (
                      <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold">
                        当前版本
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
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionCheckModal;




