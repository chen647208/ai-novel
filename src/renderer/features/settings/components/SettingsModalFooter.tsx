import React from 'react';
import type { SettingsModalFooterProps } from '../types';

const SettingsModalFooter: React.FC<SettingsModalFooterProps> = ({ onClose, onSave }) => {
  return (
    <div className="p-10 border-t border-gray-100 bg-white flex justify-between items-center">
      <p className="text-xs text-gray-400 font-medium italic">本地数据持久化已开启，配置将自动保存在当前浏览器。</p>
      <div className="flex gap-4">
        <button onClick={onClose} className="px-8 py-3 text-sm font-black text-gray-400 hover:text-gray-600">
          取消
        </button>
        <button
          onClick={onSave}
          className="px-10 py-3 bg-blue-600 text-white text-sm font-black rounded-2xl hover:bg-blue-700 shadow-2xl shadow-blue-100 active:scale-95 transition-all"
        >
          应用并保存配置
        </button>
      </div>
    </div>
  );
};

export default SettingsModalFooter;
