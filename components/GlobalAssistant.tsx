
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ModelConfig, KnowledgeItem, Project, PromptTemplate, AIResponse, OutputMode, Character, AICardCommand, Timeline, WorldView, CardPromptTemplate } from '../types';
import { AIService } from '../services/aiService';
import { AICardCreationService } from '../services/aiCardCreationService';
import { AICardCommandService } from '../services/aiCardCommandService';
import { getDefaultCardPrompts } from '../services/cardPromptService';

interface GlobalAssistantProps {
  models: ModelConfig[];
  activeModelId: string | null;
  project: Project | null;
  prompts: PromptTemplate[];
  onUpdate?: (updates: Partial<Project>) => void;  // 新增：数据更新回调
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: KnowledgeItem[];
  timestamp: number;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  model?: string;
  finishReason?: string;
  error?: string;
  isStreaming?: boolean;
}

const GlobalAssistant: React.FC<GlobalAssistantProps> = ({ models, activeModelId, project, prompts, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // 窗口状态
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 650 });
  const [size, setSize] = useState({ width: 380, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isLocked, setIsLocked] = useState(false); // 新增：窗口锁定状态
  const [alwaysOnTop, setAlwaysOnTop] = useState(false); // 新增：窗口置顶状态

  // 聊天状态
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentModelId, setCurrentModelId] = useState<string>(activeModelId || models[0]?.id);
  const [pendingFiles, setPendingFiles] = useState<KnowledgeItem[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [outputMode, setOutputMode] = useState<OutputMode>('streaming');

  // --- 项目上下文面板状态 ---
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'inspiration' | 'knowledge' | 'characters' | 'outline' | 'chapters'>('inspiration');
  const [subSelectionId, setSubSelectionId] = useState<string>('all');
  const [analysisPromptId, setAnalysisPromptId] = useState<string>('');

  // --- 新增：数据编辑面板状态 ---
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<'inspiration' | 'knowledge' | 'characters' | 'outline' | 'chapters' | 'content'>('inspiration');
  interface EditingData extends Partial<Project> {
    editingChapterId?: string;
  }
  const [editingData, setEditingData] = useState<EditingData>({});
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [characterGenerationPrompt, setCharacterGenerationPrompt] = useState<string>('');
  const [isGeneratingCharacter, setIsGeneratingCharacter] = useState(false);

  // --- AI卡片模板选择状态 ---
  const [cardPromptTemplates, setCardPromptTemplates] = useState<CardPromptTemplate[]>([]);
  const [selectedCardTemplateId, setSelectedCardTemplateId] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // 加载默认模板
  useEffect(() => {
    const defaultTemplates = getDefaultCardPrompts();
    setCardPromptTemplates(defaultTemplates);
  }, []);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  // 确保 activeModelId 变更时同步
  useEffect(() => {
    if (activeModelId) {
       // Optional: 可以在这里决定是否跟随全局模型切换
    }
  }, [activeModelId]);

  // 自动滚动到底部
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isOpen, contextPanelOpen]);

  // 获取上下文内容
  const getContextContent = useMemo(() => {
    if (!project) return "当前未打开任何项目。";
    
    switch (activeCategory) {
      case 'inspiration':
        return `【书名】\n${project.title}\n\n【原始灵感】\n${project.inspiration || '无'}\n\n【简介方案】\n${project.intro || '无'}`;
      
      case 'knowledge':
        if (subSelectionId === 'all') {
           return (project.knowledge || []).map(k => `- ${k.name} (${k.type})`).join('\n') || "知识库为空";
        }
        const kItem = project.knowledge?.find(k => k.id === subSelectionId);
        return kItem ? `【资料：${kItem.name}】\n${kItem.content}` : "未找到资料";
      
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
      
      case 'chapters':
        if (subSelectionId === 'all') {
           return (project.chapters || []).sort((a, b) => a.order - b.order)
             .map(c => `第${c.order + 1}章：${c.title}`).join('\n') || "暂无章节";
        }
        const chap = project.chapters?.find(c => c.id === subSelectionId);
        return chap ? `【第${chap.order + 1}章：${chap.title}】\n\n细纲：\n${chap.summary}` : "未找到章节";
        
      default:
        return "";
    }
  }, [project, activeCategory, subSelectionId]);

  // 自动选择第一个合适的 Prompt
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


  // --- 拖拽逻辑 ---
  const handleMouseDown = (e: React.MouseEvent) => {
    // 如果窗口被锁定，不启动拖动
    if (isLocked) return;
    
    // 扩展可拖动区域：允许窗口顶部30px区域拖动
    const target = e.target as HTMLElement;
    const isInHeader = dragRef.current && dragRef.current.contains(target);
    const isInTopArea = e.clientY - position.y < 30; // 窗口顶部30px区域
    
    if (isInHeader || isInTopArea) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      // 添加拖动时的视觉反馈：改变鼠标指针
      document.body.style.cursor = 'grabbing';
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // 计算新位置
        let newX = e.clientX - dragOffset.x;
        let newY = e.clientY - dragOffset.y;
        
        // 边界检查：确保窗口不会移出屏幕可视区域
        const minX = 0; // 最小左边距
        const minY = 0; // 最小上边距
        const maxX = window.innerWidth - (isMinimized ? 200 : size.width); // 最大左边距
        const maxY = window.innerHeight - (isMinimized ? 60 : size.height); // 最大上边距
        
        // 限制在边界内
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
      // 恢复鼠标指针样式
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

  // --- 聊天逻辑 ---
  const sendMessageInternal = async (text: string, attachments: KnowledgeItem[]) => {
    // ===== AI卡片创建命令检测 =====
    if (project && AICardCommandService.isValidCommand(text)) {
      setIsLoading(true);
      
      // 添加用户消息
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, userMsg]);
      
      // 获取当前模型配置
      const activeModel = models.find(m => m.id === currentModelId) || models[0];
      
      if (!activeModel) {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '❌ 请先配置AI模型',
          timestamp: Date.now(),
          error: '未配置模型',
        };
        setMessages(prev => [...prev, errorMsg]);
        setIsLoading(false);
        return;
      }
      
      // 获取选中的模板
      const selectedTemplate = selectedCardTemplateId 
        ? cardPromptTemplates.find(t => t.id === selectedCardTemplateId)
        : undefined;
      
      // 调用卡片创建服务，传递完整的模型配置和自定义模板
      const result = await AICardCreationService.processInput(text, project, activeModel, selectedTemplate);
      
      if (result) {
        if (result.success) {
          // 创建成功，更新项目数据
          addCardToProject(result.command, result.data);
          
          // 添加系统成功消息
          const systemMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.message,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, systemMsg]);
        } else {
          // 创建失败
          const errorMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.message,
            timestamp: Date.now(),
            error: '创建失败',
          };
          setMessages(prev => [...prev, errorMsg]);
        }
        setIsLoading(false);
        return; // 跳过正常的AI对话流程
      }
      
      setIsLoading(false);
      return;
    }
    // ===== 卡片命令检测结束 =====
    
    setIsLoading(true);
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      attachments: attachments,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    // 构建 Prompt
    const activeModel = models.find(m => m.id === currentModelId) || models[0];
    
    // 构建上下文
    let contextPrompt = messages.slice(-10).map(m => 
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n\n');

    let currentContent = text;
    if (attachments && attachments.length > 0) {
      const fileContent = attachments.map(f => `[参考内容: ${f.name}]\n${f.content.substring(0, 15000)}... (内容过长已截断)`).join('\n\n');
      currentContent += `\n\n### 附带参考资料:\n${fileContent}`;
    }

    const finalPrompt = `以下是对话历史：\n${contextPrompt}\n\nUser: ${currentContent}\n\nAssistant:`;

    // 检查是否使用流式输出
    const shouldUseStreaming = outputMode === 'streaming' && activeModel.supportsStreaming !== false;
    
    if (shouldUseStreaming) {
      // 使用流式调用
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
          }
        });
      } catch (err) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === aiMsgId) {
            return {
              ...msg,
              content: `Error: 流式调用失败 - ${err instanceof Error ? err.message : '未知错误'}`,
              isStreaming: false,
              error: '流式调用失败'
            };
          }
          return msg;
        }));
        setStreamingMessageId(null);
        setIsLoading(false);
      }
    } else {
      // 使用传统输出模式
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
      } catch (err) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: "Error: AI 响应失败，请检查网络或配置。",
          timestamp: Date.now(),
          error: '调用失败'
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

  // 停止流式响应
  const handleStopStreaming = () => {
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
     
     // 将上下文作为附件发送，指令作为消息
     const attachment: KnowledgeItem = {
        id: 'ctx-' + Date.now(),
        name: `项目上下文-${activeCategory}`,
        content: content,
        type: 'context',
        size: content.length,
        addedAt: Date.now(),
        category: 'writing' as const
     };
     
     // 替换模板中的变量 (简单替换，防止未匹配变量)
     let finalInstruction = instruction;
     if (promptTemplate) {
        // 尝试一些通用替换，虽然这是 Global Assistant，未必能完全匹配所有 Step 的变量
        // 但我们可以简单处理
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

  // --- AI卡片创建功能 ---
  
  // 将创建的卡片添加到项目
  const addCardToProject = (command: AICardCommand, data: any) => {
    if (!project || !onUpdate) return;
    
    switch (command) {
      case 'character':
        onUpdate({
          characters: [...(project.characters || []), data]
        });
        break;
      case 'location':
        onUpdate({
          locations: [...(project.locations || []), data]
        });
        break;
      case 'faction':
        onUpdate({
          factions: [...(project.factions || []), data]
        });
        break;
      case 'timeline':
      case 'event':
        onUpdate({
          timeline: {
            ...(project.timeline || { id: Math.random().toString(36).substr(2, 9), projectId: project.id, config: { calendarSystem: 'default' }, events: [], createdAt: Date.now(), updatedAt: Date.now() }),
            events: [...(project.timeline?.events || []), data]
          } as Timeline
        });
        break;
      case 'rule':
        onUpdate({
          ruleSystems: [...(project.ruleSystems || []), data]
        });
        break;
      case 'magic':
        onUpdate({
          worldView: {
            ...(project.worldView || { id: Math.random().toString(36).substr(2, 9), projectId: project.id, createdAt: Date.now(), updatedAt: Date.now() }),
            magicSystem: data
          } as WorldView
        });
        break;
      case 'tech':
        onUpdate({
          worldView: {
            ...(project.worldView || { id: Math.random().toString(36).substr(2, 9), projectId: project.id, createdAt: Date.now(), updatedAt: Date.now() }),
            technologyLevel: data
          } as WorldView
        });
        break;
      case 'history':
        onUpdate({
          worldView: {
            ...(project.worldView || { id: Math.random().toString(36).substr(2, 9), projectId: project.id, createdAt: Date.now(), updatedAt: Date.now() }),
            history: data
          } as WorldView
        });
        break;
    }
  };

  // --- 新增：数据编辑功能 ---

  // 打开编辑面板
  const handleOpenEditPanel = (category: 'inspiration' | 'knowledge' | 'characters' | 'outline' | 'chapters' | 'content') => {
    setEditCategory(category);
    setEditPanelOpen(true);
    
    // 根据类别初始化编辑数据
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
          // 内容编辑需要选择章节，初始化章节数据
          setEditingData({ chapters: [...(project.chapters || [])] });
          break;
      }
    }
  };

  // 保存编辑的数据
  const handleSaveEdit = () => {
    if (Object.keys(editingData).length === 0 || !onUpdate) return;
    
    setSyncStatus('saving');
    try {
      onUpdate(editingData);
      setSyncStatus('saved');
      setEditingData({});
      
      // 3秒后重置状态
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save data:', error);
      setSyncStatus('error');
    }
  };

  // 智能角色生成 - 增强的解析函数
  const parseSingleCharacterFromText = (text: string): Character | null => {
    if (!text) return null;
    
    const cleanLines = text.replace(/[*#_]/g, '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let activeChar: Partial<Character> | null = null;
    let currentField: keyof Omit<Character, 'birthInfo' | 'ruleSystemLevel' | 'birthDate'> | null = null;

    cleanLines.forEach(line => {
      const nameMatch = line.match(/^(?:角色名|姓名|名字|名称|身份)[:：\s]*(.*)/i);
      if (nameMatch && nameMatch[1].trim()) {
        if (activeChar && activeChar.name) {
          // 如果已经有角色，返回它
          return;
        }
        activeChar = { 
          id: Math.random().toString(36).substr(2, 9), 
          name: nameMatch[1].trim(), 
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

      if (!activeChar) return;
      if (genderMatch) { activeChar.gender = genderMatch[1].trim(); currentField = 'gender'; }
      else if (ageMatch) { activeChar.age = ageMatch[1].trim(); currentField = 'age'; }
      else if (roleMatch) { activeChar.role = roleMatch[1].trim(); currentField = 'role'; }
      else if (personalityMatch) { activeChar.personality = personalityMatch[1].trim(); currentField = 'personality'; }
      else if (backgroundMatch) { activeChar.background = backgroundMatch[1].trim(); currentField = 'background'; }
      else if (relationshipMatch) { activeChar.relationships = relationshipMatch[1].trim(); currentField = 'relationships'; }
      else if (appearanceMatch) { activeChar.appearance = appearanceMatch[1].trim(); currentField = 'appearance'; }
      else if (featuresMatch) { activeChar.distinctiveFeatures = featuresMatch[1].trim(); currentField = 'distinctiveFeatures'; }
      else if (occupationMatch) { activeChar.occupation = occupationMatch[1].trim(); currentField = 'occupation'; }
      else if (motivationMatch) { activeChar.motivation = motivationMatch[1].trim(); currentField = 'motivation'; }
      else if (strengthsMatch) { activeChar.strengths = strengthsMatch[1].trim(); currentField = 'strengths'; }
      else if (weaknessesMatch) { activeChar.weaknesses = weaknessesMatch[1].trim(); currentField = 'weaknesses'; }
      else if (arcMatch) { activeChar.characterArc = arcMatch[1].trim(); currentField = 'characterArc'; }
      else if (currentField && currentField !== 'id') {
        activeChar[currentField] = ((activeChar[currentField] || '') + ' ' + line).trim();
      }
    });
    
    const char = activeChar as Partial<Character> | null;
    if (char && char.name) {
      // 创建完整的角色对象
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

  // 智能角色生成
  const handleGenerateCharacter = async () => {
    if (!project || !characterGenerationPrompt.trim()) return;
    
    setIsGeneratingCharacter(true);
    try {
      const activeModel = models.find(m => m.id === currentModelId) || models[0];
      
      // 增强的提示词，要求严格的JSON格式
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
      
      // 辅助函数：从响应中提取JSON
      const extractJSONFromResponse = (text: string): string => {
        if (!text) return text;
        
        // 1. 首先尝试直接解析（如果已经是纯JSON）
        try {
          JSON.parse(text);
          return text;
        } catch (e) {
          // 不是纯JSON，继续提取
        }
        
        // 2. 尝试提取JSON对象（使用正则表达式）
        // 匹配 { ... } 格式的JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return jsonMatch[0];
        }
        
        // 3. 尝试提取JSON数组（如果需要的话）
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          return arrayMatch[0];
        }
        
        // 4. 如果以上都失败，返回原始文本
        return text;
      };
      
      // 多重解析策略：JSON解析 -> 文本解析 -> 智能提取
      let characterData: any = null;
      let parseError: any = null;
      let extractedJSON = '';
      
      // 策略1：尝试直接JSON解析
      try {
        characterData = JSON.parse(response.content);
      } catch (error1) {
        parseError = error1;
        
        // 策略2：提取JSON后解析
        extractedJSON = extractJSONFromResponse(response.content);
        if (extractedJSON !== response.content) {
          try {
            characterData = JSON.parse(extractedJSON);
            parseError = null;
          } catch (error2) {
            parseError = error2;
          }
        }
      }
      
      // 策略3：如果JSON解析失败，尝试文本解析
      if (!characterData) {
        const parsedCharacter = parseSingleCharacterFromText(response.content);
        if (parsedCharacter) {
          characterData = parsedCharacter;
          parseError = null;
        }
      }
      
      // 策略4：如果文本解析也失败，尝试智能提取
      if (!characterData) {
        // 尝试从文本中提取关键信息
        const nameMatch = response.content.match(/(?:姓名|名字|角色名)[:：\s]*([^\n,，。]+)/i);
        const genderMatch = response.content.match(/(?:性别)[:：\s]*([^\n,，。]+)/i);
        const ageMatch = response.content.match(/(?:年龄)[:：\s]*([^\n,，。]+)/i);
        
        if (nameMatch) {
          characterData = {
            name: nameMatch[1].trim(),
            gender: genderMatch ? genderMatch[1].trim() : '未知',
            age: ageMatch ? ageMatch[1].trim() : '未知',
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
        // 解析成功，创建角色
        const newCharacter = {
          id: Date.now().toString(),
          name: characterData.name || '未命名角色',
          gender: characterData.gender || '未知',
          age: characterData.age || '未知',
          role: characterData.role || '配角',
          personality: characterData.personality || '暂无描述',
          background: characterData.background || '暂无背景',
          relationships: characterData.relationships || '',
          appearance: characterData.appearance || '暂无描述',
          distinctiveFeatures: characterData.distinctiveFeatures || '暂无特征',
          occupation: characterData.occupation || '暂无',
          motivation: characterData.motivation || '暂无',
          strengths: characterData.strengths || '暂无',
          weaknesses: characterData.weaknesses || '暂无',
          characterArc: characterData.characterArc || '暂无'
        };
        
        // 添加到角色列表
        const updatedCharacters = [...(project.characters || []), newCharacter];
        if (onUpdate) {
          onUpdate({ characters: updatedCharacters });
        }
        
        setCharacterGenerationPrompt('');
        alert('角色生成成功并已添加到角色库！');
      } else {
        // 解析失败，提供详细错误信息
        console.error('Failed to parse character response:', parseError);
        console.error('Original response:', response.content);
        console.error('Extracted JSON:', extractedJSON);
        
        // 提供更详细的错误信息
        const errorMessage = `角色生成成功，但解析失败。\n\n可能原因：
1. AI返回的格式不是有效的JSON
2. JSON格式有错误（如缺少引号、括号不匹配等）
3. 响应中包含非JSON文本

原始响应（前500字符）：
${response.content.substring(0, 500)}${response.content.length > 500 ? '...' : ''}

请检查AI模型返回的格式，或尝试手动添加角色。`;
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Failed to generate character:', error);
      alert('角色生成失败，请检查网络连接或模型配置。');
    } finally {
      setIsGeneratingCharacter(false);
    }
  };

  // 渲染编辑面板
  const renderEditPanel = () => {
    if (!project) return null;

    return (
      <div className="flex-1 flex flex-col bg-gray-50 z-10 overflow-hidden animate-in slide-in-from-right duration-200 absolute inset-0 top-[88px]">
        {/* 编辑类别标签 */}
        <div className="flex bg-white border-b overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'inspiration', icon: 'fa-lightbulb', label: '灵感' },
            { id: 'knowledge', icon: 'fa-book-atlas', label: '知识库' },
            { id: 'characters', icon: 'fa-users', label: '角色' },
            { id: 'outline', icon: 'fa-sitemap', label: '大纲' },
            { id: 'chapters', icon: 'fa-list-ol', label: '章节' },
            { id: 'content', icon: 'fa-file-lines', label: '正文' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => handleOpenEditPanel(cat.id as any)}
              className={`flex-1 min-w-[60px] py-3 flex flex-col items-center gap-1 text-[10px] border-b-2 transition-colors ${
                editCategory === cat.id ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <i className={`fas ${cat.icon}`}></i>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* 编辑内容区域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {editCategory === 'inspiration' && (
            <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">灵感内容</label>
                <textarea
                  className="w-full h-32 bg-white border border-gray-200 rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-100"
                  value={editingData.inspiration || project.inspiration || ''}
                  onChange={(e) => setEditingData(prev => ({ ...prev, inspiration: e.target.value }))}
                  placeholder="输入灵感内容..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">小说简介</label>
                <textarea
                  className="w-full h-32 bg-white border border-gray-200 rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-100"
                  value={editingData.intro || project.intro || ''}
                  onChange={(e) => setEditingData(prev => ({ ...prev, intro: e.target.value }))}
                  placeholder="输入小说简介..."
                />
              </div>
            </div>
          )}

          {editCategory === 'knowledge' && (
            <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">知识库条目</h3>
                <button
                  onClick={() => {
                    const newKnowledge = [...(editingData.knowledge || project.knowledge || [])];
                    newKnowledge.push({
                      id: `knowledge-${Date.now()}`,
                      name: '新知识条目',
                      content: '',
                      type: 'txt',
                      size: 0,
                      addedAt: Date.now(),
                      category: 'writing' as const
                    });
                    setEditingData(prev => ({ ...prev, knowledge: newKnowledge }));
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                >
                  添加条目
                </button>
              </div>
              {(editingData.knowledge || project.knowledge || []).map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-100"
                    value={item.name}
                    onChange={(e) => {
                      const newKnowledge = [...(editingData.knowledge || project.knowledge || [])];
                      newKnowledge[index] = { ...item, name: e.target.value };
                      setEditingData(prev => ({ ...prev, knowledge: newKnowledge }));
                    }}
                    placeholder="条目名称"
                  />
                  <textarea
                    className="w-full h-24 bg-white border border-gray-200 rounded p-2 text-sm resize-none outline-none focus:ring-1 focus:ring-blue-100"
                    value={item.content}
                    onChange={(e) => {
                      const newKnowledge = [...(editingData.knowledge || project.knowledge || [])];
                      newKnowledge[index] = { ...item, content: e.target.value };
                      setEditingData(prev => ({ ...prev, knowledge: newKnowledge }));
                    }}
                    placeholder="条目内容"
                  />
                  <button
                    onClick={() => {
                      const newKnowledge = (editingData.knowledge || project.knowledge || []).filter((_, i) => i !== index);
                      setEditingData(prev => ({ ...prev, knowledge: newKnowledge }));
                    }}
                    className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded hover:bg-red-100"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}

          {editCategory === 'characters' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 智能角色生成 - 固定在上方，不参与滚动 */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 shrink-0">
                <h3 className="text-sm font-medium text-blue-700 mb-2">智能角色生成</h3>
                <div className="space-y-2">
                  <textarea
                    className="w-full h-20 bg-white border border-blue-200 rounded-lg p-2 text-sm resize-none outline-none focus:ring-1 focus:ring-blue-100"
                    value={characterGenerationPrompt}
                    onChange={(e) => setCharacterGenerationPrompt(e.target.value)}
                    placeholder="描述你想要生成的角色特点（例如：一个神秘的反派，拥有强大的魔法能力）..."
                  />
                  <button
                    onClick={handleGenerateCharacter}
                    disabled={isGeneratingCharacter || !characterGenerationPrompt.trim()}
                    className={`w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2 ${
                      isGeneratingCharacter || !characterGenerationPrompt.trim() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isGeneratingCharacter ? (
                      <>
                        <i className="fas fa-circle-notch fa-spin"></i>
                        生成中...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-wand-magic-sparkles"></i>
                        智能生成角色
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 角色编辑列表 - 单独的可滚动部分 */}
              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-700">角色列表</h3>
                  <button
                    onClick={() => {
                      const newCharacters = [...(editingData.characters || project.characters || [])];
                      newCharacters.push({
                        id: `character-${Date.now()}`,
                        name: '新角色',
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
                      });
                      setEditingData(prev => ({ ...prev, characters: newCharacters }));
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                  >
                    添加角色
                  </button>
                </div>
                {(editingData.characters || project.characters || []).map((character, index) => (
                  <div key={character.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">姓名</label>
                        <input
                          type="text"
                          className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-100"
                          value={character.name}
                          onChange={(e) => {
                            const newCharacters = [...(editingData.characters || project.characters || [])];
                            newCharacters[index] = { ...character, name: e.target.value };
                            setEditingData(prev => ({ ...prev, characters: newCharacters }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">性别</label>
                        <input
                          type="text"
                          className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-100"
                          value={character.gender}
                          onChange={(e) => {
                            const newCharacters = [...(editingData.characters || project.characters || [])];
                            newCharacters[index] = { ...character, gender: e.target.value };
                            setEditingData(prev => ({ ...prev, characters: newCharacters }));
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">性格特点</label>
                      <textarea
                        className="w-full h-16 bg-white border border-gray-200 rounded p-2 text-sm resize-none outline-none focus:ring-1 focus:ring-blue-100"
                        value={character.personality}
                        onChange={(e) => {
                          const newCharacters = [...(editingData.characters || project.characters || [])];
                          newCharacters[index] = { ...character, personality: e.target.value };
                          setEditingData(prev => ({ ...prev, characters: newCharacters }));
                        }}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          const newCharacters = (editingData.characters || project.characters || []).filter((_, i) => i !== index);
                          setEditingData(prev => ({ ...prev, characters: newCharacters }));
                        }}
                        className="px-3 py-1 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100"
                      >
                        删除角色
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editCategory === 'outline' && (
            <div className="p-4 overflow-y-auto custom-scrollbar">
              <label className="block text-xs font-medium text-gray-700 mb-1">小说大纲</label>
              <textarea
                className="w-full h-64 bg-white border border-gray-200 rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-100"
                value={editingData.outline || project.outline || ''}
                onChange={(e) => setEditingData(prev => ({ ...prev, outline: e.target.value }))}
                placeholder="输入小说大纲..."
              />
            </div>
          )}

          {editCategory === 'chapters' && (
            <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">章节列表</h3>
                <button
                  onClick={() => {
                    const newChapters = [...(editingData.chapters || project.chapters || [])];
                    const newOrder = newChapters.length;
                    newChapters.push({
                      id: `chapter-${Date.now()}`,
                      title: `第${newOrder + 1}章`,
                      summary: '',
                      content: '',
                      order: newOrder
                    });
                    setEditingData(prev => ({ ...prev, chapters: newChapters }));
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                >
                  添加章节
                </button>
              </div>
              {(editingData.chapters || project.chapters || []).sort((a, b) => a.order - b.order).map((chapter, index) => (
                <div key={chapter.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">章节标题</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-100"
                        value={chapter.title}
                        onChange={(e) => {
                          const newChapters = [...(editingData.chapters || project.chapters || [])];
                          newChapters[index] = { ...chapter, title: e.target.value };
                          setEditingData(prev => ({ ...prev, chapters: newChapters }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">章节顺序</label>
                      <input
                        type="number"
                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-100"
                        value={chapter.order}
                        onChange={(e) => {
                          const newChapters = [...(editingData.chapters || project.chapters || [])];
                          newChapters[index] = { ...chapter, order: parseInt(e.target.value) || 0 };
                          setEditingData(prev => ({ ...prev, chapters: newChapters }));
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">章节细纲</label>
                    <textarea
                      className="w-full h-24 bg-white border border-gray-200 rounded p-2 text-sm resize-none outline-none focus:ring-1 focus:ring-blue-100"
                      value={chapter.summary}
                      onChange={(e) => {
                        const newChapters = [...(editingData.chapters || project.chapters || [])];
                        newChapters[index] = { ...chapter, summary: e.target.value };
                        setEditingData(prev => ({ ...prev, chapters: newChapters }));
                      }}
                      placeholder="输入章节细纲..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        // 打开正文编辑器
                        setEditCategory('content');
                        // 设置当前编辑的章节
                        setEditingData(prev => ({ ...prev, editingChapterId: chapter.id }));
                      }}
                      className="px-3 py-1 bg-green-50 text-green-600 text-xs rounded-lg hover:bg-green-100"
                    >
                      编辑正文
                    </button>
                    <button
                      onClick={() => {
                        const newChapters = (editingData.chapters || project.chapters || []).filter((_, i) => i !== index);
                        setEditingData(prev => ({ ...prev, chapters: newChapters }));
                      }}
                      className="px-3 py-1 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100"
                    >
                      删除章节
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {editCategory === 'content' && (
            <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">正文编辑</h3>
                <select
                  value={editingData.editingChapterId || ''}
                  onChange={(e) => setEditingData(prev => ({ ...prev, editingChapterId: e.target.value }))}
                  className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-100"
                >
                  <option value="">选择章节</option>
                  {(project?.chapters || []).sort((a, b) => a.order - b.order).map(chapter => (
                    <option key={chapter.id} value={chapter.id}>第{chapter.order + 1}章：{chapter.title}</option>
                  ))}
                </select>
              </div>
              {editingData.editingChapterId && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">正文内容</label>
                  <textarea
                    className="w-full h-96 bg-white border border-gray-200 rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-100 font-mono leading-relaxed"
                    value={getChapterContent(editingData.editingChapterId)}
                    onChange={(e) => {
                      const chapterId = editingData.editingChapterId;
                      if (!chapterId) return;
                      
                      // 更新编辑数据中的章节内容
                      const currentChapters = editingData.chapters || project?.chapters || [];
                      const updatedChapters = currentChapters.map(chapter => {
                        if (chapter.id === chapterId) {
                          return { ...chapter, content: e.target.value };
                        }
                        return chapter;
                      });
                      
                      setEditingData(prev => ({ ...prev, chapters: updatedChapters }));
                      // 设置保存状态为待保存
                      if (syncStatus === 'idle' || syncStatus === 'saved') {
                        setSyncStatus('idle');
                      }
                    }}
                    placeholder="输入正文内容..."
                  />
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <i className="fas fa-info-circle"></i>
                    <span>正文内容已修改，点击"保存更改"按钮保存到对应章节</span>
                    {syncStatus === 'idle' && editingData.chapters && editingData.chapters.length > 0 && (
                      <span className="text-amber-600 font-medium">（有未保存的更改）</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 编辑操作按钮 */}
        <div className="p-4 bg-white border-t border-gray-200 shrink-0 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {syncStatus === 'saving' && (
              <div className="flex items-center gap-1 text-blue-600 text-xs">
                <i className="fas fa-circle-notch fa-spin"></i>
                保存中...
              </div>
            )}
            {syncStatus === 'saved' && (
              <div className="flex items-center gap-1 text-green-600 text-xs">
                <i className="fas fa-check-circle"></i>
                已保存
              </div>
            )}
            {syncStatus === 'error' && (
              <div className="flex items-center gap-1 text-red-600 text-xs">
                <i className="fas fa-exclamation-circle"></i>
                保存失败
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditPanelOpen(false);
                setEditingData({});
                setSyncStatus('idle');
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200"
            >
              取消
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={syncStatus === 'saving' || Object.keys(editingData).length === 0}
              className={`px-4 py-2 text-white text-xs rounded-lg flex items-center gap-2 ${
                syncStatus === 'saving' || Object.keys(editingData).length === 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {syncStatus === 'saving' ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i>
                  保存中...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  保存更改
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 获取章节正文内容 - 改进版本：优先从编辑数据中获取
  const getChapterContent = (chapterId: string) => {
    if (!project) return '';
    
    // 首先尝试从编辑数据中获取章节内容
    if (editingData.chapters && editingData.chapters.length > 0) {
      const editedChapter = editingData.chapters.find(c => c.id === chapterId);
      if (editedChapter && editedChapter.content !== undefined) {
        return editedChapter.content;
      }
    }
    
    // 如果编辑数据中没有，从原始项目数据中获取
    const chapter = project.chapters.find(c => c.id === chapterId);
    return chapter?.content || '';
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-[9999] w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform cursor-pointer group"
        title="打开 AI 写作助手"
      >
        <i className="fas fa-robot text-xl group-hover:animate-bounce"></i>
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
      {/* Header */}
      <div 
        ref={dragRef}
        onMouseDown={handleMouseDown}
        className={`flex items-center justify-between px-4 py-3 bg-gray-900 text-white cursor-move select-none shrink-0 ${isMinimized ? 'h-full' : ''}`}
      >
        <div className="flex items-center gap-2">
          <i className="fas fa-robot text-blue-400"></i>
          <span className="font-bold text-sm">AI 助手</span>
        </div>
        <div className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
          {/* 置顶按钮 */}
          <button 
            onClick={() => setAlwaysOnTop(!alwaysOnTop)} 
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              alwaysOnTop ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/20 text-white'
            }`}
            title={alwaysOnTop ? "取消置顶" : "窗口置顶（保持在最上层）"}
          >
            <i className={`fas ${alwaysOnTop ? 'fa-thumbtack' : 'fa-thumbtack fa-rotate-90'} text-xs`}></i>
          </button>
          
          {/* 锁定按钮 */}
          <button 
            onClick={() => setIsLocked(!isLocked)} 
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              isLocked ? 'bg-yellow-500/20 text-yellow-400' : 'hover:bg-white/20 text-white'
            }`}
            title={isLocked ? "解锁窗口（可拖动和调整大小）" : "锁定窗口（固定位置和大小）"}
          >
            <i className={`fas ${isLocked ? 'fa-lock' : 'fa-lock-open'} text-xs`}></i>
          </button>
          
          <button onClick={() => setIsMinimized(!isMinimized)} className="w-6 h-6 rounded hover:bg-white/20 flex items-center justify-center transition-colors">
            <i className={`fas ${isMinimized ? 'fa-expand-alt' : 'fa-minus'} text-xs`}></i>
          </button>
          <button onClick={() => setIsOpen(false)} className="w-6 h-6 rounded hover:bg-red-500/80 flex items-center justify-center transition-colors">
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Toolbar */}
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
                  <option value="streaming">流式输出</option>
                  <option value="traditional">传统输出</option>
                </select>
             </div>
             <div className="flex items-center gap-1">
                {/* Edit Button */}
                <button 
                  onClick={() => setEditPanelOpen(!editPanelOpen)} 
                  className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${editPanelOpen ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:bg-gray-200'}`}
                  title="编辑项目数据"
                >
                  <i className="fas fa-edit"></i>
                </button>
                {/* Context Button */}
                <button 
                  onClick={() => setContextPanelOpen(!contextPanelOpen)} 
                  className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${contextPanelOpen ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-200'}`}
                  title="项目上下文分析"
                >
                  <i className="fas fa-book-open-reader"></i>
                </button>
                {streamingMessageId && (
                  <button 
                    onClick={handleStopStreaming}
                    className="w-7 h-7 rounded text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                    title="停止流式响应"
                  >
                    <i className="fas fa-stop-circle"></i>
                  </button>
                )}
                <button 
                  onClick={() => setMessages([])} 
                  className="w-7 h-7 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                  title="清空聊天记录"
                >
                  <i className="fas fa-trash-can"></i>
                </button>
             </div>
          </div>

          {/* Edit Panel Overlay */}
          {editPanelOpen && renderEditPanel()}

          {/* Context Panel Overlay */}
          {contextPanelOpen && (
             <div className="flex-1 flex flex-col bg-gray-50 z-10 overflow-hidden animate-in slide-in-from-right duration-200 absolute inset-0 top-[88px]">
                {/* Category Tabs */}
                <div className="flex bg-white border-b overflow-x-auto no-scrollbar shrink-0">
                   {[
                     { id: 'inspiration', icon: 'fa-lightbulb', label: '灵感' },
                     { id: 'knowledge', icon: 'fa-book-atlas', label: '知识库' },
                     { id: 'characters', icon: 'fa-users', label: '角色' },
                     { id: 'outline', icon: 'fa-sitemap', label: '大纲' },
                     { id: 'chapters', icon: 'fa-list-ol', label: '章节' },
                   ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => { setActiveCategory(cat.id as any); setSubSelectionId('all'); }}
                        className={`flex-1 min-w-[60px] py-3 flex flex-col items-center gap-1 text-[10px] border-b-2 transition-colors ${
                           activeCategory === cat.id ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                      >
                         <i className={`fas ${cat.icon}`}></i>
                         <span>{cat.label}</span>
                      </button>
                   ))}
                </div>

                {/* Sub-selection for Knowledge/Chapters */}
                {(activeCategory === 'knowledge' || activeCategory === 'chapters') && project && (
                   <div className="px-4 py-2 bg-white border-b shrink-0">
                      <select 
                        value={subSelectionId}
                        onChange={(e) => setSubSelectionId(e.target.value)}
                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none"
                      >
                         <option value="all">-- 查看全部列表 --</option>
                         {activeCategory === 'knowledge' && project.knowledge?.map(k => (
                            <option key={k.id} value={k.id}>{k.name}</option>
                         ))}
                         {activeCategory === 'chapters' && project.chapters?.sort((a,b)=>a.order-b.order).map(c => (
                            <option key={c.id} value={c.id}>第{c.order+1}章：{c.title}</option>
                         ))}
                      </select>
                   </div>
                )}

                {/* Content Preview */}
                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                   <textarea
                      readOnly
                      className="w-full h-full bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-600 leading-relaxed resize-none outline-none focus:ring-1 focus:ring-blue-100"
                      value={getContextContent}
                   />
                </div>

                {/* Analysis Actions */}
                <div className="p-3 bg-white border-t border-gray-200 shrink-0 space-y-2">
                   <div className="flex gap-2">
                      <select 
                        value={analysisPromptId}
                        onChange={(e) => setAnalysisPromptId(e.target.value)}
                        className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 outline-none"
                      >
                         <option value="">-- 选择分析提示词 --</option>
                         {prompts.map(p => <option key={p.id} value={p.id}>[{p.category}] {p.name}</option>)}
                      </select>
                   </div>
                   <button 
                     onClick={handleContextAnalyze}
                     disabled={isLoading || !project}
                     className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                     <i className="fas fa-wand-magic-sparkles"></i> AI 一键分析优化
                   </button>
                </div>
             </div>
          )}

          {/* Chat Area */}
          <div 
             ref={chatContainerRef}
             className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 custom-scrollbar"
             style={{ display: (contextPanelOpen || editPanelOpen) ? 'none' : 'block' }}
          >
             {messages.length === 0 && (
                <div className="text-center mt-20 text-gray-300">
                   <i className="fas fa-comments text-4xl mb-3 opacity-20"></i>
                   <p className="text-xs">选择上下文分析，或直接对话。</p>
                </div>
             )}
             {messages.map((msg) => (
               <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-white border border-gray-100 text-gray-700 shadow-sm rounded-bl-none'
                 }`}>
                    {msg.attachments && msg.attachments.length > 0 && (
                       <div className="mb-2 space-y-1">
                          {msg.attachments.map((f, idx) => (
                             <div key={idx} className="flex items-center gap-2 text-xs bg-black/10 px-2 py-1 rounded">
                                <i className={`fas ${f.type === 'context' ? 'fa-book-open' : 'fa-paperclip'}`}></i>
                                <span className="truncate max-w-[150px]">{f.name}</span>
                             </div>
                          ))}
                          <hr className="border-white/20 my-2"/>
                       </div>
                    )}
                    <div className="relative">
                      {msg.content}
                      {msg.isStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse"></span>
                      )}
                    </div>
                    
                    {/* Token 信息和模型信息 */}
                    {(msg.tokens || msg.model || msg.finishReason) && (
                      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                        {msg.model && (
                          <div className="flex items-center gap-1">
                            <i className="fas fa-microchip"></i>
                            <span>模型: {msg.model}</span>
                          </div>
                        )}
                        {msg.tokens && (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <i className="fas fa-keyboard"></i>
                              <span>输入: {msg.tokens.prompt}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <i className="fas fa-reply"></i>
                              <span>输出: {msg.tokens.completion}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <i className="fas fa-calculator"></i>
                              <span>总计: {msg.tokens.total}</span>
                            </div>
                          </div>
                        )}
                        {msg.finishReason && (
                          <div className="flex items-center gap-1">
                            <i className="fas fa-flag-checkered"></i>
                            <span>完成原因: {msg.finishReason}</span>
                          </div>
                        )}
                        {msg.error && (
                          <div className="flex items-center gap-1 text-red-500">
                            <i className="fas fa-exclamation-circle"></i>
                            <span>错误: {msg.error}</span>
                          </div>
                        )}
                      </div>
                    )}
                 </div>
               </div>
             ))}
             {isLoading && !streamingMessageId && (
               <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-3 shadow-sm">
                     <i className="fas fa-circle-notch fa-spin text-blue-500 text-xs"></i>
                  </div>
               </div>
             )}
          </div>

          {/* Pending Files Area */}
          {!contextPanelOpen && pendingFiles.length > 0 && (
             <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex gap-2 overflow-x-auto custom-scrollbar shrink-0">
                {pendingFiles.map((f, idx) => (
                   <div key={idx} className="flex items-center gap-1 bg-white border border-blue-200 px-2 py-1 rounded-lg text-[10px] text-blue-700 whitespace-nowrap">
                      <i className="fas fa-file-alt"></i>
                      <span className="max-w-[80px] truncate">{f.name}</span>
                      <button onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))} className="hover:text-red-500 ml-1"><i className="fas fa-times"></i></button>
                   </div>
                ))}
             </div>
          )}

          {/* Input Area */}
          {!contextPanelOpen && (
            <div className="p-3 bg-white border-t border-gray-100 shrink-0">
               {/* AI卡片创建快捷按钮 */}
               <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="text-[10px] text-gray-400 py-1">快捷创建:</span>
                  {[
                    { cmd: '/角色 ', icon: 'fa-user', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200', category: 'card-character' },
                    { cmd: '/地点 ', icon: 'fa-map-marker-alt', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200', category: 'card-location' },
                    { cmd: '/势力 ', icon: 'fa-flag', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200', category: 'card-faction' },
                    { cmd: '/时间线 ', icon: 'fa-clock', color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200', category: 'card-timeline' },
                    { cmd: '/规则 ', icon: 'fa-cogs', color: 'bg-rose-100 text-rose-700 hover:bg-rose-200', category: 'card-rule' },
                    { cmd: '/魔法体系 ', icon: 'fa-bolt', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200', category: 'card-magic' },
                    { cmd: '/科技水平 ', icon: 'fa-microchip', color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200', category: 'card-tech' },
                    { cmd: '/历史背景 ', icon: 'fa-landmark', color: 'bg-stone-100 text-stone-700 hover:bg-stone-200', category: 'card-history' },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(item.cmd);
                        // 自动选择对应类别的默认模板
                        const defaultTemplate = cardPromptTemplates.find(t => t.category === item.category);
                        if (defaultTemplate) {
                          setSelectedCardTemplateId(defaultTemplate.id);
                        }
                      }}
                      className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${item.color}`}
                      title={`点击快速输入 ${item.cmd}`}
                    >
                      <i className={`fas ${item.icon} mr-1`}></i>
                      {item.cmd.trim()}
                    </button>
                  ))}
               </div>
               
               {/* 模板选择器 - 当输入以"/"开头时显示 */}
               {input.startsWith('/') && cardPromptTemplates.length > 0 && (
                 <div className="flex items-center gap-2 mb-2 px-1">
                   <span className="text-[10px] text-gray-400">模板:</span>
                   <select
                     value={selectedCardTemplateId || ''}
                     onChange={(e) => setSelectedCardTemplateId(e.target.value || null)}
                     className="flex-1 text-[10px] bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                   >
                     <option value="">使用默认模板</option>
                     {cardPromptTemplates
                       .filter(t => input.includes('/角色') ? t.category === 'card-character' :
                                   input.includes('/地点') ? t.category === 'card-location' :
                                   input.includes('/势力') ? t.category === 'card-faction' :
                                   input.includes('/时间线') || input.includes('/事件') ? t.category === 'card-timeline' :
                                   input.includes('/规则') || input.includes('/体系') ? t.category === 'card-rule' :
                                   input.includes('/魔法') || input.includes('/修炼') ? t.category === 'card-magic' :
                                   input.includes('/科技') ? t.category === 'card-tech' :
                                   input.includes('/历史') ? t.category === 'card-history' : true)
                       .map(t => (
                         <option key={t.id} value={t.id}>{t.name}</option>
                       ))}
                   </select>
                   {selectedCardTemplateId && (
                     <button
                       onClick={() => setSelectedCardTemplateId(null)}
                       className="text-[10px] text-gray-400 hover:text-red-500"
                       title="重置为默认模板"
                     >
                       <i className="fas fa-times"></i>
                     </button>
                   )}
                 </div>
               )}
               <div className="flex gap-2 items-end">
                  <label className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors">
                     <i className="fas fa-paperclip text-lg"></i>
                     <input type="file" multiple className="hidden" onChange={handleFileUpload} accept=".txt,.md,.json,.js,.ts,.csv" />
                  </label>
                  <textarea 
                    className="flex-1 max-h-32 min-h-[40px] bg-gray-50 border-none rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none resize-none custom-scrollbar"
                    placeholder="输入问题，或使用 /角色 /地点 /势力 等命令快速创建... (Shift+Enter 换衍)"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                       if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                       }
                    }}
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={isLoading || (!input.trim() && pendingFiles.length === 0)}
                    className={`p-2.5 rounded-xl text-white transition-all shadow-lg ${
                       isLoading || (!input.trim() && pendingFiles.length === 0)
                         ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                         : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-200'
                    }`}
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
               </div>
            </div>
          )}
          
          {/* Resize Handle */}
          <div 
             className={`absolute bottom-0 right-0 w-4 h-4 z-10 ${isLocked ? 'cursor-not-allowed' : 'cursor-se-resize'}`}
             onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                
                // 如果窗口被锁定，不启动调整大小
                if (isLocked) return;
                
                const startX = e.clientX;
                const startY = e.clientY;
                const startW = size.width;
                const startH = size.height;
                
                const handleResize = (ev: MouseEvent) => {
                   setSize({
                      width: Math.max(300, startW + (ev.clientX - startX)),
                      height: Math.max(400, startH + (ev.clientY - startY))
                   });
                };
                const stopResize = () => {
                   window.removeEventListener('mousemove', handleResize);
                   window.removeEventListener('mouseup', stopResize);
                };
                window.addEventListener('mousemove', handleResize);
                window.addEventListener('mouseup', stopResize);
             }}
             title={isLocked ? "窗口已锁定，无法调整大小" : "拖动调整窗口大小"}
          />
        </>
      )}
    </div>
  );
};

export default GlobalAssistant;
