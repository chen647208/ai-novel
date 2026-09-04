/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React, { useMemo, useState } from 'react';
import { useTranslation } from '@/i18n';
import type { Project } from '../../../shared/types';
import { dialogService } from '@/shared/services/dialogService';
import { logger } from '@/shared/utils/logger';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/DropdownMenu';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { PageHeader } from '@/shared/ui/PageHeader';
import NewBookModal from '@/features/books/NewBookModal';
import {
  BookHeart,
  BookOpen,
  BookUp,
  Copy,
  Download,
  FolderOpen,
  ListOrdered,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';

interface BookshelfProps {
  books: Project[];
  activeBookId: string | null;
  onOpenBook: (bookId: string) => void;
  onCreateBook: (title: string, description?: string, templateType?: 'blank' | 'duplicate' | 'example', sourceBookId?: string) => void;
  onRenameBook: (bookId: string, newTitle: string) => void;
  onDeleteBook: (bookId: string) => void;
  onDuplicateBook: (bookId: string) => void;
  onExportBook: (book: Project) => void;
  onImportBook: () => void;
  onExportAll: () => void;
  onImportAll: () => Promise<void>;
}

/** 统计全书正文字数（CJK 按字符计）。 */
function wordCount(book: Project): number {
  return book.chapters.reduce((sum, c) => sum + (c.content?.length ?? 0), 0);
}

/** 依据界面语言格式化"最后编辑"时间。 */
function formatLastEdited(ts: number, locale: string): string {
  const d = new Date(ts);
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === now.getFullYear()
      ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { year: 'numeric', month: 'short', day: 'numeric' };
  try {
    return new Intl.DateTimeFormat(locale, opts).format(d);
  } catch {
    return d.toLocaleString();
  }
}

const Bookshelf: React.FC<BookshelfProps> = ({
  books,
  activeBookId,
  onOpenBook,
  onCreateBook,
  onRenameBook,
  onDeleteBook,
  onDuplicateBook,
  onExportBook,
  onImportBook,
  onExportAll,
  onImportAll,
}) => {
  const { t, i18n } = useTranslation(['app', 'common']);
  const [query, setQuery] = useState('');
  const [isNewBookOpen, setIsNewBookOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...books].sort((a, b) => b.lastModified - a.lastModified);
    return q ? sorted.filter(b => b.title.toLowerCase().includes(q)) : sorted;
  }, [books, query]);

  const handleRename = async (book: Project) => {
    const newTitle = await dialogService.prompt({
      title: t('app:bookshelf.renameTitle'),
      message: t('app:bookshelf.renameMessage'),
      defaultValue: book.title,
    });
    if (newTitle && newTitle.trim() && newTitle.trim() !== book.title) {
      onRenameBook(book.id, newTitle.trim());
    }
  };

  const handleImportAll = async () => {
    try {
      await onImportAll();
    } catch (error) {
      logger.error('导入全部数据失败:', error);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-6xl px-8 py-10">
        <PageHeader
          className="mb-6"
          title={<span className="font-serif">{t('app:bookshelf.title')}</span>}
          description={t('app:bookshelf.subtitle')}
          actions={
            <>
              <Button variant="ghost" size="sm" onClick={onExportAll} title={t('app:bookshelf.backup')}>
                <Download className="size-4" />
                {t('app:bookshelf.backup')}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleImportAll} title={t('app:bookshelf.importAll')}>
                <Upload className="size-4" />
                {t('app:bookshelf.importAll')}
              </Button>
              <Button variant="outline" size="sm" onClick={onImportBook}>
                <BookUp className="size-4" />
                {t('app:bookshelf.importBook')}
              </Button>
              <Button size="sm" onClick={() => setIsNewBookOpen(true)}>
                <Plus className="size-4" />
                {t('app:bookshelf.newBook')}
              </Button>
            </>
          }
        />

        {books.length > 0 && (
          <div className="relative mb-6 max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('app:bookshelf.search')}
              className="pl-8"
            />
          </div>
        )}

        {books.length === 0 ? (
          <EmptyState
            className="mt-24"
            icon={BookHeart}
            title={t('app:bookshelf.empty.title')}
            description={t('app:bookshelf.empty.desc')}
            action={
              <>
                <Button onClick={() => setIsNewBookOpen(true)}>
                  <Plus className="size-4" />
                  {t('app:bookshelf.newBook')}
                </Button>
                <Button variant="outline" onClick={onImportBook}>
                  <BookUp className="size-4" />
                  {t('app:bookshelf.importBook')}
                </Button>
              </>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title={t('app:bookshelf.noResults')} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(book => (
              <Card
                key={book.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenBook(book.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenBook(book.id);
                  }
                }}
                className="group flex cursor-pointer flex-col gap-3 p-5 transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-1 font-serif text-lg font-medium text-foreground">
                    {book.title}
                  </h3>
                  {book.id === activeBookId && (
                    <Badge variant="secondary" className="shrink-0">
                      {t('app:bookshelf.current')}
                    </Badge>
                  )}
                </div>

                <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                  {book.intro || book.inspiration || t('app:bookshelf.noContent')}
                </p>

                <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1" title={t('app:bookshelf.words')}>
                      <BookOpen className="size-3.5" />
                      {wordCount(book).toLocaleString(i18n.language)}
                    </span>
                    <span className="flex items-center gap-1" title={t('app:bookshelf.chapters')}>
                      <ListOrdered className="size-3.5" />
                      {book.chapters.length}
                    </span>
                    <span className="flex items-center gap-1" title={t('app:bookshelf.characters')}>
                      <Users className="size-3.5" />
                      {book.characters.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="tabular-nums">{formatLastEdited(book.lastModified, i18n.language)}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                          onClick={e => e.stopPropagation()}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                        <DropdownMenuItem onSelect={() => onOpenBook(book.id)}>
                          <FolderOpen className="size-4" />
                          {t('app:bookshelf.open')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleRename(book)}>
                          <Pencil className="size-4" />
                          {t('common:rename')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onDuplicateBook(book.id)}>
                          <Copy className="size-4" />
                          {t('app:bookshelf.duplicate')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onExportBook(book)}>
                          <Download className="size-4" />
                          {t('common:export')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => onDeleteBook(book.id)}>
                          <Trash2 className="size-4" />
                          {t('common:delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <NewBookModal
        isOpen={isNewBookOpen}
        onClose={() => setIsNewBookOpen(false)}
        onCreate={(title, description, templateType, sourceBookId) => {
          onCreateBook(title, description, templateType, sourceBookId);
          setIsNewBookOpen(false);
        }}
        existingBooks={books.map(b => ({ id: b.id, title: b.title }))}
      />
    </div>
  );
};

export default Bookshelf;
