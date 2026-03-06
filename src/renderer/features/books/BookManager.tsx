import React, { useState } from 'react';
import { Project } from '../../../shared/types';
import BookItem from './BookItem';
import NewBookModal from './NewBookModal';

interface BookManagerProps {
  books: Project[];
  activeBookId: string | null;
  onBookSelect: (bookId: string) => void;
  onBookCreate: (title: string, description?: string, templateType?: 'blank' | 'duplicate' | 'example', sourceBookId?: string) => void;
  onBookRename: (bookId: string, newTitle: string) => void;
  onBookDelete: (bookId: string) => void;
  onBookDuplicate: (bookId: string) => void;
}

const BookManager: React.FC<BookManagerProps> = ({
  books,
  activeBookId,
  onBookSelect,
  onBookCreate,
  onBookRename,
  onBookDelete,
  onBookDuplicate
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isNewBookModalOpen, setIsNewBookModalOpen] = useState(false);

  const activeBook = books.find(book => book.id === activeBookId);

  const handleCreateBook = (title: string, description?: string, templateType?: 'blank' | 'duplicate' | 'example') => {
    onBookCreate(title, description, templateType);
    setIsNewBookModalOpen(false);
  };

  const sortedBooks = [...books].sort((a, b) => b.lastModified - a.lastModified);

  return (
    <div className="border-b border-gray-800 pb-4">
      {/* 当前书籍显示区域 */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <i className="fas fa-book text-blue-400"></i>
          </div>
          <div className="text-left">
            <div className="font-bold text-white text-sm">当前书籍</div>
            <div className="text-gray-400 text-xs truncate max-w-[140px]">
              {activeBook?.title || '未选择书籍'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
            {books.length} 本
          </div>
          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-gray-500 text-xs transition-transform`}></i>
        </div>
      </div>

      {/* 书籍列表（可折叠） */}
      {isExpanded && (
        <div className="mt-3 px-2 space-y-1 max-h-[300px] overflow-y-auto">
          {sortedBooks.map((book) => (
            <BookItem
              key={book.id}
              book={book}
              isActive={book.id === activeBookId}
              onClick={() => {
                onBookSelect(book.id);
                setIsExpanded(false);
              }}
              onRename={onBookRename}
              onDelete={onBookDelete}
              onDuplicate={onBookDuplicate}
            />
          ))}
        </div>
      )}

      {/* 新建书籍按钮 */}
      <div className={`px-2 ${isExpanded ? 'mt-3' : 'mt-2'}`}>
        <button
          onClick={() => setIsNewBookModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 rounded-lg border border-blue-600/30 hover:border-blue-600/50 transition-all group cursor-pointer"
        >
          <i className="fas fa-plus text-xs"></i>
          <span className="text-sm font-bold">新建书籍</span>
        </button>
      </div>

      {/* 新建书籍模态框 */}
      <NewBookModal
        isOpen={isNewBookModalOpen}
        onClose={() => setIsNewBookModalOpen(false)}
        onCreate={handleCreateBook}
        existingBooks={books.map(book => ({ id: book.id, title: book.title }))}
      />
    </div>
  );
};

export default BookManager;






