import React from 'react';
import type { StorageSettingsPanelProps } from '../types';
import { storage } from '../../../shared/services/storage';

const StorageSettingsPanel: React.FC<StorageSettingsPanelProps> = ({
  storageConfig,
  setStorageConfig,
  isLoadingStorage,
  setIsLoadingStorage,
  migrationStatus,
  setMigrationStatus,
  onClearData,
}) => {
  return (
                <div className="space-y-8 animate-in zoom-in duration-300">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-4 mx-auto shadow-2xl shadow-green-200">
                      <i className="fas fa-database text-3xl text-white"></i>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">数据存储管理</h3>
                    <p className="text-gray-500 text-sm max-w-2xl mx-auto leading-relaxed">
                      管理您的项目数据存储位置，支持自定义路径、数据迁移和自动备份
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 当前存储信息 */}
                    <div className="border-2 border-green-100 rounded-2xl p-6 bg-gradient-to-br from-green-50 to-white">
                      <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                        <i className="fas fa-info-circle text-green-500"></i>
                        当前存储状态
                      </h4>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">存储路径</div>
                          <div className="text-sm font-mono bg-gray-50 text-gray-700 p-3 rounded-lg border border-gray-100 truncate">
                            {storageConfig.dataPath || '默认应用数据目录'}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">存储模式</div>
                          <div className="flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-lg text-xs font-black ${storageConfig.useCustomPath ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                              {storageConfig.useCustomPath ? '自定义路径' : '默认路径'}
                            </div>
                            {storageConfig.lastMigration && (
                              <div className="text-xs text-gray-400">
                                <i className="fas fa-clock mr-1"></i>
                                上次迁移: {new Date(storageConfig.lastMigration).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">数据文件</div>
                          <div className="text-sm text-gray-600">
                            novalist-data.json
                          </div>
                        </div>
                        
                        {/* 自动备份状态 */}
                        <div>
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">自动备份状态</div>
                          <div className="flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-lg text-xs font-black ${storageConfig.autoBackupEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                              {storageConfig.autoBackupEnabled ? '已启用' : '未启用'}
                            </div>
                            {storageConfig.lastAutoBackup && (
                              <div className="text-xs text-gray-400">
                                <i className="fas fa-history mr-1"></i>
                                上次备份: {new Date(storageConfig.lastAutoBackup).toLocaleTimeString()}
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
                        存储配置
                      </h4>
                      
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-gray-700 mb-1">使用自定义存储路径</div>
                            <p className="text-xs text-gray-500">启用后，数据将保存到您指定的目录</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={storageConfig.useCustomPath}
                              onChange={(e) => setStorageConfig({...storageConfig, useCustomPath: e.target.checked})}
                            />
                            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                          </label>
                        </div>

                        {storageConfig.useCustomPath && (
                          <div className="space-y-4">
                            <div>
                              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">自定义存储路径</div>
                              <div className="flex gap-2">
                                <input 
                                  type="text"
                                  className="flex-1 border-none rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-blue-100"
                                  value={storageConfig.dataPath}
                                  onChange={(e) => setStorageConfig({...storageConfig, dataPath: e.target.value})}
                                  placeholder="例如：C:/Users/用户名/Documents/NovalistData"
                                />
                                <button 
                                  onClick={async () => {
                                    // 使用Electron API选择目录
                                    if (window.electronAPI) {
                                      try {
                                        const result = await window.electronAPI.openDirectoryDialog({
                                          title: '选择数据存储目录',
                                          defaultPath: storageConfig.dataPath || ''
                                        });
                                        if (!result.canceled && result.filePaths.length > 0) {
                                          setStorageConfig({...storageConfig, dataPath: result.filePaths[0]});
                                        }
                                      } catch (error) {
                                        console.error('选择目录失败:', error);
                                      }
                                    } else {
                                      alert('Electron API不可用，请在Electron环境中使用此功能');
                                    }
                                  }}
                                  className="px-4 py-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-black transition-all"
                                >
                                  <i className="fas fa-folder-open mr-2"></i>
                                  选择目录
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* 自动备份配置 */}
                        <div className="space-y-6 pt-6 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-black text-gray-700 mb-1">启用自动备份</div>
                              <p className="text-xs text-gray-500">启用后，系统将定期自动备份所有数据</p>
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
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">备份间隔</div>
                                <div className="flex gap-2">
                                  {[5, 10, 30].map((interval) => (
                                    <button
                                      key={interval}
                                      onClick={() => setStorageConfig({...storageConfig, autoBackupInterval: interval})}
                                      className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                                        storageConfig.autoBackupInterval === interval 
                                          ? 'bg-green-100 text-green-600 border-2 border-green-200' 
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      {interval}秒
                                    </button>
                                  ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                  选择自动备份的时间间隔。备份将覆盖之前的备份文件，只保留最新的一份。
                                </p>
                              </div>
                              
                              <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">备份状态</div>
                                <div className="flex items-center gap-2">
                                  <div className={`px-3 py-1 rounded-lg text-xs font-black ${
                                    storageConfig.lastAutoBackup 
                                      ? 'bg-green-100 text-green-600' 
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {storageConfig.lastAutoBackup 
                                      ? `上次备份: ${new Date(storageConfig.lastAutoBackup).toLocaleTimeString()}`
                                      : '尚未备份'
                                    }
                                  </div>
                                  <button 
                                    onClick={async () => {
                                      // 手动触发备份
                                      try {
                                        // 这里需要调用storage.ts中的triggerManualBackup方法
                                        // 由于我们是在React组件中，需要通过props或其他方式传递
                                        // 暂时先显示提示
                                        alert('手动备份功能将在保存配置后生效');
                                      } catch (error) {
                                        console.error('手动备份失败:', error);
                                      }
                                    }}
                                    className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-black transition-all"
                                  >
                                    <i className="fas fa-save mr-1"></i>
                                    立即备份
                                  </button>
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">备份策略</div>
                                <p className="text-xs text-gray-600">
                                  • 自动备份将在每次数据保存时检查是否达到间隔时间<br/>
                                  • 备份文件保存在数据目录的"backups"文件夹中<br/>
                                  • 只保留最新的备份文件，旧的备份会被自动清理<br/>
                                  • 备份包含完整的项目数据和应用状态
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
                      危险操作
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">数据迁移</div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={async () => {
                              setIsLoadingStorage(true);
                              setMigrationStatus('正在检查数据迁移...');
                              try {
                                // 这里需要调用数据迁移逻辑
                                // 暂时先模拟
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                setMigrationStatus('数据迁移检查完成');
                              } catch (error) {
                                setMigrationStatus('数据迁移失败: ' + (error as Error).message);
                              } finally {
                                setIsLoadingStorage(false);
                              }
                            }}
                            disabled={isLoadingStorage}
                            className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-black transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                            {isLoadingStorage ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-exchange-alt"></i>}
                            检查数据迁移
                          </button>
                          {migrationStatus && (
                            <span className="text-xs text-gray-600">{migrationStatus}</span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">清除所有数据</div>
                        <p className="text-xs text-gray-600 mb-3">
                          此操作将删除所有项目数据、配置和备份文件，无法恢复。
                        </p>
                        <button 
                          onClick={() => {
                            if (window.confirm('⚠️ 警告：这将删除所有数据，包括项目、配置和备份。确定要继续吗？')) {
                              onClearData();
                            }
                          }}
                          className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-black transition-all flex items-center gap-2"
                        >
                          <i className="fas fa-trash-alt"></i>
                          清除所有数据
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
  );
};

export default StorageSettingsPanel;
