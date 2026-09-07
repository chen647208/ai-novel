/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React, { useState } from 'react';
import { useTranslation } from '@/i18n';
import { dialogService } from '@/shared/services/dialogService';
import { cn } from '@/shared/utils/cn';
import { Button } from '@/shared/ui/Button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/shared/ui/Dialog';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { BookHeart } from 'lucide-react';

interface NewBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, description?: string, templateType?: 'blank' | 'duplicate' | 'example', sourceBookId?: string) => void;
  existingBooks?: Array<{ id: string; title: string }>;
}

const NewBookModal: React.FC<NewBookModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  existingBooks = []
}) => {
  const { t } = useTranslation(['books', 'common']);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateType, setTemplateType] = useState<'blank' | 'duplicate' | 'example'>('blank');
  const [selectedBookToDuplicate, setSelectedBookToDuplicate] = useState<string>('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTemplateType('blank');
    setSelectedBookToDuplicate('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      dialogService.alert(t('books:newBook.titleRequired'));
      return;
    }
    if (templateType === 'duplicate' && !selectedBookToDuplicate) {
      dialogService.alert(t('books:newBook.duplicateRequired'));
      return;
    }

    onCreate(title.trim(), description.trim() || undefined, templateType, selectedBookToDuplicate || undefined);
    resetForm();
  };

  const methods = [
    { value: 'blank' as const, label: t('books:newBook.blank'), desc: t('books:newBook.blankDesc') },
    ...(existingBooks.length > 0
      ? [{ value: 'duplicate' as const, label: t('books:newBook.duplicate'), desc: t('books:newBook.duplicateDesc') }]
      : []),
    { value: 'example' as const, label: t('books:newBook.example'), desc: t('books:newBook.exampleDesc') },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookHeart className="size-5" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="font-serif text-lg">{t('books:newBook.title')}</DialogTitle>
            <DialogDescription className="mt-1">{t('books:newBook.subtitle')}</DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              {t('books:newBook.titleLabel')} <span className="text-destructive">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('books:newBook.titlePlaceholder')}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('books:newBook.descLabel')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('books:newBook.descPlaceholder')}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('books:newBook.methodLabel')}</Label>
            <div className="space-y-2">
              {methods.map(({ value, label, desc }) => (
                <label
                  key={value}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                    templateType === value ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-accent/40'
                  )}
                >
                  <input
                    type="radio"
                    name="templateType"
                    value={value}
                    checked={templateType === value}
                    onChange={() => setTemplateType(value)}
                    className="mt-0.5 size-3.5 accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{desc}</span>
                    {value === 'duplicate' && templateType === 'duplicate' && (
                      <Select
                        value={selectedBookToDuplicate}
                        onChange={(e) => setSelectedBookToDuplicate(e.target.value)}
                        className="mt-2 h-8 text-sm"
                      >
                        <option value="">{t('books:newBook.selectToDuplicate')}</option>
                        {existingBooks.map((book) => (
                          <option key={book.id} value={book.id}>
                            {book.title}
                          </option>
                        ))}
                      </Select>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('common:cancel')}
            </Button>
            <Button type="submit">
              {t('books:newBook.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewBookModal;
