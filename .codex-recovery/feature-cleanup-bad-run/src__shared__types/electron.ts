export interface ElectronAPI {
  // 文件系统操作
  getAppDataPath: () => Promise<string>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, data: string) => Promise<boolean>;
  exists: (filePath: string) => Promise<boolean>;
  unlink: (filePath: string) => Promise<boolean>;
  
  // 对话框
  openFileDialog: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
  saveFileDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string }>;
  openDirectoryDialog: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
  
  // 应用信息
  getVersion: () => string;
  getPlatform: () => string;
  
  // 窗口控制
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  
  // 环境变量
  getEnv: (key: string) => string | null;
  
  // 向量存储操作（通过主进程代理）
  vector: {
    initialize: () => Promise<{ success: boolean; error?: string }>;
    addDocuments: (projectId: string, documents: any[]) => Promise<{ success: boolean; ids?: string[]; error?: string }>;
    updateDocument: (projectId: string, document: any) => Promise<{ success: boolean; error?: string }>;
    deleteDocuments: (projectId: string, documentIds: string[]) => Promise<{ success: boolean; error?: string }>;
    semanticSearch: (projectId: string, queryEmbedding: number[], options?: any) => Promise<{ success: boolean; results?: any[]; error?: string }>;
    getStats: (projectId: string) => Promise<{ success: boolean; stats?: any; error?: string }>;
    cleanup: (projectId: string) => Promise<{ success: boolean; error?: string }>;
    checkConsistency: (projectId: string) => Promise<{ success: boolean; result?: any; error?: string }>;
  };
}

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
