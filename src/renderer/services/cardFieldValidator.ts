/**
 * AI卡片字段完整性校验服务
 * 负责确保AI生成的卡片数据包含所有必需字段
 */

import { AICardCommand, CardPromptTemplate } from '../types';

/**
 * 字段定义配置
 */
export interface FieldDefinition {
  /** 字段名 */
  name: string;
  /** 字段类型 */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** 是否必填 */
  required: boolean;
  /** 默认值 */
  defaultValue: any;
  /** 字段说明 */
  description: string;
}

/**
 * 卡片类型字段定义
 */
export const CardFieldDefinitions: Record<AICardCommand, FieldDefinition[]> = {
  'character': [
    { name: 'name', type: 'string', required: true, defaultValue: '未命名角色', description: '角色姓名' },
    { name: 'gender', type: 'string', required: true, defaultValue: '未知', description: '性别' },
    { name: 'age', type: 'string', required: true, defaultValue: '未知', description: '年龄' },
    { name: 'role', type: 'string', required: true, defaultValue: '配角', description: '角色类型' },
    { name: 'personality', type: 'string', required: true, defaultValue: '', description: '性格特征' },
    { name: 'appearance', type: 'string', required: true, defaultValue: '', description: '外貌描述' },
    { name: 'background', type: 'string', required: true, defaultValue: '', description: '背景故事' },
    { name: 'relationships', type: 'string', required: true, defaultValue: '', description: '核心关系网' },
    { name: 'distinctiveFeatures', type: 'string', required: true, defaultValue: '', description: '标志性特征' },
    { name: 'occupation', type: 'string', required: true, defaultValue: '', description: '职业/身份' },
    { name: 'motivation', type: 'string', required: true, defaultValue: '', description: '动机/目标' },
    { name: 'strengths', type: 'string', required: true, defaultValue: '', description: '优势/能力' },
    { name: 'weaknesses', type: 'string', required: true, defaultValue: '', description: '弱点/缺陷' },
    { name: 'characterArc', type: 'string', required: true, defaultValue: '', description: '角色成长弧线' }
  ],
  
  'location': [
    { name: 'name', type: 'string', required: true, defaultValue: '未命名地点', description: '地点名称' },
    { name: 'type', type: 'string', required: true, defaultValue: 'other', description: '地点类型' },
    { name: 'description', type: 'string', required: true, defaultValue: '', description: '地点描述' },
    { name: 'geography', type: 'object', required: true, defaultValue: { terrain: '', climate: '', resources: [] }, description: '地理属性' },
    { name: 'tags', type: 'array', required: true, defaultValue: [], description: '地点标签' }
  ],
  
  'faction': [
    { name: 'name', type: 'string', required: true, defaultValue: '未命名势力', description: '势力名称' },
    { name: 'type', type: 'string', required: true, defaultValue: 'other', description: '势力类型' },
    { name: 'description', type: 'string', required: true, defaultValue: '', description: '势力描述' },
    { name: 'ideology', type: 'string', required: true, defaultValue: '', description: '理念/信仰' },
    { name: 'strength', type: 'object', required: true, defaultValue: { military: '', economic: '', influence: '', overall: '未知' }, description: '实力评估' },
    { name: 'emblem', type: 'string', required: true, defaultValue: '', description: '标志/旗帜' },
    { name: 'goals', type: 'string', required: true, defaultValue: '', description: '主要目标' },
    { name: 'structure', type: 'string', required: true, defaultValue: '', description: '组织架构' }
  ],
  
  'timeline': [
    { name: 'title', type: 'string', required: true, defaultValue: '未命名事件', description: '事件标题' },
    { name: 'description', type: 'string', required: true, defaultValue: '', description: '事件描述' },
    { name: 'date', type: 'object', required: true, defaultValue: { year: 0, month: undefined, day: undefined, display: '' }, description: '事件日期' },
    { name: 'type', type: 'string', required: true, defaultValue: 'plot', description: '事件类型' },
    { name: 'impact', type: 'string', required: true, defaultValue: '', description: '事件影响' },
    { name: 'relatedCharacters', type: 'array', required: true, defaultValue: [], description: '相关角色' },
    { name: 'relatedLocations', type: 'array', required: true, defaultValue: [], description: '相关地点' }
  ],
  
  'rule': [
    { name: 'name', type: 'string', required: true, defaultValue: '未命名规则系统', description: '系统名称' },
    { name: 'type', type: 'string', required: true, defaultValue: 'custom', description: '系统类型' },
    { name: 'description', type: 'string', required: true, defaultValue: '', description: '系统描述' },
    { name: 'levels', type: 'array', required: true, defaultValue: [], description: '等级定义' },
    { name: 'mechanics', type: 'string', required: true, defaultValue: '', description: '核心机制' },
    { name: 'limitations', type: 'string', required: true, defaultValue: '', description: '限制条件' },
    { name: 'relatedResources', type: 'string', required: true, defaultValue: '', description: '相关资源' }
  ],
  
  'event': [
    { name: 'title', type: 'string', required: true, defaultValue: '未命名事件', description: '事件标题' },
    { name: 'description', type: 'string', required: true, defaultValue: '', description: '事件描述' },
    { name: 'date', type: 'object', required: true, defaultValue: { year: 0, display: '' }, description: '事件日期' },
    { name: 'type', type: 'string', required: true, defaultValue: 'plot', description: '事件类型' },
    { name: 'impact', type: 'string', required: true, defaultValue: '', description: '事件影响' },
    { name: 'relatedCharacters', type: 'array', required: true, defaultValue: [], description: '相关角色' },
    { name: 'relatedLocations', type: 'array', required: true, defaultValue: [], description: '相关地点' }
  ],
  
  'magic': [
    { name: 'name', type: 'string', required: true, defaultValue: '未命名魔法体系', description: '体系名称' },
    { name: 'description', type: 'string', required: true, defaultValue: '', description: '体系概述' },
    { name: 'rules', type: 'array', required: true, defaultValue: [], description: '体系规则' },
    { name: 'limitations', type: 'string', required: true, defaultValue: '', description: '限制条件' },
    { name: 'castingMethod', type: 'string', required: true, defaultValue: '', description: '施法方式' },
    { name: 'levels', type: 'array', required: true, defaultValue: [], description: '等级划分' }
  ],
  
  'tech': [
    { name: 'era', type: 'string', required: true, defaultValue: '未命名时代', description: '时代名称' },
    { name: 'description', type: 'string', required: true, defaultValue: '', description: '科技描述' },
    { name: 'keyTechnologies', type: 'array', required: true, defaultValue: [], description: '关键技术' },
    { name: 'limitations', type: 'string', required: true, defaultValue: '', description: '科技限制' },
    { name: 'energySource', type: 'string', required: true, defaultValue: '', description: '能源类型' },
    { name: 'transportation', type: 'string', required: true, defaultValue: '', description: '交通方式' },
    { name: 'communication', type: 'string', required: true, defaultValue: '', description: '通讯方式' }
  ],
  
  'history': [
    { name: 'overview', type: 'string', required: true, defaultValue: '', description: '历史概述' },
    { name: 'keyEvents', type: 'array', required: true, defaultValue: [], description: '关键事件' }
  ]
};

