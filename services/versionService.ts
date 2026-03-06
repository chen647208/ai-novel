/**
 * 版本服务 - 处理应用版本检查和更新
 */

// 从package.json获取当前版本
let CURRENT_VERSION = '1.4.5'; // 默认值

// 初始化版本号（在Electron环境中动态加载）
async function initializeVersion() {
  try {
    // 在ES模块中使用createRequire
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const packageJson = require('../../package.json');
    CURRENT_VERSION = packageJson.version;
  } catch (error) {
    console.warn('无法加载package.json，使用默认版本号:', error);
  }
}

// 在模块加载时初始化版本号（但不在顶层使用await）
initializeVersion().catch(error => {
  console.warn('版本初始化失败:', error);
});

// GitHub仓库信息（用于检查更新）
const GITHUB_REPO = 'novalocal/ai-novelist';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export interface VersionInfo {
  current: string;
  latest: string | null;
  hasUpdate: boolean;
  releaseNotes: string | null;
  releaseUrl: string | null;
  publishedAt: string | null;
}

export interface UpdateCheckResult {
  success: boolean;
  versionInfo: VersionInfo;
  error?: string;
}

/**
 * 检查是否有新版本可用
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  try {
    // 调用GitHub API检查最新版本
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AI-Novelist-App'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API请求失败: ${response.status} ${response.statusText}`);
    }

    const releaseData = await response.json();
    const latestVersion = releaseData.tag_name.replace(/^v/, ''); // 移除可能的v前缀
    const releaseNotes = releaseData.body || '暂无更新说明';
    const releaseUrl = releaseData.html_url;
    const publishedAt = releaseData.published_at;
    
    const versionInfo: VersionInfo = {
      current: CURRENT_VERSION,
      latest: latestVersion,
      hasUpdate: compareVersions(latestVersion, CURRENT_VERSION) > 0,
      releaseNotes,
      releaseUrl,
      publishedAt
    };

    return {
      success: true,
      versionInfo
    };
  } catch (error) {
    console.error('检查更新失败:', error);
    return {
      success: false,
      versionInfo: {
        current: CURRENT_VERSION,
        latest: null,
        hasUpdate: false,
        releaseNotes: null,
        releaseUrl: null,
        publishedAt: null
      },
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 比较两个版本号
 * @returns 1: v1 > v2, 0: v1 = v2, -1: v1 < v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  
  return 0;
}

/**
 * 获取版本变更日志
 */
export function getVersionChangelog(version: string): string {
  const changelog: Record<string, string> = {
    '1.4.5': '• 版本号更新至1.4.5\n• 修复构建过程中的顶层await问题\n• 优化版本检查服务初始化逻辑\n• 准备发布新的安装包',
    '1.4.4': '• 版本检查与更新系统全面升级\n• 支持GitHub API实时检查\n• 自动更新功能集成\n• 性能优化和错误修复',
    '1.4.3': '• 修复存储配置持久化问题\n• 优化AI助手滚动行为\n• 改进用户界面体验',
    '1.4.2': '• 增强向量数据库集成\n• 改进角色生成算法\n• 修复已知bug',
    '1.4.1': '• 初始版本检查功能\n• 基础更新机制\n• 版本历史记录',
    '1.4.0': '• 项目版本迭代更新系统\n• 依赖项自动更新检查功能\n• 版本兼容性验证工具\n• 性能优化和构建改进',
    '1.3.0': '• 全局历史查看器\n• 批量操作功能\n• 虚拟章节显示优化',
    '1.2.1': '• 修复正文撰写功能bug\n• 优化批量更新逻辑\n• 安装包体积优化',
    '1.1.0': '• AI小说家应用初始版本\n• 完整创作流程支持\n• 跨平台桌面应用'
  };
  
  return changelog[version] || `版本 ${version} 的更新内容`;
}

/**
 * 获取当前版本信息
 */
export function getCurrentVersionInfo(): VersionInfo {
  return {
    current: CURRENT_VERSION,
    latest: null,
    hasUpdate: false,
    releaseNotes: getVersionChangelog(CURRENT_VERSION),
    releaseUrl: null,
    publishedAt: null
  };
}

/**
 * 格式化版本显示
 */
export function formatVersion(version: string): string {
  return `v${version}`;
}

/**
 * 检查版本兼容性
 */
export function checkCompatibility(requiredVersion: string): boolean {
  return compareVersions(CURRENT_VERSION, requiredVersion) >= 0;
}

/**
 * 获取版本历史
 */
export function getVersionHistory(): Array<{version: string; date: string; description: string}> {
  return [
    { version: '1.4.5', date: '2026-01-25', description: '版本号更新至1.4.5，修复构建问题，准备发布新安装包' },
    { version: '1.4.4', date: '2026-01-25', description: '版本检查与更新系统全面升级，支持GitHub API实时检查' },
    { version: '1.4.3', date: '2026-01-25', description: '修复存储配置持久化问题，优化AI助手滚动行为' },
    { version: '1.4.2', date: '2026-01-24', description: '增强向量数据库集成，改进角色生成算法' },
    { version: '1.4.1', date: '2026-01-24', description: '初始版本检查功能，基础更新机制' },
    { version: '1.4.0', date: '2026-01-23', description: '版本迭代更新系统，性能优化' },
    { version: '1.3.0', date: '2026-01-22', description: '全局历史查看器，批量操作功能' },
    { version: '1.2.1', date: '2026-01-21', description: '修复正文撰写bug，优化更新逻辑' },
    { version: '1.1.0', date: '2026-01-20', description: 'AI小说家应用初始版本' }
  ];
}
