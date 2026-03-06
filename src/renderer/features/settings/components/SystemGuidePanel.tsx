import React from 'react';
import { modelProviders } from '../../../constants/modelProviders';
import type { SystemGuidePanelProps } from '../types';

const SystemGuidePanel: React.FC<SystemGuidePanelProps> = ({ onQuickAddProviderModel }) => {
  return (
    <div className="space-y-8 animate-in zoom-in duration-300">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 mx-auto shadow-2xl shadow-blue-200">
          <i className="fas fa-graduation-cap text-3xl text-white"></i>
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-2">模型提供商配置教程</h3>
        <p className="text-gray-500 text-sm max-w-2xl mx-auto leading-relaxed">
          快速找到国内主流模型提供商的 API 申请地址、OpenAI 兼容 URL 和正确配置方法
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modelProviders.map((provider) => (
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
                  {provider.name}
                  {provider.isChinese && (
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase">
                      国内
                    </span>
                  )}
                </h4>
                <p className="text-sm text-gray-500 mt-1">{provider.description}</p>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">推荐模型</div>
                <div className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                  {provider.modelExamples[0]}
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">官方网站</div>
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
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">API 申请地址</div>
                <a
                  href={provider.apiApplyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                >
                  <i className="fas fa-key text-xs"></i>
                  获取 API Key
                </a>
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">OpenAI 兼容 URL</div>
                <div className="text-xs font-mono bg-gray-50 text-gray-700 p-2 rounded-lg border border-gray-100">
                  {provider.openaiCompatibleUrl}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">配置提示</div>
              <ul className="space-y-1">
                {provider.tips.map((tip, index) => (
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
                  快速添加配置
                </button>
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-external-link-alt"></i>
                  访问官网
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-100 rounded-2xl p-6 mt-8">
        <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
          <i className="fas fa-lightbulb text-yellow-500"></i>
          配置步骤说明
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-blue-100">
            <div className="text-blue-600 font-black text-sm mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">1</span>
              选择服务商
            </div>
            <p className="text-xs text-gray-600">在“模型提供商”标签页中，选择“OpenAI Compatible”作为提供商类型。</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-blue-100">
            <div className="text-blue-600 font-black text-sm mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">2</span>
              填写配置信息
            </div>
            <p className="text-xs text-gray-600">复制上方对应的 URL 和模型名称，填入接口地址和模型名称字段。</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-blue-100">
            <div className="text-blue-600 font-black text-sm mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">3</span>
              测试连接
            </div>
            <p className="text-xs text-gray-600">点击“立即测试连接”按钮，确认配置正确并能够正常通信。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemGuidePanel;