/**
 * 字段校验结果
 */
export interface FieldValidationResult {
  /** 是否通过校验 */
  isValid: boolean;
  /** 缺失的必填字段 */
  missingFields: string[];
  /** 已填充的字段 */
  filledFields: string[];
  /** 使用默认值填充的字段 */
  defaultedFields: string[];
  /** 补全后的数据 */
  completedData: any;
}

/**
 * 校验并补全卡片数据
 * @param command 命令类型
 * @param data AI返回的原始数据
 * @param projectId 项目ID
 * @returns 校验结果
 */
export function validateAndCompleteCardData(
  command: AICardCommand,
  data: any,
  projectId: string
): FieldValidationResult {
  const fieldDefs = CardFieldDefinitions[command];
  const result: FieldValidationResult = {
    isValid: true,
    missingFields: [],
    filledFields: [],
    defaultedFields: [],
    completedData: { ...data }
  };
  
  // 添加系统字段
  const timestamp = Date.now();
  result.completedData.id = data.id || `${command}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  result.completedData.projectId = data.projectId || projectId;
  result.completedData.createdAt = data.createdAt || timestamp;
  result.completedData.updatedAt = timestamp;
  
  // 校验每个字段
  for (const fieldDef of fieldDefs) {
    const fieldName = fieldDef.name;
    const fieldValue = result.completedData[fieldName];
    
    // 检查字段是否存在且不为空
    const hasValue = fieldValue !== undefined && 
                     fieldValue !== null && 
                     !(typeof fieldValue === 'string' && fieldValue.trim() === '');
    
    if (hasValue) {
      // 字段已填充
      result.filledFields.push(fieldName);
    } else if (fieldDef.required) {
      // 必填字段缺失，使用默认值填充
      result.completedData[fieldName] = fieldDef.defaultValue;
      result.defaultedFields.push(fieldName);
      
      if (fieldDef.type === 'object') {
        // 对于对象类型，确保深拷贝默认值
        result.completedData[fieldName] = JSON.parse(JSON.stringify(fieldDef.defaultValue));
      }
    }
  }
  
  // 检查是否有未定义的必填字段
  for (const fieldDef of fieldDefs) {
    if (fieldDef.required && !(fieldDef.name in data)) {
      result.missingFields.push(fieldDef.name);
    }
  }
  
  // 如果有缺失的必填字段，标记为无效
  if (result.missingFields.length > 0) {
    result.isValid = false;
  }
  
  return result;
}

/**
 * 生成字段缺失报告
 * @param result 校验结果
 * @returns 可读的报告文本
 */
export function generateFieldReport(result: FieldValidationResult): string {
  const lines: string[] = [];
  
  if (result.isValid && result.defaultedFields.length === 0) {
    lines.push('✅ 所有字段已正确填充');
  } else {
    if (result.missingFields.length > 0) {
      lines.push(`⚠️ 缺失字段（已自动填充默认值）：${result.missingFields.join('、')}`);
    }
    
    if (result.defaultedFields.length > 0) {
      lines.push(`📝 使用默认值的字段：${result.defaultedFields.join('、')}`);
    }
    
    if (result.filledFields.length > 0) {
      lines.push(`✅ 已填充字段：${result.filledFields.length}个`);
    }
  }
  
  return lines.join('\n');
}

/**
 * 获取字段定义
 * @param command 命令类型
 * @returns 字段定义列表
 */
export function getFieldDefinitions(command: AICardCommand): FieldDefinition[] {
  return CardFieldDefinitions[command] || [];
}

/**
 * 根据模板验证数据
 * @param template 提示词模板
 * @param data AI返回的数据
 * @returns 验证结果
 */
export function validateAgainstTemplate(
  template: CardPromptTemplate,
  data: any
): { isValid: boolean; missingFields: string[]; extraFields: string[] } {
  const requiredFields = template.requiredFields || [];
  const missingFields: string[] = [];
  const extraFields: string[] = [];
  
  // 检查必填字段
  for (const field of requiredFields) {
    if (!(field in data) || data[field] === undefined || data[field] === null) {
      missingFields.push(field);
    }
  }
  
  // 检查是否有额外字段
  const dataFields = Object.keys(data);
  for (const field of dataFields) {
    if (!requiredFields.includes(field) && 
        !['id', 'projectId', 'createdAt', 'updatedAt'].includes(field)) {
      extraFields.push(field);
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    extraFields
  };
}

/**
 * 标准化字段值
 * @param fieldName 字段名
 * @param value 原始值
 * @param expectedType 期望类型
 * @returns 标准化后的值
 */
export function normalizeFieldValue(fieldName: string, value: any, expectedType: string): any {
  if (value === undefined || value === null) {
    return getDefaultValueForType(expectedType);
  }
  
  switch (expectedType) {
    case 'string':
      return String(value);
    case 'number':
      return Number(value) || 0;
    case 'boolean':
      return Boolean(value);
    case 'array':
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    case 'object':
      if (typeof value === 'object' && !Array.isArray(value)) return value;
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    default:
      return value;
  }
}

/**
 * 获取类型的默认值
 * @param type 类型
 * @returns 默认值
 */
function getDefaultValueForType(type: string): any {
  switch (type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return null;
  }
}
