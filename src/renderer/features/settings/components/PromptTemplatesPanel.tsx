/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React from 'react';
import { useTranslation, templateDisplayName } from '@/i18n';
import type { PromptTemplate } from '../../../../shared/types';
import type { PromptTemplatesPanelProps } from '../types';

const PromptTemplatesPanel: React.FC<PromptTemplatesPanelProps> = ({
  localPrompts,
  setLocalPrompts,
  updatePrompt,
  addPrompt,
}) => {
  const { t } = useTranslation('settings');
  return (
    <div className="grid grid-cols-1 gap-6">
              {localPrompts.map(prompt => (
                <div key={prompt.id} className="border-2 border-gray-100 rounded-[2rem] p-8 bg-white hover:border-blue-100 transition-all">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex-1 mr-6">
                      <input 
                        className="font-black bg-transparent border-none focus:ring-0 p-0 text-xl text-gray-800 w-full"
                        value={templateDisplayName(prompt)}
                        onChange={(e) => updatePrompt(prompt.id, { name: e.target.value, nameKey: undefined })}
                        placeholder={t('prompts.namePlaceholder')}
                      />
                    </div>
                    <select 
                      className="text-[10px] font-black border-none rounded-lg px-3 py-1 bg-gray-100 text-gray-500 uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-100"
                      value={prompt.category}
                      onChange={(e) => updatePrompt(prompt.id, { category: e.target.value as PromptTemplate['category'] })}
                    >
                      <option value="inspiration">{t('prompts.category.inspiration')}</option>
                      <option value="character">{t('prompts.category.character')}</option>
                      <option value="outline">{t('prompts.category.outline')}</option>
                      <option value="chapter">{t('prompts.category.chapter')}</option>
                      <option value="writing">{t('prompts.category.writing')}</option>
                      <option value="edit">{t('prompts.category.edit')}</option>
                      <option value="summary">{t('prompts.category.summary')}</option>
                    </select>
                  </div>

                  <textarea 
                    className="w-full h-40 border-none rounded-2xl p-6 text-sm font-medium text-gray-600 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 resize-none custom-scrollbar"
                    value={prompt.content}
                    onChange={(e) => updatePrompt(prompt.id, { content: e.target.value })}
                    placeholder={t('prompts.contentPlaceholder')}
                  />
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-[9px] text-gray-300 font-bold uppercase">{t('prompts.availablePlaceholders')}</span>
                    <button onClick={() => setLocalPrompts(localPrompts.filter(p => p.id !== prompt.id))} className="text-gray-300 hover:text-red-500 text-xs font-bold">{t('prompts.deleteTemplate')}</button>
                  </div>
                </div>
              ))}
              <button onClick={addPrompt} className="w-full border-4 border-dashed border-gray-100 rounded-[2rem] py-8 text-gray-300 font-black hover:bg-white hover:text-emerald-500 hover:border-emerald-100 transition-all group flex flex-col items-center gap-2">
                <i className="fas fa-magic text-2xl group-hover:rotate-12 transition-transform"></i>
                <span>{t('prompts.addTemplate')}</span>
              </button>
    </div>
  );
};

export default PromptTemplatesPanel;
