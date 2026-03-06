export interface StorageConfig {
  dataPath: string;           // 数据存储路径
  useCustomPath: boolean;     // 是否使用自定义路径
  lastMigration?: string;     // 上次数据迁移时间
  // 新增自动备份配置
  autoBackupEnabled?: boolean;      // 是否启用自动备份
  autoBackupInterval?: number;      // 自动备份间隔（秒）：5, 10, 30
  lastAutoBackup?: number;          // 上次自动备份时间戳
  maxBackupFiles?: number;          // 最大备份文件数（默认为1，覆盖备份）
}
