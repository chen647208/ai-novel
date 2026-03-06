import electron from 'electron';
const { app, BrowserWindow, ipcMain, dialog } = electron;
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

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

app.whenReady().then(() => {
  console.log('Electron user data path:', app.getPath('userData'));
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

// IPC处理函数
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
