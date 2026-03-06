import electron from 'electron';
const { app, BrowserWindow, ipcMain, dialog } = electron;
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

// 向量存储服务（在主进程中运行）
let vectorService = null;
let LocalIndex = null;

// 初始化向量存储服务
async function initVectorService() {
  try {
    // 动态导入Vectra（ESM模块）
    const vectra = await import('vectra');
    LocalIndex = vectra.LocalIndex;
    
    const userDataPath = app.getPath('userData');
    const basePath = path.join(userDataPath, 'vectra_indices');
    
    // 确保基础目录存在
    await fs.mkdir(basePath, { recursive: true });
    
    vectorService = {
      basePath,
      indices: new Map()
    };
    
    console.log('Vector service initialized at:', basePath);
  } catch (error) {
    console.error('Failed to initialize vector service:', error);
  }
}

// 获取或创建索引
async function getOrCreateIndex(projectId) {
  if (!vectorService) {
    await initVectorService();
  }
  
  if (vectorService.indices.has(projectId)) {
    return vectorService.indices.get(projectId);
  }
  
  // 清理项目ID，确保文件名安全
  const safeProjectId = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const indexPath = path.join(vectorService.basePath, safeProjectId);
  
  const index = new LocalIndex(indexPath);
  
  if (!(await index.isIndexCreated())) {
    await index.createIndex();
    console.log(`Created new Vectra index for project ${projectId}`);
  }
  
  vectorService.indices.set(projectId, index);
  return index;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'default',
    autoHideMenuBar: true
  });

  // 判断是否为打包版本
  if (app.isPackaged) {
    // 生产环境：加载打包后的文件
    console.log('Production mode: loading built files');
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
      // 如果加载失败，显示错误信息
      mainWindow.loadURL(`data:text/html;charset=utf-8,
        <html>
          <body style="font-family: Arial; padding: 40px; text-align: center;">
            <h1>加载失败</h1>
            <p>无法加载应用程序文件。请检查dist目录是否存在。</p>
            <p>错误信息: ${err.message}</p>
          </body>
        </html>
      `);
    });
  } else {
    // 开发环境：优先尝试开发服务器
    console.log('Development mode: trying development server first');
    tryDevelopmentServer(mainWindow);
    // 打开开发者工具以便调试
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 尝试连接开发服务器
function tryDevelopmentServer(window) {
  // 尝试多个可能的开发服务器端口
  const possiblePorts = [3000, 3001, 3002, 3003];
  
  const tryPort = (portIndex) => {
    if (portIndex >= possiblePorts.length) {
      // 所有端口都尝试失败，显示错误页面
      console.error('All development server ports failed');
      window.loadFile(path.join(__dirname, 'error.html')).catch(() => {
        console.error('Failed to load error page');
      });
      return;
    }
    
    const port = possiblePorts[portIndex];
    const devServerURL = `http://localhost:${port}`;
    console.log('Trying development server:', devServerURL);
    
    window.loadURL(devServerURL).catch(err => {
      console.error(`Failed to load from development server on port ${port}:`, err.message);
      // 尝试下一个端口
      setTimeout(() => tryPort(portIndex + 1), 100);
    });
  };
  
  // 从第一个端口开始尝试
  tryPort(0);
}

app.whenReady().then(async () => {
  console.log('Electron user data path:', app.getPath('userData'));
  
  // 初始化向量存储服务
  await initVectorService();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ========== IPC处理函数 ==========

ipcMain.handle('get-app-data-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return data;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
});

ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    // 确保目录存在
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, data, 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing file:', error);
    throw error;
  }
});

ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
});

