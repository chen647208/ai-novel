import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncElectronPackage() {
  try {
    const targetDir = path.join(__dirname, '../build/main');
    await fs.mkdir(targetDir, { recursive: true });

    const packageSource = path.join(__dirname, '../package.json');
    const packageContent = await fs.readFile(packageSource, 'utf-8');
    const packageJson = JSON.parse(packageContent);

    const electronPackage = {
      name: packageJson.name,
      version: packageJson.version,
      type: packageJson.type,
      main: 'main.js'
    };

    const packageTarget = path.join(targetDir, 'package.json');
    await fs.writeFile(packageTarget, JSON.stringify(electronPackage, null, 2), 'utf-8');
    console.log(`Synced Electron package manifest to ${packageTarget}`);
  } catch (error) {
    console.error('Error syncing Electron package manifest:', error);
    process.exit(1);
  }
}

syncElectronPackage();
