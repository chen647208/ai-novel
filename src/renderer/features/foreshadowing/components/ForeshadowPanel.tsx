/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React, { useMemo, useState } from 'react';
import { useTranslation } from '@/i18n';
import { dialogService } from '@/shared/services/dialogService';
import type { ForeshadowImportance, ModelConfig, Project } from '../../../../shared/types';
import { Button } from '@/shared/ui/Button';
import { Dialog, DialogContent } from '@/shared/ui/Dialog';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { SegmentedControl } from '@/shared/ui/ViewModeToggle';
import { Textarea } from '@/shared/ui/Textarea';
import { cn } from '@/shared/utils/cn';
import { Loader2, Plus, Sprout, WandSparkles } from 'lucide-react';
import {
  addForeshadow,
  createForeshadow,
  detectPaidOffForeshadows,
  foreshadowCounts,
  openForeshadows,
  overdueForeshadows,
  payOffForeshadow,
  removeForeshadow,
  setStatus,
} from '../services/foreshadowService';

interface ForeshadowPanelProps {
  isOpen: boolean;
  project: Project;
  activeModel: ModelConfig;
  /** 当前编辑章节（用于"标记回收"与 AI 检测的目标章节） */
  activeChapter: { id: string; title: string; order: number; content: string } | null;
  onUpdate: (updates: Partial<Project>) => void;
  onClose: () => void;
}

const IMPORTANCE_VALUES: ForeshadowImportance[] = ['minor', 'major', 'critical'];

const IMPORTANCE_STYLE: Record<ForeshadowImportance, string> = {
  minor: 'border-border bg-muted/40 text-muted-foreground',
  major: 'border-primary/30 bg-primary/10 text-primary',
  critical: 'border-destructive/30 bg-destructive/10 text-destructive',
};

