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
  }
});

// 监听主进程消息
ipcRenderer.on('app-version', (event, version) => {
  console.log('App version:', version);
});
