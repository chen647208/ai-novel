/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { ModelProvider } from '../../shared/types';

/**
 * 服务商预设：一个「渠道」= 适配器协议 + 预置端点 + 推荐模型清单。
 * 官方渠道（official=true，端点预置）只需填 API Key 即可用；
 * 自定义渠道（official=false）端点留空由用户填写，API Key 可选。
 * 推荐模型为 models.dev 快照（截至 2026-09），仅保留各家最新两代 / 近几个月更新的模型，
 * 离线可选；仍可「刷新模型列表」实时拉取。
 *
 * 展示文案（名称/描述/提示）以 i18n 键存储于 providers 命名空间，渲染时用 dt()/dtList() 解析；
 * 品牌名与型号名在各语言字典中保持一致（语言无关）。
 */
export interface ModelProviderInfo {
  id: string;
  /** providers:model.<id>.name */
  nameKey: string;
  /** 适配器协议（决定走哪套请求实现） */
  protocol: ModelProvider;
  /** 是否为官方渠道（端点预置、只需填 Key）；false 表示自定义通用接口 */
  official: boolean;
  website: string;
  apiApplyUrl: string;
  /** 预置接口 base（不含 /chat/completions 等路径）；自定义渠道留空 */
  endpoint: string;
  recommendedModels: string[];
  /** providers:model.<id>.description */
  descriptionKey: string;
  /** providers:model.<id>.tips（数组） */
  tipsKey: string;
  isChinese: boolean;
}

