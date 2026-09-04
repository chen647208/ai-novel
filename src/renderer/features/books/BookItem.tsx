/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React from 'react';
import { useTranslation } from '@/i18n';
import { type Project } from '../../../shared/types';
import { dialogService } from '@/shared/services/dialogService';
import { BookOpen, Copy, MoreHorizontal, PenLine, Trash2 } from 'lucide-react';


interface BookItemProps {
  book: Project;
  isActive: boolean;
  onClick: () => void;
  onRename: (bookId: string, newTitle: string) => void;
  onDelete: (bookId: string) => void;
  onDuplicate: (bookId: string) => void;
}

const BookItem: React.FC<BookItemProps> = ({
  book,
  isActive,
  onClick,
  onRename,
  onDelete,
  onDuplicate
}) => {
  const { t, i18n } = useTranslation(['books', 'common']);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(book.title);
  const [showContextMenu, setShowContextMenu] = React.useState(false);
  const [contextMenuPosition, setContextMenuPosition] = React.useState({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== book.title) {
      onRename(book.id, editTitle.trim());
    }
    setIsEditing(false);
    setShowContextMenu(false);
  };

  const handleDelete = async () => {
    if (await dialogService.confirm({ message: t('books:item.deleteConfirm', { title: book.title }), danger: true })) {
      onDelete(book.id);
    }
    setShowContextMenu(false);
  };

  const handleDuplicate = () => {
    onDuplicate(book.id);
    setShowContextMenu(false);
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return t('books:item.minutesAgo', { count: minutes });
    } else if (hours < 24) {
      return t('books:item.hoursAgo', { count: hours });
    } else if (days < 7) {
      return t('books:item.daysAgo', { count: days });
    } else {
      return new Date(timestamp).toLocaleDateString(i18n.language);
    }
  };

  return (
    <div className="relative">
      <div
        className={`flex items-center px-3 py-2 rounded-lg transition-all cursor-pointer group ${
          isActive
            ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
        }`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
          <BookOpen className={`size-4 ${isActive ? 'text-blue-400' : 'text-gray-500'}`} />
        </div>
        
        <div className="ml-3 flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setEditTitle(book.title);
                }
              }}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <div className="font-medium truncate text-sm">{book.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {formatTime(book.lastModified)}
              </div>
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="w-6 h-6 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                setShowContextMenu(true);
                setContextMenuPosition({ x: e.clientX, y: e.clientY });
              }}
              title={t('books:item.moreActions')}
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {showContextMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setShowContextMenu(false)}
          />
          <div
            className="fixed z-50 bg-gray-900 border border-gray-800 rounded-lg shadow-lg py-1 min-w-[160px]"
            style={{
              left: `${contextMenuPosition.x}px`,
              top: `${contextMenuPosition.y}px`,
            }}
          >
            <button
              className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 text-left flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setShowContextMenu(false);
              }}
            >
              <PenLine className="size-4 mr-2 text-gray-400" />
              {t('books:item.rename')}
            </button>
            <button
              className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 text-left flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                handleDuplicate();
              }}
            >
              <Copy className="size-4 mr-2 text-gray-400" />
              {t('books:item.duplicate')}
            </button>
            <div className="border-t border-gray-800 my-1"></div>
            <button
              className="w-full px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 text-left flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              <Trash2 className="size-4 mr-2" />
              {t('common:delete')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default BookItem;






