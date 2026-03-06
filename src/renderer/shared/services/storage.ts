
import { AppState, Project, StorageConfig, KnowledgeItem, EmbeddingModelConfig } from "../../../shared/types";
import { AutoBackupService } from "./autoBackupService";

// 使用Electron API进行文件系统存储
const STORAGE_FILE_NAME = 'novalist-data.json';
const STORAGE_CONFIG_FILE = 'storage-config.json';
const EMBEDDING_CONFIG_FILE = 'embedding-config.json';

// 自动备份服务实例
const autoBackupService = AutoBackupService.getInstance();

// 数据迁移：为知识库条目添加默认分类
const migrateKnowledgeCategories = (state: AppState): AppState => {
  console.log('开始知识库分类迁移...');
  if (!state) {
    console.warn('迁移失败：state为空');
    return state;
  }
  
  if (!state.projects) {
    console.warn('迁移失败：state.projects为空');
    return state;
  }
  
  // 遍历所有项目
  const migratedProjects = state.projects.map((project, index) => {
    console.log(`处理项目 ${index + 1}/${state.projects.length}: ${project.title || '未命名项目'}`);
    
    if (!project.knowledge || project.knowledge.length === 0) {
      console.log(`项目 ${project.title} 没有知识库条目，跳过`);
      return project;
    }
    
    console.log(`项目 ${project.title} 有 ${project.knowledge.length} 个知识库条目`);
    
    // 迁移知识库条目
    const migratedKnowledge = project.knowledge.map((item: any, itemIndex) => {
      // 如果条目已经有category字段，保持不变
      if (item && 'category' in item) {
        console.log(`条目 ${itemIndex + 1}: 已有分类 "${item.category}"`);
        return item as KnowledgeItem;
      }
      
      // 否则添加默认分类（'writing'作为默认值）
      console.log(`条目 ${itemIndex + 1}: 添加默认分类 "writing"`);
      return {
        ...item,
        category: 'writing' as const
      };
    });
    
    return {
      ...project,
      knowledge: migratedKnowledge
    };
  });
  
  console.log('知识库分类迁移完成');
  return {
    ...state,
    projects: migratedProjects
  };
};

// 数据迁移：将虚拟章节从chapters数组迁移到virtualChapters数组
const migrateVirtualChapters = (state: AppState): AppState => {
  console.log('开始虚拟章节迁移...');
  if (!state) {
    console.warn('迁移失败：state为空');
    return state;
  }
  
  if (!state.projects) {
    console.warn('迁移失败：state.projects为空');
    return state;
  }
  
  // 遍历所有项目
  const migratedProjects = state.projects.map((project, index) => {
    console.log(`处理项目 ${index + 1}/${state.projects.length}: ${project.title || '未命名项目'}`);
    
    // 初始化virtualChapters数组（如果不存在）
    const virtualChapters = project.virtualChapters || [];
    console.log(`项目 ${project.title} 已有 ${virtualChapters.length} 个虚拟章节`);
    
    // 找出chapters数组中的虚拟章节（order = -100）
    const virtualChapterIds = ['inspiration-virtual-chapter', 'characters-virtual-chapter', 'outline-virtual-chapter', 'chapter-outline-virtual-chapter'];
    const regularChapters: any[] = [];
    const chaptersToMigrate: any[] = [];
    
    const chapters = project.chapters || [];
    console.log(`项目 ${project.title} 有 ${chapters.length} 个章节`);
    
    chapters.forEach((chapter: any, chapterIndex) => {
      if (!chapter || !chapter.id) {
        console.warn(`章节 ${chapterIndex} 无效，跳过`);
        return;
      }
      
      if (virtualChapterIds.includes(chapter.id) || chapter.order === -100) {
        // 这是虚拟章节，需要迁移
        console.log(`章节 ${chapterIndex}: "${chapter.title || chapter.id}" 是虚拟章节，需要迁移`);
        chaptersToMigrate.push(chapter);
      } else {
        // 这是普通章节，保留在chapters数组中
        console.log(`章节 ${chapterIndex}: "${chapter.title || chapter.id}" 是普通章节，保留`);
        regularChapters.push(chapter);
      }
    });
    
    // 如果找到了需要迁移的虚拟章节
    if (chaptersToMigrate.length > 0) {
      console.log(`找到 ${chaptersToMigrate.length} 个需要迁移的虚拟章节`);
      
      // 合并现有的virtualChapters和新迁移的虚拟章节
      const allVirtualChapters = [...virtualChapters, ...chaptersToMigrate];
      
      // 去重（基于id）
      const uniqueVirtualChapters = allVirtualChapters.filter((chapter, index, self) =>
        index === self.findIndex((c) => c.id === chapter.id)
      );
      
      console.log(`迁移后共有 ${uniqueVirtualChapters.length} 个虚拟章节`);
      
      return {
        ...project,
        chapters: regularChapters,
        virtualChapters: uniqueVirtualChapters
      };
    }
    
    // 如果没有需要迁移的虚拟章节，保持原样
    console.log(`没有找到需要迁移的虚拟章节`);
    return {
      ...project,
      virtualChapters: virtualChapters
    };
  });
  
  console.log('虚拟章节迁移完成');
  return {
    ...state,
    projects: migratedProjects
  };
};

