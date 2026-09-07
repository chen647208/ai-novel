/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AssistantEditPanelProps, AssistantEditCategory } from '../types';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { normalizeGenderId } from '../../characters/characterKinds';
import { Select } from '@/shared/ui/Select';
import { Spinner } from '@/shared/ui/Spinner';
import { Textarea } from '@/shared/ui/Textarea';
import { cn } from '@/shared/utils/cn';
import { AlertCircle, BookOpenText, CheckCircle2, FileText, Info, Lightbulb, ListOrdered, ListTree, Save, Users, WandSparkles, type LucideIcon } from 'lucide-react';

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

/** 表单小标题 */
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{children}</Label>
);

const AssistantEditPanel: React.FC<AssistantEditPanelProps> = ({
  project,
  editCategory,
  editingData,
  syncStatus,
  characterGenerationPrompt,
  isGeneratingCharacter,
  hasModel,
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
      <div className="absolute inset-0 top-[88px] z-10 flex flex-1 flex-col overflow-hidden bg-background">
        {/* 编辑类别标签 */}
        <div className="flex shrink-0 overflow-x-auto border-b border-border bg-card no-scrollbar">
          {EDIT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleOpenEditPanel(cat.id)}
              className={cn(
                'flex min-w-[60px] flex-1 flex-col items-center gap-1 border-b-2 py-3 text-2xs transition-colors',
                editCategory === cat.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <cat.icon className="size-4" />
              <span>{t(CATEGORY_LABEL_KEYS[cat.id])}</span>
            </button>
          ))}
        </div>

        {/* 编辑内容区域 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {editCategory === 'inspiration' && (
            <div className="custom-scrollbar space-y-4 overflow-y-auto p-4">
              <div>
                <FieldLabel>{t('edit.inspirationLabel')}</FieldLabel>
                <Textarea
                  className="min-h-[128px]"
                  value={editingData.inspiration || project.inspiration || ''}
                  onChange={(e) => setEditingData(prev => ({ ...prev, inspiration: e.target.value }))}
                  placeholder={t('edit.inspirationPlaceholder')}
                />
              </div>
              <div>
                <FieldLabel>{t('edit.introLabel')}</FieldLabel>
                <Textarea
                  className="min-h-[128px]"
                  value={editingData.intro || project.intro || ''}
                  onChange={(e) => setEditingData(prev => ({ ...prev, intro: e.target.value }))}
                  placeholder={t('edit.introPlaceholder')}
                />
              </div>
            </div>
          )}

          {editCategory === 'knowledge' && (
            <div className="custom-scrollbar space-y-4 overflow-y-auto p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">{t('edit.knowledgeTitle')}</h3>
                <Button
                  size="sm"
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
                >
                  {t('edit.addEntry')}
                </Button>
              </div>
              {(editingData.knowledge || project.knowledge || []).map((item, index) => (
                <div key={item.id} className="space-y-2 rounded-lg border border-border bg-card p-3">
                  <Input
                    value={item.name}
                    onChange={(e) => {
                      const newKnowledge = [...(editingData.knowledge || project.knowledge || [])];
                      newKnowledge[index] = { ...item, name: e.target.value };
                      setEditingData(prev => ({ ...prev, knowledge: newKnowledge }));
                    }}
                    placeholder={t('edit.entryNamePlaceholder')}
                  />
                  <Textarea
                    className="min-h-[96px]"
                    value={item.content}
                    onChange={(e) => {
                      const newKnowledge = [...(editingData.knowledge || project.knowledge || [])];
                      newKnowledge[index] = { ...item, content: e.target.value };
                      setEditingData(prev => ({ ...prev, knowledge: newKnowledge }));
                    }}
                    placeholder={t('edit.entryContentPlaceholder')}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      const newKnowledge = (editingData.knowledge || project.knowledge || []).filter((_, i) => i !== index);
                      setEditingData(prev => ({ ...prev, knowledge: newKnowledge }));
                    }}
                  >
                    {t('edit.delete')}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {editCategory === 'characters' && (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* 智能角色生成 - 固定在上方，不参与滚动 */}
              <div className="shrink-0 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <h3 className="mb-2 text-sm font-medium text-foreground">{t('edit.charGenTitle')}</h3>
                <div className="space-y-2">
                  <Textarea
                    className="min-h-[80px] bg-background"
                    value={characterGenerationPrompt}
                    onChange={(e) => setCharacterGenerationPrompt(e.target.value)}
                    placeholder={t('edit.charGenPlaceholder')}
                  />
                  <Button
                    className="w-full"
                    onClick={handleGenerateCharacter}
                    disabled={isGeneratingCharacter || !hasModel || !characterGenerationPrompt.trim()}
                    title={!hasModel ? t('dialog.noModel') : undefined}
                  >
                    {isGeneratingCharacter ? (
                      <>
                        <Spinner className="size-4" />
                        {t('edit.generating')}
                      </>
                    ) : (
                      <>
                        <WandSparkles className="size-4" />
                        {t('edit.generateCharacter')}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* 角色编辑列表 - 单独的可滚动部分 */}
              <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">{t('edit.charListTitle')}</h3>
                  <Button
                    size="sm"
                    onClick={() => {
                      const newCharacters = [...(editingData.characters || project.characters || [])];
                      newCharacters.push({
                        id: `character-${Date.now()}`,
                        name: t('edit.newCharacterName'),
                        gender: 'unknown',
                        age: '未知',
                        role: 'supporting',
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
                  >
                    {t('edit.addCharacter')}
                  </Button>
                </div>
                {(editingData.characters || project.characters || []).map((character, index) => (
                  <div key={character.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>{t('edit.nameLabel')}</FieldLabel>
                        <Input
                          value={character.name}
                          onChange={(e) => {
                            const newCharacters = [...(editingData.characters || project.characters || [])];
                            newCharacters[index] = { ...character, name: e.target.value };
                            setEditingData(prev => ({ ...prev, characters: newCharacters }));
                          }}
                        />
                      </div>
                      <div>
                        <FieldLabel>{t('edit.genderLabel')}</FieldLabel>
                        <Input
                          value={character.gender}
                          onChange={(e) => {
                            const newCharacters = [...(editingData.characters || project.characters || [])];
                            newCharacters[index] = { ...character, gender: normalizeGenderId(e.target.value) };
                            setEditingData(prev => ({ ...prev, characters: newCharacters }));
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>{t('edit.personalityLabel')}</FieldLabel>
                      <Textarea
                        className="min-h-[64px]"
                        value={character.personality}
                        onChange={(e) => {
                          const newCharacters = [...(editingData.characters || project.characters || [])];
                          newCharacters[index] = { ...character, personality: e.target.value };
                          setEditingData(prev => ({ ...prev, characters: newCharacters }));
                        }}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          const newCharacters = (editingData.characters || project.characters || []).filter((_, i) => i !== index);
                          setEditingData(prev => ({ ...prev, characters: newCharacters }));
                        }}
                      >
                        {t('edit.deleteCharacter')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editCategory === 'outline' && (
            <div className="custom-scrollbar overflow-y-auto p-4">
              <FieldLabel>{t('edit.outlineLabel')}</FieldLabel>
              <Textarea
                className="min-h-[256px]"
                value={editingData.outline || project.outline || ''}
                onChange={(e) => setEditingData(prev => ({ ...prev, outline: e.target.value }))}
                placeholder={t('edit.outlinePlaceholder')}
              />
            </div>
          )}

          {editCategory === 'chapters' && (
            <div className="custom-scrollbar space-y-4 overflow-y-auto p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">{t('edit.chapterListTitle')}</h3>
                <Button
                  size="sm"
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
                >
                  {t('edit.addChapter')}
                </Button>
              </div>
              {[...(editingData.chapters || project.chapters || [])].sort((a, b) => a.order - b.order).map((chapter, index) => (
                <div key={chapter.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>{t('edit.chapterTitleLabel')}</FieldLabel>
                      <Input
                        value={chapter.title}
                        onChange={(e) => {
                          const newChapters = [...(editingData.chapters || project.chapters || [])];
                          newChapters[index] = { ...chapter, title: e.target.value };
                          setEditingData(prev => ({ ...prev, chapters: newChapters }));
                        }}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t('edit.chapterOrderLabel')}</FieldLabel>
                      <Input
                        type="number"
                        className="tabular-nums"
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
                    <FieldLabel>{t('edit.chapterSummaryLabel')}</FieldLabel>
                    <Textarea
                      className="min-h-[96px]"
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
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        // 打开正文编辑器
                        setEditCategory('content');
                        // 设置当前编辑的章节
                        setEditingData(prev => ({ ...prev, editingChapterId: chapter.id }));
                      }}
                    >
                      {t('edit.editContent')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        const newChapters = (editingData.chapters || project.chapters || []).filter((_, i) => i !== index);
                        setEditingData(prev => ({ ...prev, chapters: newChapters }));
                      }}
                    >
                      {t('edit.deleteChapter')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {editCategory === 'content' && (
            <div className="custom-scrollbar space-y-4 overflow-y-auto p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium text-foreground">{t('edit.contentTitle')}</h3>
                <Select
                  className="h-8 w-auto text-xs"
                  value={editingData.editingChapterId || ''}
                  onChange={(e) => setEditingData(prev => ({ ...prev, editingChapterId: e.target.value }))}
                >
                  <option value="">{t('edit.selectChapterOption')}</option>
                  {[...(project?.chapters || [])].sort((a, b) => a.order - b.order).map(chapter => (
                    <option key={chapter.id} value={chapter.id}>{t('edit.chapterEntry', { num: chapter.order + 1, title: chapter.title })}</option>
                  ))}
                </Select>
              </div>
              {editingData.editingChapterId && (
                <div className="space-y-3">
                  <div>
                    <FieldLabel>{t('edit.contentLabel')}</FieldLabel>
                    <Textarea
                      className="min-h-[384px] font-mono leading-relaxed"
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
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Info className="size-3.5" />
                    <span>{t('edit.unsavedHint')}</span>
                    {syncStatus === 'idle' && editingData.chapters && editingData.chapters.length > 0 && (
                      <span className="font-medium text-warning">{t('edit.unsavedBadge')}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 编辑操作按钮 */}
        <div className="flex shrink-0 items-center justify-between border-t border-border bg-card p-4">
          <div className="flex items-center gap-2">
            {syncStatus === 'saving' && (
              <div className="flex items-center gap-1 text-xs text-primary">
                <Spinner className="size-4" />
                {t('edit.saving')}
              </div>
            )}
            {syncStatus === 'saved' && (
              <div className="flex items-center gap-1 text-xs text-success">
                <CheckCircle2 className="size-4" />
                {t('edit.saved')}
              </div>
            )}
            {syncStatus === 'error' && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="size-4" />
                {t('edit.saveFailed')}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditPanelOpen(false);
                setEditingData({});
                setSyncStatus('idle');
              }}
            >
              {t('edit.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={syncStatus === 'saving' || Object.keys(editingData).length === 0}
            >
              {syncStatus === 'saving' ? (
                <>
                  <Spinner className="size-4" />
                  {t('edit.saving')}
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  {t('edit.saveChanges')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
};

export default AssistantEditPanel;
