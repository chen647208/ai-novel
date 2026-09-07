/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { type AICardCommand, type AIProjectContext, type Project, type CardPromptTemplate } from '../../../../shared/types';
import { 
  getDefaultTemplateForCommand, 
  buildCardPrompt as buildPromptFromTemplate,
  getTemplateVariableDescriptions 
} from './cardPromptService';

/**
 * AI卡片Prompt构建服务
 * 根据不同的命令类型构建适当的AI Prompt
 * 
 * 此服务现在作为兼容层，实际逻辑已迁移到 cardPromptService
 */
export class AICardPromptService {
  
  /**
   * 根据命令类型构建Prompt
   * @param command 命令类型
   * @param description 用户描述
   * @param projectContext 项目上下文
   * @param customTemplate 可选的自定义模板
   * @returns 构建好的Prompt字符串
   */
  static buildPrompt(
    command: AICardCommand, 
    description: string, 
    projectContext: AIProjectContext,
    customTemplate?: CardPromptTemplate
  ): string {
    // 使用新的 cardPromptService 构建提示词
    return buildPromptFromTemplate(command, description, projectContext, customTemplate);
  }

  /**
   * 从 Project 对象提取上下文
   * @param project 项目对象
   * @returns 上下文对象
   */
  static extractContextFromProject(project: Project): AIProjectContext {
    return {
      title: project.title,
      worldView: project.worldView,
      characters: project.characters,
      locations: project.locations,
      factions: project.factions,
      timeline: project.timeline,
      ruleSystems: project.ruleSystems,
    };
  }

  /**
   * 获取命令类型的默认模板
   * @param command 命令类型
   * @returns 默认模板
   */
  static getDefaultTemplate(command: AICardCommand): CardPromptTemplate | undefined {
    return getDefaultTemplateForCommand(command);
  }

  /**
   * 获取模板变量说明
   * @returns 变量说明列表
   */
  static getTemplateVariableDescriptions(): Array<{ variable: string; description: string; required: boolean }> {
    return getTemplateVariableDescriptions();
  }

}





