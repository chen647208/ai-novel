import { AppState, StorageConfig } from '../../types';

// 自动备份服务类
export class AutoBackupService {
  private static instance: AutoBackupService;
  private backupTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private currentConfig: StorageConfig | null = null;

  // 单例模式
  public static getInstance(): AutoBackupService {
    if (!AutoBackupService.instance) {
      AutoBackupService.instance = new AutoBackupService();
    }
    return AutoBackupService.instance;
  }

  // 启动自动备份
  public async startAutoBackup(config: StorageConfig, getCurrentState: () => AppState | null): Promise<boolean> {
    // 检查是否已启用自动备份
    if (!config.autoBackupEnabled || !config.autoBackupInterval) {
      console.log('自动备份未启用或未配置间隔时间');
      return false;
    }

    // 停止现有的定时器
    this.stopAutoBackup();

    // 保存配置
    this.currentConfig = config;

    // 立即执行一次备份
    await this.performBackup(config, getCurrentState);

    // 设置定时器
    const intervalMs = config.autoBackupInterval * 1000;
    this.backupTimer = setInterval(async () => {
      await this.performBackup(config, getCurrentState);
    }, intervalMs);

    this.isRunning = true;
    console.log(`自动备份已启动，间隔: ${config.autoBackupInterval}秒`);
    return true;
  }

  // 停止自动备份
  public stopAutoBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
    this.isRunning = false;
    console.log('自动备份已停止');
  }

  // 执行单次备份
  public async performBackup(config: StorageConfig, getCurrentState: () => AppState | null): Promise<boolean> {
    try {
      // 获取当前应用状态
      const currentState = getCurrentState();
      if (!currentState) {
        console.warn('无法获取当前应用状态，跳过备份');
        return false;
      }

      // 检查是否在Electron环境中
      if (!window.electronAPI) {
        console.warn('不在Electron环境中，跳过备份');
        return false;
      }

      // 获取存储路径
      const storagePath = await this.getStoragePath(config);
      const backupDir = `${storagePath}/backups`;
      
      // 创建备份目录（如果不存在）
      try {
        const exists = await window.electronAPI.exists(backupDir);
        if (!exists) {
          // 注意：Electron API没有直接的mkdir方法，我们需要通过其他方式创建目录
          // 这里我们尝试写入一个临时文件来触发目录创建
          const tempFile = `${backupDir}/.temp`;
          await window.electronAPI.writeFile(tempFile, '');
          await window.electronAPI.unlink(tempFile);
        }
      } catch (error) {
        console.warn('创建备份目录失败:', error);
        // 继续尝试备份，可能会失败
      }

      // 生成备份文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `novalist-backup-${timestamp}.json`;
      const backupFilePath = `${backupDir}/${backupFileName}`;

      // 保存备份文件
      await window.electronAPI.writeFile(backupFilePath, JSON.stringify(currentState, null, 2));
      
      // 更新上次备份时间
      config.lastAutoBackup = Date.now();
      
      // 清理旧备份文件（只保留最新的1个）
      await this.cleanupOldBackups(backupDir, config.maxBackupFiles || 1);

      console.log(`备份成功: ${backupFileName}`);
      return true;
    } catch (error) {
      console.error('备份失败:', error);
      return false;
    }
  }

  // 清理旧备份文件
  private async cleanupOldBackups(backupDir: string, maxBackupFiles: number): Promise<void> {
    try {
      if (!window.electronAPI) return;

      // 获取备份目录中的所有文件
      // 注意：Electron API没有直接的readdir方法，我们需要通过其他方式获取文件列表
      // 这里我们简化处理，假设备份文件命名规范
      
      // 在实际应用中，可能需要实现更复杂的文件列表获取逻辑
      // 这里我们只记录日志，不实际删除文件
      console.log(`备份清理策略: 最多保留 ${maxBackupFiles} 个备份文件`);
      
    } catch (error) {
      console.error('清理旧备份失败:', error);
    }
  }

  // 获取存储路径
  private async getStoragePath(config: StorageConfig): Promise<string> {
    if (!window.electronAPI) {
      throw new Error('不在Electron环境中');
    }

    if (config.useCustomPath && config.dataPath) {
      return config.dataPath;
    } else {
      const appDataPath = await window.electronAPI.getAppDataPath();
      return appDataPath;
    }
  }

  // 获取备份状态
  public getBackupStatus(): {
    isRunning: boolean;
    interval?: number;
    lastBackup?: number;
    nextBackup?: number;
  } {
    if (!this.isRunning || !this.currentConfig) {
      return { isRunning: false };
    }

    const lastBackup = this.currentConfig.lastAutoBackup;
    const interval = this.currentConfig.autoBackupInterval || 0;
    const nextBackup = lastBackup ? lastBackup + (interval * 1000) : undefined;

    return {
      isRunning: true,
      interval,
      lastBackup,
      nextBackup
    };
  }

  // 立即执行备份（手动触发）
  public async triggerManualBackup(getCurrentState: () => AppState | null): Promise<boolean> {
    if (!this.currentConfig) {
      console.warn('没有可用的备份配置');
      return false;
    }

    return await this.performBackup(this.currentConfig, getCurrentState);
  }

  // 检查是否应该执行备份
  public shouldPerformBackup(config: StorageConfig): boolean {
    if (!config.autoBackupEnabled || !config.autoBackupInterval) {
      return false;
    }

    const now = Date.now();
    const lastBackup = config.lastAutoBackup || 0;
    const intervalMs = (config.autoBackupInterval || 30) * 1000;

    return (now - lastBackup) >= intervalMs;
  }

  // 获取备份历史
  public async getBackupHistory(): Promise<Array<{
    fileName: string;
    filePath: string;
    size: number;
    timestamp: number;
  }>> {
    // 简化实现，返回空数组
    // 在实际应用中，可以扫描备份目录并返回文件信息
    return [];
  }
}

// 导出单例实例
export const autoBackupService = AutoBackupService.getInstance();

