/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type KnowledgeItem, type OutputMode, type Character, type Location, type Faction, type RuleSystem, type TimelineEvent, type AICardCommand, type CreatedCard, type Timeline, type WorldView, type MagicSystem, type TechnologyLevel, type WorldHistory, type CardPromptTemplate } from '../../../shared/types';
import { type GlobalAssistantProps, type ChatMessage, type AssistantCategory, type AssistantEditCategory, type SyncStatus, type EditingData, type AssistantWindowSize } from './types';
import { type LooseRecord, asRecord, asStr } from '../../shared/utils/loose';
import { AIService } from './services/aiService';
import { AICardCreationService } from '../cards/services/aiCardCreationService';
import { AICardCommandService } from '../cards/services/aiCardCommandService';
import { getDefaultCardPrompts } from '../cards/services/cardPromptService';
import AssistantContextPanel from './components/AssistantContextPanel';
import AssistantEditPanel from './components/AssistantEditPanel';
import AssistantChatWorkspace from './components/AssistantChatWorkspace';
import { dialogService } from '@/shared/services/dialogService';
import { BookOpenText, Bot, CircleStop, Lock, LockOpen, Maximize2, Minus, PenLine, Pin, Trash2, X } from 'lucide-react';

const GlobalAssistant: React.FC<GlobalAssistantProps> = ({ models, activeModelId, project, prompts, onUpdate }) => {
  const { t } = useTranslation('assistant');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 650 });
  const [size, setSize] = useState<AssistantWindowSize>({ width: 380, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isLocked, setIsLocked] = useState(false); // 新增：窗口锁定状态
  const [alwaysOnTop, setAlwaysOnTop] = useState(false); // 新增：窗口置顶状态

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentModelId, setCurrentModelId] = useState<string>(activeModelId || models[0]?.id || '');
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
  const dragRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isOpen, contextPanelOpen]);

  const getContextContent = useMemo(() => {
    if (!project) return "当前未打开任何项目。";
    
    switch (activeCategory) {
      case 'inspiration':
        return `【书名】\n${project.title}\n\n【原始灵感】\n${project.inspiration || '无'}\n\n【简介方案】\n${project.intro || '无'}`;
      
      case 'knowledge': {
        if (subSelectionId === 'all') {
           return (project.knowledge || []).map(k => `- ${k.name} (${k.type})`).join('\n') || "知识库为空";
        }
        const kItem = project.knowledge?.find(k => k.id === subSelectionId);
        return kItem ? `【资料：${kItem.name}】\n${kItem.content}` : "未找到资料";
      }
      
      case 'characters':
        if ((project.characters || []).length === 0) return "暂无角色档案";
        return (project.characters || []).map(c => 
          `角色名：${c.name || '未命名'}\n` +
          `性别：${c.gender || '未知'}\n` +
          `年龄：${c.age || '未知'}\n` +
          `角色类型：${c.role || '未知'}\n` +
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
        return project.outline || "暂无大纲内容";
      
      case 'chapters': {
        if (subSelectionId === 'all') {
           return (project.chapters || []).sort((a, b) => a.order - b.order)
             .map(c => `第${c.order + 1}章：${c.title}`).join('\n') || "暂无章节";
        }
        const chap = project.chapters?.find(c => c.id === subSelectionId);
        return chap ? `【第${chap.order + 1}章：${chap.title}】\n\n细纲：\n${chap.summary}` : "未找到章节";
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return;
    
    const target = e.target as HTMLElement;
    const isInHeader = dragRef.current && dragRef.current.contains(target);
    const isInTopArea = e.clientY - position.y < 30; // 窗口顶部30px区域
    
    if (isInHeader || isInTopArea) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      document.body.style.cursor = 'grabbing';
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        let newX = e.clientX - dragOffset.x;
        let newY = e.clientY - dragOffset.y;
        
        const minX = 0; // 最小左边距
        const minY = 0; // 最小上边距
        const maxX = window.innerWidth - (isMinimized ? 200 : size.width); // 最大左边距
        const maxY = window.innerHeight - (isMinimized ? 60 : size.height); // 最大上边距
        
        newX = Math.max(minX, Math.min(newX, maxX));
        newY = Math.max(minY, Math.min(newY, maxY));
        
        setPosition({
          x: newX,
          y: newY
        });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, isMinimized, size.width, size.height]);

  const sendMessageInternal = async (text: string, attachments: KnowledgeItem[]) => {
    if (project && AICardCommandService.isValidCommand(text)) {
      setIsLoading(true);
      
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, userMsg]);
      
      const activeModel = models.find(m => m.id === currentModelId) || models[0];
      
      if (!activeModel) {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: t('chat.modelMissing'),
          timestamp: Date.now(),
          error: t('chat.modelMissingError'),
        };
        setMessages(prev => [...prev, errorMsg]);
        setIsLoading(false);
        return;
      }
      
      const selectedTemplate = selectedCardTemplateId
        ? cardPromptTemplates.find(tpl => tpl.id === selectedCardTemplateId)
        : undefined;
      
      const result = await AICardCreationService.processInput(text, project, activeModel, selectedTemplate);
      
      if (result) {
        if (result.success && result.data) {
          addCardToProject(result.command, result.data);
          
          const systemMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.message,
            timestamp: Date.now(),
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
    
    setIsLoading(true);
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      attachments: attachments,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    const activeModel = models.find(m => m.id === currentModelId) || models[0];
    if (!activeModel) {
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
    
    const contextPrompt = messages.slice(-10).map(m => 
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n\n');

    let currentContent = text;
    if (attachments && attachments.length > 0) {
      const fileContent = attachments.map(f => `[参考内容: ${f.name}]\n${f.content.substring(0, 15000)}... (内容过长已截断)`).join('\n\n');
      currentContent += `\n\n### 附带参考资料:\n${fileContent}`;
    }

    const finalPrompt = `以下是对话历史：\n${contextPrompt}\n\nUser: ${currentContent}\n\nAssistant:`;

    const shouldUseStreaming = outputMode === 'streaming' && activeModel.supportsStreaming !== false;
    
    if (shouldUseStreaming) {
      const aiMsgId = (Date.now() + 1).toString();
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true
      };
      
      setMessages(prev => [...prev, aiMsg]);
      setStreamingMessageId(aiMsgId);
      const controller = new AbortController();
      streamAbortRef.current = controller;
      
      try {
        await AIService.callStreaming(activeModel, finalPrompt, (response) => {
          setMessages(prev => prev.map(msg => {
            if (msg.id === aiMsgId) {
              return {
                ...msg,
                content: response.content,
                tokens: response.tokens,
                model: response.model,
                finishReason: response.finishReason,
                error: response.error,
                isStreaming: !response.isComplete
              };
            }
            return msg;
          }));
          
          if (response.isComplete) {
            setStreamingMessageId(null);
            setIsLoading(false);
            streamAbortRef.current = null;
          }
        }, { signal: controller.signal });
      } catch (err) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === aiMsgId) {
            return {
              ...msg,
              content: t('chat.streamFailedContent', { error: err instanceof Error ? err.message : t('chat.unknownError') }),
              isStreaming: false,
              error: t('chat.streamFailed')
            };
          }
          return msg;
        }));
        setStreamingMessageId(null);
        setIsLoading(false);
        streamAbortRef.current = null;
      }
    } else {
      try {
        const response = await AIService.call(activeModel, finalPrompt);
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.content,
          tokens: response.tokens,
          model: response.model,
          finishReason: response.finishReason,
          error: response.error,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);
      } catch {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: t('chat.callFailedContent'),
          timestamp: Date.now(),
          error: t('chat.callFailed')
        }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSendMessage = () => {
    if ((!input.trim() && pendingFiles.length === 0) || isLoading) return;
    sendMessageInternal(input, [...pendingFiles]);
    setInput('');
    setPendingFiles([]);
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
     const content = getContextContent;
     const promptTemplate = prompts.find(p => p.id === analysisPromptId);
     const instruction = promptTemplate ? promptTemplate.content : "请分析以下内容";
     
     const attachment: KnowledgeItem = {
        id: 'ctx-' + Date.now(),
        name: t('chat.contextAttachmentName', { category: activeCategory }),
        content: content,
        type: 'context',
        size: content.length,
        addedAt: Date.now(),
        category: 'writing' as const
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
    
    const files = e.target.files;
    const newItems: KnowledgeItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      if (file.type.startsWith('text/') || file.name.match(/\.(md|json|txt|csv|js|ts|tsx|jsx)$/i)) {
        try {
          const text = await file.text();
          newItems.push({
            id: `chat-file-${Date.now()}-${i}`,
            name: file.name,
            content: text,
            type: file.name.split('.').pop() || 'txt',
            size: file.size,
            addedAt: Date.now(),
            category: 'writing' as const
          });
        } catch (err) {
          console.error("Failed to read file", file.name, err);
        }
      }
    }

    if (newItems.length > 0) {
      setPendingFiles(prev => [...prev, ...newItems]);
    }
    
    e.target.value = '';
  };

  const addCardToProject = (command: AICardCommand, data: CreatedCard) => {
    if (!project || !onUpdate) return;
    
    switch (command) {
      case 'character':
        onUpdate({
          characters: [...(project.characters || []), data as Character]
        });
        break;
      case 'location':
        onUpdate({
          locations: [...(project.locations || []), data as Location]
        });
        break;
      case 'faction':
        onUpdate({
          factions: [...(project.factions || []), data as Faction]
        });
        break;
      case 'timeline':
      case 'event':
        onUpdate({
          timeline: {
            ...(project.timeline || { id: Math.random().toString(36).substr(2, 9), projectId: project.id, config: { calendarSystem: 'default' }, events: [], createdAt: Date.now(), updatedAt: Date.now() }),
            events: [...(project.timeline?.events || []), data as TimelineEvent]
          } as Timeline
        });
        break;
      case 'rule':
        onUpdate({
          ruleSystems: [...(project.ruleSystems || []), data as RuleSystem]
        });
        break;
      case 'magic':
        onUpdate({
          worldView: {
            ...(project.worldView || { id: Math.random().toString(36).substr(2, 9), projectId: project.id, createdAt: Date.now(), updatedAt: Date.now() }),
            magicSystem: data as MagicSystem
          } as WorldView
        });
        break;
      case 'tech':
        onUpdate({
          worldView: {
            ...(project.worldView || { id: Math.random().toString(36).substr(2, 9), projectId: project.id, createdAt: Date.now(), updatedAt: Date.now() }),
            technologyLevel: data as TechnologyLevel
          } as WorldView
        });
        break;
      case 'history':
        onUpdate({
          worldView: {
            ...(project.worldView || { id: Math.random().toString(36).substr(2, 9), projectId: project.id, createdAt: Date.now(), updatedAt: Date.now() }),
            history: data as WorldHistory
          } as WorldView
        });
        break;
    }
  };

  const handleOpenEditPanel = (category: AssistantEditCategory) => {
    setEditCategory(category);
    setEditPanelOpen(true);
    
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

  const handleSaveEdit = () => {
    if (Object.keys(editingData).length === 0 || !onUpdate) return;
    
    setSyncStatus('saving');
    try {
      onUpdate(editingData);
      setSyncStatus('saved');
      setEditingData({});
      
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save data:', error);
      setSyncStatus('error');
    }
  };

  const parseSingleCharacterFromText = (text: string): Character | null => {
    if (!text) return null;
    
    const cleanLines = text.replace(/[*#_]/g, '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let activeChar: Partial<Character> | null = null;
    let currentField: keyof Omit<Character, 'birthInfo' | 'ruleSystemLevel' | 'birthDate'> | null = null;

    cleanLines.forEach(line => {
      const nameMatch = line.match(/^(?:角色名|姓名|名字|名称|身份)[:：\s]*(.*)/i);
      if (nameMatch && nameMatch[1]?.trim()) {
        if (activeChar && activeChar.name) {
          return;
        }
        activeChar = { 
          id: Math.random().toString(36).substr(2, 9), 
          name: nameMatch[1]?.trim() ?? '', 
          gender: '未知',
          age: '未知', 
          role: '配角', 
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
    
    const char = activeChar as Partial<Character> | null;
    if (char && char.name) {
      const completeChar: Character = {
        id: char.id || Math.random().toString(36).substr(2, 9),
        name: char.name || '',
        gender: char.gender || '未知',
        age: char.age || '未知',
        role: char.role || '配角',
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
      const activeModel = models.find(m => m.id === currentModelId) || models[0];
      if (!activeModel) {
        dialogService.alert(t('dialog.noModel'));
        return;
      }
      
      const prompt = `基于以下小说信息生成一个角色设定：
书名：${project.title}
简介：${project.intro}
用户要求：${characterGenerationPrompt}

请生成包含以下字段的完整角色设定：
- 姓名、性别、年龄
- 角色定位（主角/配角/反派等）
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
          characterData = {
            name: nameMatch[1]?.trim() ?? '',
            gender: genderMatch ? genderMatch[1]?.trim() ?? '' : '未知',
            age: ageMatch ? ageMatch[1]?.trim() ?? '' : '未知',
            role: '配角',
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
          gender: asStr(characterData.gender, '未知'),
          age: asStr(characterData.age, '未知'),
          role: asStr(characterData.role, '配角'),
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
          onUpdate({ characters: updatedCharacters });
        }
        
        setCharacterGenerationPrompt('');
        dialogService.alert(t('dialog.characterGenerated'));
      } else {
        console.error('Failed to parse character response:', parseError);
        console.error('Original response:', response.content);
        console.error('Extracted JSON:', extractedJSON);
        
        dialogService.alert(t('dialog.characterParseFailed', {
          preview: response.content.substring(0, 500),
          ellipsis: response.content.length > 500 ? '...' : '',
        }));
      }
    } catch (error) {
      console.error('Failed to generate character:', error);
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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-[9999] w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform cursor-pointer group"
        title={t('window.fabTitle')}
      >
        <Bot className="size-6 group-hover:animate-bounce" />
      </button>
    );
  }

  return (
    <div 
      className="fixed bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? 200 : size.width,
        height: isMinimized ? 60 : size.height,
        maxWidth: '90vw',
        maxHeight: '90vh',
        zIndex: alwaysOnTop ? 10000 : 9999
      }}
    >
      <div 
        ref={dragRef}
        onMouseDown={handleMouseDown}
        className={`flex items-center justify-between px-4 py-3 bg-gray-900 text-white cursor-move select-none shrink-0 ${isMinimized ? 'h-full' : ''}`}
      >
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-blue-400" />
          <span className="font-bold text-sm">{t('window.title')}</span>
        </div>
        <div className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
          <button 
            onClick={() => setAlwaysOnTop(!alwaysOnTop)} 
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              alwaysOnTop ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/20 text-white'
            }`}
            title={alwaysOnTop ? t('window.unpinTitle') : t('window.pinTitle')}
          >
            {alwaysOnTop ? <Pin className="size-3.5" /> : <Pin className="size-3.5 rotate-90" />}
          </button>
          
          <button 
            onClick={() => setIsLocked(!isLocked)} 
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              isLocked ? 'bg-yellow-500/20 text-yellow-400' : 'hover:bg-white/20 text-white'
            }`}
            title={isLocked ? t('window.unlockTitle') : t('window.lockTitle')}
          >
            {isLocked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
          </button>
          
          <button onClick={() => setIsMinimized(!isMinimized)} className="w-6 h-6 rounded hover:bg-white/20 flex items-center justify-center transition-colors">
            {isMinimized ? <Maximize2 className="size-3.5" /> : <Minus className="size-3.5" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="w-6 h-6 rounded hover:bg-red-500/80 flex items-center justify-center transition-colors">
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="px-4 py-2 border-b bg-gray-50 flex justify-between items-center text-xs shrink-0">
             <div className="flex items-center gap-2">
                <select 
                  value={currentModelId} 
                  onChange={(e) => setCurrentModelId(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-500 max-w-[140px]"
                >
                  {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select 
                  value={outputMode}
                  onChange={(e) => setOutputMode(e.target.value as OutputMode)}
                  className="bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-500 max-w-[120px]"
                >
                  <option value="streaming">{t('output.streaming')}</option>
                  <option value="traditional">{t('output.traditional')}</option>
                </select>
             </div>
             <div className="flex items-center gap-1">
                <button 
                  onClick={() => setEditPanelOpen(!editPanelOpen)} 
                  className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${editPanelOpen ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:bg-gray-200'}`}
                  title={t('window.editDataTitle')}
                >
                  <PenLine className="size-4" />
                </button>
                <button 
                  onClick={() => setContextPanelOpen(!contextPanelOpen)} 
                  className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${contextPanelOpen ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-200'}`}
                  title={t('window.contextTitle')}
                >
                  <BookOpenText className="size-4" />
                </button>
                {streamingMessageId && (
                  <button 
                    onClick={handleStopStreaming}
                    className="w-7 h-7 rounded text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                    title={t('window.stopStreamTitle')}
                  >
                    <CircleStop className="size-4" />
                  </button>
                )}
                <button 
                  onClick={() => setMessages([])} 
                  className="w-7 h-7 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                  title={t('window.clearChatTitle')}
                >
                  <Trash2 className="size-4" />
                </button>
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
            input={input}
            setInput={setInput}
            handleSendMessage={handleSendMessage}
            onStopGeneration={handleStopStreaming}
            handleFileUpload={handleFileUpload}
            cardPromptTemplates={cardPromptTemplates}
            selectedCardTemplateId={selectedCardTemplateId}
            setSelectedCardTemplateId={setSelectedCardTemplateId}
            isLocked={isLocked}
            size={size}
            setSize={setSize}
          />
        </>
      )}
    </div>
  );
};

export default GlobalAssistant;

