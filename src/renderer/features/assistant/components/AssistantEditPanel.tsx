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
import type { AssistantEditPanelProps, AssistantEditCategory } from '../types';
import { AlertCircle, BookOpenText, CheckCircle2, FileText, Info, Lightbulb, ListOrdered, ListTree, LoaderCircle, Save, Users, WandSparkles, type LucideIcon } from 'lucide-react';

const EDIT_CATEGORIES: Array<{ id: AssistantEditCategory; icon: LucideIcon }> = [
  { id: 'inspiration', icon: Lightbulb },
  { id: 'knowledge', icon: BookOpenText },
  { id: 'characters', icon: Users },
  { id: 'outline', icon: ListTree },
  { id: 'chapters', icon: ListOrdered },
  { id: 'content', icon: FileText },
];

/** 类别 id 与字典键一一对应，渲染时按当前语言取标签。 */
const CATEGORY_LABEL_KEYS = {
  inspiration: 'category.inspiration',
  knowledge: 'category.knowledge',
  characters: 'category.characters',
  outline: 'category.outline',
  chapters: 'category.chapters',
  content: 'category.content',
} as const;

const AssistantEditPanel: React.FC<AssistantEditPanelProps> = ({
  project,
  editCategory,
  editingData,
  syncStatus,
  characterGenerationPrompt,
  isGeneratingCharacter,
  setEditingData,
  setEditCategory,
  setSyncStatus,
  setEditPanelOpen,
  setCharacterGenerationPrompt,
  handleOpenEditPanel,
  handleSaveEdit,
  handleGenerateCharacter,
  getChapterContent,
}) => {
    const { t } = useTranslation('assistant');
    if (!project) return null;

    return (
      <div className="flex-1 flex flex-col bg-gray-50 z-10 overflow-hidden animate-in slide-in-from-right duration-200 absolute inset-0 top-[88px]">
        {/* 编辑类别标签 */}
        <div className="flex bg-white border-b overflow-x-auto no-scrollbar shrink-0">
          {EDIT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleOpenEditPanel(cat.id)}
              className={`flex-1 min-w-[60px] py-3 flex flex-col items-center gap-1 text-[10px] border-b-2 transition-colors ${
                editCategory === cat.id ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <cat.icon className="size-4" />
              <span>{t(CATEGORY_LABEL_KEYS[cat.id])}</span>
            </button>
          ))}
        </div>

        {/* 编辑内容区域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {editCategory === 'inspiration' && (
            <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('edit.inspirationLabel')}</label>
                <textarea
                  className="w-full h-32 bg-white border border-gray-200 rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-100"
                  value={editingData.inspiration || project.inspiration || ''}
                  onChange={(e) => setEditingData(prev => ({ ...prev, inspiration: e.target.value }))}
                  placeholder={t('edit.inspirationPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('edit.introLabel')}</label>
                <textarea
                  className="w-full h-32 bg-white border border-gray-200 rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-100"
                  value={editingData.intro || project.intro || ''}
                  onChange={(e) => setEditingData(prev => ({ ...prev, intro: e.target.value }))}
                  placeholder={t('edit.introPlaceholder')}
                />
              </div>
            </div>
          )}

          {editCategory === 'knowledge' && (
            <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">{t('edit.knowledgeTitle')}</h3>
                <button
                  onClick={() => {
                    const newKnowledge = [...(editingData.knowledge || project.knowledge || [])];
                    newKnowledge.push({
                      id: `knowledge-${Date.now()}`,
                      name: t('edit.newEntryName'),
                      content: '',
                      type: 'txt',
                      size: 0,
                      addedAt: Date.now(),
                      category: 'writing' as const
                    });
                    setEditingData(prev => ({ ...prev, knowledge: newKnowledge }));
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                >
                  {t('edit.addEntry')}
                </button>
              </div>
              {(editingData.knowledge || project.knowledge || []).map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-100"
                    value={item.name}
                    onChange={(e) => {
                      const newKnowledge = [...(editingData.knowledge || project.knowledge || [])];
                      newKnowledge[index] = { ...item, name: e.target.value };
                      setEditingData(prev => ({ ...prev, knowledge: newKnowledge }));
                    }}
                    placeholder={t('edit.entryNamePlaceholder')}
                  />
                  <textarea
                    className="w-full h-24 bg-white border border-gray-200 rounded p-2 text-sm resize-none outline-none focus:ring-1 focus:ring-blue-100"
                    value={item.content}
                    onChange={(e) => {
                      const newKnowledge = [...(editingData.knowledge || project.knowledge || [])];
                      newKnowledge[index] = { ...item, content: e.target.value };
                      setEditingData(prev => ({ ...prev, knowledge: newKnowledge }));
                    }}
                    placeholder={t('edit.entryContentPlaceholder')}
                  />
                  <button
                    onClick={() => {
                      const newKnowledge = (editingData.knowledge || project.knowledge || []).filter((_, i) => i !== index);
                      setEditingData(prev => ({ ...prev, knowledge: newKnowledge }));
                    }}
                    className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded hover:bg-red-100"
                  >
                    {t('edit.delete')}
                  </button>
                </div>
              ))}
            </div>
          )}

          {editCategory === 'characters' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 智能角色生成 - 固定在上方，不参与滚动 */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 shrink-0">
                <h3 className="text-sm font-medium text-blue-700 mb-2">{t('edit.charGenTitle')}</h3>
                <div className="space-y-2">
                  <textarea
                    className="w-full h-20 bg-white border border-blue-200 rounded-lg p-2 text-sm resize-none outline-none focus:ring-1 focus:ring-blue-100"
                    value={characterGenerationPrompt}
                    onChange={(e) => setCharacterGenerationPrompt(e.target.value)}
                    placeholder={t('edit.charGenPlaceholder')}
                  />
                  <button
                    onClick={handleGenerateCharacter}
                    disabled={isGeneratingCharacter || !characterGenerationPrompt.trim()}
                    className={`w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2 ${
                      isGeneratingCharacter || !characterGenerationPrompt.trim() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isGeneratingCharacter ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        {t('edit.generating')}
                      </>
                    ) : (
                      <>
                        <WandSparkles className="size-4" />
                        {t('edit.generateCharacter')}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 角色编辑列表 - 单独的可滚动部分 */}
              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-700">{t('edit.charListTitle')}</h3>
                  <button
                    onClick={() => {
                      const newCharacters = [...(editingData.characters || project.characters || [])];
                      newCharacters.push({
                        id: `character-${Date.now()}`,
                        name: t('edit.newCharacterName'),
                        gender: '未知',
                        age: '未知',
                        role: '配角',
                        personality: '',
                        background: '',
                        relationships: '',
                        appearance: '',
                        distinctiveFeatures: '',
                        occupation: '',
                        motivation: '',
                        strengths: '',
                        weaknesses: '',
                        characterArc: ''
                      });
                      setEditingData(prev => ({ ...prev, characters: newCharacters }));
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                  >
                    {t('edit.addCharacter')}
                  </button>
                </div>
                {(editingData.characters || project.characters || []).map((character, index) => (
                  <div key={character.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('edit.nameLabel')}</label>
                        <input
                          type="text"
                          className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-100"
                          value={character.name}
                          onChange={(e) => {
                            const newCharacters = [...(editingData.characters || project.characters || [])];
                            newCharacters[index] = { ...character, name: e.target.value };
                            setEditingData(prev => ({ ...prev, characters: newCharacters }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('edit.genderLabel')}</label>
                        <input
                          type="text"
                          className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-100"
                          value={character.gender}
                          onChange={(e) => {
                            const newCharacters = [...(editingData.characters || project.characters || [])];
                            newCharacters[index] = { ...character, gender: e.target.value };
                            setEditingData(prev => ({ ...prev, characters: newCharacters }));
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('edit.personalityLabel')}</label>
                      <textarea
                        className="w-full h-16 bg-white border border-gray-200 rounded p-2 text-sm resize-none outline-none focus:ring-1 focus:ring-blue-100"
                        value={character.personality}
                        onChange={(e) => {
                          const newCharacters = [...(editingData.characters || project.characters || [])];
                          newCharacters[index] = { ...character, personality: e.target.value };
                          setEditingData(prev => ({ ...prev, characters: newCharacters }));
                        }}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          const newCharacters = (editingData.characters || project.characters || []).filter((_, i) => i !== index);
                          setEditingData(prev => ({ ...prev, characters: newCharacters }));
                        }}
                        className="px-3 py-1 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100"
                      >
                        {t('edit.deleteCharacter')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editCategory === 'outline' && (
            <div className="p-4 overflow-y-auto custom-scrollbar">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('edit.outlineLabel')}</label>
              <textarea
                className="w-full h-64 bg-white border border-gray-200 rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-100"
                value={editingData.outline || project.outline || ''}
                onChange={(e) => setEditingData(prev => ({ ...prev, outline: e.target.value }))}
                placeholder={t('edit.outlinePlaceholder')}
              />
            </div>
          )}

          {editCategory === 'chapters' && (
            <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">{t('edit.chapterListTitle')}</h3>
                <button
                  onClick={() => {
                    const newChapters = [...(editingData.chapters || project.chapters || [])];
                    const newOrder = newChapters.length;
                    newChapters.push({
                      id: `chapter-${Date.now()}`,
                      title: t('edit.defaultChapterTitle', { num: newOrder + 1 }),
                      summary: '',
                      content: '',
                      order: newOrder
                    });
                    setEditingData(prev => ({ ...prev, chapters: newChapters }));
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                >
                  {t('edit.addChapter')}
                </button>
              </div>
              {(editingData.chapters || project.chapters || []).sort((a, b) => a.order - b.order).map((chapter, index) => (
                <div key={chapter.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('edit.chapterTitleLabel')}</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-100"
                        value={chapter.title}
                        onChange={(e) => {
                          const newChapters = [...(editingData.chapters || project.chapters || [])];
                          newChapters[index] = { ...chapter, title: e.target.value };
                          setEditingData(prev => ({ ...prev, chapters: newChapters }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('edit.chapterOrderLabel')}</label>
                      <input
                        type="number"
                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-100"
                        value={chapter.order}
                        onChange={(e) => {
                          const newChapters = [...(editingData.chapters || project.chapters || [])];
                          newChapters[index] = { ...chapter, order: parseInt(e.target.value) || 0 };
                          setEditingData(prev => ({ ...prev, chapters: newChapters }));
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('edit.chapterSummaryLabel')}</label>
                    <textarea
                      className="w-full h-24 bg-white border border-gray-200 rounded p-2 text-sm resize-none outline-none focus:ring-1 focus:ring-blue-100"
                      value={chapter.summary}
                      onChange={(e) => {
                        const newChapters = [...(editingData.chapters || project.chapters || [])];
                        newChapters[index] = { ...chapter, summary: e.target.value };
                        setEditingData(prev => ({ ...prev, chapters: newChapters }));
                      }}
                      placeholder={t('edit.chapterSummaryPlaceholder')}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        // 打开正文编辑器
                        setEditCategory('content');
                        // 设置当前编辑的章节
                        setEditingData(prev => ({ ...prev, editingChapterId: chapter.id }));
                      }}
                      className="px-3 py-1 bg-green-50 text-green-600 text-xs rounded-lg hover:bg-green-100"
                    >
                      {t('edit.editContent')}
                    </button>
                    <button
                      onClick={() => {
                        const newChapters = (editingData.chapters || project.chapters || []).filter((_, i) => i !== index);
                        setEditingData(prev => ({ ...prev, chapters: newChapters }));
                      }}
                      className="px-3 py-1 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100"
                    >
                      {t('edit.deleteChapter')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {editCategory === 'content' && (
            <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">{t('edit.contentTitle')}</h3>
                <select
                  value={editingData.editingChapterId || ''}
                  onChange={(e) => setEditingData(prev => ({ ...prev, editingChapterId: e.target.value }))}
                  className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-100"
                >
                  <option value="">{t('edit.selectChapterOption')}</option>
                  {(project?.chapters || []).sort((a, b) => a.order - b.order).map(chapter => (
                    <option key={chapter.id} value={chapter.id}>{t('edit.chapterEntry', { num: chapter.order + 1, title: chapter.title })}</option>
                  ))}
                </select>
              </div>
              {editingData.editingChapterId && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('edit.contentLabel')}</label>
                  <textarea
                    className="w-full h-96 bg-white border border-gray-200 rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-100 font-mono leading-relaxed"
                    value={getChapterContent(editingData.editingChapterId)}
                    onChange={(e) => {
                      const chapterId = editingData.editingChapterId;
                      if (!chapterId) return;
                      
                      // 更新编辑数据中的章节内容
                      const currentChapters = editingData.chapters || project?.chapters || [];
                      const updatedChapters = currentChapters.map(chapter => {
                        if (chapter.id === chapterId) {
                          return { ...chapter, content: e.target.value };
                        }
                        return chapter;
                      });
                      
                      setEditingData(prev => ({ ...prev, chapters: updatedChapters }));
                      // 设置保存状态为待保存
                      if (syncStatus === 'idle' || syncStatus === 'saved') {
                        setSyncStatus('idle');
                      }
                    }}
                    placeholder={t('edit.contentPlaceholder')}
                  />
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <Info className="size-4" />
                    <span>{t('edit.unsavedHint')}</span>
                    {syncStatus === 'idle' && editingData.chapters && editingData.chapters.length > 0 && (
                      <span className="text-amber-600 font-medium">{t('edit.unsavedBadge')}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 编辑操作按钮 */}
        <div className="p-4 bg-white border-t border-gray-200 shrink-0 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {syncStatus === 'saving' && (
              <div className="flex items-center gap-1 text-blue-600 text-xs">
                <LoaderCircle className="size-4 animate-spin" />
                {t('edit.saving')}
              </div>
            )}
            {syncStatus === 'saved' && (
              <div className="flex items-center gap-1 text-green-600 text-xs">
                <CheckCircle2 className="size-4" />
                {t('edit.saved')}
              </div>
            )}
            {syncStatus === 'error' && (
              <div className="flex items-center gap-1 text-red-600 text-xs">
                <AlertCircle className="size-4" />
                {t('edit.saveFailed')}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditPanelOpen(false);
                setEditingData({});
                setSyncStatus('idle');
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200"
            >
              {t('edit.cancel')}
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={syncStatus === 'saving' || Object.keys(editingData).length === 0}
              className={`px-4 py-2 text-white text-xs rounded-lg flex items-center gap-2 ${
                syncStatus === 'saving' || Object.keys(editingData).length === 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {syncStatus === 'saving' ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  {t('edit.saving')}
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  {t('edit.saveChanges')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
};

export default AssistantEditPanel;
