import React from 'react';
import SettingsTabNav from './SettingsTabNav';
import type { SettingsModalHeaderProps } from '../types';

const SettingsModalHeader: React.FC<SettingsModalHeaderProps> = ({ activeTab, onChange, onClose }) => {
  return (
    <div className="border-b border-gray-100 px-10 pt-8 pb-4 flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter">控制台配置</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">System Core Settings</p>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
          <i className="fas fa-times text-gray-400"></i>
        </button>
      </div>

      <SettingsTabNav activeTab={activeTab} onChange={onChange} />
    </div>
  );
};

export default SettingsModalHeader;
