/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { ModelConfig } from '../../../../shared/types';
import { findProviderPreset, type ModelProviderInfo } from '../../../constants/modelProviders';

/**
 * 反推一个模型当前对应的渠道预设 id（用于渠道下拉的选中值）。
 * 优先用显式 presetId；缺失时按协议回落到语义最接近的渠道，
 * 保证任何历史/自定义配置都能在下拉里有一个合法选中项。
 * 例外：gemini 官方预设端点留空（走 SDK 默认），填了端点即视为自定义 Gemini 兼容。
 */
export function channelValueFor(model: ModelConfig): string {
  if (model.presetId && findProviderPreset(model.presetId)) return model.presetId;
  switch (model.provider) {
    case 'gemini':
      return model.endpoint?.trim() ? 'custom-gemini' : 'gemini';
    case 'ollama':
      return 'ollama';
    case 'anthropic':
      return 'custom-anthropic';
    case 'openai-responses':
      return 'openai-responses';
    default:
      return 'custom-openai';
  }
}

/**
 * 计算「切换渠道」时对模型的补丁：写入协议、presetId、预置端点与推荐模型清单。
 * - 官方渠道：端点预置、presetId 标记、availableModels=推荐模型；
 *   当前模型名不在推荐列表时重置为首个推荐模型，否则保留用户选择。
 * - 自定义渠道：presetId 同样保留（身份即所选兼容协议，否则下拉回弹到官方项），
 *   端点清空交由用户填写、清除 availableModels，保留模型名。
 * 不触碰 apiKey / temperature / maxTokens / systemPrompt 等用户既有配置。
 */
export function channelPatch(preset: ModelProviderInfo, current: ModelConfig): Partial<ModelConfig> {
  const patch: Partial<ModelConfig> = {
    provider: preset.protocol,
    presetId: preset.id,
    endpoint: preset.endpoint,
    modelsFetchError: undefined,
  };
  if (preset.recommendedModels.length > 0) {
    patch.availableModels = [...preset.recommendedModels];
    if (!preset.recommendedModels.includes(current.modelName)) {
      patch.modelName = preset.recommendedModels[0];
    }
  } else {
    patch.availableModels = undefined;
  }
  return patch;
}

/** 渠道下拉的分组结构。labelKey 为 settings 命名空间下的 i18n 键，渲染时解析。 */
export type ChannelLabelKey = 'channel.domestic' | 'channel.international' | 'channel.local' | 'channel.custom';
export interface ChannelGroup {
  id: string;
  labelKey: ChannelLabelKey;
  items: ModelProviderInfo[];
}

/**
 * 按「自定义（兼容协议） / 国内官方 / 国际官方 / 本地」对预设渠道分组，供下拉渲染。
 * 自定义排最前：协议是第一选择（对标 new-api 先选通道类型、OpenCode 先配 provider 包），
 * 官方预设只是填好端点的快捷方式。
 */
export function channelGroups(presets: ModelProviderInfo[]): ChannelGroup[] {
  const groups: ChannelGroup[] = [
    { id: 'custom', labelKey: 'channel.custom', items: presets.filter((p) => !p.official) },
    { id: 'domestic', labelKey: 'channel.domestic', items: presets.filter((p) => p.official && p.isChinese) },
    { id: 'international', labelKey: 'channel.international', items: presets.filter((p) => p.official && !p.isChinese && p.protocol !== 'ollama') },
    { id: 'local', labelKey: 'channel.local', items: presets.filter((p) => p.protocol === 'ollama') },
  ];
  return groups.filter((g) => g.items.length > 0);
}
