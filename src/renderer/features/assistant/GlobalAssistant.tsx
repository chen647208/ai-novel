/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { logger } from '@/shared/utils/logger';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type KnowledgeItem, type OutputMode, type AIMessageImage, type Character, type Location, type Faction, type RuleSystem, type TimelineEvent, type AICardCommand, type CreatedCard, type Timeline, type WorldView, type MagicSystem, type TechnologyLevel, type WorldHistory, type CardPromptTemplate, type ModelConfig, type Project } from '../../../shared/types';
import { useProjectStore } from '@/app/stores/projectStore';
import { ATTACHMENT_TRUNCATE } from '../../../shared/constants/chapters';
import { SUMMARY_MAX_CHARS } from '../../../shared/constants/chat';
import { collectChatAttachments } from './services/chatAttachments';
import { needsCompaction, splitForCompaction, type ChatTurn } from './services/chatHistory';
import { type GlobalAssistantProps, type ChatMessage, type AssistantCategory, type AssistantEditCategory, type SyncStatus, type EditingData } from './types';
import { type LooseRecord, asRecord, asStr } from '../../shared/utils/loose';
import { isModelUsable } from '@/shared/utils/modelReadiness';
import { AIService } from '@/shared/services/ai/aiService';
import { approvalBroker, sessionManager } from './services/aiRuntime';
import { indexService } from '@core/index';
import { AICardCreationService } from '../cards/services/aiCardCreationService';
import { normalizeGenderId, normalizeRoleId, type CharacterDraft, type CharacterDraftField } from '@/shared/utils/characterKinds';
import { AICardCommandService } from '../cards/services/aiCardCommandService';
import { genderLabel, roleLabel } from '@/shared/utils/displayLabels';
import { getDefaultCardPrompts } from '../cards/services/cardPromptService';
import AssistantContextPanel from './components/AssistantContextPanel';
import AssistantEditPanel from './components/AssistantEditPanel';
import AssistantChatWorkspace from './components/AssistantChatWorkspace';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/utils/cn';
import { dialogService } from '@/shared/services/dialogService';
import { useSettingsStore } from '../../app/stores/settingsStore';
import { BookOpenText, Bot, CircleStop, ListChecks, PenLine, RotateCcw, Trash2, X } from 'lucide-react';
import { uuidv7 } from '@core/entities';

