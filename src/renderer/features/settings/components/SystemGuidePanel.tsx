/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React from 'react';
import { useTranslation, dt, dtList } from '@/i18n';
import { modelProviders } from '../../../constants/modelProviders';
import type { SystemGuidePanelProps } from '../types';

const SystemGuidePanel: React.FC<SystemGuidePanelProps> = ({ onQuickAddProviderModel }) => {
  const { t } = useTranslation('settings');
  return (
    <div className="space-y-8 animate-in zoom-in duration-300">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 mx-auto shadow-2xl shadow-blue-200">
          <i className="fas fa-graduation-cap text-3xl text-white"></i>
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-2">{t('guide.title')}</h3>
        <p className="text-gray-500 text-sm max-w-2xl mx-auto leading-relaxed">
          {t('guide.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modelProviders.filter((provider) => provider.official).map((provider) => (
          <div
            key={provider.id}
            className={`border-2 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl ${
              provider.isChinese
                ? 'border-blue-100 bg-gradient-to-br from-blue-50 to-white hover:border-blue-300'
                : 'border-gray-100 bg-gradient-to-br from-gray-50 to-white hover:border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  {dt(provider.nameKey)}
                  {provider.isChinese && (
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase">
                      {t('guide.domestic')}
                    </span>
                  )}
                </h4>
                <p className="text-sm text-gray-500 mt-1">{dt(provider.descriptionKey)}</p>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t('guide.recommendedModel')}</div>
                <div className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                  {provider.recommendedModels[0] ?? t('guide.custom')}
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('guide.website')}</div>
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  <i className="fas fa-external-link-alt text-xs"></i>
                  {provider.website.replace('https://', '')}
                </a>
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('guide.apiApplyUrl')}</div>
                <a
                  href={provider.apiApplyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                >
                  <i className="fas fa-key text-xs"></i>
                  {t('guide.getApiKey')}
                </a>
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('guide.endpoint')}</div>
                <div className="text-xs font-mono bg-gray-50 text-gray-700 p-2 rounded-lg border border-gray-100">
                  {provider.endpoint || t('guide.endpointDefault')}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('guide.tips')}</div>
              <ul className="space-y-1">
                {dtList(provider.tipsKey).map((tip, index) => (
                  <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                    <i className="fas fa-check-circle text-green-500 mt-0.5 text-xs"></i>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex gap-2">
                <button
                  onClick={() => onQuickAddProviderModel(provider)}
                  className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-plus-circle"></i>
                  {t('guide.quickAdd')}
                </button>
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-external-link-alt"></i>
                  {t('guide.visitSite')}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-100 rounded-2xl p-6 mt-8">
        <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
          <i className="fas fa-lightbulb text-yellow-500"></i>
          {t('guide.stepsTitle')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-blue-100">
            <div className="text-blue-600 font-black text-sm mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">1</span>
              {t('guide.step1Title')}
            </div>
            <p className="text-xs text-gray-600">{t('guide.step1Desc')}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-blue-100">
            <div className="text-blue-600 font-black text-sm mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">2</span>
              {t('guide.step2Title')}
            </div>
            <p className="text-xs text-gray-600">{t('guide.step2Desc')}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-blue-100">
            <div className="text-blue-600 font-black text-sm mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">3</span>
              {t('guide.step3Title')}
            </div>
            <p className="text-xs text-gray-600">{t('guide.step3Desc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemGuidePanel;
