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
import { templateDisplayName } from '@/i18n';
import { roleLabel } from '../../characters/displayLabels';
import { type OutputMode } from '../../../../shared/types';
import type { ChapterGenerationModalProps } from '../types';
import { useSettingsStore } from '../../../app/stores/settingsStore';
import { isModelUsable } from '@/shared/utils/modelReadiness';
import { Button } from '@/shared/ui/Button';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/Dialog';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { cn } from '@/shared/utils/cn';
import { ArrowDown, ArrowUp, Ban, BookOpen, Check, WandSparkles } from 'lucide-react';

/** 生成弹窗的「左标签 / 右内容」分区卡片 */
const GenSection: React.FC<{ label: string; alignStart?: boolean; children: React.ReactNode }> = ({ label, alignStart, children }) => (
  <div className="grid grid-cols-12 overflow-hidden rounded-lg border border-border bg-card">
    <div
      className={cn(
        'col-span-3 border-r border-border bg-muted/30 p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground',
        !alignStart && 'flex items-center'
      )}
    >
      {label}
    </div>
    <div className="col-span-9 p-4">{children}</div>
  </div>
);

/** 上下文连贯性检测的单行指示器 */
const ContextIndicator: React.FC<{
  direction: 'up' | 'down';
  present: boolean;
  title: string;
  titleCls: string;
  hint: string;
}> = ({ direction, present, title, titleCls, hint }) => {
  const Icon = direction === 'up' ? ArrowUp : ArrowDown;
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full',
          present ? (direction === 'up' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success') : 'bg-muted text-muted-foreground'
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div>
        <p className={cn('text-xs font-medium', present ? titleCls : 'text-muted-foreground')}>{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
};

const ChapterGenerationModal: React.FC<ChapterGenerationModalProps> = ({
  genModal,
  setGenModal,
  modalContextInfo,
  useOutline,
  setUseOutline,
  project,
  selectedCharacterIds,
  toggleCharacter,
  selectAllCharacters,
  clearAllCharacters,
  selectedChapterSummaryIds,
  toggleChapterSummary,
  selectAllChapterSummaries,
  clearAllChapterSummaries,
  editableSummary,
  setEditableSummary,
  selectedKnowledgeIds,
  toggleKnowledge,
  selectAllKnowledge,
  clearAllKnowledge,
  writingPrompts,
  selectedGenPromptId,
  setSelectedGenPromptId,
  targetWordCount,
  setTargetWordCount,
  batchMode,
  setBatchMode,
  activeModel,
  outputMode,
  setOutputMode,
  isStreaming,
  streamingTokens,
  traditionalTokens,
  isGenerating,
  handleEnterEditor,
  handleModalGenerate,
}) => {
  const { t } = useTranslation('writing');
  const prevTitlePart = modalContextInfo.prevChapter ? `《${modalContextInfo.prevChapter.title}》` : '';
  const nextTitlePart = modalContextInfo.nextChapter ? `《${modalContextInfo.nextChapter.title}》` : '';
  const streamingSupported = isModelUsable(activeModel) ? activeModel.supportsStreaming !== false : false;
  const hasModel = isModelUsable(activeModel);
  const summaryChapters = [...project.chapters]
    .sort((a, b) => a.order - b.order)
    .filter((chapter) => chapter.contentSummary && chapter.contentSummary.trim().length > 0);
  const writingKnowledge = (project.knowledge || []).filter((k) => k.category === 'writing');
  const batchOptions: Array<{ value: typeof batchMode; label: string }> = [
    { value: 'single', label: t('genModal.batchSingle') },
    { value: 'batch5', label: t('genModal.batchFive') },
    { value: 'batch10', label: t('genModal.batchTen') },
  ];

  return (
    genModal.isOpen && genModal.chapter && (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) setGenModal({ isOpen: false, chapter: null });
        }}
      >
        <DialogContent className="flex h-[92vh] w-[94vw] max-w-5xl flex-col gap-0 overflow-hidden p-0">
          <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-4">
            <DialogTitle className="font-serif text-lg">{t('genModal.title')}</DialogTitle>
          </div>

          <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {/* 信息概览卡片 */}
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="grid grid-cols-12 border-b border-border">
                <div className="col-span-3 flex items-center border-r border-border bg-muted/30 p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('genModal.targetChapter')}</div>
                <div className="col-span-9 flex items-center justify-between p-4 text-sm font-medium text-foreground">
                  <span>{t('genModal.chapterEntry', { num: genModal.chapter.order + 1, title: genModal.chapter.title })}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded border px-1.5 py-0.5 text-xs',
                      genModal.chapter.content.length > 50
                        ? 'border-warning/30 bg-warning/10 text-warning'
                        : 'border-border bg-muted/40 text-muted-foreground'
                    )}
                  >
                    {genModal.chapter.content.length > 50 ? t('genModal.hasContent') : t('genModal.blankChapter')}
                  </span>
                </div>
              </div>

              {/* 上下文连贯性检测面板 */}
              <div className="grid grid-cols-12">
                <div className="col-span-3 border-r border-border bg-muted/30 p-4 pt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('genModal.contextTitle')}</div>
                <div className="col-span-9 space-y-2.5 p-4">
                  <ContextIndicator
                    direction="up"
                    present={!!(modalContextInfo.prevContextText && modalContextInfo.prevContextText.length > 0)}
                    title={modalContextInfo.prevContextText && modalContextInfo.prevContextText.length > 0 ? t('genModal.prevTitle') : t('genModal.noPrevTitle')}
                    titleCls="text-foreground"
                    hint={modalContextInfo.prevContextText && modalContextInfo.prevContextText.length > 0 ? t('genModal.prevHint', { chapter: prevTitlePart }) : t('genModal.noPrevHint')}
                  />
                  <ContextIndicator
                    direction="down"
                    present={!!(modalContextInfo.nextSummary && modalContextInfo.nextSummary.length > 0)}
                    title={modalContextInfo.nextSummary && modalContextInfo.nextSummary.length > 0 ? t('genModal.nextTitle') : t('genModal.noNextTitle')}
                    titleCls="text-foreground"
                    hint={modalContextInfo.nextSummary && modalContextInfo.nextSummary.length > 0 ? t('genModal.nextHint', { chapter: nextTitlePart }) : t('genModal.noNextHint')}
                  />
                </div>
              </div>
            </div>

            {/* 区域A：小说大纲关联 */}
            <GenSection label={t('genModal.sectionOutline')}>
              <Button variant={useOutline ? 'default' : 'secondary'} size="sm" onClick={() => setUseOutline(!useOutline)}>
                <BookOpen className="size-4" />
                {useOutline ? t('genModal.outlineLinked') : t('genModal.outlineLink')}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">{t('genModal.outlineHint')}</p>
            </GenSection>

            {/* 区域B：角色选择器 */}
            <GenSection label={t('genModal.sectionCharacters')}>
              <div className="mb-2 flex gap-2">
                <Button variant="secondary" size="sm" onClick={selectAllCharacters}>{t('genModal.selectAllCharacters')}</Button>
                <Button variant="ghost" size="sm" onClick={clearAllCharacters}>{t('genModal.clearSelection')}</Button>
              </div>

              <div className="custom-scrollbar max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2">
                {project.characters.map((character) => {
                  const isSelected = selectedCharacterIds.has(character.id);
                  return (
                    <div
                      key={character.id}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => toggleCharacter(character.id)}
                      onKeyDown={(event) => {
                        if (event.key === ' ' || event.key === 'Enter') {
                          event.preventDefault();
                          toggleCharacter(character.id);
                        }
                      }}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-md p-2.5 transition-colors',
                        isSelected ? 'border border-primary/40 bg-primary/5' : 'border border-transparent hover:bg-accent/40'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                          isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background'
                        )}
                      >
                        {isSelected && <Check className="size-3" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-serif text-sm font-medium text-foreground">{character.name}</span>
                          <span
                            className={cn(
                              'shrink-0 rounded border px-1.5 py-0.5 text-2xs uppercase tracking-wide',
                              isSelected ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-muted/40 text-muted-foreground'
                            )}
                          >
                            {character.role ? roleLabel(character.role) : t('genModal.roleUnspecified')}
                          </span>
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {character.personality || character.background || t('genModal.noCharacterDesc')}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {project.characters.length === 0 && (
                  <div className="py-4 text-center text-sm text-muted-foreground">{t('genModal.noCharacters')}</div>
                )}
              </div>

              <p className="mt-2 text-xs text-muted-foreground">{t('genModal.charactersHint')}</p>
            </GenSection>

            {/* 区域C：章节正文摘要选择器 */}
            <GenSection label={t('genModal.sectionSummaries')}>
              <div className="mb-2 flex gap-2">
                <Button variant="secondary" size="sm" onClick={selectAllChapterSummaries}>{t('genModal.smartSelectFive')}</Button>
                <Button variant="ghost" size="sm" onClick={clearAllChapterSummaries}>{t('genModal.clearSelection')}</Button>
              </div>

              <div className="custom-scrollbar max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2">
                {summaryChapters.map((chapter) => {
                  const isSelected = selectedChapterSummaryIds.has(chapter.id);
                  const isCurrentChapter = genModal.chapter?.id === chapter.id;
                  return (
                    <div
                      key={chapter.id}
                      role={isCurrentChapter ? undefined : 'checkbox'}
                      aria-checked={isCurrentChapter ? undefined : isSelected}
                      tabIndex={isCurrentChapter ? -1 : 0}
                      onClick={() => !isCurrentChapter && toggleChapterSummary(chapter.id)}
                      onKeyDown={(event) => {
                        if (!isCurrentChapter && (event.key === ' ' || event.key === 'Enter')) {
                          event.preventDefault();
                          toggleChapterSummary(chapter.id);
                        }
                      }}
                      className={cn(
                        'flex items-start gap-3 rounded-md p-2.5 transition-colors',
                        isCurrentChapter
                          ? 'cursor-not-allowed border border-transparent bg-muted/40 opacity-60'
                          : isSelected
                            ? 'cursor-pointer border border-primary/40 bg-primary/5'
                            : 'cursor-pointer border border-transparent hover:bg-accent/40'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                          isCurrentChapter
                            ? 'border-border bg-muted text-muted-foreground'
                            : isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input bg-background'
                        )}
                      >
                        {isCurrentChapter && <Ban className="size-2.5" />}
                        {!isCurrentChapter && isSelected && <Check className="size-3" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {t('genModal.chapterEntry', { num: chapter.order + 1, title: chapter.title })}
                            {isCurrentChapter && <span className="ml-2 text-xs font-normal text-muted-foreground">{t('genModal.currentChapter')}</span>}
                          </span>
                          {!isCurrentChapter && (
                            <span
                              className={cn(
                                'shrink-0 rounded border px-1.5 py-0.5 text-2xs',
                                isSelected ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-muted/40 text-muted-foreground'
                              )}
                            >
                              {isSelected ? t('genModal.selectedState') : t('genModal.unselectedState')}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{chapter.contentSummary}</div>
                      </div>
                    </div>
                  );
                })}

                {summaryChapters.length === 0 && (
                  <div className="py-4 text-center text-sm text-muted-foreground">{t('genModal.noSummaries')}</div>
                )}
              </div>

              <p className="mt-2 text-xs text-muted-foreground">{t('genModal.summariesHint')}</p>
            </GenSection>

            {/* 区域D：细纲自由编辑 */}
            <GenSection label={t('genModal.sectionDetail')} alignStart>
              <Textarea
                className="min-h-[120px]"
                value={editableSummary}
                onChange={(e) => setEditableSummary(e.target.value)}
                placeholder={t('genModal.detailPlaceholder')}
              />
              <p className="mt-2 text-xs text-muted-foreground">{t('genModal.detailHint')}</p>
            </GenSection>

            {/* 知识库选择区域 */}
            <GenSection label={t('genModal.sectionKnowledge')}>
              <div className="mb-2 flex gap-2">
                <Button variant="secondary" size="sm" onClick={selectAllKnowledge}>{t('genModal.selectAll')}</Button>
                <Button variant="ghost" size="sm" onClick={clearAllKnowledge}>{t('genModal.clear')}</Button>
              </div>
              <div className="custom-scrollbar max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2">
                {writingKnowledge.length > 0 ? (
                  writingKnowledge.map((k) => {
                    const isSelected = selectedKnowledgeIds.has(k.id);
                    return (
                      <div
                        key={k.id}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => toggleKnowledge(k.id)}
                        onKeyDown={(event) => {
                          if (event.key === ' ' || event.key === 'Enter') {
                            event.preventDefault();
                            toggleKnowledge(k.id);
                          }
                        }}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-md p-2.5 transition-colors',
                          isSelected ? 'border border-primary/40 bg-primary/5' : 'border border-transparent hover:bg-accent/40'
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                            isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background'
                          )}
                        >
                          {isSelected && <Check className="size-3" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">{k.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{k.category}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-4 text-center text-sm text-muted-foreground">{t('genModal.noKnowledge')}</div>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t('genModal.knowledgeHint')}</p>
            </GenSection>

            {/* 生成模板选择区域 */}
            <GenSection label={t('genModal.sectionTemplate')}>
              <Select value={selectedGenPromptId} onChange={(e) => setSelectedGenPromptId(e.target.value)}>
                {writingPrompts.map((p) => (
                  <option key={p.id} value={p.id}>{templateDisplayName(p)}</option>
                ))}
              </Select>
            </GenSection>

            {/* 字数目标选择区域 */}
            <GenSection label={t('genModal.sectionWordTarget')}>
              <div className="flex items-center gap-3">
                <Input
                  className="flex-1"
                  type="number"
                  min="1"
                  value={targetWordCount}
                  onChange={(e) => setTargetWordCount(parseInt(e.target.value, 10) || 1)}
                  placeholder={t('genModal.wordTargetPlaceholder')}
                />
                <span className="min-w-[80px] text-right text-sm text-muted-foreground">{t('genModal.wordUnit')}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t('genModal.wordTargetHint')}</p>
            </GenSection>

            {/* 批量生成模式选择区域 */}
            <GenSection label={t('genModal.sectionBatch')}>
              <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
                {batchOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setBatchMode(opt.value)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                      batchMode === opt.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t('genModal.batchHint')}</p>
            </GenSection>

            {/* 输出模式选择区域 */}
            <GenSection label={t('genModal.sectionOutputMode')} alignStart>
              <Select
                value={activeModel?.id ?? ''}
                onChange={(e) => useSettingsStore.getState().setActiveModelId(e.target.value)}
                className="mb-2 font-medium"
              >
                {!hasModel && <option value="">{t('genModal.noModelOption')}</option>}
                {useSettingsStore.getState().models.filter((m) => m.isEnabled !== false).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </Select>
              <Select value={outputMode} onChange={(e) => setOutputMode(e.target.value as OutputMode)}>
                <option value="streaming">{t('output.streaming')}</option>
                <option value="traditional">{t('output.traditional')}</option>
              </Select>

              <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn('size-2 rounded-full', streamingSupported ? 'animate-pulse bg-success' : 'bg-muted-foreground/40')} />
                    <span className="text-sm text-foreground">{t('output.supportLabel')}</span>
                  </div>
                  <span
                    className={cn(
                      'rounded px-2 py-0.5 text-xs font-medium',
                      streamingSupported ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {streamingSupported ? t('output.on') : t('output.off')}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {!hasModel
                    ? t('output.noModelHint')
                    : streamingSupported
                      ? t('output.onHint', { name: activeModel.name })
                      : t('output.offHint', { name: activeModel.name })}
                </p>
              </div>
            </GenSection>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-border bg-muted/30 px-6 py-4">
            <div className="flex items-center gap-4">
              {/* Token消耗显示 */}
              {(isStreaming || isGenerating || streamingTokens.total >= 0 || traditionalTokens.total >= 0) && (
                <div className="flex items-center gap-4 rounded-lg border border-border bg-background px-3 py-2">
                  <div className="text-center">
                    <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{t('output.inputToken')}</div>
                    <div className="text-sm tabular-nums text-foreground">{isStreaming ? streamingTokens.prompt : traditionalTokens.prompt}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{t('output.outputToken')}</div>
                    <div className="text-sm tabular-nums text-foreground">{isStreaming ? streamingTokens.completion : traditionalTokens.completion}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{t('output.total')}</div>
                    <div className="text-sm font-medium tabular-nums text-foreground">{isStreaming ? streamingTokens.total : traditionalTokens.total}</div>
                  </div>
                  {isStreaming && (
                    <div className="flex items-center gap-2">
                      <span className="size-2 animate-pulse rounded-full bg-primary" />
                      <span className="text-xs text-muted-foreground">{t('output.generating')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" onClick={handleEnterEditor}>{t('genModal.editorOnly')}</Button>
              <Button onClick={handleModalGenerate} disabled={!hasModel} title={!hasModel ? t('output.noModelHint') : undefined}>
                <WandSparkles className="size-4" /> {t('genModal.confirmGenerate')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  );
};

export default ChapterGenerationModal;
