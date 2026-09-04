/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WritingSelectionMenuProps } from '../types';
import { WandSparkles, X } from 'lucide-react';

const WritingSelectionMenu: React.FC<WritingSelectionMenuProps> = ({
  menuPos,
  isEditModalOpen,
  onOpenEditModal,
  onClearSelection,
}) => {
  const { t } = useTranslation('writing');
  if (!menuPos || isEditModalOpen) {
    return null;
  }

  return (
    <div
      className="fixed z-[100] bg-white border border-gray-200 shadow-2xl rounded-2xl p-1.5 flex gap-1 animate-in zoom-in-95 duration-200"
      style={{ left: menuPos.x, top: menuPos.y }}
    >
      <button onClick={onOpenEditModal} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-black rounded-xl hover:shadow-lg hover:shadow-blue-200 transition-all flex items-center gap-2 active:scale-95">
        <WandSparkles className="size-4" /> {t('selectionMenu.polishExpand')}
      </button>
      <div className="w-px h-6 bg-gray-200 self-center mx-1"></div>
      <button onClick={onClearSelection} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex items-center justify-center transition-all" title={t('selectionMenu.clearTitle')}>
        <X className="size-4" />
      </button>
    </div>
  );
};

export default WritingSelectionMenu;
