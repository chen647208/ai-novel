/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 历史数据迁移（从 storage.ts 抽出）：知识库分类补全、虚拟章节升级。
 * 纯 state→state 变换，不改外部存储；由 storage 在载入后调用。
 */
import { logger } from '../utils/logger';
import { isVirtualChapter } from '../../../shared/constants/chapters';
import { type AppState, type Chapter } from '../../../shared/types';

// 数据迁移：为知识库条目添加默认分类
export const migrateKnowledgeCategories = (state: AppState): AppState => {
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
export const migrateVirtualChapters = (state: AppState): AppState => {
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

// 获取存储配置
