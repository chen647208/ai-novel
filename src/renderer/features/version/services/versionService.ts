/**
 * 版本服务 - 处理应用版本检查和更新
 */

declare const __APP_VERSION__: string;

const CURRENT_VERSION = __APP_VERSION__;

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

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'AI-Novelist-App',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API请求失败: ${response.status} ${response.statusText}`);
    }

    const releaseData = await response.json();
    const latestVersion = releaseData.tag_name.replace(/^v/, '');
    const releaseNotes = releaseData.body || '暂无更新说明';
    const releaseUrl = releaseData.html_url;
    const publishedAt = releaseData.published_at;

    const versionInfo: VersionInfo = {
      current: CURRENT_VERSION,
      latest: latestVersion,
      hasUpdate: compareVersions(latestVersion, CURRENT_VERSION) > 0,
      releaseNotes,
      releaseUrl,
      publishedAt,
    };

    return {
      success: true,
      versionInfo,
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
        publishedAt: null,
      },
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let index = 0; index < Math.max(parts1.length, parts2.length); index += 1) {
    const num1 = parts1[index] || 0;
    const num2 = parts2[index] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

export function getVersionChangelog(version: string): string {
  const changelog: Record<string, string> = {
    '1.4.5': '• 版本号更新至1.4.5\n• 修复构建过程中的顶层await问题\n• 优化版本检查服务初始化逻辑\n• 准备发布新的安装包',
    '1.4.4': '• 版本检查与更新系统全面升级\n• 支持GitHub API实时检查\n• 自动更新功能集成\n• 性能优化和错误修复',
    '1.4.3': '• 改进AI历史记录显示\n• 优化系统稳定性\n• 修复已知问题',
    '1.4.2': '• 新增智能提示词管理\n• 优化写作体验\n• 改进数据持久化',
    '1.4.1': '• 增强章节编辑器\n• 优化批量生成功能\n• 修复部分UI问题',
    '1.4.0': '• 全新版本检查与更新系统\n• GitHub Release 集成\n• 自动下载与安装支持',
  };

  return changelog[version] || '暂无该版本的详细更新日志';
}

export function getCurrentVersion(): string {
  return CURRENT_VERSION;
}

export interface VersionHistoryItem {
  version: string;
  date: string;
  description: string;
}

const VERSION_HISTORY: VersionHistoryItem[] = [
  { version: '1.4.5', date: '2026-03-06', description: '构建告警修复、版本服务前端化、打包分块优化。' },
  { version: '1.4.4', date: '2026-01-26', description: '版本检查与更新系统全面升级，支持 GitHub Release 实时检查。' },
  { version: '1.4.3', date: '2026-01-25', description: '改进 AI 历史记录显示，优化系统稳定性并修复已知问题。' },
  { version: '1.4.2', date: '2026-01-24', description: '新增智能提示词管理，优化写作体验与数据持久化。' },
  { version: '1.4.1', date: '2026-01-23', description: '增强章节编辑器，优化批量生成功能并修复部分 UI 问题。' },
  { version: '1.4.0', date: '2026-01-22', description: '上线版本检查与更新系统，集成 GitHub Release。' },
  { version: '1.2.1', date: '2026-01-21', description: '修复正文撰写问题，优化更新逻辑。' },
  { version: '1.1.0', date: '2026-01-20', description: 'AI 小说家应用初始版本。' },
];

export function getCurrentVersionInfo(): VersionInfo {
  return {
    current: CURRENT_VERSION,
    latest: CURRENT_VERSION,
    hasUpdate: false,
    releaseNotes: getVersionChangelog(CURRENT_VERSION),
    releaseUrl: null,
    publishedAt: VERSION_HISTORY.find((item) => item.version === CURRENT_VERSION)?.date || null,
  };
}

export function getVersionHistory(): VersionHistoryItem[] {
  return VERSION_HISTORY;
}

export function formatVersion(version: string | null): string {
  if (!version) {
    return '未知版本';
  }
  return version.startsWith('v') ? version : `v${version}`;
}
