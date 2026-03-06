/**
 * 一致性检查提示词模板服务
 * 管理AI语义检查和向量相似度检测的提示词模板
 */

import { ConsistencyCheckPromptTemplate, ConsistencyCheckPromptCategory } from '../../../../shared/types';
import { getDefaultConsistencyPrompts } from '../../../constants/consistencyCheck';

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
      errors.push('提示词内容不能为空');
    }

    if (!template.content?.includes('{')) {
      errors.push('提示词内容应包含变量占位符（如 {projectTitle}）');
    }

    if (!template.category) {
      errors.push('必须选择模板分类');
    }

    if (!template.name?.trim()) {
      errors.push('模板名称不能为空');
    }

    if (!template.variables || template.variables.length === 0) {
      errors.push('模板应定义至少一个变量');
    }

    // 检查必须变量是否存在
    const requiredVars = ['projectTitle'];
    requiredVars.forEach(v => {
      if (!template.content?.includes(`{${v}}`)) {
        errors.push(`建议包含变量 {${v}} 以提供上下文`);
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
    } catch (error) {
      return {
        success: false,
        error: '导入失败：JSON格式错误'
      };
    }
  }

  /**
   * 获取分类显示名称
   */
  static getCategoryDisplayName(category: ConsistencyCheckPromptCategory): string {
    const names: Record<ConsistencyCheckPromptCategory, string> = {
      'semantic_character': '角色语义检查',
      'semantic_faction': '势力语义检查',
      'semantic_location': '地点语义检查',
      'semantic_timeline': '时间线逻辑检查',
      'semantic_cross': '跨引用一致性检查',
      'similarity_detection': '相似度检测'
    };
    return names[category] || category;
  }

  /**
   * 获取分类图标
   */
  static getCategoryIcon(category: ConsistencyCheckPromptCategory): string {
    const icons: Record<ConsistencyCheckPromptCategory, string> = {
      'semantic_character': 'fa-user',
      'semantic_faction': 'fa-users',
      'semantic_location': 'fa-map-marker-alt',
      'semantic_timeline': 'fa-clock',
      'semantic_cross': 'fa-exchange-alt',
      'similarity_detection': 'fa-clone'
    };
    return icons[category] || 'fa-file-alt';
  }
}





