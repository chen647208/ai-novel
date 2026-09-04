/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React, { useState } from 'react';
import { useTranslation } from '@/i18n';
import { dialogService } from '@/shared/services/dialogService';

interface NewBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, description?: string, templateType?: 'blank' | 'duplicate' | 'example') => void;
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      dialogService.alert(t('books:newBook.titleRequired'));
      return;
    }

    onCreate(title.trim(), description.trim() || undefined, templateType);
    resetForm();
  };

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

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-800 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                <i className="fas fa-book-medical text-blue-400 text-lg"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{t('books:newBook.title')}</h3>
                <p className="text-gray-400 text-sm mt-1">{t('books:newBook.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                {t('books:newBook.titleLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder={t('books:newBook.titlePlaceholder')}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                {t('books:newBook.descLabel')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                placeholder={t('books:newBook.descPlaceholder')}
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-3">
                {t('books:newBook.methodLabel')}
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 rounded-lg border border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="templateType"
                    value="blank"
                    checked={templateType === 'blank'}
                    onChange={() => setTemplateType('blank')}
                    className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-white">{t('books:newBook.blank')}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{t('books:newBook.blankDesc')}</div>
                  </div>
                </label>

                {existingBooks.length > 0 && (
                  <label className="flex items-center p-3 rounded-lg border border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="templateType"
                      value="duplicate"
                      checked={templateType === 'duplicate'}
                      onChange={() => setTemplateType('duplicate')}
                      className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-white">{t('books:newBook.duplicate')}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{t('books:newBook.duplicateDesc')}</div>
                      {templateType === 'duplicate' && (
                        <select
                          value={selectedBookToDuplicate}
                          onChange={(e) => setSelectedBookToDuplicate(e.target.value)}
                          className="w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="">{t('books:newBook.selectToDuplicate')}</option>
                          {existingBooks.map((book) => (
                            <option key={book.id} value={book.id}>
                              {book.title}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </label>
                )}

                <label className="flex items-center p-3 rounded-lg border border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="templateType"
                    value="example"
                    checked={templateType === 'example'}
                    onChange={() => setTemplateType('example')}
                    className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-white">{t('books:newBook.example')}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{t('books:newBook.exampleDesc')}</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-800">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors"
            >
              {t('common:cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95"
            >
              {t('books:newBook.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewBookModal;





