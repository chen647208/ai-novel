/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { logger } from '@/shared/utils/logger';
import { isModelUsable } from '@/shared/utils/modelReadiness';

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation, templateDisplayName } from '@/i18n';
import { type Project, type Character } from '../../../shared/types';
import { useProjectStore, type CommitOptions } from '@/app/stores/projectStore';
import { VIRTUAL_CHAPTER_ORDER, KNOWLEDGE_SNIPPET_TRUNCATE } from '../../../shared/constants/chapters';
import { useSettingsStore, useUsableModel } from '@/app/stores/settingsStore';
import { AIService } from '../assistant/services/aiService';
import RelationshipDiagram from './RelationshipDiagram';
import CompactCharacterCard from './CompactCharacterCard';
import CharacterModal from './CharacterModal';
import { dialogService } from '@/shared/services/dialogService';
import { normalizeGenderId, normalizeRoleId, type CharacterDraft, type CharacterDraftField } from './characterKinds';
import { cn } from '@/shared/utils/cn';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Select } from '@/shared/ui/Select';
import { AlertCircle, Check, CheckCheck, Network, Plus, Settings, Trash2, UserRound, WandSparkles, XCircle } from 'lucide-react';
import { Spinner } from '@/shared/ui/Spinner';

interface StepCharactersProps {
  project: Project;
  onOpenSettings?: () => void;
  /** 外部导航（一致性检查「跳转到编辑」等）：自动打开该角色的详情弹窗 */
  focusCharacterId?: string | null;
  /** 聚焦已消费的通知，父组件据此清除 focusCharacterId，避免重复弹出 */
  onFocusHandled?: () => void;
  /** 跨页接力：缺简介时回灵感页补充，由工作台注入 */
  onGoSection?: (next: 'inspiration') => void;
}

