/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { logger } from '@/shared/utils/logger';

import { type EmbeddingModelConfig } from "../../../shared/types";

// Embedding 模型配置的持久化存储。
// 从 storage 上帝对象中解耦而来：它只管理 embedding-config.json 这一份数据，
// 与项目状态、存储路径、备份等关注点无关，唯一消费者是 embeddingModelService。

const EMBEDDING_CONFIG_FILE = 'embedding-config.json';
const DEFAULT_EMBEDDING_CONFIGS: EmbeddingModelConfig[] = [];

// 读取全部配置（Electron 走文件系统，开发模式走 localStorage）
const readConfigs = async (): Promise<EmbeddingModelConfig[]> => {
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
      logger.error('Failed to load embedding configs:', error);
    }
  } else {
    const data = localStorage.getItem(EMBEDDING_CONFIG_FILE);
    if (data) {
      return JSON.parse(data);
    }
  }
  return DEFAULT_EMBEDDING_CONFIGS;
};

// 覆盖写入全部配置
const writeConfigs = async (configs: EmbeddingModelConfig[]): Promise<boolean> => {
  if (window.electronAPI) {
    try {
      const appDataPath = await window.electronAPI.getAppDataPath();
      const configPath = `${appDataPath}/${EMBEDDING_CONFIG_FILE}`;
      await window.electronAPI.writeFile(configPath, JSON.stringify(configs, null, 2));
      return true;
    } catch (error) {
      logger.error('Failed to save embedding configs:', error);
      return false;
    }
  } else {
    localStorage.setItem(EMBEDDING_CONFIG_FILE, JSON.stringify(configs));
    return true;
  }
};

export const embeddingConfigStore = {
  // 获取所有 Embedding 模型配置
  getAll: async (): Promise<EmbeddingModelConfig[]> => {
    return await readConfigs();
  },

  // 保存单个配置（存在则更新，否则追加）
  save: async (config: EmbeddingModelConfig): Promise<boolean> => {
    try {
      const configs = await readConfigs();
      const existingIndex = configs.findIndex(c => c.id === config.id);

      if (existingIndex >= 0) {
        configs[existingIndex] = config;
      } else {
        configs.push(config);
      }

      return await writeConfigs(configs);
    } catch (error) {
      logger.error('Failed to save embedding config:', error);
      return false;
    }
  },

  // 删除配置
  remove: async (id: string): Promise<boolean> => {
    try {
      const configs = await readConfigs();
      const filtered = configs.filter(c => c.id !== id);
      return await writeConfigs(filtered);
    } catch (error) {
      logger.error('Failed to delete embedding config:', error);
      return false;
    }
  },

  // 设置激活的配置（互斥：其余全部置为非激活）
  setActive: async (id: string | null): Promise<boolean> => {
    try {
      const configs = await readConfigs();
      const updated = configs.map(c => ({
        ...c,
        isActive: c.id === id
      }));
      return await writeConfigs(updated);
    } catch (error) {
      logger.error('Failed to set active embedding config:', error);
      return false;
    }
  },

  // 获取当前激活的配置
  getActive: async (): Promise<EmbeddingModelConfig | null> => {
    try {
      const configs = await readConfigs();
      return configs.find(c => c.isActive) || null;
    } catch (error) {
      logger.error('Failed to get active embedding config:', error);
      return null;
    }
  },

  // 按 id 获取单个配置
  getById: async (id: string): Promise<EmbeddingModelConfig | null> => {
    try {
      const configs = await readConfigs();
      return configs.find(c => c.id === id) || null;
    } catch (error) {
      logger.error('Failed to get embedding config:', error);
      return null;
    }
  },
};