const GlobalAssistant: React.FC<GlobalAssistantProps> = ({ models, activeModelId, project, prompts, onUpdate, width = 380, onClose, onWidthChange }) => {
  const { t, i18n } = useTranslation('assistant');
  const resizeRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // 计划模式：只出计划不执行（codex /plan 同语义，指令级；批准=下一条发送执行）
  const [planMode, setPlanMode] = useState(false);
  const [pendingImages, setPendingImages] = useState<Array<{ id: string; name: string; mime: string; dataUrl: string }>>([]);
  // 本轮工具调用链（codex 式内联折叠，免跳事件浏览器）
  const [lastToolChain, setLastToolChain] = useState<Array<{ toolId: string; ok: boolean }>>([]);
  // 会话记忆（docs/design/11）：超长压缩后的摘要存这里，后续发送拼在历史最前
  const [historySummary, setHistorySummary] = useState('');
  const lastUserText = useRef('');
  const firstEnabledModel = models.find((m) => m.isEnabled !== false) ?? models[0];
  const updateActiveProject = useProjectStore((s) => s.updateActiveProject);
  // AI 产物归因：助手生成的卡片/角色标注来源，用户手改走 onUpdate 默认 user
  const commitAICard = (updates: Partial<Project>) =>
    updateActiveProject(updates, { agentId: 'ai:assistant' });
  // 单源：助手内切换直接写回 settingsStore，不再私设分叉状态。外部 activeModelId 变化时跟随。
  const [currentModelId, setCurrentModelId] = useState<string>(activeModelId || firstEnabledModel?.id || '');
  useEffect(() => {
    if (activeModelId) setCurrentModelId(activeModelId);
  }, [activeModelId]);
  const handleModelChange = (id: string) => {
    setCurrentModelId(id);
    useSettingsStore.getState().setActiveModelId(id);
  };
  // 单源可用模型：三处 AI 入口共用，isEnabled 过滤一致（须在 currentModelId 声明之后）
  const usableModel = models.find((m) => m.id === currentModelId && m.isEnabled !== false)
    ?? models.find((m) => m.isEnabled !== false)
    ?? models[0];
  // 可用 = 已启用 && 已配好凭证：默认模型未填 Key 时按钮禁用，与全屏拦截同口径
  const hasModel = isModelUsable(usableModel);
  const [pendingFiles, setPendingFiles] = useState<KnowledgeItem[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [outputMode, setOutputMode] = useState<OutputMode>('streaming');

  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<AssistantCategory>('inspiration');
  const [subSelectionId, setSubSelectionId] = useState<string>('all');
  const [analysisPromptId, setAnalysisPromptId] = useState<string>('');

  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<AssistantEditCategory>('inspiration');
  const [editingData, setEditingData] = useState<EditingData>({});
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [characterGenerationPrompt, setCharacterGenerationPrompt] = useState<string>('');
  const [isGeneratingCharacter, setIsGeneratingCharacter] = useState(false);

  const [cardPromptTemplates, setCardPromptTemplates] = useState<CardPromptTemplate[]>([]);
  const [selectedCardTemplateId, setSelectedCardTemplateId] = useState<string | null>(null);

  useEffect(() => {
    const defaultTemplates = getDefaultCardPrompts();
    setCardPromptTemplates(defaultTemplates);
  }, []);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, contextPanelOpen]);

  const getContextContent = useMemo(() => {
    if (!project) return "当前未打开任何项目。";
    
    switch (activeCategory) {
      case 'inspiration':
        return `【书名】\n${project.title}\n\n【原始灵感】\n${project.inspiration || '无'}\n\n【简介方案】\n${project.intro || '无'}`;
      
      case 'knowledge': {
        if (subSelectionId === 'all') {
           return (project.knowledge || []).map(k => `- ${k.name} (${k.type})`).join('\n');
        }
        const kItem = project.knowledge?.find(k => k.id === subSelectionId);
        return kItem ? `【资料：${kItem.name}】\n${kItem.content}` : '';
      }

      case 'characters':
        if ((project.characters || []).length === 0) return '';
        return (project.characters || []).map(c =>
          `角色名：${c.name || '未命名'}\n` +
          `性别：${genderLabel(c.gender)}\n` +
          `年龄：${c.age || '未知'}\n` +
          `角色类型：${roleLabel(c.role)}\n` +
          `性格：${c.personality || '暂无描述'}\n` +
          `背景：${c.background || '暂无背景'}\n` +
          `关系：${c.relationships || '暂无关系'}\n` +
          `外观：${c.appearance || '暂无描述'}\n` +
          `标志性特征：${c.distinctiveFeatures || '暂无特征'}\n` +
          `职业：${c.occupation || '暂无'}\n` +
          `动机：${c.motivation || '暂无'}\n` +
          `优势：${c.strengths || '暂无'}\n` +
          `弱点：${c.weaknesses || '暂无'}\n` +
          `成长弧线：${c.characterArc || '暂无'}`
        ).join('\n\n----------------\n\n');
      
      case 'outline':
        return project.outline || '';

      case 'chapters': {
        if (subSelectionId === 'all') {
           return [...(project.chapters || [])].sort((a, b) => a.order - b.order)
             .map(c => `第${c.order + 1}章：${c.title}`).join('\n');
        }
        const chap = project.chapters?.find(c => c.id === subSelectionId);
        return chap ? `【第${chap.order + 1}章：${chap.title}】\n\n细纲：\n${chap.summary}` : '';
      }
        
      default:
        return "";
    }
  }, [project, activeCategory, subSelectionId]);

  useEffect(() => {
    const relevant = prompts.find(p => {
       if (activeCategory === 'inspiration') return p.category === 'inspiration';
       if (activeCategory === 'characters') return p.category === 'character';
       if (activeCategory === 'outline') return p.category === 'outline';
       if (activeCategory === 'chapters') return p.category === 'chapter';
       return p.category === 'edit';
    });
    setAnalysisPromptId(relevant?.id || prompts[0]?.id || '');
  }, [activeCategory, prompts]);

  /**
   * 组装本轮携带的历史：报错消息剔除（噪声）→ 摘要置顶 → 旧轮在前。
   * 超阈值时先调模型压缩最旧一半；压缩失败降级为硬截断，不断流。
   */
  const buildHistoryTurns = async (model: ModelConfig): Promise<ChatTurn[]> => {
    const turns: ChatTurn[] = [];
    if (historySummary.trim()) {
      turns.push({ role: 'assistant', content: `[此前对话摘要]${historySummary.trim()}` });
    }
    for (const m of messages) {
      if (m.error || !m.content?.trim()) continue;
      turns.push({ role: m.role, content: m.content });
    }
    const raw = turns.map((t) => t.content).join('\n');
    if (!needsCompaction(raw) || turns.length === 0) return turns;
    const { old, recent } = splitForCompaction(turns);
    try {
      const prompt = i18n.language.startsWith('en')
        ? `Summarize the following earlier conversation in under 400 words: topics discussed, confirmed facts (names/settings/decisions), open questions. Summary only, no pleasantries.\n\n${old.map((t) => `${t.role}: ${t.content}`).join('\n')}`
        : `把以下此前对话压缩成400字以内摘要：谈了哪几个话题、已确认的关键事实（人名/设定/决定）、未解决的问题。只要摘要，不要寒暄。\n\n${old.map((t) => `${t.role}: ${t.content}`).join('\n')}`;
      const res = await AIService.call(model, prompt);
      const summary = (res.content ?? '').trim().slice(0, SUMMARY_MAX_CHARS);
      if (summary) {
        setHistorySummary(summary);
        return [{ role: 'assistant', content: `[此前对话摘要]${summary}` }, ...recent];
      }
    } catch {
      // 摘要失败走降级：buildHistoryText 的三档截断兜底
    }
    return turns;
  };

  const handleRetry = () => {
    // 重新生成：旧答案保留在历史流，按上轮原文重跑（与发送键同口径守卫）
    if (isLoading || !lastUserText.current.trim() || !hasModel) return;
    sendMessageInternal(lastUserText.current, []);
  };

  const sendMessageInternal = async (text: string, attachments: KnowledgeItem[], images: AIMessageImage[] = []) => {
    if (project && AICardCommandService.isValidCommand(text)) {
      setIsLoading(true);
      
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, userMsg]);
      
      const activeModel = usableModel;

      if (!isModelUsable(activeModel)) {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: t('chat.modelMissing'),
          timestamp: Date.now(),
          error: t('chat.modelMissingError'),
        };
        setMessages(prev => [...prev, errorMsg]);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('chat.unknownCommand', { text }),
        timestamp: Date.now(),
        error: t('chat.creationFailed'),
      }]);
      setIsLoading(false);
      return;
    }
      
      const selectedTemplate = selectedCardTemplateId
        ? cardPromptTemplates.find(tpl => tpl.id === selectedCardTemplateId)
        : undefined;
      
      const result = await AICardCreationService.processInput(text, project, activeModel, selectedTemplate);
      
      if (result) {
        if (result.success && result.data) {
          // 斜杠建卡同样走审批：先弹框确认，批准后落库（与 Agent 工具同标准）
          const decision = await approvalBroker.request({
            callId: `cmd_${Date.now().toString(36)}`,
            toolId: 'core.card.generate',
            permission: 'write:proposal',
            proposal: {
              title: result.message,
              summary: t('chat.cardApprovalHint'),
              suggestion: JSON.stringify(result.data, null, 2)?.slice(0, 2000),
            },
          });
          const applied = decision.verdict === 'approved';
          if (applied) {
            addCardToProject(result.command, result.data);
          }

          const systemMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: applied
              ? result.message
              : decision.verdict === 'rejected'
                ? t('chat.cardRejected')
                : t('chat.cardDeferred'),
            timestamp: Date.now(),
            error: applied ? undefined : t('chat.creationPending'),
          };
          setMessages(prev => [...prev, systemMsg]);
        } else {
          const errorMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.message,
            timestamp: Date.now(),
            error: t('chat.creationFailed'),
          };
          setMessages(prev => [...prev, errorMsg]);
        }
        setIsLoading(false);
        return; // 跳过正常的AI对话流程
      }
      
      setIsLoading(false);
      return;
    }
    
    // ── Agent 循环：装配 → 网关 → 工具（三档审批）→ 答复 ──
    setIsLoading(true);
    lastUserText.current = text;

    const activeModel = usableModel;
    if (!isModelUsable(activeModel)) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('chat.modelMissing'),
        timestamp: Date.now(),
        error: t('chat.modelMissingError'),
      }]);
      setIsLoading(false);
      return;
    }

    // 用户消息进历史流（Agent 分支此前漏推，聊天区只见答复不见问）
    // 图片名取 state（调用时刻即最新；重试路径图片已清空，不会误标）
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user' as const,
      content: attachments.length > 0 || pendingImages.length > 0
        ? `${text}\n${[...attachments.map((f) => `[附件：${f.name}]`), ...pendingImages.map((f) => `[图片：${f.name}]`)].join(' ')}`
        : text,
      timestamp: Date.now(),
    }]);

    const controller = new AbortController();
    streamAbortRef.current = controller;
    // Agent 整轮可停止：停止键靠该 id 显示，中止经 signal 传入循环
    setStreamingMessageId('agent');
    setLastToolChain([]);

    let taskText = text;
    if (planMode) {
      taskText = i18n.language.startsWith('en')
        ? `【PLAN MODE】Output ONLY a numbered execution plan (steps, tools involved, risks). Do NOT call any tools or execute. Wait for user confirmation.\n\n${text}`
        : `【计划模式】只输出执行计划（编号步骤清单，含涉及的工具与风险点），不要调用任何工具，不要执行。等用户确认后再行动。\n\n${text}`;
    }
    if (attachments && attachments.length > 0) {
      const fileContent = attachments.map(f => `[参考内容: ${f.name}]\n${f.content.substring(0, ATTACHMENT_TRUNCATE)}... (内容过长已截断)`).join('\n\n');
      taskText += `\n\n### 附带参考资料:\n${fileContent}`;
    }

    // 会话记忆：本次发送前已落盘的消息（不含刚推入的本轮） + 摘要
    const history = await buildHistoryTurns(activeModel);

    const result = await sessionManager.run({
      bookId: project?.id,
      task: taskText,
      project,
      index: (project && indexService.snapshot(project.id)) || undefined,
      model: activeModel,
      history,
      images,
      cardTemplate: selectedCardTemplateId
        ? cardPromptTemplates.find((tpl) => tpl.id === selectedCardTemplateId)
        : undefined,
      signal: controller.signal,
    });

    streamAbortRef.current = null;
    setStreamingMessageId(null);
    // 本轮工具链快照：callId 关联调用与结果，供聊天区折叠展示
    try {
      const names = new Map<string, string>();
      const results = new Map<string, boolean>();
      for (const e of sessionManager.getEvents()) {
        if (e.t === 'tool.call' && typeof e.callId === 'string' && typeof e.toolId === 'string') {
          names.set(e.callId, e.toolId);
          if (!results.has(e.callId)) results.set(e.callId, true);
        } else if (e.t === 'tool.result' && typeof e.callId === 'string') {
          results.set(e.callId, e.ok !== false);
        }
      }
      setLastToolChain([...results].map(([callId, ok]) => ({ toolId: names.get(callId) ?? callId, ok })));
    } catch {
      // 事件读取失败不影响主流程
    }
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'assistant' as const,
      content: result.ok ? result.reply : (result.error ?? t('chat.callFailedContent')),
      timestamp: Date.now(),
      error: result.ok ? undefined : t('chat.callFailed'),
    }]);
    setIsLoading(false);
  };

  const handleSendMessage = () => {
    if ((!input.trim() && pendingFiles.length === 0 && pendingImages.length === 0) || isLoading) return;
    sendMessageInternal(input, [...pendingFiles], pendingImages.map(({ mime, dataUrl }) => ({ mime, dataUrl })));
    setInput('');
    setPendingFiles([]);
    setPendingImages([]);
    // 卡片模板只跟随选定的那一次发送，下次普通问答不再携带
    setSelectedCardTemplateId(null);
  };

  const handleStopStreaming = () => {
    // 先真正中止底层请求，再复位 UI 状态
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    if (streamingMessageId) {
      setMessages(prev => prev.map(msg => {
        if (msg.id === streamingMessageId) {
          return {
            ...msg,
            isStreaming: false
          };
        }
        return msg;
      }));
      setStreamingMessageId(null);
      setIsLoading(false);
    }
  };

  const handleContextAnalyze = () => {
     if (!project) return;
     if (!hasModel) {
       dialogService.alert(t('dialog.noModel'));
       return;
     }
     const content = getContextContent;
     // 空上下文不发送（该分区暂无内容时保持静默，由空态引导用户先填）
     if (!content.trim()) return;
     const promptTemplate = prompts.find(p => p.id === analysisPromptId);
     const instruction = promptTemplate ? promptTemplate.content : "请分析以下内容";
     
     // 附件归类跟随当前分析分区（知识库无独立归类，回落 writing；原硬编码全标 writing）
     const attachmentCategory = activeCategory === 'inspiration' ? 'inspiration'
       : activeCategory === 'characters' ? 'character'
       : activeCategory === 'outline' ? 'outline'
       : activeCategory === 'chapters' ? 'chapter'
       : 'writing' as const;
     const attachment: KnowledgeItem = {
        id: 'ctx-' + Date.now(),
        name: t('chat.contextAttachmentName', { category: activeCategory }),
        content: content,
        type: 'context',
        size: content.length,
        addedAt: Date.now(),
        category: attachmentCategory
     };
     
     let finalInstruction = instruction;
     if (promptTemplate) {
        finalInstruction = instruction
          .replace('{inspiration}', project.inspiration)
          .replace('{title}', project.title)
          .replace('{intro}', project.intro)
          .replace('{content}', "（见附件资料）"); // 提示 AI 查看附件
     }

     setContextPanelOpen(false);
     sendMessageInternal(finalInstruction, [attachment]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const { images, items } = await collectChatAttachments(Array.from(e.target.files), {
      visionAvailable: usableModel?.supportsVision !== false,
      readDataUrl: (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ''));
          reader.onerror = () => reject(new Error('read failed'));
          reader.readAsDataURL(file);
        }),
      readText: (file) => file.text(),
      extractPdfText: window.electronAPI?.extractPdfText
        ? (base64) => window.electronAPI!.extractPdfText(base64)
        : undefined,
      alert: (key, params) => dialogService.alert(t(key as never, params as never) as unknown as string),
      logError: (message, name, error) => logger.error(message, name, error),
      now: () => Date.now(),
      makeId: (prefix, index) => `${prefix}-${Date.now()}-${index}`,
    });
    if (images.length > 0) setPendingImages((prev) => [...prev, ...images]);
    if (items.length > 0) setPendingFiles((prev) => [...prev, ...items]);
    e.target.value = '';
  };

  const addCardToProject = (command: AICardCommand, data: CreatedCard) => {
    if (!project || !onUpdate) return;
    
    switch (command) {
      case 'character':
        commitAICard({
          characters: [...(project.characters || []), data as Character]
        });
        break;
      case 'location':
        commitAICard({
          locations: [...(project.locations || []), data as Location]
        });
        break;
      case 'faction':
        commitAICard({
          factions: [...(project.factions || []), data as Faction]
        });
        break;
      case 'timeline':
      case 'event':
        commitAICard({
          timeline: {
            ...(project.timeline || { id: uuidv7(), projectId: project.id, config: { calendarSystem: 'default' }, events: [], createdAt: Date.now(), updatedAt: Date.now() }),
            events: [...(project.timeline?.events || []), data as TimelineEvent]
          } as Timeline
        });
        break;
      case 'rule':
        commitAICard({
          ruleSystems: [...(project.ruleSystems || []), data as RuleSystem]
        });
        break;
      case 'magic':
        commitAICard({
          worldView: {
            ...(project.worldView || { id: uuidv7(), projectId: project.id, createdAt: Date.now(), updatedAt: Date.now() }),
            magicSystem: data as MagicSystem
          } as WorldView
        });
        break;
      case 'tech':
        commitAICard({
          worldView: {
            ...(project.worldView || { id: uuidv7(), projectId: project.id, createdAt: Date.now(), updatedAt: Date.now() }),
            technologyLevel: data as TechnologyLevel
          } as WorldView
        });
        break;
      case 'history':
        commitAICard({
          worldView: {
            ...(project.worldView || { id: uuidv7(), projectId: project.id, createdAt: Date.now(), updatedAt: Date.now() }),
            history: data as WorldHistory
          } as WorldView
        });
        break;
      default:
        // 未知命令无落库目标：记日志并让调用方感知，避免"审批通过却无事发生"的假闭环
        logger.warn('addCardToProject: 未知卡片命令', command);
        // as string：模板字面量类型会干扰 i18next 插值参数推断， widen 后再传
        dialogService.alert(t('chat.unknownCommand', { text: `/${command}` as string }));
        break;
    }
  };

  const handleOpenEditPanel = (category: AssistantEditCategory) => {
    setEditCategory(category);
    setEditPanelOpen(true);
    // 打开瞬间快照：保存时比对，面板外并发修改先确认再覆盖，防静默丢数据
    editSnapshotRef.current = project ? JSON.stringify(project) : null;
    
    if (project) {
      switch (category) {
        case 'inspiration':
          setEditingData({ inspiration: project.inspiration, intro: project.intro });
          break;
        case 'knowledge':
          setEditingData({ knowledge: [...(project.knowledge || [])] });
          break;
        case 'characters':
          setEditingData({ characters: [...project.characters] });
          break;
        case 'outline':
          setEditingData({ outline: project.outline });
          break;
        case 'chapters':
          setEditingData({ chapters: [...project.chapters] });
          break;
        case 'content':
          setEditingData({ chapters: [...(project.chapters || [])] });
          break;
      }
    }
  };

  const syncResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editSnapshotRef = useRef<string | null>(null);
  useEffect(() => () => {
    if (syncResetTimer.current) clearTimeout(syncResetTimer.current);
  }, []);

  const handleSaveEdit = () => {
    if (Object.keys(editingData).length === 0 || !onUpdate) return;
    
    setSyncStatus('saving');
    try {
      // 并发保护：只比对本次回写的字段；面板打开后这些字段在外被改过，先确认再覆盖
      void (async () => {
        const snap = editSnapshotRef.current ? (JSON.parse(editSnapshotRef.current) as Partial<Project>) : null;
        const conflicted = snap && project
          ? (Object.keys(editingData) as Array<keyof Project>).filter(
              (k) => JSON.stringify(snap[k]) !== JSON.stringify(project[k]),
            )
          : [];
        if (conflicted.length > 0) {
          const ok = await dialogService.confirm({
            message: t('edit.concurrentConfirm', { fields: conflicted.join('、') }),
            danger: true,
          });
          if (!ok) {
            setSyncStatus('idle');
            return;
          }
        }
        onUpdate(editingData);
        setSyncStatus('saved');
        setEditingData({});
        editSnapshotRef.current = null;
      })();
      
      if (syncResetTimer.current) clearTimeout(syncResetTimer.current);
      syncResetTimer.current = setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      logger.error('Failed to save data:', error);
      setSyncStatus('error');
    }
  };

  const parseSingleCharacterFromText = (text: string): Character | null => {
    if (!text) return null;
    
    const cleanLines = text.replace(/[*#_]/g, '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
    // 解析草稿：role/gender 先收原始文本，落库前归一化为枚举 id
    let activeChar: CharacterDraft | null = null;
    let currentField: CharacterDraftField | null = null;

    cleanLines.forEach(line => {
      const nameMatch = line.match(/^(?:角色名|姓名|名字|名称|身份)[:：\s]*(.*)/i);
      if (nameMatch && nameMatch[1]?.trim()) {
        if (activeChar && activeChar.name) {
          return;
        }
        activeChar = {
          id: uuidv7(),
          name: nameMatch[1]?.trim() ?? '',
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
        };
        currentField = 'name';
        return;
      }
      if (!activeChar) return;
      
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

      if (!activeChar) return;
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
      const completeChar: Character = {
        id: char.id || uuidv7(),
        name: char.name || '',
        gender: normalizeGenderId(char.gender),
        age: char.age || '未知',
        role: normalizeRoleId(char.role, 'supporting'),
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
      return completeChar;
    }
    return null;
  };

  const handleGenerateCharacter = async () => {
    if (!project || !characterGenerationPrompt.trim()) return;
    
    setIsGeneratingCharacter(true);
    try {
      const activeModel = usableModel;
      if (!isModelUsable(activeModel)) {
        dialogService.alert(t('dialog.noModel'));
        return;
      }
      
      const prompt = `基于以下小说信息生成一个角色设定：
书名：${project.title}
简介：${project.intro}
用户要求：${characterGenerationPrompt}

请生成包含以下字段的完整角色设定：
- 姓名、性别（male/female/other/unknown）、年龄
- 角色定位（protagonist/antagonist/supporting/other）
- 性格特点
- 背景故事
- 外貌特征
- 独特特征
- 职业/身份
- 动机目标
- 优点缺点
- 角色成长弧线

重要要求：
1. 请只返回JSON格式，不要包含任何其他解释性文字
2. JSON必须严格符合格式，使用双引号包裹所有键和字符串值
3. 所有字段都必须提供，即使为空字符串

请以JSON格式返回，包含以下字段：name, gender, age, role, personality, background, appearance, distinctiveFeatures, occupation, motivation, strengths, weaknesses, characterArc`;
      
      const response = await AIService.call(activeModel, prompt);
      
      const extractJSONFromResponse = (text: string): string => {
        if (!text) return text;
        
        try {
          JSON.parse(text);
          return text;
        } catch {
          /* 非纯 JSON，继续尝试提取 */
        }
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return jsonMatch[0];
        }
        
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          return arrayMatch[0];
        }
        
        return text;
      };
      
      let characterData: LooseRecord | null = null;
      let parseError: unknown = null;
      let degradedFromRegex = false;
      let extractedJSON = '';
      
      try {
        const parsed: unknown = JSON.parse(response.content);
        characterData = parsed === null ? null : asRecord(parsed);
      } catch (error1) {
        parseError = error1;
        
        extractedJSON = extractJSONFromResponse(response.content);
        if (extractedJSON !== response.content) {
          try {
            const reparsed: unknown = JSON.parse(extractedJSON);
            characterData = reparsed === null ? null : asRecord(reparsed);
            parseError = null;
          } catch (error2) {
            parseError = error2;
          }
        }
      }
      
      if (!characterData) {
        const parsedCharacter = parseSingleCharacterFromText(response.content);
        if (parsedCharacter) {
          characterData = { ...parsedCharacter };
          parseError = null;
        }
      }
      
      if (!characterData) {
        const nameMatch = response.content.match(/(?:姓名|名字|角色名)[:：\s]*([^\n,，。]+)/i);
        const genderMatch = response.content.match(/(?:性别)[:：\s]*([^\n,，。]+)/i);
        const ageMatch = response.content.match(/(?:年龄)[:：\s]*([^\n,，。]+)/i);
        
        if (nameMatch) {
          // 降级路径：仅姓名可辨，其余字段记空，落库时明确告知用户补全
          degradedFromRegex = true;
          characterData = {
            name: nameMatch[1]?.trim() ?? '',
            gender: genderMatch ? genderMatch[1]?.trim() ?? '' : 'unknown',
            age: ageMatch ? ageMatch[1]?.trim() ?? '' : '未知',
            role: 'supporting',
            personality: '',
            background: '',
            appearance: '',
            distinctiveFeatures: '',
            occupation: '',
            motivation: '',
            strengths: '',
            weaknesses: '',
            characterArc: ''
          };
        }
      }
      
      if (characterData) {
        const newCharacter: Character = {
          id: Date.now().toString(),
          name: asStr(characterData.name, '未命名角色'),
          gender: normalizeGenderId(asStr(characterData.gender)),
          age: asStr(characterData.age, '未知'),
          role: normalizeRoleId(asStr(characterData.role), 'supporting'),
          personality: asStr(characterData.personality, '暂无描述'),
          background: asStr(characterData.background, '暂无背景'),
          relationships: asStr(characterData.relationships),
          appearance: asStr(characterData.appearance, '暂无描述'),
          distinctiveFeatures: asStr(characterData.distinctiveFeatures, '暂无特征'),
          occupation: asStr(characterData.occupation, '暂无'),
          motivation: asStr(characterData.motivation, '暂无'),
          strengths: asStr(characterData.strengths, '暂无'),
          weaknesses: asStr(characterData.weaknesses, '暂无'),
          characterArc: asStr(characterData.characterArc, '暂无')
        };
        
        const updatedCharacters = [...(project.characters || []), newCharacter];
        if (onUpdate) {
          commitAICard({ characters: updatedCharacters });
        }
        
        setCharacterGenerationPrompt('');
        if (degradedFromRegex) {
          const missing = ['personality', 'background', 'appearance', 'occupation', 'motivation']
            .filter((k) => !asStr(characterData[k]).trim());
          dialogService.alert(t('dialog.characterGeneratedPartial', {
            fields: missing.map((k) => t(`edit.charGenField.${k}`, k)).join('、'),
          }));
        } else {
          dialogService.alert(t('dialog.characterGenerated'));
        }
      } else {
        logger.error('Failed to parse character response:', parseError);
        logger.error('Original response:', response.content);
        logger.error('Extracted JSON:', extractedJSON);
        
        dialogService.alert(t('dialog.characterParseFailed', {
          preview: response.content.substring(0, 500),
          ellipsis: response.content.length > 500 ? '...' : '',
        }));
      }
    } catch (error) {
      logger.error('Failed to generate character:', error);
      dialogService.alert(t('dialog.characterGenerateFailed'));
    } finally {
      setIsGeneratingCharacter(false);
    }
  };

  const getChapterContent = (chapterId: string) => {
    if (!project) return '';
    
    if (editingData.chapters && editingData.chapters.length > 0) {
      const editedChapter = editingData.chapters.find(c => c.id === chapterId);
      if (editedChapter && editedChapter.content !== undefined) {
        return editedChapter.content;
      }
    }
    
    const chapter = project.chapters.find(c => c.id === chapterId);
    return chapter?.content || '';
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!onWidthChange) return;
    const startX = e.clientX;
    const startW = width;
    const handleResize = (moveEvent: MouseEvent) => {
      onWidthChange(Math.min(560, Math.max(300, startW + (startX - moveEvent.clientX))));
    };
    const stopResize = () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResize);
    };
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', stopResize);
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-card">
      <div
        ref={resizeRef}
        onMouseDown={handleResizeStart}
        className="absolute inset-y-0 left-0 z-10 w-1 cursor-col-resize transition-colors hover:bg-primary/40"
        title={t('window.resizeSidebarTitle')}
      />
      <div
        className="flex shrink-0 items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5"
      >
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{t('window.title')}</span>
        </div>
        <div className="flex items-center gap-1">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-6 text-muted-foreground hover:text-foreground"
              title={t('window.closeSidebar')}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      <>
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/20 px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <Select
              className="h-7 w-auto max-w-[140px] text-xs"
              aria-label={t('chat.modelSelect')}
              value={usableModel?.id ?? ''}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              {!hasModel && <option value="">{t('model.noModelOption')}</option>}
              {models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}{m.isEnabled === false ? t('model.disabledSuffix') : !isModelUsable(m) ? t('model.unconfiguredSuffix') : ''}
                </option>
              ))}
            </Select>
            <Select
              className="h-7 w-auto max-w-[120px] text-xs"
              aria-label={t('chat.outputModeSelect')}
              value={outputMode}
              onChange={(e) => setOutputMode(e.target.value as OutputMode)}
            >
              <option value="streaming">{t('output.streaming')}</option>
              <option value="traditional">{t('output.traditional')}</option>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditPanelOpen(!editPanelOpen)}
              className={cn('size-7 text-muted-foreground hover:text-foreground', editPanelOpen && 'bg-primary/10 text-primary')}
              title={t('window.editDataTitle')}
            >
              <PenLine className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setContextPanelOpen(!contextPanelOpen)}
              className={cn('size-7 text-muted-foreground hover:text-foreground', contextPanelOpen && 'bg-primary/10 text-primary')}
              title={t('window.contextTitle')}
            >
              <BookOpenText className="size-4" />
            </Button>
            {streamingMessageId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleStopStreaming}
                className="size-7 text-destructive hover:text-destructive"
                title={t('window.stopStreamTitle')}
              >
                <CircleStop className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPlanMode((v) => !v)}
              className={cn('size-7 text-muted-foreground hover:text-foreground', planMode && 'bg-primary/10 text-primary')}
              title={t('window.planModeTitle')}
            >
              <ListChecks className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRetry}
              disabled={isLoading || !hasModel || !lastUserText.current.trim()}
              className="size-7 text-muted-foreground hover:text-foreground disabled:opacity-40"
              title={t('chat.retryTitle')}
            >
              <RotateCcw className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setMessages([]); setHistorySummary(''); lastUserText.current = ''; }}
              className="size-7 text-muted-foreground hover:text-destructive"
              title={t('window.clearChatTitle')}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

          {editPanelOpen && (
            <AssistantEditPanel
              project={project}
              editCategory={editCategory}
              editingData={editingData}
              syncStatus={syncStatus}
              characterGenerationPrompt={characterGenerationPrompt}
              isGeneratingCharacter={isGeneratingCharacter}
              hasModel={hasModel}
              setEditingData={setEditingData}
              setEditCategory={setEditCategory}
              setSyncStatus={setSyncStatus}
              setEditPanelOpen={setEditPanelOpen}
              setCharacterGenerationPrompt={setCharacterGenerationPrompt}
              handleOpenEditPanel={handleOpenEditPanel}
              handleSaveEdit={handleSaveEdit}
              handleGenerateCharacter={handleGenerateCharacter}
              getChapterContent={getChapterContent}
            />
          )}

          {contextPanelOpen && (
            <AssistantContextPanel
              project={project}
              activeCategory={activeCategory}
              subSelectionId={subSelectionId}
              analysisPromptId={analysisPromptId}
              prompts={prompts}
              contextContent={getContextContent}
              isLoading={isLoading}
              hasModel={hasModel}
              onCategoryChange={setActiveCategory}
              onSubSelectionChange={setSubSelectionId}
              onPromptChange={setAnalysisPromptId}
              onAnalyze={handleContextAnalyze}
            />
          )}

          <AssistantChatWorkspace
            chatContainerRef={chatContainerRef}
            contextPanelOpen={contextPanelOpen}
            editPanelOpen={editPanelOpen}
            messages={messages}
            isLoading={isLoading}
            streamingMessageId={streamingMessageId}
            pendingFiles={pendingFiles}
            setPendingFiles={setPendingFiles}
            pendingImages={pendingImages}
            setPendingImages={setPendingImages}
            input={input}
            setInput={setInput}
            hasModel={hasModel}
            handleSendMessage={handleSendMessage}
            onStopGeneration={handleStopStreaming}
            onDeleteMessage={(id) => setMessages((prev) => prev.filter((m) => m.id !== id))}
            lastToolChain={lastToolChain}
            handleFileUpload={handleFileUpload}
            cardPromptTemplates={cardPromptTemplates}
            selectedCardTemplateId={selectedCardTemplateId}
            setSelectedCardTemplateId={setSelectedCardTemplateId}
          />
        </>
    </div>
  );
};

export default GlobalAssistant;

