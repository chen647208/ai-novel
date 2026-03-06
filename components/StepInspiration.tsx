
import React, { useState, useRef, useEffect } from 'react';
import { Project, PromptTemplate, ModelConfig, KnowledgeItem, StreamingAIResponse, OutputMode, WorldView } from '../types';
import { AIService } from '../services/aiService';
import WorldViewEditor from './WorldViewEditor';

interface StepInspirationProps {
  project: Project | null;
  prompts: PromptTemplate[];
  activeModel: ModelConfig;
  onUpdate: (updates: Partial<Project>) => void;
}

const StepInspiration: React.FC<StepInspirationProps> = ({ project, prompts, activeModel, onUpdate }) => {
  // 调试日志
  useEffect(() => {
    console.log('StepInspiration组件渲染:', {
      projectId: project?.id,
      projectTitle: project?.title,
      hasKnowledge: project?.knowledge?.length || 0,
      inspiration: project?.inspiration,
      intro: project?.intro
    });
  }, [project]);
  
  const [input, setInput] = useState(project?.inspiration || '');
  const [selectedPromptId, setSelectedPromptId] = useState(prompts.find(p => p.category === 'inspiration')?.id || '');
  const [loading, setLoading] = useState(false);
  
  // 输出模式状态
  const [outputMode, setOutputMode] = useState<OutputMode>('streaming');
  
  // 世界观编辑器显示状态（可选功能）
  const [showWorldView, setShowWorldView] = useState(false);
  
  // 流式输出状态
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingTokens, setStreamingTokens] = useState({ prompt: 0, completion: 0, total: 0 });
  const [isComplete, setIsComplete] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 传统输出模式的token信息
  const [traditionalTokens, setTraditionalTokens] = useState({ prompt: 0, completion: 0, total: 0 });
  
  // Knowledge Base Selection State
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<Set<string>>(new Set());
  
  // 直接读取结果或使用流式内容
  const results = isStreaming ? streamingContent : (project?.intro || '');
  
  // 安全获取知识库数据
  const safeKnowledge = Array.isArray(project?.knowledge) ? project.knowledge : [];
  const inspirationKnowledge = safeKnowledge.filter(k => k && k.category === 'inspiration');

  // 流式回调处理函数
  const handleStreamingChunk = (response: StreamingAIResponse, finalPrompt?: string) => {
    if (response.content) {
      setStreamingContent(prev => prev + response.content);
    }
    if (response.tokens) {
      setStreamingTokens(response.tokens);
    }
    if (response.isComplete) {
      setIsComplete(true);
      setIsStreaming(false);
      setLoading(false);
      
      // 流式完成后更新项目数据
      const finalContent = streamingContent + (response.content || '');
      const firstLine = finalContent.split('\n')[0].replace(/[#*]/g, '').trim();
      
      // 创建AI历史记录
      const historyRecord = AIService.buildHistoryRecordData(
        'inspiration-virtual-chapter', // 虚拟章节ID
        finalPrompt || '', // 使用传递的finalPrompt
        finalContent,
        activeModel,
        response,
        {
          templateName: prompts.find(p => p.id === selectedPromptId)?.name || '灵感生成模板',
          batchGeneration: false,
          chapterTitle: '灵感生成'
        }
      );
      
      // 安全处理虚拟章节
      const updatedVirtualChapters = Array.isArray(project?.virtualChapters) ? project.virtualChapters : [];
      const inspirationChapter = updatedVirtualChapters.find(c => c && c.id === 'inspiration-virtual-chapter') || {
        id: 'inspiration-virtual-chapter',
        title: '灵感生成',
        summary: '灵感生成历史记录',
        content: '',
        order: -100, // 特殊顺序，放在最前面
        history: []
      };
      
      const existingHistory = Array.isArray(inspirationChapter.history) ? inspirationChapter.history : [];
      const updatedInspirationChapter = {
        ...inspirationChapter,
        history: [...existingHistory, historyRecord]
      };
      
      // 更新虚拟章节列表
      const finalVirtualChapters = updatedVirtualChapters.filter(c => c && c.id !== 'inspiration-virtual-chapter');
      finalVirtualChapters.unshift(updatedInspirationChapter);
      
      // 安全处理项目标题
      const currentTitle = project?.title;
      const newTitle = currentTitle && currentTitle !== '新小说' ? currentTitle : (firstLine || '未命名小说');
      
      onUpdate({ 
        inspiration: input, 
        intro: finalContent,
        title: newTitle,
        virtualChapters: finalVirtualChapters
      });
    }
  };

  // 暂停/继续流式输出
  const handlePauseResume = () => {
    if (isPaused) {
      setIsPaused(false);
    } else {
      setIsPaused(true);
    }
  };

  // 停止流式输出
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setLoading(false);
    setIsPaused(false);
  };

  const generate = async () => {
    if (!input) return;
    
    // 重置流式状态
    setStreamingContent('');
    setStreamingTokens({ prompt: 0, completion: 0, total: 0 });
    setIsComplete(false);
    setIsPaused(false);
    
    setLoading(true);
    setIsStreaming(true);
    
    const promptTemplate = prompts.find(p => p.id === selectedPromptId)?.content || '{inspiration}';
    let finalPrompt = promptTemplate.replace('{inspiration}', input);
    
    // Inject Knowledge
    if (project && project.knowledge && selectedKnowledgeIds.size > 0) {
       const kContent = project.knowledge
         .filter(k => k && selectedKnowledgeIds.has(k.id))
         .map(k => {
           const name = k.name || '未命名资料';
           const content = typeof k.content === 'string' ? k.content.substring(0, 8000) : '';
           return `【参考资料：${name}】\n${content}`;
         })
         .join('\n\n');
       if (kContent) finalPrompt += `\n\n### 参考世界观/设定资料 (Knowledge Base)\n请务必参考以下资料进行构思：\n${kContent}`;
    }

    try {
      // 创建新的AbortController用于取消请求
      abortControllerRef.current = new AbortController();
      
      // 根据输出模式选择调用方式
      if (outputMode === 'streaming' && activeModel.supportsStreaming !== false) {
        await AIService.callStreaming(
          activeModel,
          finalPrompt,
          (response) => handleStreamingChunk(response, finalPrompt)
        );
      } else {
        // 使用传统方法
        const result = await AIService.call(activeModel, finalPrompt);
        if (result.error) {
          alert(`生成失败: ${result.error}`);
          return;
        }
        
        // 保存传统输出模式的token信息
        if (result.tokens) {
          setTraditionalTokens(result.tokens);
        } else {
          setTraditionalTokens({ prompt: 0, completion: 0, total: 0 });
        }
        
        // 创建AI历史记录（传统输出模式）
        const historyRecord = AIService.buildHistoryRecordData(
          'inspiration-virtual-chapter', // 虚拟章节ID
          finalPrompt,
          result.content,
          activeModel,
          result,
          {
            templateName: prompts.find(p => p.id === selectedPromptId)?.name || '灵感生成模板',
            batchGeneration: false,
            chapterTitle: '灵感生成'
          }
        );
        
        // 将历史记录添加到虚拟章节
        const updatedVirtualChapters = project?.virtualChapters || [];
        const inspirationChapter = updatedVirtualChapters.find(c => c.id === 'inspiration-virtual-chapter') || {
          id: 'inspiration-virtual-chapter',
          title: '灵感生成',
          summary: '灵感生成历史记录',
          content: '',
          order: -100, // 特殊顺序，放在最前面
          history: []
        };
        
        const existingHistory = inspirationChapter.history || [];
        const updatedInspirationChapter = {
          ...inspirationChapter,
          history: [...existingHistory, historyRecord]
        };
        
        // 更新虚拟章节列表
        const finalVirtualChapters = updatedVirtualChapters.filter(c => c.id !== 'inspiration-virtual-chapter');
        finalVirtualChapters.unshift(updatedInspirationChapter);
        
        // 更新项目数据
        const firstLine = result.content.split('\n')[0].replace(/[#*]/g, '').trim();
        onUpdate({ 
          inspiration: input, 
          intro: result.content,
          title: project?.title && project.title !== '新小说' ? project.title : (firstLine || '未命名小说'),
          virtualChapters: finalVirtualChapters
        });
        setIsStreaming(false);
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('流式输出已停止');
      } else {
        alert("生成失败，请检查模型设置");
        console.error(e);
      }
    } finally {
      if (!isStreaming) {
        setLoading(false);
      }
    }
  };

  const handleClear = () => {
    if (window.confirm("确定要清空当前的灵感和生成结果吗？")) {
      setInput('');
      onUpdate({ inspiration: '', intro: '' });
    }
  };

  const toggleKnowledge = (id: string) => {
     const newSet = new Set(selectedKnowledgeIds);
     if (newSet.has(id)) newSet.delete(id);
     else newSet.add(id);
     setSelectedKnowledgeIds(newSet);
  };

  const selectAllKnowledge = () => {
     const allIds = (project?.knowledge || [])
       .filter(k => k.category === 'inspiration')
       .map(k => k.id);
     setSelectedKnowledgeIds(new Set(allIds));
  };

  const clearAllKnowledge = () => {
     setSelectedKnowledgeIds(new Set());
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = e.target.files;
    const newItems: KnowledgeItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // 简单限制：仅处理文本文件
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
        try {
            const text = await file.text();
            // Consistent ID generation with StepKnowledge
            const uniqueId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9) + '_' + i;
            newItems.push({
                id: uniqueId,
                name: file.name,
                content: text,
                type: file.name.split('.').pop() || 'txt',
                size: file.size,
                addedAt: Date.now(),
                category: 'inspiration' as const
            });
        } catch (err) {
            console.error("读取文件失败", err);
            alert(`读取文件 ${file.name} 失败`);
        }
      } else {
        alert(`文件 ${file.name} 格式不支持。仅支持纯文本格式 (txt, md, json 等)。`);
      }
    }

    if (newItems.length > 0) {
      const currentKnowledge = project?.knowledge || [];
      // 更新项目数据
      onUpdate({ knowledge: [...currentKnowledge, ...newItems] });
      
      // 自动选中新上传的文件
      const newSet = new Set(selectedKnowledgeIds);
      newItems.forEach(item => newSet.add(item.id));
      setSelectedKnowledgeIds(newSet);
    }
    
    // 清空 input 防止重复选择同一文件不触发 onChange
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm">1</span>
            输入灵感碎片
          </h3>
          {(input || results) && (
            <button onClick={handleClear} className="text-xs text-gray-400 hover:text-red-500 font-bold transition-colors">
              <i className="fas fa-trash-alt mr-1"></i>清空内容
            </button>
          )}
        </div>
        
        <textarea
          value={input}
          onChange={(e) => {
             setInput(e.target.value);
             // Sync to project state immediately
             onUpdate({ inspiration: e.target.value });
          }}
          placeholder="输入你的初始灵感、题材、关键词或是一段简短的背景描述..."
          className="w-full h-40 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all text-gray-700"
        />
        
        {/* Knowledge Base Selection */}
        <div className="mt-4 border-t border-gray-100 pt-4">
             <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <i className="fas fa-book-atlas text-blue-500"></i>
                    <span className="text-xs font-bold text-gray-500">引用知识库 (可选)</span>
                </div>
                {(project?.knowledge || []).filter(k => k.category === 'inspiration').length > 0 && (
                   <div className="flex gap-1">
                      <button 
                         onClick={selectAllKnowledge}
                         className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-[9px] font-bold transition-all flex items-center gap-1"
                         title="全选所有文件"
                      >
                         <i className="fas fa-check-double text-[8px]"></i> 全选
                      </button>
                      <button 
                         onClick={clearAllKnowledge}
                         className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-[9px] font-bold transition-all flex items-center gap-1"
                         title="清空所有选择"
                      >
                         <i className="fas fa-times-circle text-[8px]"></i> 清空
                      </button>
                   </div>
                )}
                <label className="cursor-pointer px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-500 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 border border-transparent hover:border-blue-100">
                    <i className="fas fa-cloud-upload-alt"></i> 上传新资料
                    <input type="file" multiple className="hidden" onChange={handleFileUpload} accept=".txt,.md,.json,.csv" />
                </label>
             </div>
             
             {inspirationKnowledge.length === 0 ? (
                <div className="text-xs text-gray-400 italic pl-6 bg-gray-50/50 py-3 rounded-lg border border-dashed border-gray-200 text-center">
                   暂无知识库文件，请点击右上方按钮上传<br/>
                   <span className="text-[10px] opacity-70">支持 .txt, .md (上传后将自动创建项目)</span>
                </div>
             ) : (
                <div className="max-h-48 overflow-y-auto custom-scrollbar pr-2">
                   <div className="flex flex-wrap gap-2">
                      {inspirationKnowledge.map(k => k && (
                         <button
                           key={k.id}
                           onClick={() => toggleKnowledge(k.id)}
                           className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${
                              selectedKnowledgeIds.has(k.id) 
                                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                           }`}
                         >
                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${selectedKnowledgeIds.has(k.id) ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}>
                               {selectedKnowledgeIds.has(k.id) && <i className="fas fa-check text-[6px] text-white"></i>}
                            </div>
                            {k.name || '未命名文件'}
                         </button>
                      ))}
                   </div>
                </div>
             )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-bold">输出模式:</span>
              <select 
                value={outputMode}
                onChange={(e) => setOutputMode(e.target.value as OutputMode)}
                className="text-sm border rounded-lg px-3 py-1.5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                <option value="streaming">流式输出</option>
                <option value="traditional">传统输出</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-bold">提示词模板:</span>
              <select 
                value={selectedPromptId}
                onChange={(e) => setSelectedPromptId(e.target.value)}
                className="text-sm border rounded-lg px-3 py-1.5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                {prompts.filter(p => p.category === 'inspiration').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Token 信息显示 */}
            {(isStreaming && streamingTokens.total > 0) || (!isStreaming && traditionalTokens.total > 0) ? (
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-gray-500">Tokens:</span>
                  <span className="text-xs font-bold text-blue-600">
                    {isStreaming ? streamingTokens.total : traditionalTokens.total}
                  </span>
                </div>
                <div className="h-3 w-px bg-gray-300"></div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400">输入:</span>
                  <span className="text-xs font-bold text-gray-600">
                    {isStreaming ? streamingTokens.prompt : traditionalTokens.prompt}
                  </span>
                </div>
                <div className="h-3 w-px bg-gray-300"></div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400">输出:</span>
                  <span className="text-xs font-bold text-gray-600">
                    {isStreaming ? streamingTokens.completion : traditionalTokens.completion}
                  </span>
                </div>
              </div>
            ) : null}
            
            {/* 流式控制按钮 */}
            {isStreaming && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePauseResume}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    isPaused 
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100' 
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <i className={`fas ${isPaused ? 'fa-play' : 'fa-pause'} text-xs`}></i>
                  {isPaused ? '继续' : '暂停'}
                </button>
                <button
                  onClick={handleStopStreaming}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center gap-1.5"
                >
                  <i className="fas fa-stop text-xs"></i>
                  停止
                </button>
              </div>
            )}
            
            {/* 生成按钮 */}
            <button 
              onClick={generate}
              disabled={loading || (!input && selectedKnowledgeIds.size === 0)}
              className={`px-8 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center ${
                loading || (!input && selectedKnowledgeIds.size === 0) ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 active:scale-95'
              }`}
            >
              {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-wand-magic-sparkles mr-2"></i>}
              {loading ? 'AI 正在构思...' : '生成书名与简介'}
            </button>
          </div>
        </div>
      </section>

      {/* ===== 世界观设定（可选增强功能） ===== */}
      <section className="bg-white/50 p-4 rounded-xl border border-gray-200">
        <button
          onClick={() => setShowWorldView(!showWorldView)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              project?.worldView ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
            }`}>
              <i className="fas fa-globe text-lg"></i>
            </div>
            <div>
              <h4 className="font-bold text-gray-800">世界观设定</h4>
              <p className="text-xs text-gray-500">
                {project?.worldView 
                  ? '已配置魔法/科技/历史背景' 
                  : '可选：配置魔法体系、科技水平、历史背景'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {project?.worldView && (
              <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded-lg text-xs font-bold">
                已启用
              </span>
            )}
            <i className={`fas fa-chevron-${showWorldView ? 'up' : 'down'} text-gray-400 transition-transform`}></i>
          </div>
        </button>
        
        {showWorldView && (
          <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in">
            <WorldViewEditor
              projectId={project?.id || ''}
              worldView={project?.worldView}
              onSave={(worldView) => {
                onUpdate({ worldView });
              }}
            />
          </div>
        )}
      </section>

      {results ? (
        <section className="bg-white p-8 rounded-[2rem] shadow-lg border border-gray-100 border-l-8 border-l-blue-500 animate-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-50">
             <div className="flex items-center gap-2">
                <i className="fas fa-robot text-blue-500"></i>
                <h3 className="text-lg font-black text-gray-800">AI 构思方案</h3>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded ml-2 font-bold">可编辑</span>
             </div>
             <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg">
                <span className="text-xs font-bold text-gray-400">书名:</span>
                <input 
                  placeholder="可在此修改书名..."
                  className="text-sm font-bold bg-transparent border-none focus:ring-0 outline-none text-gray-800 w-48"
                  value={project?.title || ''}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                />
                <i className="fas fa-pen text-gray-300 text-xs"></i>
             </div>
          </div>
          <textarea
            className="w-full min-h-[500px] p-4 -ml-4 rounded-xl border-2 border-transparent hover:border-gray-100 focus:border-blue-100 focus:bg-blue-50/10 outline-none resize-y transition-all text-gray-600 leading-loose whitespace-pre-wrap font-medium custom-scrollbar"
            value={results}
            onChange={(e) => onUpdate({ intro: e.target.value })}
            placeholder="AI 生成的方案将显示在这里，您可以自由修改..."
            spellCheck={false}
          />
        </section>
      ) : (
        <div className="text-center py-10 opacity-50">
          <i className="fas fa-lightbulb text-4xl text-gray-200 mb-4"></i>
          <p className="text-gray-400 text-sm">输入灵感或上传资料后，点击生成按钮开始创作旅程</p>
        </div>
      )}
    </div>
  );
};

export default StepInspiration;
