/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { templateDisplayName } from '@/i18n';
import type { ChapterSummarySectionProps } from '../types';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { Bot, Settings } from 'lucide-react';
import { Spinner } from '@/shared/ui/Spinner';

const ChapterSummarySection: React.FC<ChapterSummarySectionProps> = ({
  activeChapter,
  summaryPrompts,
  selectedSummaryPromptId,
  isExtractingSummary,
  hasModel,
  onOpenSummaryPromptManager,
  onContentSummaryChange,
  onSummaryPromptChange,
  onExtractSummary,
}) => {
  const { t } = useTranslation('writing');
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('summarySection.title')}</h4>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          onClick={onOpenSummaryPromptManager}
          title={t('summarySection.manageTitle')}
        >
          <Settings className="size-4" />
        </Button>
      </div>

      <Textarea
        value={activeChapter?.contentSummary || ''}
        onChange={(event) => onContentSummaryChange(event.target.value)}
        placeholder={t('summarySection.placeholder')}
        className="mb-3 min-h-[120px] bg-muted/40 text-xs leading-relaxed whitespace-pre-wrap"
      />

      <div className="space-y-2">
        <Select
          value={selectedSummaryPromptId}
          onChange={(event) => onSummaryPromptChange(event.target.value)}
          className="h-8 text-xs"
        >
          <option value="">{t('summarySection.selectTemplate')}</option>
          {summaryPrompts.map((prompt) => (
            <option key={prompt.id} value={prompt.id}>{templateDisplayName(prompt)}</option>
          ))}
        </Select>

        <Button
          className="w-full"
          size="sm"
          onClick={onExtractSummary}
          disabled={isExtractingSummary || !hasModel || !activeChapter?.content || activeChapter.content.trim().length === 0}
          title={!hasModel ? t('output.noModelHint') : undefined}
        >
          {isExtractingSummary ? (
            <>
              <Spinner className="size-3.5" />
              {t('summarySection.extracting')}
            </>
          ) : (
            <>
              <Bot className="size-3.5" />
              {t('summarySection.extractBtn')}
            </>
          )}
        </Button>

        <p className="text-center text-2xs text-muted-foreground">
          {t('summarySection.hint')}
        </p>
      </div>
    </section>
  );
};

export default ChapterSummarySection;
