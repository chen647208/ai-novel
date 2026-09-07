/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { ChevronDown, ChevronUp, RefreshCcw, ReplaceAll, X } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

export interface FindBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  replacement: string;
  onReplacementChange: (value: string) => void;
  caseSensitive: boolean;
  onToggleCaseSensitive: () => void;
  matchIndex: number;
  matchCount: number;
  onPrev: () => void;
  onNext: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

/**
 * 查找替换浮条：当前匹配即用编辑器选区高亮（不另建装饰插件），
 * 上一个/下一个跳转，替换/全部替换走事务（可撤销）。
 */
const FindBar: React.FC<FindBarProps> = ({
  query,
  onQueryChange,
  replacement,
  onReplacementChange,
  caseSensitive,
  onToggleCaseSensitive,
  matchIndex,
  matchCount,
  onPrev,
  onNext,
  onReplace,
  onReplaceAll,
  onClose,
}) => {
  const { t } = useTranslation('writing');
  return (
    <div className="absolute right-4 top-2 z-30 flex items-center gap-1.5 rounded-lg border border-border bg-popover p-1.5 shadow-md">
      <Input
        autoFocus
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={t('findbar.queryPlaceholder')}
        className="h-7 w-44 text-xs"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
          }
          if (e.key === 'Escape') onClose();
        }}
      />
      <Input
        value={replacement}
        onChange={(e) => onReplacementChange(e.target.value)}
        placeholder={t('findbar.replacePlaceholder')}
        className="h-7 w-32 text-xs"
      />
      <span className="min-w-12 text-center text-2xs tabular-nums text-muted-foreground">
        {query.trim() && matchCount > 0 ? t('findbar.count', { current: matchIndex + 1, total: matchCount }) : t('findbar.noResults')}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className={cn('size-7', caseSensitive && 'bg-accent text-foreground')}
        onClick={onToggleCaseSensitive}
        title={t('findbar.caseTitle')}
      >
        <span className="text-xs font-bold">Aa</span>
      </Button>
      <Button variant="ghost" size="icon" className="size-7" onClick={onPrev} disabled={matchCount === 0} title={t('findbar.prev')}>
        <ChevronUp className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" className="size-7" onClick={onNext} disabled={matchCount === 0} title={t('findbar.next')}>
        <ChevronDown className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" className="size-7" onClick={onReplace} disabled={matchCount === 0} title={t('findbar.replace')}>
        <RefreshCcw className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" className="size-7" onClick={onReplaceAll} disabled={matchCount === 0} title={t('findbar.replaceAll')}>
        <ReplaceAll className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={onClose} title={t('findbar.close')}>
        <X className="size-4" />
      </Button>
    </div>
  );
};

export default FindBar;
