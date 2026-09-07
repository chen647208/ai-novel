/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 一致性检查提示词模板服务
 * 管理AI语义检查和向量相似度检测的提示词模板
 */

import { type ConsistencyCheckPromptTemplate, type ConsistencyCheckPromptCategory } from '../../../../shared/types';
import { getDefaultConsistencyPrompts } from '../../../constants/consistencyCheck';
import { i18n } from '@/i18n';

export class ConsistencyCheckPromptService {
  /**
   * 获取所有默认模板
   */
  static getDefaultTemplates(): ConsistencyCheckPromptTemplate[] {
    return getDefaultConsistencyPrompts();
  }

  /**
   * 按分类获取模板
   */
  static getTemplatesByCategory(
    category: ConsistencyCheckPromptCategory
  ): ConsistencyCheckPromptTemplate[] {
    return this.getDefaultTemplates().filter(t => t.category === category);
  }

  /**
   * 根据ID获取模板
   */
  static getTemplateById(id: string): ConsistencyCheckPromptTemplate | undefined {
    return this.getDefaultTemplates().find(t => t.id === id);
  }

  /**
   * 获取模板变量列表
   */
  static getVariables(template: ConsistencyCheckPromptTemplate): string[] {
    return template.variables;
  }

  /**
   * 应用变量到模板
   */
  static applyVariables(
    template: ConsistencyCheckPromptTemplate,
    variables: Record<string, string>
  ): string {
    let result = template.content;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    return result;
  }

  /**
   * 验证用户自定义模板
   */
  static validateTemplate(
    template: Partial<ConsistencyCheckPromptTemplate>
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.content?.trim()) {
      errors.push(i18n.t('consistency:validation.contentRequired'));
    }

    if (!template.content?.includes('{')) {
      errors.push(i18n.t('consistency:validation.contentNeedsVariable'));
    }

    if (!template.category) {
      errors.push(i18n.t('consistency:validation.categoryRequired'));
    }

    if (!template.name?.trim()) {
      errors.push(i18n.t('consistency:validation.nameRequired'));
    }

    if (!template.variables || template.variables.length === 0) {
      errors.push(i18n.t('consistency:validation.variablesRequired'));
    }

    // 检查必须变量是否存在
    const requiredVars = ['projectTitle'];
    requiredVars.forEach(v => {
      if (!template.content?.includes(`{${v}}`)) {
        errors.push(i18n.t('consistency:validation.recommendVariable', { variable: `{${v}}` }));
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * 从内容中提取变量
   */
  static extractVariables(content: string): string[] {
    const matches = content.match(/\{([a-zA-Z_]+)\}/g);
    if (!matches) return [];
    
    return [...new Set(matches.map(m => m.slice(1, -1)))];
  }

  /**
   * 创建新模板
   */
  static createTemplate(
    category: ConsistencyCheckPromptCategory,
    name: string,
    content: string,
    description?: string
  ): ConsistencyCheckPromptTemplate {
    const variables = this.extractVariables(content);
    
    return {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category,
      name,
      content,
      description,
      isDefault: false,
      variables,
      applicableModes: this.getApplicableModesByCategory(category)
    };
  }

  /**
   * 根据分类获取适用的检查模式
   */
  private static getApplicableModesByCategory(
    category: ConsistencyCheckPromptCategory
  ): ('ai' | 'vector')[] {
    switch (category) {
      case 'similarity_detection':
        return ['vector'];
      default:
        return ['ai'];
    }
  }

  /**
   * 导出模板为JSON
   */
  static exportTemplates(templates: ConsistencyCheckPromptTemplate[]): string {
    // 只导出自定义模板（非默认）
    const customTemplates = templates.filter(t => !t.isDefault);
    return JSON.stringify(customTemplates, null, 2);
  }

  /**
   * 从JSON导入模板
   */
  static importTemplates(jsonString: string): {
    success: boolean;
    templates?: ConsistencyCheckPromptTemplate[];
    error?: string;
  } {
    try {
      const imported = JSON.parse(jsonString) as Partial<ConsistencyCheckPromptTemplate>[];
      
      const validTemplates: ConsistencyCheckPromptTemplate[] = [];
      
      for (const item of imported) {
        const validation = this.validateTemplate(item);
        
        if (validation.isValid && item.category && item.name && item.content) {
          validTemplates.push({
            id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            category: item.category,
            name: item.name,
            content: item.content,
            description: item.description,
            isDefault: false,
            variables: item.variables || this.extractVariables(item.content),
            applicableModes: item.applicableModes || this.getApplicableModesByCategory(item.category)
          });
        }
      }

      return {
        success: true,
        templates: validTemplates
      };
    } catch {
      return {
        success: false,
        error: i18n.t('consistency:validation.importJsonError')
      };
    }
  }

  /**
   * 获取分类显示名称
   */
  static getCategoryDisplayName(category: ConsistencyCheckPromptCategory): string {
    return i18n.t(`consistency:promptCategory.${category}`);
  }
}





