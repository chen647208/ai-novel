import React from 'react';
import type { WritingSelectionMenuProps } from '../types';

const WritingSelectionMenu: React.FC<WritingSelectionMenuProps> = ({
  menuPos,
  isEditModalOpen,
  onOpenEditModal,
  onClearSelection,
}) => {
  if (!menuPos || isEditModalOpen) {
    return null;
  }

  return (
    <div
      className="fixed z-[100] bg-white border border-gray-200 shadow-2xl rounded-2xl p-1.5 flex gap-1 animate-in zoom-in-95 duration-200"
      style={{ left: menuPos.x, top: menuPos.y }}
    >
      <button onClick={onOpenEditModal} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-black rounded-xl hover:shadow-lg hover:shadow-blue-200 transition-all flex items-center gap-2 active:scale-95">
        <i className="fas fa-wand-magic-sparkles"></i> AI 润色 / 扩写
      </button>
      <div className="w-px h-6 bg-gray-200 self-center mx-1"></div>
      <button onClick={onClearSelection} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex items-center justify-center transition-all" title="取消选择">
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

export default WritingSelectionMenu;
