import React from 'react';
import type { SettingsTab } from '../types';

interface SettingsTabNavProps {
  activeTab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

const tabItems: Array<{ id: SettingsTab; icon: string; label: string; activeClassName: string }> = [
  { id: 'models', icon: 'fa-microchip', label: '模型提供商', activeClassName: 'bg-gray-900 text-white shadow-xl shadow-gray-200' },
  { id: 'prompts', icon: 'fa-terminal', label: '提示词库', activeClassName: 'bg-gray-900 text-white shadow-xl shadow-gray-200' },
  { id: 'card-prompts', icon: 'fa-magic', label: '卡片提示词', activeClassName: 'bg-amber-600 text-white shadow-xl shadow-amber-200' },
  { id: 'consistency-prompts', icon: 'fa-stethoscope', label: '一致性检查模板', activeClassName: 'bg-rose-600 text-white shadow-xl shadow-rose-200' },
  { id: 'system', icon: 'fa-graduation-cap', label: '配置教程', activeClassName: 'bg-purple-50 text-purple-600 shadow-xl shadow-purple-100' },
  { id: 'storage', icon: 'fa-database', label: '数据存储', activeClassName: 'bg-green-50 text-green-600 shadow-xl shadow-green-100' },
  { id: 'embedding', icon: 'fa-brain', label: '向量模型', activeClassName: 'bg-indigo-50 text-indigo-600 shadow-xl shadow-indigo-100' },
];

const SettingsTabNav: React.FC<SettingsTabNavProps> = ({ activeTab, onChange }) => {
  return (
    <div className="flex gap-3 flex-wrap">
      {tabItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`px-5 py-2.5 text-sm font-black rounded-xl transition-all whitespace-nowrap ${
            activeTab === item.id ? item.activeClassName : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
        >
          <i className={`fas ${item.icon} mr-2`}></i> {item.label}
        </button>
      ))}
    </div>
  );
};

export default SettingsTabNav;
