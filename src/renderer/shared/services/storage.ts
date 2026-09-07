/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */


import { logger } from '../utils/logger';
import { isVirtualChapter } from '../../../shared/constants/chapters';
import { type AppState, type Project, type StorageConfig, type Chapter, type ConsistencyCheckConfig, type ConsistencyCheckPromptTemplate } from "../../../shared/types";
import { AutoBackupService } from "./autoBackupService";
import { dialogService } from '@/shared/services/dialogService';
import { i18n } from '@/i18n';

// 使用Electron API进行文件系统存储
const STORAGE_FILE_NAME = 'novalist-data.json';
const STORAGE_CONFIG_FILE = 'storage-config.json';

// 自动备份服务实例
const autoBackupService = AutoBackupService.getInstance();

// 数据迁移：为知识库条目添加默认分类
const migrateKnowledgeCategories = (state: AppState): AppState => {
  logger.debug('开始知识库分类迁移...');
  if (!state) {
    logger.warn('迁移失败：state为空');
    return state;
  }
  
  if (!state.projects) {
    logger.warn('迁移失败：state.projects为空');
    return state;
  }
  
  // 遍历所有项目
  const migratedProjects = state.projects.map((project, index) => {
    logger.debug(`处理项目 ${index + 1}/${state.projects.length}: ${project.title || '未命名项目'}`);
    
    if (!project.knowledge || project.knowledge.length === 0) {
      logger.debug(`项目 ${project.title} 没有知识库条目，跳过`);
      return project;
    }
    
    logger.debug(`项目 ${project.title} 有 ${project.knowledge.length} 个知识库条目`);
    
    // 迁移知识库条目
    const migratedKnowledge = project.knowledge.map((item, itemIndex) => {
      // 如果条目已经有category字段，保持不变（旧数据可能缺失该字段）
      if (item && item.category) {
        logger.debug(`条目 ${itemIndex + 1}: 已有分类 "${item.category}"`);
        return item;
      }
      
      // 否则添加默认分类（'writing'作为默认值）
      logger.debug(`条目 ${itemIndex + 1}: 添加默认分类 "writing"`);
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
  
  logger.debug('知识库分类迁移完成');
  return {
    ...state,
    projects: migratedProjects
  };
};

// 数据迁移：将虚拟章节从chapters数组迁移到virtualChapters数组
const migrateVirtualChapters = (state: AppState): AppState => {
  logger.debug('开始虚拟章节迁移...');
  if (!state) {
    logger.warn('迁移失败：state为空');
    return state;
  }
  
  if (!state.projects) {
    logger.warn('迁移失败：state.projects为空');
    return state;
  }
  
  // 遍历所有项目
  const migratedProjects = state.projects.map((project, index) => {
    logger.debug(`处理项目 ${index + 1}/${state.projects.length}: ${project.title || '未命名项目'}`);
    
    // 初始化virtualChapters数组（如果不存在）
    const virtualChapters = project.virtualChapters || [];
    logger.debug(`项目 ${project.title} 已有 ${virtualChapters.length} 个虚拟章节`);
    
    // 虚拟章节判据见 shared/constants/chapters.ts（序号为负或遗留 id）
    const regularChapters: Chapter[] = [];
    const chaptersToMigrate: Chapter[] = [];
    
    const chapters = project.chapters || [];
    logger.debug(`项目 ${project.title} 有 ${chapters.length} 个章节`);
    
    chapters.forEach((chapter, chapterIndex) => {
      if (!chapter || !chapter.id) {
        logger.warn(`章节 ${chapterIndex} 无效，跳过`);
        return;
      }
      
      if (isVirtualChapter(chapter)) {
        // 这是虚拟章节，需要迁移
        logger.debug(`章节 ${chapterIndex}: "${chapter.title || chapter.id}" 是虚拟章节，需要迁移`);
        chaptersToMigrate.push(chapter);
      } else {
        // 这是普通章节，保留在chapters数组中
        logger.debug(`章节 ${chapterIndex}: "${chapter.title || chapter.id}" 是普通章节，保留`);
        regularChapters.push(chapter);
      }
    });
    
    // 如果找到了需要迁移的虚拟章节
    if (chaptersToMigrate.length > 0) {
      logger.debug(`找到 ${chaptersToMigrate.length} 个需要迁移的虚拟章节`);
      
      // 合并现有的virtualChapters和新迁移的虚拟章节
      const allVirtualChapters = [...virtualChapters, ...chaptersToMigrate];
      
      // 去重（基于id）
      const uniqueVirtualChapters = allVirtualChapters.filter((chapter, index, self) =>
        index === self.findIndex((c) => c.id === chapter.id)
      );
      
      logger.debug(`迁移后共有 ${uniqueVirtualChapters.length} 个虚拟章节`);
      
      return {
        ...project,
        chapters: regularChapters,
        virtualChapters: uniqueVirtualChapters
      };
    }
    
    // 如果没有需要迁移的虚拟章节，保持原样
    logger.debug(`没有找到需要迁移的虚拟章节`);
    return {
      ...project,
      virtualChapters: virtualChapters
    };
  });
  
  logger.debug('虚拟章节迁移完成');
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
      logger.error('Failed to load storage config:', error);
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
      logger.error('Failed to save storage config:', error);
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
      logger.error('Failed to get storage path:', error);
      // 出错时回退到默认路径
      const appDataPath = await window.electronAPI.getAppDataPath();
      return `${appDataPath}/${STORAGE_FILE_NAME}`;
    }
  }
  // 回退到localStorage（开发模式）
  return STORAGE_FILE_NAME;
};

export const storage = {
  saveState: async (state: AppState) => {
    if (window.electronAPI) {
      try {
        const filePath = await getStoragePath();
        await window.electronAPI.writeFile(filePath, JSON.stringify(state, null, 2));
        logger.debug('State saved to file:', filePath);
      } catch (error) {
        logger.error('Failed to save state to file:', error);
        // 回退到localStorage
        localStorage.setItem(STORAGE_FILE_NAME, JSON.stringify(state));
      }
    } else {
      // 开发模式：使用localStorage
      localStorage.setItem(STORAGE_FILE_NAME, JSON.stringify(state));
    }
  },
  
  loadState: (): AppState | null => {
    if (window.electronAPI) {
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
    if (window.electronAPI) {
      try {
        const filePath = await getStoragePath();
        const exists = await window.electronAPI.exists(filePath);
        if (exists) {
          const data = await window.electronAPI.readFile(filePath);
          const state = JSON.parse(data);
          
          // 数据迁移：为知识库条目添加默认分类
          const stateWithKnowledgeCategories = migrateKnowledgeCategories(state);
          // 数据迁移：将虚拟章节从chapters数组迁移到virtualChapters数组
          return migrateVirtualChapters(stateWithKnowledgeCategories);
        }
        return null;
      } catch (error) {
        logger.error('Failed to load state from file:', error);
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
    if (window.electronAPI) {
      try {
        const filePath = await getStoragePath();
        const exists = await window.electronAPI.exists(filePath);
        if (exists) {
          await window.electronAPI.unlink(filePath);
        }
      } catch (error) {
        logger.error('Failed to delete state file:', error);
        localStorage.removeItem(STORAGE_FILE_NAME);
      }
    } else {
      localStorage.removeItem(STORAGE_FILE_NAME);
    }
  },

  exportData: async (state: AppState) => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.saveFileDialog({
          title: i18n.t('app:storage.exportAllTitle'),
          defaultPath: `novalist-backup-${new Date().toISOString().split('T')[0]}.json`,
          filters: [
            { name: i18n.t('app:storage.jsonFilter'), extensions: ['json'] },
            { name: i18n.t('app:storage.allFilesFilter'), extensions: ['*'] }
          ]
        });
        
        if (!result.canceled && result.filePath) {
          await window.electronAPI.writeFile(result.filePath, JSON.stringify(state, null, 2));
          dialogService.alert(i18n.t('app:storage.exportAllSuccess'));
        }
      } catch (error) {
        logger.error('Failed to export data:', error);
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
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.openFileDialog({
          title: i18n.t('app:storage.importAllTitle'),
          filters: [
            { name: i18n.t('app:storage.jsonFilter'), extensions: ['json'] },
            { name: i18n.t('app:storage.allFilesFilter'), extensions: ['*'] }
          ],
          properties: ['openFile']
        });
        
        const filePath = result.filePaths[0];
        if (!result.canceled && filePath) {
          const data = await window.electronAPI.readFile(filePath);
          logger.debug('导入的原始数据:', data.substring(0, 500) + '...');
          const state = JSON.parse(data);
          logger.debug('解析后的状态结构:', {
            hasProjects: !!state.projects,
            projectsCount: state.projects?.length || 0,
            hasActiveProjectId: !!state.activeProjectId,
            activeProjectId: state.activeProjectId
          });
          
          // 数据迁移：为知识库条目添加默认分类
          const stateWithKnowledgeCategories = migrateKnowledgeCategories(state);
          // 数据迁移：将虚拟章节从chapters数组迁移到virtualChapters数组
          const migratedState = migrateVirtualChapters(stateWithKnowledgeCategories);
          logger.debug('迁移后的状态:', {
            projectsCount: migratedState.projects?.length || 0,
            activeProjectId: migratedState.activeProjectId
          });
          return migratedState;
        }
        throw new Error('未选择文件');
      } catch (error) {
        logger.error('Failed to import data:', error);
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
              logger.debug('导入的原始数据:', data.substring(0, 500) + '...');
              const state = JSON.parse(data);
              logger.debug('解析后的状态结构:', {
                hasProjects: !!state.projects,
                projectsCount: state.projects?.length || 0,
                hasActiveProjectId: !!state.activeProjectId,
                activeProjectId: state.activeProjectId
              });
              
              // 数据迁移：为知识库条目添加默认分类
              const stateWithKnowledgeCategories = migrateKnowledgeCategories(state);
              // 数据迁移：将虚拟章节从chapters数组迁移到virtualChapters数组
              const migratedState = migrateVirtualChapters(stateWithKnowledgeCategories);
              logger.debug('迁移后的状态:', {
                projectsCount: migratedState.projects?.length || 0,
                activeProjectId: migratedState.activeProjectId
              });
              resolve(migratedState);
            } catch (err) {
              logger.error('导入数据解析失败:', err);
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
        logger.error('更新自动备份服务失败:', error);
      }
    }
    
    return success;
  },

  // 新增：迁移数据到新路径
  migrateData: async (newConfig: StorageConfig): Promise<boolean> => {
    if (!window.electronAPI) {
      logger.error('数据迁移仅在Electron环境中可用');
      return false;
    }

    try {
      
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
          logger.warn('Directory creation may be needed:', error);
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
        
        logger.debug(`Data migrated from ${currentFilePath} to ${newFilePath}`);
        return true;
      } else {
        // 当前文件不存在，只需保存新配置
        await saveStorageConfig(newConfig);
        return true;
      }
    } catch (error) {
      logger.error('Failed to migrate data:', error);
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
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.saveFileDialog({
          title: i18n.t('app:book.exportTitle'),
          defaultPath: `${project.title.replace(/[<>:"/\\|?*]/g, '_')}-${new Date().toISOString().split('T')[0]}.json`,
          filters: [
            { name: i18n.t('app:storage.jsonFilter'), extensions: ['json'] },
            { name: i18n.t('app:storage.allFilesFilter'), extensions: ['*'] }
          ]
        });
        
        if (!result.canceled && result.filePath) {
          await window.electronAPI.writeFile(result.filePath, JSON.stringify(project, null, 2));
          dialogService.alert(i18n.t('app:book.exportSuccess', { title: project.title }));
        }
      } catch (error) {
        logger.error('Failed to export current book:', error);
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
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.openFileDialog({
          title: i18n.t('app:bookshelf.importBook'),
          filters: [
            { name: i18n.t('app:storage.jsonFilter'), extensions: ['json'] },
            { name: i18n.t('app:storage.allFilesFilter'), extensions: ['*'] }
          ],
          properties: ['openFile']
        });
        
        const filePath = result.filePaths[0];
        if (!result.canceled && filePath) {
          const data = await window.electronAPI.readFile(filePath);
          const project = JSON.parse(data);
          
          // 验证导入的数据是否为有效的Project对象
          if (!project.id || !project.title) {
            throw new Error(i18n.t('app:book.invalidFile'));
          }
          
          // 确保导入的书籍有唯一的ID（避免与现有书籍冲突）
          project.id = Date.now().toString();
          project.lastModified = Date.now();
          
          return project;
        }
        throw new Error('未选择文件');
      } catch (error) {
        logger.error('Failed to import book:', error);
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
                reject(new Error(i18n.t('app:book.invalidFile')));
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
      logger.error('手动备份失败:', error);
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
        logger.debug('自动备份服务已启动');
      }
    } catch (error) {
      logger.error('初始化自动备份服务失败:', error);
    }
  },

  // 新增：停止自动备份服务（应用关闭时调用）
  stopAutoBackup: () => {
    autoBackupService.stopAutoBackup();
    logger.debug('自动备份服务已停止');
  },

  // ========== 一致性检查配置相关方法 ==========

  // 加载一致性检查配置
  loadConsistencyCheckConfig: async (): Promise<ConsistencyCheckConfig | null> => {
    try {
      let state: AppState | null = null;
      
      if (window.electronAPI) {
        const filePath = await getStoragePath();
        const data = await window.electronAPI.readFile(filePath);
        state = JSON.parse(data);
      } else {
        const data = localStorage.getItem(STORAGE_FILE_NAME);
        state = data ? JSON.parse(data) : null;
      }
      
      return state?.consistencyCheckConfig || null;
    } catch (error) {
      logger.error('Failed to load consistency check config:', error);
      return null;
    }
  },

  // 加载一致性检查提示词模板
  loadConsistencyPrompts: async (): Promise<ConsistencyCheckPromptTemplate[] | null> => {
    try {
      let state: AppState | null = null;
      
      if (window.electronAPI) {
        const filePath = await getStoragePath();
        const data = await window.electronAPI.readFile(filePath);
        state = JSON.parse(data);
      } else {
        const data = localStorage.getItem(STORAGE_FILE_NAME);
        state = data ? JSON.parse(data) : null;
      }
      
      return state?.consistencyPrompts || null;
    } catch (error) {
      logger.error('Failed to load consistency prompts:', error);
      return null;
    }
  }
};