export const modelProviders: ModelProviderInfo[] = [
  {
    id: 'deepseek',
    nameKey: 'providers:model.deepseek.name',
    protocol: 'openai-chat',
    official: true,
    website: 'https://platform.deepseek.com',
    apiApplyUrl: 'https://platform.deepseek.com/api_keys',
    endpoint: 'https://api.deepseek.com/v1',
    recommendedModels: ['deepseek-v4-pro', 'deepseek-v4-flash'],
    descriptionKey: 'providers:model.deepseek.description',
    tipsKey: 'providers:model.deepseek.tips',
    isChinese: true,
  },
  {
    id: 'kimi',
    nameKey: 'providers:model.kimi.name',
    protocol: 'openai-chat',
    official: true,
    website: 'https://platform.moonshot.cn',
    apiApplyUrl: 'https://platform.moonshot.cn/console/api-keys',
    endpoint: 'https://api.moonshot.cn/v1',
    recommendedModels: ['kimi-k3', 'kimi-k2.6', 'kimi-k2.5'],
    descriptionKey: 'providers:model.kimi.description',
    tipsKey: 'providers:model.kimi.tips',
    isChinese: true,
  },
  {
    id: 'zhipu',
    nameKey: 'providers:model.zhipu.name',
    protocol: 'openai-chat',
    official: true,
    website: 'https://open.bigmodel.cn',
    apiApplyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4',
    recommendedModels: ['glm-5.3', 'glm-5.2', 'glm-4.7'],
    descriptionKey: 'providers:model.zhipu.description',
    tipsKey: 'providers:model.zhipu.tips',
    isChinese: true,
  },
  {
    id: 'qwen',
    nameKey: 'providers:model.qwen.name',
    protocol: 'openai-chat',
    official: true,
    website: 'https://bailian.console.aliyun.com',
    apiApplyUrl: 'https://bailian.console.aliyun.com/#/api-key',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    recommendedModels: ['qwen3.8-max', 'qwen3.8-flash', 'qwen3.7-plus'],
    descriptionKey: 'providers:model.qwen.description',
    tipsKey: 'providers:model.qwen.tips',
    isChinese: true,
  },
  {
    id: 'minimax',
    nameKey: 'providers:model.minimax.name',
    protocol: 'anthropic',
    official: true,
    website: 'https://www.minimaxi.com',
    apiApplyUrl: 'https://www.minimaxi.com/usercenter/basic-info',
    endpoint: 'https://api.minimaxi.com/anthropic/v1',
    recommendedModels: ['MiniMax-M3', 'MiniMax-M2.7'],
    descriptionKey: 'providers:model.minimax.description',
    tipsKey: 'providers:model.minimax.tips',
    isChinese: true,
  },
  {
    id: 'openai',
    nameKey: 'providers:model.openai.name',
    protocol: 'openai-chat',
    official: true,
    website: 'https://platform.openai.com',
    apiApplyUrl: 'https://platform.openai.com/api-keys',
    endpoint: 'https://api.openai.com/v1',
    recommendedModels: ['gpt-5.6', 'gpt-5.5', 'gpt-5.4-mini'],
    descriptionKey: 'providers:model.openai.description',
    tipsKey: 'providers:model.openai.tips',
    isChinese: false,
  },
  {
    id: 'openai-responses',
    nameKey: 'providers:model.openai-responses.name',
    protocol: 'openai-responses',
    official: true,
    website: 'https://platform.openai.com',
    apiApplyUrl: 'https://platform.openai.com/api-keys',
    endpoint: 'https://api.openai.com/v1',
    recommendedModels: ['gpt-5.6', 'gpt-5.5'],
    descriptionKey: 'providers:model.openai-responses.description',
    tipsKey: 'providers:model.openai-responses.tips',
    isChinese: false,
  },
  {
    id: 'anthropic',
    nameKey: 'providers:model.anthropic.name',
    protocol: 'anthropic',
    official: true,
    website: 'https://console.anthropic.com',
    apiApplyUrl: 'https://console.anthropic.com/settings/keys',
    endpoint: 'https://api.anthropic.com',
    recommendedModels: ['claude-sonnet-5', 'claude-opus-5', 'claude-sonnet-4-6'],
    descriptionKey: 'providers:model.anthropic.description',
    tipsKey: 'providers:model.anthropic.tips',
    isChinese: false,
  },
  {
    id: 'gemini',
    nameKey: 'providers:model.gemini.name',
    protocol: 'gemini',
    official: true,
    website: 'https://aistudio.google.com',
    apiApplyUrl: 'https://aistudio.google.com/apikey',
    endpoint: '',
    recommendedModels: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'],
    descriptionKey: 'providers:model.gemini.description',
    tipsKey: 'providers:model.gemini.tips',
    isChinese: false,
  },
  {
    id: 'ollama',
    nameKey: 'providers:model.ollama.name',
    protocol: 'ollama',
    official: true,
    website: 'https://ollama.com',
    apiApplyUrl: 'https://ollama.com/download',
    endpoint: 'http://localhost:11434/v1',
    recommendedModels: ['llama3.3', 'qwen2.5', 'deepseek-r1', 'gemma3'],
    descriptionKey: 'providers:model.ollama.description',
    tipsKey: 'providers:model.ollama.tips',
    isChinese: false,
  },
  {
    id: 'custom-openai',
    nameKey: 'providers:model.custom-openai.name',
    protocol: 'openai-chat',
    official: false,
    website: '',
    apiApplyUrl: '',
    endpoint: '',
    recommendedModels: [],
    descriptionKey: 'providers:model.custom-openai.description',
    tipsKey: 'providers:model.custom-openai.tips',
    isChinese: false,
  },
  {
    id: 'gateway-openai',
    nameKey: 'providers:model.gateway-openai.name',
    protocol: 'openai-chat',
    official: false,
    website: 'https://openrouter.ai',
    apiApplyUrl: 'https://openrouter.ai/keys',
    endpoint: '',
    recommendedModels: [],
    descriptionKey: 'providers:model.gateway-openai.description',
    tipsKey: 'providers:model.gateway-openai.tips',
    isChinese: false,
  },
  {
    id: 'custom-anthropic',
    nameKey: 'providers:model.custom-anthropic.name',
    protocol: 'anthropic',
    official: false,
    website: '',
    apiApplyUrl: '',
    endpoint: '',
    recommendedModels: [],
    descriptionKey: 'providers:model.custom-anthropic.description',
    tipsKey: 'providers:model.custom-anthropic.tips',
    isChinese: false,
  },
  {
    id: 'custom-gemini',
    nameKey: 'providers:model.custom-gemini.name',
    protocol: 'gemini',
    official: false,
    website: '',
    apiApplyUrl: '',
    endpoint: '',
    recommendedModels: [],
    descriptionKey: 'providers:model.custom-gemini.description',
    tipsKey: 'providers:model.custom-gemini.tips',
    isChinese: false,
  },
];

/** 按 id 查找预设 */
export function findProviderPreset(id: string | undefined): ModelProviderInfo | undefined {
  if (!id) return undefined;
  return modelProviders.find((p) => p.id === id);
}
