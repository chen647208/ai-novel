const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件系统操作
  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  exists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  unlink: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  
  // 对话框
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  openDirectoryDialog: (options) => ipcRenderer.invoke('open-directory-dialog', options),
  
  // 应用信息
  getVersion: () => process.versions.electron,
  getPlatform: () => process.platform,
  
  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // 环境变量（安全地暴露）
  getEnv: (key) => {
    // 只暴露允许的环境变量
    const allowedKeys = ['NODE_ENV', 'GEMINI_API_KEY'];
    if (allowedKeys.includes(key)) {
      return process.env[key];
    }
    return null;
  },
  
  // ========== 向量存储操作 ==========
  vector: {
    // 初始化向量服务
    initialize: () => ipcRenderer.invoke('vector:initialize'),
    
    // 添加文档
    addDocuments: (projectId, documents) => ipcRenderer.invoke('vector:add-documents', projectId, documents),
    
    // 更新文档
    updateDocument: (projectId, document) => ipcRenderer.invoke('vector:update-document', projectId, document),
    
    // 删除文档
    deleteDocuments: (projectId, documentIds) => ipcRenderer.invoke('vector:delete-documents', projectId, documentIds),
    
    // 语义搜索
    semanticSearch: (projectId, queryEmbedding, options) => ipcRenderer.invoke('vector:semantic-search', projectId, queryEmbedding, options),
    
    // 获取统计信息
    getStats: (projectId) => ipcRenderer.invoke('vector:get-stats', projectId),
    
    // 清理集合
    cleanup: (projectId) => ipcRenderer.invoke('vector:cleanup', projectId),
    
    // 检查一致性
    checkConsistency: (projectId) => ipcRenderer.invoke('vector:check-consistency', projectId),
  }
});

// 监听主进程消息
ipcRenderer.on('app-version', (event, version) => {
  console.log('App version:', version);
});