// 处理文件选择对话框
ipcMain.handle('open-file-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// 处理保存文件对话框
ipcMain.handle('save-file-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

// 处理目录选择对话框
ipcMain.handle('open-directory-dialog', async (event, options) => {
  const defaultOptions = {
    title: '选择目录',
    properties: ['openDirectory', 'createDirectory']
  };
  
  const dialogOptions = { ...defaultOptions, ...options };
  const result = await dialog.showOpenDialog(mainWindow, dialogOptions);
  return result;
});

// ========== 向量存储IPC处理函数 ==========

// 初始化向量服务
ipcMain.handle('vector:initialize', async () => {
  try {
    if (!vectorService) {
      await initVectorService();
    }
    return { success: true };
  } catch (error) {
    console.error('Vector initialize error:', error);
    return { success: false, error: error.message };
  }
});

// 添加文档
ipcMain.handle('vector:add-documents', async (event, projectId, documents) => {
  try {
    const index = await getOrCreateIndex(projectId);
    const ids = [];
    
    for (const doc of documents) {
      await index.insertItem({
        id: doc.id,
        vector: doc.embedding,
        metadata: {
          projectId: doc.projectId,
          knowledgeItemId: doc.knowledgeItemId,
          content: doc.content,
          category: doc.metadata.category,
          type: doc.metadata.type,
          size: doc.metadata.size,
          addedAt: doc.metadata.addedAt,
          chunkIndex: doc.metadata.chunkIndex,
          totalChunks: doc.metadata.totalChunks,
        }
      });
      ids.push(doc.id);
    }
    
    return { success: true, ids };
  } catch (error) {
    console.error('Vector add documents error:', error);
    return { success: false, error: error.message };
  }
});

// 更新文档
ipcMain.handle('vector:update-document', async (event, projectId, document) => {
  try {
    const index = await getOrCreateIndex(projectId);
    
    // Vectra没有直接更新，先删除再插入
    try {
      await index.deleteItem(document.id);
    } catch (e) {
      // 文档可能不存在，忽略错误
    }
    
    await index.insertItem({
      id: document.id,
      vector: document.embedding,
      metadata: {
        projectId: document.projectId,
        knowledgeItemId: document.knowledgeItemId,
        content: document.content,
        category: document.metadata.category,
        type: document.metadata.type,
        size: document.metadata.size,
        addedAt: document.metadata.addedAt,
        chunkIndex: document.metadata.chunkIndex,
        totalChunks: document.metadata.totalChunks,
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Vector update document error:', error);
    return { success: false, error: error.message };
  }
});

// 删除文档
ipcMain.handle('vector:delete-documents', async (event, projectId, documentIds) => {
  try {
    const index = await getOrCreateIndex(projectId);
    
    for (const id of documentIds) {
      try {
        await index.deleteItem(id);
      } catch (e) {
        console.warn(`Failed to delete document ${id}:`, e);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Vector delete documents error:', error);
    return { success: false, error: error.message };
  }
});

// 语义搜索
ipcMain.handle('vector:semantic-search', async (event, projectId, queryEmbedding, options = {}) => {
  try {
    const index = await getOrCreateIndex(projectId);
    
    const results = await index.queryItems(
      queryEmbedding,
      '',  // query text for BM25
      options.limit || 10
    );
    
    // 转换结果格式
    const searchResults = results.map(result => ({
      document: {
        id: result.item.id,
        projectId: String(result.item.metadata?.projectId || projectId),
        knowledgeItemId: result.item.metadata?.knowledgeItemId || '',
        content: result.item.metadata?.content || '',
        embedding: [], // 不返回完整嵌入向量
        metadata: {
          category: result.item.metadata?.category || 'writing',
          type: result.item.metadata?.type || 'text',
          size: result.item.metadata?.size || 0,
          addedAt: result.item.metadata?.addedAt || Date.now(),
          chunkIndex: result.item.metadata?.chunkIndex,
          totalChunks: result.item.metadata?.totalChunks,
        }
      },
      score: result.score,
      content: result.item.metadata?.content || '',
      metadata: {
        category: result.item.metadata?.category || 'writing',
        type: result.item.metadata?.type || 'text',
        size: result.item.metadata?.size || 0,
        addedAt: result.item.metadata?.addedAt || Date.now(),
        chunkIndex: result.item.metadata?.chunkIndex,
        totalChunks: result.item.metadata?.totalChunks,
        name: result.item.metadata?.knowledgeItemId || ''
      }
    }));
    
    return { success: true, results: searchResults };
  } catch (error) {
    console.error('Vector semantic search error:', error);
    return { success: false, error: error.message, results: [] };
  }
});

// 获取统计信息
ipcMain.handle('vector:get-stats', async (event, projectId) => {
  try {
    const index = await getOrCreateIndex(projectId);
    const items = await index.listItems();
    
    // 统计类别分布
    const categories = {};
    let dimensions = 384;
    
    for (const item of items) {
      const category = item.metadata?.category || 'unknown';
      categories[category] = (categories[category] || 0) + 1;
      
      if (item.vector && item.vector.length > 0) {
        dimensions = item.vector.length;
      }
    }
    
    return {
      success: true,
      stats: {
        count: items.length,
        dimensions,
        categories,
        lastUpdated: Date.now()
      }
    };
  } catch (error) {
    console.error('Vector get stats error:', error);
    return { success: false, error: error.message };
  }
});

// 清理集合
ipcMain.handle('vector:cleanup', async (event, projectId) => {
  try {
    const index = await getOrCreateIndex(projectId);
    
    // 删除所有项目
    const items = await index.listItems();
    for (const item of items) {
      try {
        await index.deleteItem(item.id);
      } catch (e) {
        console.warn(`Failed to delete item ${item.id}:`, e);
      }
    }
    
    // 从缓存中移除
    if (vectorService) {
      vectorService.indices.delete(projectId);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Vector cleanup error:', error);
    return { success: false, error: error.message };
  }
});

// 检查一致性
ipcMain.handle('vector:check-consistency', async (event, projectId) => {
  try {
    const index = await getOrCreateIndex(projectId);
    const items = await index.listItems();
    
    const conflicts = [];
    let dimensions = 384;
    
    for (const item of items) {
      if (item.vector && item.vector.length > 0) {
        dimensions = item.vector.length;
      }
      
      // 检查元数据完整性
      if (!item.metadata || (item.metadata.projectId && item.metadata.projectId !== projectId)) {
        conflicts.push({
          type: 'metadata_inconsistency',
          description: `文档${item.id}的projectId不匹配`,
          severity: 'high',
          suggestion: '修复或重新添加该文档'
        });
      }
      
      if (!item.vector || item.vector.length === 0) {
        conflicts.push({
          type: 'missing_embedding',
          description: `文档${item.id}缺少嵌入向量`,
          severity: 'high',
          suggestion: '重新生成该文档的嵌入向量'
        });
      }
    }
    
    // 检查维度
    if (dimensions !== 384 && dimensions !== 1024) {
      conflicts.push({
        type: 'embedding_dimension_unusual',
        description: `嵌入维度为${dimensions}，常见值为384或1024`,
        severity: 'low',
        suggestion: '如使用非标准模型，可忽略此警告'
      });
    }
    
    return {
      success: true,
      result: {
        isConsistent: conflicts.length === 0,
        conflicts,
        score: conflicts.length === 0 ? 1.0 : Math.max(0, 1 - conflicts.length * 0.1)
      }
    };
  } catch (error) {
    console.error('Vector check consistency error:', error);
    return { success: false, error: error.message };
  }
});