const ForeshadowPanel: React.FC<ForeshadowPanelProps> = ({
  isOpen,
  project,
  activeModel,
  activeChapter,
  onUpdate,
  onClose,
}) => {
  const { t } = useTranslation(['foreshadow', 'common']);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [importance, setImportance] = useState<ForeshadowImportance>('major');
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [detecting, setDetecting] = useState(false);

  const counts = useMemo(() => foreshadowCounts(project), [project]);
  const overdueIds = useMemo(
    () => new Set(overdueForeshadows(project, activeChapter?.order ?? 0).map((f) => f.id)),
    [project, activeChapter?.order],
  );

  const visible = filter === 'open' ? openForeshadows(project) : [...(project.foreshadows ?? [])].sort((a, b) => b.updatedAt - a.updatedAt);

  const emit = (next: Project) => onUpdate({ foreshadows: next.foreshadows ?? [] });

  const handleAdd = () => {
    if (!title.trim() || !detail.trim()) {
      dialogService.alert(t('foreshadow:addRequired'));
      return;
    }
    const planted = activeChapter ? { plantedChapterId: activeChapter.id, plantedChapterOrder: activeChapter.order } : {};
    emit(addForeshadow(project, createForeshadow({ title, detail, importance, ...planted })));
    setTitle('');
    setDetail('');
    setImportance('major');
  };

  const handleDetect = async () => {
    if (!activeChapter || !activeChapter.content.trim()) {
      dialogService.alert(t('foreshadow:detectNoContent'));
      return;
    }
    setDetecting(true);
    try {
      const { ids, error } = await detectPaidOffForeshadows(activeModel, project, activeChapter);
      if (error) {
        dialogService.alert(t('foreshadow:detectFailed', { error }));
        return;
      }
      if (ids.length === 0) {
        dialogService.alert(t('foreshadow:detectNone'));
        return;
      }
      let next = project;
      for (const id of ids) {
        next = payOffForeshadow(next, id, { id: activeChapter.id, order: activeChapter.order });
      }
      emit(next);
      dialogService.alert(t('foreshadow:detectMarked', { count: ids.length }));
    } finally {
      setDetecting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[88vh] w-[94vw] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-4">
          <h3 className="font-serif text-lg font-medium text-foreground">{t('foreshadow:title')}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('foreshadow:statOpen')} {counts.planted} · {t('foreshadow:statPaidOff')} {counts.paidOff} · {t('foreshadow:statAbandoned')} {counts.abandoned}
            {overdueIds.size > 0 && <span className="font-medium text-destructive"> · {t('foreshadow:statOverdue')} {overdueIds.size}</span>}
          </p>
        </div>

        {/* 新增区 */}
        <div className="shrink-0 space-y-2 border-b border-border p-5">
          <Input
            placeholder={t('foreshadow:formTitlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            rows={2}
            placeholder={t('foreshadow:formDetailPlaceholder')}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Select
              className="h-8 w-auto text-xs"
              value={importance}
              onChange={(e) => setImportance(e.target.value as ForeshadowImportance)}
            >
              {IMPORTANCE_VALUES.map((v) => <option key={v} value={v}>{t(`foreshadow:importance.${v}`)}</option>)}
            </Select>
            {activeChapter && (
              <span className="text-xs text-muted-foreground">{t('foreshadow:willPlantAt', { num: activeChapter.order + 1 })}</span>
            )}
            <Button size="sm" className="ml-auto" onClick={handleAdd}>
              <Plus className="size-3.5" />{t('foreshadow:add')}
            </Button>
          </div>
        </div>

        {/* 过滤 + AI 检测 */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
          <SegmentedControl
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'open' as const, label: t('foreshadow:filterOpen') },
              { value: 'all' as const, label: t('foreshadow:filterAll') },
            ]}
          />
          <Button variant="secondary" size="sm" onClick={handleDetect} disabled={detecting} title={t('foreshadow:detectTitle')}>
            {detecting ? <Loader2 className="size-3.5 animate-spin" /> : <WandSparkles className="size-3.5" />}
            {detecting ? t('foreshadow:detecting') : t('foreshadow:detectBtn')}
          </Button>
        </div>

        {/* 列表 */}
        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto bg-muted/20 p-5">
          {visible.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Sprout className="mx-auto mb-3 size-8" />
              {filter === 'open' ? t('foreshadow:emptyOpen') : t('foreshadow:emptyAll')}
            </div>
          ) : (
            visible.map((f) => (
              <div key={f.id} className={cn('rounded-lg border bg-card p-4', overdueIds.has(f.id) ? 'border-destructive/30' : 'border-border')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={cn('rounded border px-1.5 py-0.5 text-2xs', IMPORTANCE_STYLE[f.importance])}>{t(`foreshadow:importance.${f.importance}`)}</span>
                      <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-2xs text-muted-foreground">{t(`foreshadow:status.${f.status}`)}</span>
                      {overdueIds.has(f.id) && <span className="rounded border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-2xs text-destructive">{t('foreshadow:overdueBadge')}</span>}
                      <span className="truncate font-serif text-sm font-medium text-foreground">{f.title}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.detail}</p>
                    <div className="mt-1.5 text-2xs text-muted-foreground">
                      {f.plantedChapterOrder !== undefined && t('foreshadow:plantedAt', { num: f.plantedChapterOrder + 1 })}
                      {f.payoffChapterOrder !== undefined && t('foreshadow:payoffAt', { num: f.payoffChapterOrder + 1 })}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {f.status !== 'paid-off' && activeChapter && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-success hover:bg-success/10 hover:text-success" onClick={() => emit(payOffForeshadow(project, f.id, { id: activeChapter.id, order: activeChapter.order }))} title={t('foreshadow:markPayoffTitle')}>{t('foreshadow:markPayoff')}</Button>
                    )}
                    {f.status !== 'abandoned' ? (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => emit(setStatus(project, f.id, 'abandoned'))}>{t('foreshadow:abandon')}</Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => emit(setStatus(project, f.id, 'planted'))}>{t('foreshadow:restore')}</Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => emit(removeForeshadow(project, f.id))}>{t('common:delete')}</Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForeshadowPanel;
