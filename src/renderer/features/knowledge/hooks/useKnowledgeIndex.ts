/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 知识库上传与向量索引（从 StepKnowledgeEnhanced 抽出）：
 * 去重入库、向量索引、统计刷新。
 */
import { useEffect, useState } from 'react';
import type { TFunction } from 'i18next';
import { type KnowledgeCategory, type KnowledgeItem, type Project } from '../../../../shared/types';
import { sha256Hex, uuidv7 } from '@core/entities';
import { dialogService } from '@/shared/services/dialogService';
import { logger } from '@/shared/utils/logger';
import { vectorIntegrationService } from '../services/vectorIntegrationService';

type VectorStats = Awaited<ReturnType<typeof vectorIntegrationService.getVectorStats>>;

type CategoryFilter = KnowledgeCategory | 'all';

interface UseKnowledgeIndexOptions {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
  selectedCategory: CategoryFilter;
  t: TFunction<'knowledge'>;
}

export function useKnowledgeIndex({ project, onUpdate, selectedCategory, t }: UseKnowledgeIndexOptions) {
  const [vectorStats, setVectorStats] = useState<VectorStats | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);

  const loadVectorStats = async () => {
    try {
      const stats = await vectorIntegrationService.getVectorStats(project.id);
      setVectorStats(stats);
    } catch {
      /* 无索引时忽略 */
    }
  };

  useEffect(() => {
    void loadVectorStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const indexKnowledgeItems = async (items: KnowledgeItem[]) => {
    if (items.length === 0) return;

    setIsIndexing(true);
    setIndexProgress(0);

    try {
      logger.debug(`开始索引 ${items.length} 个知识库项目...`);
      const result = await vectorIntegrationService.indexKnowledgeBase(project.id, items);
      logger.debug('索引结果:', result);

      if (result.success) {
        setVectorStats(await vectorIntegrationService.getVectorStats(project.id));
        logger.debug(`✅ 成功索引 ${result.indexedCount} 个文档`);
      } else {
        logger.error('❌ 索引失败:', result.error);
        dialogService.alert(t('center.indexFailed', { error: result.error ?? '' }));
      }
    } catch (error) {
      logger.error('❌ 索引过程中出错:', error);
      dialogService.alert(t('center.indexError', { error: error instanceof Error ? error.message : String(error) }));
    } finally {
      setIsIndexing(false);
      setIndexProgress(100);
    }
  };

  const handleFiles = async (files: FileList) => {
    const newItems: KnowledgeItem[] = [];
    const skipped: string[] = [];
    // 内容哈希去重：已有条目与本批文件统一比对，同内容只留一份
    const seenHashes = new Set(
      await Promise.all((project.knowledge || []).map((k) => sha256Hex(k.content ?? ''))),
    );

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
        try {
          const text = await file.text();
          const hash = await sha256Hex(text);
          if (seenHashes.has(hash)) {
            skipped.push(file.name);
            continue;
          }
          seenHashes.add(hash);
          newItems.push({
            id: Date.now().toString() + '_' + uuidv7() + '_' + i,
            name: file.name,
            content: text,
            type: file.name.split('.').pop() || 'txt',
            size: file.size,
            addedAt: Date.now(),
            category: selectedCategory === 'all' ? 'writing' : selectedCategory,
          });
        } catch (err) {
          logger.error('Failed to read file', file.name, err);
          dialogService.alert(t('readFailed', { name: file.name }));
        }
      } else {
        dialogService.alert(t('formatUnsupported', { name: file.name }));
      }
    }

    if (skipped.length > 0) {
      dialogService.alert(t('center.duplicateSkipped', { count: skipped.length, names: skipped.slice(0, 5).join('、') }));
    }

    if (newItems.length > 0) {
      onUpdate({ knowledge: [...(project.knowledge || []), ...newItems] });
      await indexKnowledgeItems(newItems);
    }
  };

  return { vectorStats, setVectorStats, isIndexing, setIsIndexing, indexProgress, loadVectorStats, indexKnowledgeItems, handleFiles };
}
