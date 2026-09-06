/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React, { useEffect } from 'react';
import { useTranslation } from '@/i18n';
import type { Project } from '../../../shared/types';
import StepOutline from '../../features/outline/StepOutline';
import StepChapterOutline from '../../features/chapters/StepChapterOutline';
import { useViewPreference } from '@/shared/hooks/useViewPreference';
import { SegmentedControl } from '@/shared/ui/ViewModeToggle';
import { PageHeader } from '@/shared/ui/PageHeader';

interface StructureSectionProps {
  project: Project;
  onEnterWriting: (chapterId: string) => void;
  /** 引导深链：外部指定子页（大纲/细纲）时切过去；平时沿用用户偏好 */
  initialSub?: 'outline' | 'chapters';
}

/**
 * 结构页（一页两段）：大纲 ⇄ 细纲子页签共用一页，原先两个一级分区合并。
 * StepOutline / StepChapterOutline 已直读 store，这里只负责子页签与进写作跳转。
 * 默认落大纲（正向创作流先见大纲），细纲是第二步。
 */
const StructureSection: React.FC<StructureSectionProps> = ({ project, onEnterWriting, initialSub }) => {
  const { t } = useTranslation('nav');
  const [sub, setSub] = useViewPreference<'outline' | 'chapters'>('structure.subtab', 'outline');

  useEffect(() => {
    if (initialSub) setSub(initialSub);
  }, [initialSub, setSub]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        left={
          <SegmentedControl
            value={sub}
            onChange={setSub}
            options={[
              { value: 'chapters', label: t('structureTabs.chapters') },
              { value: 'outline', label: t('structureTabs.outline') },
            ]}
          />
        }
      />
      <div className="min-h-0 flex-1">
        {sub === 'outline' ? (
          <StepOutline project={project} />
        ) : (
          <StepChapterOutline project={project} onEnterWriting={onEnterWriting} />
        )}
      </div>
    </div>
  );
};

export default StructureSection;
