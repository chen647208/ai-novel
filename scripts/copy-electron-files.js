import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function copyElectronFiles() {
  try {
    const sourceDir = path.join(__dirname, '../electron-main');
    const targetDir = path.join(__dirname, '../dist-electron');
    
    // 确保目标目录存在
    await fs.mkdir(targetDir, { recursive: true });
    
    // 复制main.js
    const mainSource = path.join(sourceDir, 'main.js');
    const mainTarget = path.join(targetDir, 'main.js');
    await fs.copyFile(mainSource, mainTarget);
    console.log(`Copied ${mainSource} to ${mainTarget}`);
    
    // 复制preload.js
    const preloadSource = path.join(sourceDir, 'preload.js');
    const preloadTarget = path.join(targetDir, 'preload.js');
    await fs.copyFile(preloadSource, preloadTarget);
    console.log(`Copied ${preloadSource} to ${preloadTarget}`);
    
    // 读取并修改package.json
    const packageSource = path.join(__dirname, '../package.json');
    const packageContent = await fs.readFile(packageSource, 'utf-8');
    const packageJson = JSON.parse(packageContent);
    
    // 更新main字段为main.js（相对于dist-electron目录）
    packageJson.main = 'main.js';
    
    // 写入修改后的package.json到dist-electron
    const packageTarget = path.join(targetDir, 'package.json');
    await fs.writeFile(packageTarget, JSON.stringify(packageJson, null, 2), 'utf-8');
    console.log(`Copied and updated ${packageSource} to ${packageTarget}`);
    
    console.log('Electron files copied successfully!');
  } catch (error) {
    console.error('Error copying electron files:', error);
    process.exit(1);
  }
}

copyElectronFiles();