const StepCharacters: React.FC<StepCharactersProps> = ({
  project,
  onOpenSettings,
  focusCharacterId,
  onFocusHandled,
  onGoSection,
}) => {
  // 直读 store：模型/提示词/更新动作不再经 App→View 层层透传
  const prompts = useSettingsStore((s) => s.prompts);
  const activeModel = useUsableModel();
  const updateActiveProject = useProjectStore((s) => s.updateActiveProject);
  const onUpdate = (updates: Partial<Project>, opts?: CommitOptions) => updateActiveProject(updates, opts);
  const { t } = useTranslation(['characters', 'steps']);
  const [loading, setLoading] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);
  const [modalCharacterId, setModalCharacterId] = useState<string | null>(null);

  // 外部导航：打开目标角色的详情弹窗后立即通知父组件消费
  useEffect(() => {
    if (focusCharacterId && (project.characters || []).some(c => c.id === focusCharacterId)) {
      setModalCharacterId(focusCharacterId);
      onFocusHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCharacterId]);
  
  // 传统输出模式的token信息
  const [traditionalTokens, setTraditionalTokens] = useState({ prompt: 0, completion: 0, total: 0 });
  
  // Knowledge Base Selection State
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<Set<string>>(new Set());
  
  // 双重确认状态管理
  const [clearConfirm, setClearConfirm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 自动重置确认状态（3秒后自动取消删除状态，防止误触）
  useEffect(() => {
    if (!deleteConfirmId) return;
    const timer = setTimeout(() => setDeleteConfirmId(null), 3000);
    return () => clearTimeout(timer);
  }, [deleteConfirmId]);

  useEffect(() => {
    if (!clearConfirm) return;
    const timer = setTimeout(() => setClearConfirm(false), 3000);
    return () => clearTimeout(timer);
  }, [clearConfirm]);
  
  const characterPrompts = useMemo(() => 
    prompts.filter(p => p.category === 'character'), 
    [prompts]
  );
  
  const [selectedPromptId, setSelectedPromptId] = useState(characterPrompts[0]?.id || '');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const activePrompt = useMemo(() => characterPrompts.find(p => p.id === selectedPromptId), [characterPrompts, selectedPromptId]);

  const inspirationOptions = useMemo(() => {
    if (!project.intro) return [];
    const rawSections = project.intro.split(/(?=\d\s*[.、])|(?=【书名[:：])|(?=##\s+)|(?=书名[:：])|(?=方案\s*\d)/g)
      .filter(s => s.trim().length > 15);
    
    if (rawSections.length <= 1) {
      return [{ title: project.title, summary: project.intro }];
    }
    return rawSections.map(sec => {
      const fallbackTitle = sec.split('\n')[0]?.replace(/^\d+\s*[.、]\s*/, '').trim() ?? '';
      const titleMatch = sec.match(/(?:书名|标题|##)[:：]?\s*([^\n,，:：]+)/) || 
                         sec.match(/【([^】]+)】/) || 
                         [null, fallbackTitle];
      const title = ((titleMatch[1] ?? '') || '未命名故事').replace(/[#*【】]/g, '').trim();
      const summary = sec.replace(titleMatch[0] ?? '', '').replace(/^[，,]\s*/, '').trim();
      return { title, summary };
    });
  }, [project.intro, project.title]);

  const activeInspiration = inspirationOptions[selectedIndex] || { title: project.title, summary: project.intro };

  const parseCharactersFromText = (text: string): Character[] => {
    const chars: Character[] = [];
    const cleanLines = text.replace(/[*#_]/g, '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
    // 解析草稿：role/gender 先收原始文本，落库前经 normalizeRoleId/normalizeGenderId 归一化
    let activeChar: CharacterDraft | null = null;
    let currentField: CharacterDraftField | null = null;

    cleanLines.forEach(line => {
      const nameMatch = line.match(/^(?:角色名|姓名|名字|名称|身份)[:：\s]*(.*)/i);
      if (nameMatch && nameMatch[1]?.trim()) {
        if (activeChar && activeChar.name) {
          // 为新字段提供默认值
          const completeChar: Character = {
            id: Math.random().toString(36).substr(2, 9),
            name: activeChar.name || '',
            gender: normalizeGenderId(activeChar.gender),
            age: activeChar.age || '未知',
            role: normalizeRoleId(activeChar.role, 'protagonist'),
            personality: activeChar.personality || '',
            background: activeChar.background || '',
            relationships: activeChar.relationships || '',
            appearance: activeChar.appearance || '',
            distinctiveFeatures: activeChar.distinctiveFeatures || '',
            occupation: activeChar.occupation || '',
            motivation: activeChar.motivation || '',
            strengths: activeChar.strengths || '',
            weaknesses: activeChar.weaknesses || '',
            characterArc: activeChar.characterArc || ''
          };
          chars.push(completeChar);
        }
        activeChar = {
          id: Math.random().toString(36).substr(2, 9),
          name: nameMatch[1]?.trim() ?? '',
          gender: 'unknown',
          age: '未知',
          role: 'protagonist',
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
        };
        currentField = 'name';
        return;
      }
      if (!activeChar) return;
      
      // 扩展字段匹配
      const genderMatch = line.match(/^(?:性别|性别类型)[:：\s]*(.*)/i);
      const ageMatch = line.match(/^(?:年龄|岁数)[:：\s]*(.*)/i);
      const roleMatch = line.match(/^(?:类型|角色类型|定位|身份)[:：\s]*(.*)/i);
      const personalityMatch = line.match(/^(?:性格|特质|性格特征)[:：\s]*(.*)/i);
      const backgroundMatch = line.match(/^(?:背景|出身|生平)[:：\s]*(.*)/i);
      const relationshipMatch = line.match(/^(?:关系|角色关系|社交)[:：\s]*(.*)/i);
      const appearanceMatch = line.match(/^(?:外观|外貌|长相|外表)[:：\s]*(.*)/i);
      const featuresMatch = line.match(/^(?:特征|标志性特征|特点)[:：\s]*(.*)/i);
      const occupationMatch = line.match(/^(?:职业|身份|职位)[:：\s]*(.*)/i);
      const motivationMatch = line.match(/^(?:动机|目标|目的)[:：\s]*(.*)/i);
      const strengthsMatch = line.match(/^(?:优势|能力|特长)[:：\s]*(.*)/i);
      const weaknessesMatch = line.match(/^(?:弱点|缺陷|缺点)[:：\s]*(.*)/i);
      const arcMatch = line.match(/^(?:成长|弧线|发展)[:：\s]*(.*)/i);

      if (genderMatch) { activeChar.gender = genderMatch[1]?.trim() ?? ''; currentField = 'gender'; }
      else if (ageMatch) { activeChar.age = ageMatch[1]?.trim() ?? ''; currentField = 'age'; }
      else if (roleMatch) { activeChar.role = roleMatch[1]?.trim() ?? ''; currentField = 'role'; }
      else if (personalityMatch) { activeChar.personality = personalityMatch[1]?.trim() ?? ''; currentField = 'personality'; }
      else if (backgroundMatch) { activeChar.background = backgroundMatch[1]?.trim() ?? ''; currentField = 'background'; }
      else if (relationshipMatch) { activeChar.relationships = relationshipMatch[1]?.trim() ?? ''; currentField = 'relationships'; }
      else if (appearanceMatch) { activeChar.appearance = appearanceMatch[1]?.trim() ?? ''; currentField = 'appearance'; }
      else if (featuresMatch) { activeChar.distinctiveFeatures = featuresMatch[1]?.trim() ?? ''; currentField = 'distinctiveFeatures'; }
      else if (occupationMatch) { activeChar.occupation = occupationMatch[1]?.trim() ?? ''; currentField = 'occupation'; }
      else if (motivationMatch) { activeChar.motivation = motivationMatch[1]?.trim() ?? ''; currentField = 'motivation'; }
      else if (strengthsMatch) { activeChar.strengths = strengthsMatch[1]?.trim() ?? ''; currentField = 'strengths'; }
      else if (weaknessesMatch) { activeChar.weaknesses = weaknessesMatch[1]?.trim() ?? ''; currentField = 'weaknesses'; }
      else if (arcMatch) { activeChar.characterArc = arcMatch[1]?.trim() ?? ''; currentField = 'characterArc'; }
      else if (currentField && currentField !== 'id') {
        activeChar[currentField] = ((activeChar[currentField] || '') + ' ' + line).trim();
      }
    });
    
    // forEach 闭包内的赋值对外层 CFA 不可见：此处断言回完整并集（勿删，否则收窄为 null）
    const char = activeChar as CharacterDraft | null;
    if (char && char.name) {
      // 为新字段提供默认值（定位/性别归一化为枚举 id）
      const completeChar: Character = {
        id: char.id || Math.random().toString(36).substr(2, 9),
        name: char.name || '',
        gender: normalizeGenderId(char.gender),
        age: char.age || '未知',
        role: normalizeRoleId(char.role, 'protagonist'),
        personality: char.personality || '',
        background: char.background || '',
        relationships: char.relationships || '',
        appearance: char.appearance || '',
        distinctiveFeatures: char.distinctiveFeatures || '',
        occupation: char.occupation || '',
        motivation: char.motivation || '',
        strengths: char.strengths || '',
        weaknesses: char.weaknesses || '',
        characterArc: char.characterArc || ''
      };
      chars.push(completeChar);
    }
    return chars;
  };

  const generateCharacters = async () => {
    if (!activeInspiration.summary?.trim()) {
      dialogService.alert(t('noInspiration'));
      return;
    }
    if (!isModelUsable(activeModel)) {
      dialogService.alert(t('steps:common.noModel'));
      return;
    }
    
    setLoading(true);

    let finalPrompt = (activePrompt?.content || '').replace('{title}', activeInspiration.title).replace('{intro}', activeInspiration.summary);
    
    // Inject Knowledge
    if (selectedKnowledgeIds.size > 0 && project.knowledge) {
       const kContent = project.knowledge
         .filter(k => selectedKnowledgeIds.has(k.id))
         .map(k => `【参考资料：${k.name}】\n${k.content.substring(0, KNOWLEDGE_SNIPPET_TRUNCATE)}`)
         .join('\n\n');
       if (kContent) finalPrompt += `\n\n### 必须参考的世界观/设定资料 (Knowledge Base)\n请务必参考以下设定资料来构建角色（如种族、职业、阵营等）：\n${kContent}`;
    }

    try {
      // 使用传统调用
      const result = await AIService.call(activeModel, finalPrompt);
      if (result.error) {
        dialogService.alert(t('generateFailed', { error: result.error }));
        return;
      }
      
      // 保存传统输出模式的token信息
      if (result.tokens) {
        setTraditionalTokens(result.tokens);
      } else {
        setTraditionalTokens({ prompt: 0, completion: 0, total: 0 });
      }
      
      const newCharacters = parseCharactersFromText(result.content);
      if (newCharacters.length > 0) {
        // 创建AI历史记录
        const historyRecord = AIService.buildHistoryRecordData(
          'characters-virtual-chapter', // 虚拟章节ID
          finalPrompt,
          result.content,
          activeModel,
          result,
          {
            templateName: activePrompt ? templateDisplayName(activePrompt) : t('defaultTemplateName'),
            batchGeneration: false,
            chapterTitle: t('chapterTitle')
          }
        );

        // 将历史记录添加到虚拟章节
        const updatedVirtualChapters = project.virtualChapters || [];
        const charactersChapter = updatedVirtualChapters.find(c => c.id === 'characters-virtual-chapter') || {
          id: 'characters-virtual-chapter',
          title: t('chapterTitle'),
          summary: t('historySummary'),
          content: '',
          order: VIRTUAL_CHAPTER_ORDER, // 特殊顺序，使其不在章节列表中显示
          history: []
        };
        
        const existingHistory = charactersChapter.history || [];
        const updatedCharactersChapter = {
          ...charactersChapter,
          history: [...existingHistory, historyRecord]
        };
        
        // 更新虚拟章节列表
        const finalVirtualChapters = updatedVirtualChapters.filter(c => c.id !== 'characters-virtual-chapter');
        finalVirtualChapters.unshift(updatedCharactersChapter);
        
        onUpdate({
          characters: [...(project.characters || []), ...newCharacters],
          virtualChapters: finalVirtualChapters
        }, { agentId: 'ai:characters', cause: selectedPromptId });
      } else {
        dialogService.alert(t('parseFailed'));
      }
    } catch (err) {
      logger.error(err);
      dialogService.alert(t('generateErrorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    onUpdate({ characters: (project.characters || []).map(c => c.id === id ? { ...c, ...updates } : c) });
  };

  const handleOpenModal = (characterId: string) => {
    setModalCharacterId(characterId);
  };

  const handleCloseModal = () => {
    setModalCharacterId(null);
  };

  const handleModalUpdate = (characterId: string, updates: Partial<Character>) => {
    updateCharacter(characterId, updates);
  };

  const modalCharacter = modalCharacterId 
    ? (project.characters || []).find(c => c.id === modalCharacterId)
    : null;

  // 1. 坚如磐石的清空逻辑：不依赖系统弹窗，使用按钮状态切换
  const handleClearClick = () => {
    if (clearConfirm) {
      onUpdate({ characters: [] });
      setClearConfirm(false);
    } else {
      setClearConfirm(true);
    }
  };

  // 2. 坚如磐石的删除逻辑：不依赖系统弹窗，使用按钮状态切换
  const handleDeleteClick = (id: string) => {
    if (deleteConfirmId === id) {
      const currentList = project.characters || [];
      const newList = currentList.filter(c => c.id !== id);
      onUpdate({ characters: newList });
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
    }
  };

  const toggleKnowledge = (id: string) => {
     const newSet = new Set(selectedKnowledgeIds);
     if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
     setSelectedKnowledgeIds(newSet);
  };

  const selectAllKnowledge = () => {
     const allIds = (project.knowledge || [])
       .filter(k => k.category === 'character')
       .map(k => k.id);
     setSelectedKnowledgeIds(new Set(allIds));
  };

  const clearAllKnowledge = () => {
     setSelectedKnowledgeIds(new Set());
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden p-8">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-12">

        {/* 左侧：世界观与策略 */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-1 pb-4 lg:col-span-4">
          <Card className="p-5">
            <header className="mb-4 flex items-start justify-between">
              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('strategy.title')}</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('strategy.subtitle')}</p>
              </div>
              <Button variant="ghost" size="icon" className="size-7" onClick={onOpenSettings}>
                <Settings className="size-4" />
              </Button>
            </header>

            <div className="space-y-3">
              <div>
                <span className="mb-1 block text-2xs uppercase tracking-wider text-muted-foreground">{t('strategy.templateLabel')}</span>
                <Select value={selectedPromptId} onChange={(e) => setSelectedPromptId(e.target.value)}>
                  {characterPrompts.map(p => <option key={p.id} value={p.id}>{templateDisplayName(p)}</option>)}
                </Select>
              </div>

              {/* 生成按钮（无模型时禁用，手写不受影响） */}
              <Button className="w-full" onClick={generateCharacters} disabled={loading || !isModelUsable(activeModel)} title={!isModelUsable(activeModel) ? t('steps:common.noModel') : undefined}>
                {loading ? <Spinner className="size-4" /> : <WandSparkles className="size-4" />}
                <span>{loading ? t('generating') : t('generateBtn')}</span>
              </Button>
              {!activeInspiration.summary?.trim() && onGoSection && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => onGoSection('inspiration')}>
                  {t('goInspiration')}
                </Button>
              )}

              {/* Token消耗显示 */}
              {traditionalTokens.total > 0 && (
                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <div className="flex items-center justify-between text-center">
                    <div>
                      <div className="text-2xs uppercase tracking-wider text-muted-foreground">{t('tokens.input')}</div>
                      <div className="text-sm font-medium tabular-nums">{traditionalTokens.prompt}</div>
                    </div>
                    <div>
                      <div className="text-2xs uppercase tracking-wider text-muted-foreground">{t('tokens.output')}</div>
                      <div className="text-sm font-medium tabular-nums">{traditionalTokens.completion}</div>
                    </div>
                    <div>
                      <div className="text-2xs uppercase tracking-wider text-muted-foreground">{t('tokens.total')}</div>
                      <div className="text-sm font-medium tabular-nums">{traditionalTokens.total}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-success" />
                    {t('tokens.done')}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 世界蓝本选择 */}
          <Card className="p-5">
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('blueprint.title')}</h4>
            <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
              {inspirationOptions.map((opt, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={cn(
                    'cursor-pointer rounded-md border p-2.5 transition-colors',
                    selectedIndex === idx ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted'
                  )}
                >
                  <h5 className={cn('truncate text-xs', selectedIndex === idx ? 'font-medium text-foreground' : 'text-muted-foreground')}>{idx + 1}. {opt.title}</h5>
                </div>
              ))}
            </div>
          </Card>

          {/* Knowledge Base Selection Card */}
          <Card className="p-5">
             <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('knowledge.title')}</h4>
                {(project.knowledge || []).filter(k => k.category === 'character').length > 0 && (
                   <div className="flex gap-1">
                      <Button
                         variant="ghost"
                         size="sm"
                         className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                         onClick={selectAllKnowledge}
                         title={t('knowledge.selectAllTitle')}
                      >
                         <CheckCheck className="size-3" /> {t('knowledge.selectAll')}
                      </Button>
                      <Button
                         variant="ghost"
                         size="sm"
                         className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                         onClick={clearAllKnowledge}
                         title={t('knowledge.clearTitle')}
                      >
                         <XCircle className="size-3" /> {t('knowledge.clear')}
                      </Button>
                   </div>
                )}
             </div>
             <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {(project.knowledge || []).filter(k => k.category === 'character').length === 0 ? <p className="text-xs italic text-muted-foreground">{t('knowledge.noMaterial')}</p> :
                  project.knowledge.filter(k => k.category === 'character').map(k => (
                     <div
                        key={k.id}
                        onClick={() => toggleKnowledge(k.id)}
                        className={cn(
                          'flex cursor-pointer items-center gap-2.5 rounded-md border p-2.5 transition-colors',
                          selectedKnowledgeIds.has(k.id) ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted'
                        )}
                     >
                        <span className={cn(
                          'flex size-3.5 shrink-0 items-center justify-center rounded border',
                          selectedKnowledgeIds.has(k.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
                        )}>
                           {selectedKnowledgeIds.has(k.id) && <Check className="size-2.5" />}
                        </span>
                        <span className={cn('truncate text-xs', selectedKnowledgeIds.has(k.id) ? 'font-medium text-foreground' : 'text-muted-foreground')}>{k.name}</span>
                     </div>
                  ))
                }
             </div>
          </Card>

          <Button variant="outline" className="w-full" onClick={() => setShowDiagram(true)}>
            <Network className="size-4" /> {t('openDiagram')}
          </Button>
        </div>

        {/* 右侧：角色档案列表 */}
        <div className="flex min-h-0 flex-col overflow-hidden lg:col-span-8">
          <Card className="flex h-full flex-col overflow-hidden rounded-lg">
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
            <div className="flex min-w-0 items-baseline gap-2.5">
              <h3 className="truncate font-serif text-base font-medium tracking-tight">{t('archive.title')}</h3>
              <span className="shrink-0 text-xs text-muted-foreground">{t('archive.total', { n: project.characters?.length || 0 })}</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={clearConfirm ? 'destructive' : 'outline'}
                size="sm"
                onClick={handleClearClick}
                disabled={(project.characters || []).length === 0}
              >
                {clearConfirm ? <AlertCircle className="size-3.5" /> : <Trash2 className="size-3.5" />}
                {clearConfirm ? t('archive.clearConfirm') : t('archive.clear')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => onUpdate({
                  characters: [...(project.characters || []), {
                    id: Date.now().toString(),
                    name: t('archive.defaultName'),
                    gender: 'unknown' as const,
                    age: '未知',
                    role: 'protagonist' as const,
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
                  }]
                })}
              >
                <Plus className="size-3.5" /> {t('archive.addManually')}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {(project.characters || []).length === 0 ? (
              <EmptyState
                className="h-full"
                icon={UserRound}
                title={t('archive.emptyTitle')}
                description={t('archive.emptyHint')}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {(project.characters || []).map((char) => (
                  <div key={char.id} className="group relative">
                    <CompactCharacterCard
                      character={char}
                      onClick={() => handleOpenModal(char.id)}
                    />
                    {/* 删除按钮 - 悬浮在卡片右上角 */}
                    <Button
                      variant={deleteConfirmId === char.id ? 'destructive' : 'ghost'}
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(char.id);
                      }}
                      className={cn(
                        'absolute right-3 top-3 z-10 h-8',
                        deleteConfirmId === char.id
                          ? 'w-20 text-xs font-medium'
                          : 'w-8 bg-card/80 text-muted-foreground opacity-0 backdrop-blur-sm hover:text-destructive group-hover:opacity-100'
                      )}
                    >
                      {deleteConfirmId === char.id ? (
                        <span className="animate-pulse">{t('archive.deleteConfirm')}</span>
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          </Card>
        </div>
      </div>

      {showDiagram && <RelationshipDiagram characters={project.characters || []} onClose={() => setShowDiagram(false)} />}
      
      {modalCharacter && (
        <CharacterModal
          character={modalCharacter}
          project={project}
          isOpen={!!modalCharacterId}
          onClose={handleCloseModal}
          onUpdate={(updates) => handleModalUpdate(modalCharacter.id, updates)}
        />
      )}
    </div>
  );
};

export default StepCharacters;

