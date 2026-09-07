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
import type { WritingEditModalProps } from '../types';
import { Button } from '@/shared/ui/Button';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/Dialog';
import { Label } from '@/shared/ui/Label';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { cn } from '@/shared/utils/cn';
import { isModelUsable } from '@/shared/utils/modelReadiness';
import { WandSparkles } from 'lucide-react';

const WritingEditModal: React.FC<WritingEditModalProps> = ({
  isOpen,
  selectedText,
  editPrompts,
  selectedEditPromptId,
  customEditPrompt,
  outputMode,
  activeModel,
  isStreaming,
  isGenerating,
  streamingTokens,
  traditionalTokens,
  onClose,
  onSelectedEditPromptChange,
  onCustomEditPromptChange,
  onOutputModeChange,
  onSubmit,
}) => {
  const { t } = useTranslation('writing');
  const streamingSupported = isModelUsable(activeModel) ? activeModel.supportsStreaming !== false : false;
  const hasModel = isModelUsable(activeModel);
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
          <div>
            <DialogTitle className="font-serif text-lg">{t('editModal.title')}</DialogTitle>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('editModal.sectionSelected')}</Label>
            <div className="custom-scrollbar mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-sm italic leading-relaxed text-foreground/80">
              {selectedText}
            </div>
          </div>

          <div>
            <Label htmlFor="edit-modal-strategy" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('editModal.sectionStrategy')}</Label>
            <Select
              id="edit-modal-strategy"
              className="mt-2"
              value={selectedEditPromptId}
              onChange={(event) => onSelectedEditPromptChange(event.target.value)}
            >
              {editPrompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>{templateDisplayName(prompt)}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="edit-modal-custom" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('editModal.sectionCustom')}</Label>
            <Textarea
              id="edit-modal-custom"
              className="mt-2 min-h-[120px]"
              value={customEditPrompt}
              onChange={(event) => onCustomEditPromptChange(event.target.value)}
              placeholder={t('editModal.customPlaceholder')}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">{t('editModal.customHint')}</p>
          </div>

          <div>
            <Label htmlFor="edit-modal-output" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('editModal.sectionOutputMode')}</Label>
            <Select
              id="edit-modal-output"
              className="mt-2"
              value={outputMode}
              onChange={(event) => onOutputModeChange(event.target.value as typeof outputMode)}
            >
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
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-4">
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
            <Button variant="ghost" onClick={onClose}>{t('editModal.cancel')}</Button>
            <Button onClick={onSubmit} disabled={!hasModel} title={!hasModel ? t('output.noModelHint') : undefined}>
              <WandSparkles className="size-4" /> {t('editModal.runNow')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WritingEditModal;
