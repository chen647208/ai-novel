import React from 'react';
import { Project } from '../../../shared/types';

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

  const handleDelete = () => {
    if (window.confirm(`确定要删除《${book.title}》吗？此操作不可撤销。`)) {
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
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return new Date(timestamp).toLocaleDateString();
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
          <i className={`fas fa-book ${isActive ? 'text-blue-400' : 'text-gray-500'}`}></i>
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
              title="更多操作"
            >
              <i className="fas fa-ellipsis-h text-xs"></i>
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
              <i className="fas fa-edit mr-2 text-gray-400"></i>
              重命名
            </button>
            <button
              className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 text-left flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                handleDuplicate();
              }}
            >
              <i className="fas fa-copy mr-2 text-gray-400"></i>
              复制
            </button>
            <div className="border-t border-gray-800 my-1"></div>
            <button
              className="w-full px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 text-left flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              <i className="fas fa-trash-alt mr-2"></i>
              删除
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default BookItem;






