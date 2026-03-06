import React from 'react';
import type { PromptTemplatesPanelProps } from '../types';

const PromptTemplatesPanel: React.FC<PromptTemplatesPanelProps> = ({
  localPrompts,
  setLocalPrompts,
  updatePrompt,
  addPrompt,
}) => {
  return (
    <div className="grid grid-cols-1 gap-6">
              {localPrompts.map(prompt => (
                <div key={prompt.id} className="border-2 border-gray-100 rounded-[2rem] p-8 bg-white hover:border-blue-100 transition-all">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex-1 mr-6">
                      <input 
                        className="font-black bg-transparent border-none focus:ring-0 p-0 text-xl text-gray-800 w-full"
                        value={prompt.name}
                        onChange={(e) => updatePrompt(prompt.id, { name: e.target.value })}
                        placeholder="模板名称，如：毒舌润色"
                      />
                    </div>
                    <select 
                      className="text-[10px] font-black border-none rounded-lg px-3 py-1 bg-gray-100 text-gray-500 uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-100"
                      value={prompt.category}
                      onChange={(e) => updatePrompt(prompt.id, { category: e.target.value as any })}
                    >
                      <option value="inspiration">灵感</option>
                      <option value="character">角色</option>
                      <option value="outline">大纲</option>
                      <option value="chapter">分章</option>
                      <option value="writing">正文</option>
                      <option value="edit">润色</option>
                      <option value="summary">摘要</option>
                    </select>
                  </div>

                  <textarea 
                    className="w-full h-40 border-none rounded-2xl p-6 text-sm font-medium text-gray-600 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 resize-none custom-scrollbar"
                    value={prompt.content}
                    onChange={(e) => updatePrompt(prompt.id, { content: e.target.value })}
                    placeholder="使用 {content} 代表选中的文字..."
                  />
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-[9px] text-gray-300 font-bold uppercase">可用占位符: {'{content}, {title}, {summary}'}</span>
                    <button onClick={() => setLocalPrompts(localPrompts.filter(p => p.id !== prompt.id))} className="text-gray-300 hover:text-red-500 text-xs font-bold">删除此模板</button>
                  </div>
                </div>
              ))}
              <button onClick={addPrompt} className="w-full border-4 border-dashed border-gray-100 rounded-[2rem] py-8 text-gray-300 font-black hover:bg-white hover:text-emerald-500 hover:border-emerald-100 transition-all group flex flex-col items-center gap-2">
                <i className="fas fa-magic text-2xl group-hover:rotate-12 transition-transform"></i>
                <span>新增自定义提示词模板</span>
              </button>
    </div>
  );
};

export default PromptTemplatesPanel;
