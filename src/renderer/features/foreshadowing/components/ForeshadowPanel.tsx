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
import { dialogService } from '@/shared/services/dialogService';
import type { ForeshadowImportance, ModelConfig, Project } from '../../../../shared/types';
import { Loader2, Plus, Sprout, WandSparkles, X } from 'lucide-react';
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
  minor: 'bg-gray-100 text-gray-600',
  major: 'bg-blue-100 text-blue-700',
  critical: 'bg-red-100 text-red-700',
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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-[250] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl border border-gray-100 overflow-hidden flex flex-col max-h-[88vh]">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-black text-gray-800 tracking-tight">{t('foreshadow:title')}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {t('foreshadow:statOpen')} {counts.planted} · {t('foreshadow:statPaidOff')} {counts.paidOff} · {t('foreshadow:statAbandoned')} {counts.abandoned}
              {overdueIds.size > 0 && <span className="text-red-500 font-bold"> · {t('foreshadow:statOverdue')} {overdueIds.size}</span>}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>

        {/* 新增区 */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 space-y-3 shrink-0">
          <input
            className="w-full text-sm font-bold border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder={t('foreshadow:formTitlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
            rows={2}
            placeholder={t('foreshadow:formDetailPlaceholder')}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <select
              className="text-xs font-bold border border-gray-200 rounded-lg px-2 py-1.5 outline-none"
              value={importance}
              onChange={(e) => setImportance(e.target.value as ForeshadowImportance)}
            >
              {IMPORTANCE_VALUES.map((v) => <option key={v} value={v}>{t(`foreshadow:importance.${v}`)}</option>)}
            </select>
            {activeChapter && (
              <span className="text-xs text-gray-400">{t('foreshadow:willPlantAt', { num: activeChapter.order + 1 })}</span>
            )}
            <button onClick={handleAdd} className="ml-auto px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors">
              <Plus className="size-4 mr-1" />{t('foreshadow:add')}
            </button>
          </div>
        </div>

        {/* 过滤 + AI 检测 */}
        <div className="px-5 py-3 flex items-center justify-between shrink-0 border-b border-gray-100">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setFilter('open')} className={`px-3 py-1 rounded-md text-xs font-bold ${filter === 'open' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>{t('foreshadow:filterOpen')}</button>
            <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-md text-xs font-bold ${filter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>{t('foreshadow:filterAll')}</button>
          </div>
          <button
            onClick={handleDetect}
            disabled={detecting}
            className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg hover:bg-purple-200 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            title={t('foreshadow:detectTitle')}
          >
            {detecting ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
            {detecting ? t('foreshadow:detecting') : t('foreshadow:detectBtn')}
          </button>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3 bg-gray-50/30">
          {visible.length === 0 ? (
            <div className="text-center py-14 text-gray-400 text-sm">
              <Sprout className="size-8 mb-3 block text-gray-300" />
              {filter === 'open' ? t('foreshadow:emptyOpen') : t('foreshadow:emptyAll')}
            </div>
          ) : (
            visible.map((f) => (
              <div key={f.id} className={`bg-white rounded-xl border p-4 ${overdueIds.has(f.id) ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${IMPORTANCE_STYLE[f.importance]}`}>{t(`foreshadow:importance.${f.importance}`)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-gray-100 text-gray-500">{t(`foreshadow:status.${f.status}`)}</span>
                      {overdueIds.has(f.id) && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-500 text-white">{t('foreshadow:overdueBadge')}</span>}
                      <span className="text-sm font-bold text-gray-800 truncate">{f.title}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{f.detail}</p>
                    <div className="text-[10px] text-gray-400 mt-1.5">
                      {f.plantedChapterOrder !== undefined && t('foreshadow:plantedAt', { num: f.plantedChapterOrder + 1 })}
                      {f.payoffChapterOrder !== undefined && t('foreshadow:payoffAt', { num: f.payoffChapterOrder + 1 })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {f.status !== 'paid-off' && activeChapter && (
                      <button onClick={() => emit(payOffForeshadow(project, f.id, { id: activeChapter.id, order: activeChapter.order }))} className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title={t('foreshadow:markPayoffTitle')}>{t('foreshadow:markPayoff')}</button>
                    )}
                    {f.status !== 'abandoned' ? (
                      <button onClick={() => emit(setStatus(project, f.id, 'abandoned'))} className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200">{t('foreshadow:abandon')}</button>
                    ) : (
                      <button onClick={() => emit(setStatus(project, f.id, 'planted'))} className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200">{t('foreshadow:restore')}</button>
                    )}
                    <button onClick={() => emit(removeForeshadow(project, f.id))} className="text-[10px] font-bold px-2 py-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50">{t('common:delete')}</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ForeshadowPanel;