// 默认存储配置
const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  dataPath: '',
  useCustomPath: false,
  lastMigration: undefined
};

// 默认Embedding配置
const DEFAULT_EMBEDDING_CONFIGS: EmbeddingModelConfig[] = [];

// Embedding配置管理
const getEmbeddingConfigs = async (): Promise<EmbeddingModelConfig[]> => {
  if (window.electronAPI) {
    try {
      const appDataPath = await window.electronAPI.getAppDataPath();
      const configPath = `${appDataPath}/${EMBEDDING_CONFIG_FILE}`;
      const exists = await window.electronAPI.exists(configPath);
      if (exists) {
        const data = await window.electronAPI.readFile(configPath);
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load embedding configs:', error);
    }
  } else {
    // 开发模式：使用localStorage
    const data = localStorage.getItem(EMBEDDING_CONFIG_FILE);
    if (data) {
      return JSON.parse(data);
    }
  }
  return DEFAULT_EMBEDDING_CONFIGS;
};

const saveEmbeddingConfigs = async (configs: EmbeddingModelConfig[]): Promise<boolean> => {
  if (window.electronAPI) {
    try {
      const appDataPath = await window.electronAPI.getAppDataPath();
      const configPath = `${appDataPath}/${EMBEDDING_CONFIG_FILE}`;
      await window.electronAPI.writeFile(configPath, JSON.stringify(configs, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save embedding configs:', error);
      return false;
    }
  } else {
    // 开发模式：使用localStorage
    localStorage.setItem(EMBEDDING_CONFIG_FILE, JSON.stringify(configs));
    return true;
  }
};

// 获取存储配置
const getStorageConfig = async (): Promise<StorageConfig> => {
  if (window.electronAPI) {
    try {
      const appDataPath = await window.electronAPI.getAppDataPath();
      const configPath = `${appDataPath}/${STORAGE_CONFIG_FILE}`;
      const exists = await window.electronAPI.exists(configPath);
      if (exists) {
        const data = await window.electronAPI.readFile(configPath);
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load storage config:', error);
    }
  }
  return DEFAULT_STORAGE_CONFIG;
};

// 保存存储配置
const saveStorageConfig = async (config: StorageConfig): Promise<boolean> => {
  if (window.electronAPI) {
    try {
      const appDataPath = await window.electronAPI.getAppDataPath();
      const configPath = `${appDataPath}/${STORAGE_CONFIG_FILE}`;
      await window.electronAPI.writeFile(configPath, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save storage config:', error);
      return false;
    }
  }
  return false;
};

// 获取存储文件路径
const getStoragePath = async (): Promise<string> => {
  if (window.electronAPI) {
    try {
      const config = await getStorageConfig();
      if (config.useCustomPath && config.dataPath) {
        // 使用自定义路径
        return `${config.dataPath}/${STORAGE_FILE_NAME}`;
      } else {
        // 使用默认应用数据路径
        const appDataPath = await window.electronAPI.getAppDataPath();
        return `${appDataPath}/${STORAGE_FILE_NAME}`;
      }
    } catch (error) {
      console.error('Failed to get storage path:', error);
      // 出错时回退到默认路径
      const appDataPath = await window.electronAPI.getAppDataPath();
      return `${appDataPath}/${STORAGE_FILE_NAME}`;
    }
  }
  // 回退到localStorage（开发模式）
  return STORAGE_FILE_NAME;
};

// 检查是否在Electron环境中
const isElectron = () => {
  return !!(window.electronAPI);
};

export const storage = {
  saveState: async (state: AppState) => {
    if (isElectron()) {
      try {
        const filePath = await getStoragePath();
        await window.electronAPI!.writeFile(filePath, JSON.stringify(state, null, 2));
        console.log('State saved to file:', filePath);
        
        // 检查是否需要自动备份
        try {
          const config = await getStorageConfig();
          if (config.autoBackupEnabled) {
            // 触发自动备份（异步执行，不阻塞主保存操作）
            autoBackupService.performBackup(config, () => state).catch(error => {
              console.error('自动备份失败:', error);
            });
          }
        } catch (backupError) {
          console.warn('自动备份检查失败:', backupError);
        }
      } catch (error) {
        console.error('Failed to save state to file:', error);
        // 回退到localStorage
        localStorage.setItem(STORAGE_FILE_NAME, JSON.stringify(state));
      }
    } else {
      // 开发模式：使用localStorage
      localStorage.setItem(STORAGE_FILE_NAME, JSON.stringify(state));
    }
  },
  
  loadState: (): AppState | null => {
    if (isElectron()) {
      // 在Electron中，我们需要异步加载，但为了保持API兼容性，返回null并异步更新
      // 应用启动时会调用loadState，我们返回null，然后在useEffect中异步加载
      return null;
    } else {
      // 开发模式：使用localStorage
      const data = localStorage.getItem(STORAGE_FILE_NAME);
      return data ? JSON.parse(data) : null;
    }
  },

  // 新增：异步加载状态（用于Electron环境）
  loadStateAsync: async (): Promise<AppState | null> => {
    if (isElectron()) {
      try {
        const filePath = await getStoragePath();
        const exists = await window.electronAPI!.exists(filePath);
        if (exists) {
          const data = await window.electronAPI!.readFile(filePath);
          const state = JSON.parse(data);
          
          // 数据迁移：为知识库条目添加默认分类
          const stateWithKnowledgeCategories = migrateKnowledgeCategories(state);
          // 数据迁移：将虚拟章节从chapters数组迁移到virtualChapters数组
          return migrateVirtualChapters(stateWithKnowledgeCategories);
        }
        return null;
      } catch (error) {
        console.error('Failed to load state from file:', error);
        // 回退到localStorage
        const data = localStorage.getItem(STORAGE_FILE_NAME);
        if (data) {
          const state = JSON.parse(data);
          const stateWithKnowledgeCategories = migrateKnowledgeCategories(state);
          return migrateVirtualChapters(stateWithKnowledgeCategories);
        }
        return null;
      }
    } else {
      // 开发模式：使用localStorage
      const data = localStorage.getItem(STORAGE_FILE_NAME);
      if (data) {
        const state = JSON.parse(data);
        const stateWithKnowledgeCategories = migrateKnowledgeCategories(state);
        return migrateVirtualChapters(stateWithKnowledgeCategories);
      }
      return null;
    }
  },

  clearState: async () => {
    if (isElectron()) {
      try {
        const filePath = await getStoragePath();
        const exists = await window.electronAPI!.exists(filePath);
        if (exists) {
          await window.electronAPI!.unlink(filePath);
        }
      } catch (error) {
        console.error('Failed to delete state file:', error);
        localStorage.removeItem(STORAGE_FILE_NAME);
      }
    } else {
      localStorage.removeItem(STORAGE_FILE_NAME);
    }
  },

  exportData: async (state: AppState) => {
    if (isElectron()) {
      try {
        const result = await window.electronAPI!.saveFileDialog({
          title: '导出项目数据',
          defaultPath: `novalist-backup-${new Date().toISOString().split('T')[0]}.json`,
          filters: [
            { name: 'JSON文件', extensions: ['json'] },
            { name: '所有文件', extensions: ['*'] }
          ]
        });
        
        if (!result.canceled && result.filePath) {
          await window.electronAPI!.writeFile(result.filePath, JSON.stringify(state, null, 2));
          alert('数据导出成功！');
        }
      } catch (error) {
        console.error('Failed to export data:', error);
        // 回退到浏览器下载
        const dataStr = JSON.stringify(state, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `novalist-backup-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      }
    } else {
      // 浏览器模式
      const dataStr = JSON.stringify(state, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `novalist-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  },

  importData: async (): Promise<AppState> => {
    if (isElectron()) {
      try {
        const result = await window.electronAPI!.openFileDialog({
          title: '导入项目数据',
          filters: [
            { name: 'JSON文件', extensions: ['json'] },
            { name: '所有文件', extensions: ['*'] }
          ],
          properties: ['openFile']
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
          const filePath = result.filePaths[0];
          const data = await window.electronAPI!.readFile(filePath);
          console.log('导入的原始数据:', data.substring(0, 500) + '...');
          const state = JSON.parse(data);
          console.log('解析后的状态结构:', {
            hasProjects: !!state.projects,
            projectsCount: state.projects?.length || 0,
            hasActiveProjectId: !!state.activeProjectId,
            activeProjectId: state.activeProjectId
          });
          
          // 数据迁移：为知识库条目添加默认分类
          const stateWithKnowledgeCategories = migrateKnowledgeCategories(state);
          // 数据迁移：将虚拟章节从chapters数组迁移到virtualChapters数组
          const migratedState = migrateVirtualChapters(stateWithKnowledgeCategories);
          console.log('迁移后的状态:', {
            projectsCount: migratedState.projects?.length || 0,
            activeProjectId: migratedState.activeProjectId
          });
          return migratedState;
        }
        throw new Error('未选择文件');
      } catch (error) {
        console.error('Failed to import data:', error);
        throw error;
      }
    } else {
      // 浏览器模式：使用文件输入
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            reject(new Error('未选择文件'));
            return;
          }
          
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = e.target?.result as string;
              console.log('导入的原始数据:', data.substring(0, 500) + '...');
              const state = JSON.parse(data);
              console.log('解析后的状态结构:', {
                hasProjects: !!state.projects,
                projectsCount: state.projects?.length || 0,
                hasActiveProjectId: !!state.activeProjectId,
                activeProjectId: state.activeProjectId
              });
              
              // 数据迁移：为知识库条目添加默认分类
              const stateWithKnowledgeCategories = migrateKnowledgeCategories(state);
              // 数据迁移：将虚拟章节从chapters数组迁移到virtualChapters数组
              const migratedState = migrateVirtualChapters(stateWithKnowledgeCategories);
              console.log('迁移后的状态:', {
                projectsCount: migratedState.projects?.length || 0,
                activeProjectId: migratedState.activeProjectId
              });
              resolve(migratedState);
            } catch (err) {
              console.error('导入数据解析失败:', err);
              reject(err);
            }
          };
          reader.readAsText(file);
        };
        
        input.click();
      });
    }
  },

  // 新增：获取存储配置
  getStorageConfig: async (): Promise<StorageConfig> => {
    return await getStorageConfig();
  },

  // 新增：更新存储配置
  updateStorageConfig: async (config: StorageConfig): Promise<boolean> => {
    const success = await saveStorageConfig(config);
    
    // 如果配置更新成功，更新自动备份服务
    if (success && window.electronAPI) {
      try {
        // 获取当前应用状态（通过回调函数）
        const getCurrentState = () => {
          // 这里需要从应用中获取当前状态
          // 由于storage.ts是独立模块，我们需要应用在调用updateStorageConfig时提供状态获取函数
          // 暂时返回null，应用层需要处理自动备份的启动/停止
          return null;
        };
        
        // 启动或停止自动备份
        if (config.autoBackupEnabled && config.autoBackupInterval) {
          await autoBackupService.startAutoBackup(config, getCurrentState);
        } else {
          autoBackupService.stopAutoBackup();
        }
      } catch (error) {
        console.error('更新自动备份服务失败:', error);
      }
    }
    
    return success;
  },

  // 新增：迁移数据到新路径
  migrateData: async (newConfig: StorageConfig): Promise<boolean> => {
    if (!window.electronAPI) {
      console.error('数据迁移仅在Electron环境中可用');
      return false;
    }

    try {
      // 获取当前配置
      const currentConfig = await getStorageConfig();
      
      // 如果新配置不使用自定义路径，无需迁移
      if (!newConfig.useCustomPath || !newConfig.dataPath) {
        // 保存新配置
        await saveStorageConfig(newConfig);
        return true;
      }

      // 获取当前数据文件路径
      const currentFilePath = await getStoragePath();
      
      // 检查当前文件是否存在
      const currentFileExists = await window.electronAPI.exists(currentFilePath);
      
      if (currentFileExists) {
        // 读取当前数据
        const data = await window.electronAPI.readFile(currentFilePath);
        
        // 创建新目录（如果不存在）
        try {
          // 检查目录是否存在，如果不存在则创建
          // 注意：这里简化处理，实际可能需要递归创建目录
          // 由于Electron API限制，我们假设目录已存在或由用户创建
        } catch (error) {
          console.warn('Directory creation may be needed:', error);
        }
        
        // 保存到新路径
        const newFilePath = `${newConfig.dataPath}/${STORAGE_FILE_NAME}`;
        await window.electronAPI.writeFile(newFilePath, data);
        
        // 更新配置并标记迁移时间
        const updatedConfig: StorageConfig = {
          ...newConfig,
          lastMigration: new Date().toISOString()
        };
        await saveStorageConfig(updatedConfig);
        
        console.log(`Data migrated from ${currentFilePath} to ${newFilePath}`);
        return true;
      } else {
        // 当前文件不存在，只需保存新配置
        await saveStorageConfig(newConfig);
        return true;
      }
    } catch (error) {
      console.error('Failed to migrate data:', error);
      return false;
    }
  },

  // 新增：获取当前数据文件路径
  getCurrentDataPath: async (): Promise<string> => {
    return await getStoragePath();
  },

  // 新增：获取默认应用数据路径
  getDefaultAppDataPath: async (): Promise<string> => {
    if (window.electronAPI) {
      return await window.electronAPI.getAppDataPath();
    }
    return '';
  },

  // 新增：导出当前书籍（单个项目）
  exportCurrentBook: async (project: Project) => {
    if (isElectron()) {
      try {
        const result = await window.electronAPI!.saveFileDialog({
          title: '导出当前书籍',
          defaultPath: `${project.title.replace(/[<>:"/\\|?*]/g, '_')}-${new Date().toISOString().split('T')[0]}.json`,
          filters: [
            { name: 'JSON文件', extensions: ['json'] },
            { name: '所有文件', extensions: ['*'] }
          ]
        });
        
        if (!result.canceled && result.filePath) {
          await window.electronAPI!.writeFile(result.filePath, JSON.stringify(project, null, 2));
          alert(`书籍《${project.title}》导出成功！`);
        }
      } catch (error) {
        console.error('Failed to export current book:', error);
        // 回退到浏览器下载
        const dataStr = JSON.stringify(project, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `${project.title.replace(/[<>:"/\\|?*]/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      }
    } else {
      // 浏览器模式
      const dataStr = JSON.stringify(project, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `${project.title.replace(/[<>:"/\\|?*]/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  },

  // 新增：导入单个书籍
  importBook: async (): Promise<Project> => {
    if (isElectron()) {
      try {
        const result = await window.electronAPI!.openFileDialog({
          title: '导入书籍',
          filters: [
            { name: 'JSON文件', extensions: ['json'] },
            { name: '所有文件', extensions: ['*'] }
          ],
          properties: ['openFile']
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
          const filePath = result.filePaths[0];
          const data = await window.electronAPI!.readFile(filePath);
          const project = JSON.parse(data);
          
          // 验证导入的数据是否为有效的Project对象
          if (!project.id || !project.title) {
            throw new Error('导入的文件不是有效的书籍数据');
          }
          
          // 确保导入的书籍有唯一的ID（避免与现有书籍冲突）
          project.id = Date.now().toString();
          project.lastModified = Date.now();
          
          return project;
        }
        throw new Error('未选择文件');
      } catch (error) {
        console.error('Failed to import book:', error);
        throw error;
      }
    } else {
      // 浏览器模式：使用文件输入
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            reject(new Error('未选择文件'));
            return;
          }
          
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const project = JSON.parse(e.target?.result as string);
              
              // 验证导入的数据是否为有效的Project对象
              if (!project.id || !project.title) {
                reject(new Error('导入的文件不是有效的书籍数据'));
                return;
              }
              
              // 确保导入的书籍有唯一的ID（避免与现有书籍冲突）
              project.id = Date.now().toString();
              project.lastModified = Date.now();
              
              resolve(project);
            } catch (err) {
              reject(err);
            }
          };
          reader.readAsText(file);
        };
        
        input.click();
      });
    }
  },

  // 新增：手动触发备份
  triggerManualBackup: async (state: AppState): Promise<boolean> => {
    try {
      const config = await getStorageConfig();
      return await autoBackupService.performBackup(config, () => state);
    } catch (error) {
      console.error('手动备份失败:', error);
      return false;
    }
  },

  // 新增：获取备份状态
  getBackupStatus: () => {
    return autoBackupService.getBackupStatus();
  },

  // 新增：初始化自动备份服务（应用启动时调用）
  initializeAutoBackup: async (getCurrentState: () => AppState | null) => {
    try {
      const config = await getStorageConfig();
      if (config.autoBackupEnabled && config.autoBackupInterval) {
        await autoBackupService.startAutoBackup(config, getCurrentState);
        console.log('自动备份服务已启动');
      }
    } catch (error) {
      console.error('初始化自动备份服务失败:', error);
    }
  },

  // 新增：停止自动备份服务（应用关闭时调用）
  stopAutoBackup: () => {
    autoBackupService.stopAutoBackup();
    console.log('自动备份服务已停止');
  },

  // ========== Embedding模型配置管理 ==========
  
  // 获取所有Embedding模型配置
  getEmbeddingConfigs: async (): Promise<EmbeddingModelConfig[]> => {
    return await getEmbeddingConfigs();
  },

  // 保存单个Embedding模型配置
  saveEmbeddingConfig: async (config: EmbeddingModelConfig): Promise<boolean> => {
    try {
      const configs = await getEmbeddingConfigs();
      const existingIndex = configs.findIndex(c => c.id === config.id);
      
      if (existingIndex >= 0) {
        // 更新现有配置
        configs[existingIndex] = config;
      } else {
        // 添加新配置
        configs.push(config);
      }
      
      return await saveEmbeddingConfigs(configs);
    } catch (error) {
      console.error('Failed to save embedding config:', error);
      return false;
    }
  },

  // 删除Embedding模型配置
  deleteEmbeddingConfig: async (id: string): Promise<boolean> => {
    try {
      const configs = await getEmbeddingConfigs();
      const filtered = configs.filter(c => c.id !== id);
      return await saveEmbeddingConfigs(filtered);
    } catch (error) {
      console.error('Failed to delete embedding config:', error);
      return false;
    }
  },

  // 设置激活的Embedding模型配置
  setActiveEmbeddingConfig: async (id: string | null): Promise<boolean> => {
    try {
      const configs = await getEmbeddingConfigs();
      
      // 重置所有配置的激活状态
      const updated = configs.map(c => ({
        ...c,
        isActive: c.id === id
      }));
      
      return await saveEmbeddingConfigs(updated);
    } catch (error) {
      console.error('Failed to set active embedding config:', error);
      return false;
    }
  },

  // 获取激活的Embedding模型配置
  getActiveEmbeddingConfig: async (): Promise<EmbeddingModelConfig | null> => {
    try {
      const configs = await getEmbeddingConfigs();
      return configs.find(c => c.isActive) || null;
    } catch (error) {
      console.error('Failed to get active embedding config:', error);
      return null;
    }
  },

  // 获取单个Embedding模型配置
  getEmbeddingConfigById: async (id: string): Promise<EmbeddingModelConfig | null> => {
    try {
      const configs = await getEmbeddingConfigs();
      return configs.find(c => c.id === id) || null;
    } catch (error) {
      console.error('Failed to get embedding config:', error);
      return null;
    }
  },

  // ========== 一致性检查配置相关方法 ==========
  
  // 保存一致性检查配置
  saveConsistencyCheckConfig: async (config: import('../../../shared/types').ConsistencyCheckConfig): Promise<boolean> => {
    try {
      if (isElectron()) {
        const filePath = await getStoragePath();
        const data = await window.electronAPI!.readFile(filePath);
        const state: import('../../../shared/types').AppState = JSON.parse(data);
        state.consistencyCheckConfig = config;
        await window.electronAPI!.writeFile(filePath, JSON.stringify(state, null, 2));
      } else {
        const data = localStorage.getItem(STORAGE_FILE_NAME);
        const state: import('../../../shared/types').AppState = data ? JSON.parse(data) : {};
        state.consistencyCheckConfig = config;
        localStorage.setItem(STORAGE_FILE_NAME, JSON.stringify(state));
      }
      return true;
    } catch (error) {
      console.error('Failed to save consistency check config:', error);
      return false;
    }
  },

  // 加载一致性检查配置
  loadConsistencyCheckConfig: async (): Promise<import('../../../shared/types').ConsistencyCheckConfig | null> => {
    try {
      let state: import('../../../shared/types').AppState | null = null;
      
      if (isElectron()) {
        const filePath = await getStoragePath();
        const data = await window.electronAPI!.readFile(filePath);
        state = JSON.parse(data);
      } else {
        const data = localStorage.getItem(STORAGE_FILE_NAME);
        state = data ? JSON.parse(data) : null;
      }
      
      return state?.consistencyCheckConfig || null;
    } catch (error) {
      console.error('Failed to load consistency check config:', error);
      return null;
    }
  },

  // 保存一致性检查提示词模板
  saveConsistencyPrompts: async (prompts: import('../../../shared/types').ConsistencyCheckPromptTemplate[]): Promise<boolean> => {
    try {
      if (isElectron()) {
        const filePath = await getStoragePath();
        const data = await window.electronAPI!.readFile(filePath);
        const state: import('../../../shared/types').AppState = JSON.parse(data);
        state.consistencyPrompts = prompts;
        await window.electronAPI!.writeFile(filePath, JSON.stringify(state, null, 2));
      } else {
        const data = localStorage.getItem(STORAGE_FILE_NAME);
        const state: import('../../../shared/types').AppState = data ? JSON.parse(data) : {};
        state.consistencyPrompts = prompts;
        localStorage.setItem(STORAGE_FILE_NAME, JSON.stringify(state));
      }
      return true;
    } catch (error) {
      console.error('Failed to save consistency prompts:', error);
      return false;
    }
  },

  // 加载一致性检查提示词模板
  loadConsistencyPrompts: async (): Promise<import('../../../shared/types').ConsistencyCheckPromptTemplate[] | null> => {
    try {
      let state: import('../../../shared/types').AppState | null = null;
      
      if (isElectron()) {
        const filePath = await getStoragePath();
        const data = await window.electronAPI!.readFile(filePath);
        state = JSON.parse(data);
      } else {
        const data = localStorage.getItem(STORAGE_FILE_NAME);
        state = data ? JSON.parse(data) : null;
      }
      
      return state?.consistencyPrompts || null;
    } catch (error) {
      console.error('Failed to load consistency prompts:', error);
      return null;
    }
  }
};



