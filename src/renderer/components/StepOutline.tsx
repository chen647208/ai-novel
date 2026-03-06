
import React, { useState, useMemo, useRef } from 'react';
import { Project, PromptTemplate, ModelConfig, StreamingAIResponse, OutputMode } from '../types';
import { AIService } from '../services/aiService';

interface StepOutlineProps {
  project: Project;
  prompts: PromptTemplate[];
  activeModel: ModelConfig;
  onUpdate: (updates: Partial<Project>) => void;
  onOpenSettings: () => void;
}

const StepOutline: React.FC<StepOutlineProps> = ({ project, prompts, activeModel, onUpdate, onOpenSettings }) => {
  const [loading, setLoading] = useState(false);
  const outlinePrompts = useMemo(() => prompts.filter(p => p.category === 'outline'), [prompts]);
  const [selectedPromptId, setSelectedPromptId] = useState(outlinePrompts[0]?.id || '');
  
  // 输出模式状态
  const [outputMode, setOutputMode] = useState<OutputMode>('streaming');
  
  // 流式输出状态
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingTokens, setStreamingTokens] = useState({ prompt: 0, completion: 0, total: 0 });
  const [isComplete, setIsComplete] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 传统输出token状态
  const [traditionalTokens, setTraditionalTokens] = useState({ prompt: 0, completion: 0, total: 0 });
  
  // Knowledge Base Selection State
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<Set<string>>(new Set());
  
  // 直接读取结果或使用流式内容
  const outlineContent = isStreaming ? streamingContent : (project.outline || '');

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
      onUpdate({ outline: finalContent });
      
      // 创建AI历史记录（流式输出模式）
      if (finalPrompt) {
        const historyRecord = AIService.buildHistoryRecordData(
          'outline-virtual-chapter', // 虚拟章节ID
          finalPrompt,
          finalContent,
          activeModel,
          response,
          {
            templateName: prompts.find(p => p.id === selectedPromptId)?.name || '大纲生成模板',
            batchGeneration: false,
            chapterTitle: '大纲生成'
          }
        );
        
        // 将历史记录添加到虚拟章节
        const updatedVirtualChapters = project.virtualChapters || [];
        const outlineChapter = updatedVirtualChapters.find(c => c.id === 'outline-virtual-chapter') || {
          id: 'outline-virtual-chapter',
          title: '大纲生成',
          summary: '大纲生成历史记录',
          content: '',
          order: -100, // 特殊顺序，使其不在章节列表中显示
          history: []
        };
        
        const existingHistory = outlineChapter.history || [];
        const updatedOutlineChapter = {
          ...outlineChapter,
          history: [...existingHistory, historyRecord]
        };
        
        // 更新虚拟章节列表
        const finalVirtualChapters = updatedVirtualChapters.filter(c => c.id !== 'outline-virtual-chapter');
        finalVirtualChapters.unshift(updatedOutlineChapter);
        
        // 更新项目数据，包含更新后的虚拟章节
        onUpdate({ 
          outline: finalContent,
          virtualChapters: finalVirtualChapters
        });
      }
    }
  };

  // 暂停/继续流式输出
  const togglePauseStreaming = () => {
    setIsPaused(!isPaused);
  };

  // 停止流式输出
  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsComplete(false);
    setLoading(false);
  };

  const generateOutline = async () => {
    // 重置状态 - 先重置传统模式token，但保留流式状态直到流式开始
    setTraditionalTokens({ prompt: 0, completion: 0, total: 0 });
    setIsPaused(false);
    
    setLoading(true);
    let template = prompts.find(p => p.id === selectedPromptId)?.content || '';
    
    // Build a richer character context
    const charDetails = project.characters.map(c => 
      `【${c.name}】(${c.role})\n- 性格：${c.personality}\n- 背景：${c.background}\n- 关系：${c.relationships}`
    ).join('\n\n');
    
    let finalPrompt = template
      .replace('{title}', project.title)
      .replace('{intro}', project.intro)
      .replace('{characters}', charDetails);

    // Inject Knowledge
    if (selectedKnowledgeIds.size > 0) {
       const kContent = project.knowledge
         .filter(k => selectedKnowledgeIds.has(k.id))
         .map(k => `【参考资料：${k.name}】\n${k.content.substring(0, 8000)}`)
         .join('\n\n');
       if (kContent) finalPrompt += `\n\n### 必须参考的世界观/设定资料 (Knowledge Base)\n请参考以下资料确保大纲符合设定：\n${kContent}`;
    }

    // 根据用户选择的输出模式决定调用方式
    if (outputMode === 'streaming' && activeModel.supportsStreaming !== false) {
      // 使用流式输出 - 先重置流式状态，然后开始流式
      setStreamingContent('');
      setStreamingTokens({ prompt: 0, completion: 0, total: 0 });
      setIsComplete(false);
      setIsStreaming(true);
      
      // 创建AbortController用于取消请求
      abortControllerRef.current = new AbortController();
      
      try {
        await AIService.callStreaming(activeModel, finalPrompt, (response) => handleStreamingChunk(response, finalPrompt));
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          alert(`流式生成失败: ${error.message}`);
          setIsStreaming(false);
          setLoading(false);
        }
      }
    } else {
      // 使用传统输出或模型不支持流式时回退
      const result = await AIService.call(activeModel, finalPrompt);
      if (result.error) {
        alert(`生成失败: ${result.error}`);
        setLoading(false);
        return;
      }
      
      // 保存传统输出模式的token信息
      if (result.tokens) {
        setTraditionalTokens(result.tokens);
      }
      
      // 创建AI历史记录
      const historyRecord = AIService.buildHistoryRecordData(
        'outline-virtual-chapter', // 虚拟章节ID
        finalPrompt,
        result.content,
        activeModel,
        result,
        {
          templateName: prompts.find(p => p.id === selectedPromptId)?.name || '大纲生成模板',
          batchGeneration: false,
          chapterTitle: '大纲生成'
        }
      );
      
      // 将历史记录添加到虚拟章节
      const updatedVirtualChapters = project.virtualChapters || [];
      const outlineChapter = updatedVirtualChapters.find(c => c.id === 'outline-virtual-chapter') || {
        id: 'outline-virtual-chapter',
        title: '大纲生成',
        summary: '大纲生成历史记录',
        content: '',
        order: -100, // 特殊顺序，使其不在章节列表中显示
        history: []
      };
      
      const existingHistory = outlineChapter.history || [];
      const updatedOutlineChapter = {
        ...outlineChapter,
        history: [...existingHistory, historyRecord]
      };
      
      // 更新虚拟章节列表
      const finalVirtualChapters = updatedVirtualChapters.filter(c => c.id !== 'outline-virtual-chapter');
      finalVirtualChapters.unshift(updatedOutlineChapter);
      
      // 更新项目数据
      onUpdate({ 
        outline: result.content,
        virtualChapters: finalVirtualChapters
      });
      
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-full p-8 flex flex-col gap-6 overflow-hidden">
      <div className="flex justify-between items-end border-b pb-6 border-gray-100">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">小说大纲构思</h2>
          <p className="text-gray-500 mt-1 italic font-medium">深度融合角色动机与世界观，编织命运交织的故事主轴。</p>
        </div>
        <div className="flex gap-4">
          <select 
            value={selectedPromptId}
            onChange={(e) => setSelectedPromptId(e.target.value)}
            className="text-sm border-2 border-gray-100 rounded-xl px-4 py-2 bg-white outline-none focus:border-blue-500 transition-all"
          >
            {outlinePrompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          
          {/* 输出模式选择器 */}
          <select 
            value={outputMode}
            onChange={(e) => setOutputMode(e.target.value as OutputMode)}
            className="text-sm border-2 border-gray-100 rounded-xl px-4 py-2 bg-white outline-none focus:border-blue-500 transition-all"
          >
            <option value="streaming">流式输出</option>
            <option value="traditional">传统输出</option>
          </select>
          
          {/* 流式控制按钮组 */}
          {isStreaming ? (
            <div className="flex gap-2">
              <button 
                onClick={togglePauseStreaming}
                className="px-4 py-3 bg-yellow-500 text-white font-black rounded-xl hover:bg-yellow-600 transition-all shadow-lg shadow-yellow-100 active:scale-95 flex items-center gap-2"
              >
                <i className={`fas ${isPaused ? 'fa-play' : 'fa-pause'}`}></i>
                {isPaused ? '继续生成' : '暂停生成'}
              </button>
              <button 
                onClick={stopStreaming}
                className="px-4 py-3 bg-red-500 text-white font-black rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-100 active:scale-95 flex items-center gap-2"
              >
                <i className="fas fa-stop"></i>
                停止生成
              </button>
            </div>
          ) : (
            <button 
              onClick={generateOutline}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 disabled:bg-gray-400 flex items-center gap-2"
            >
              {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sitemap"></i>}
              {loading ? '正在构建宏大叙事...' : '融合角色生成大纲'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
        {/* Left: Character & Story Reference */}
        <div className="lg:col-span-4 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">当前故事上下文</h4>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-[10px] font-black text-gray-400 block mb-1">作品标题</span>
                <p className="text-sm font-bold text-gray-800">{project.title}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-[10px] font-black text-gray-400 block mb-1">剧情核心</span>
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-6">{project.intro}</p>
              </div>
            </div>
          </div>
          
          {/* Knowledge Base Selection Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">引用知识库资料</h4>
                {(project.knowledge || []).filter(k => k.category === 'outline').length > 0 && (
                   <div className="flex gap-1">
                      <button 
                         onClick={() => {
                            const allIds = (project.knowledge || [])
                              .filter(k => k.category === 'outline')
                              .map(k => k.id);
                            setSelectedKnowledgeIds(new Set(allIds));
                         }}
                         className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-[9px] font-bold transition-all flex items-center gap-1"
                         title="全选所有文件"
                      >
                         <i className="fas fa-check-double text-[8px]"></i> 全选
                      </button>
                      <button 
                         onClick={() => setSelectedKnowledgeIds(new Set())}
                         className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-[9px] font-bold transition-all flex items-center gap-1"
                         title="清空所有选择"
                      >
                         <i className="fas fa-times-circle text-[8px]"></i> 清空
                      </button>
                   </div>
                )}
             </div>
             <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {(project.knowledge || []).filter(k => k.category === 'outline').length === 0 ? <p className="text-xs text-gray-300 italic">暂无资料</p> : 
                  project.knowledge.filter(k => k.category === 'outline').map(k => (
                     <div 
                        key={k.id}
                        onClick={() => {
                           const newSet = new Set(selectedKnowledgeIds);
                           if (newSet.has(k.id)) newSet.delete(k.id); else newSet.add(k.id);
                           setSelectedKnowledgeIds(newSet);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                           selectedKnowledgeIds.has(k.id) ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                        }`}
                     >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedKnowledgeIds.has(k.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-300'}`}>
                           {selectedKnowledgeIds.has(k.id) && <i className="fas fa-check text-[8px]"></i>}
                        </div>
                        <span className={`text-xs font-bold truncate ${selectedKnowledgeIds.has(k.id) ? 'text-emerald-800' : 'text-gray-600'}`}>{k.name}</span>
                     </div>
                  ))
                }
             </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-widest">已录入角色档案 ({project.characters.length})</h4>
              <i className="fas fa-users text-purple-200"></i>
            </div>
            <div className="space-y-3">
              {project.characters.length === 0 ? (
                <p className="text-xs text-gray-400 italic">请先去“角色构建”步骤完善人物信息...</p>
              ) : (
                project.characters.map(c => (
                  <div key={c.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 transition-colors">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-gray-800">{c.name}</span>
                      <span className="text-[9px] px-2 py-0.5 bg-white border rounded-full text-gray-500 font-bold">{c.role}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 line-clamp-2">{c.personality}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Outline Editor */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b bg-gray-50/50 flex justify-between items-center px-8">
              <div className="flex items-center gap-2">
                <i className="fas fa-edit text-gray-400 text-xs"></i>
                <span className="text-xs font-black text-gray-400 tracking-widest uppercase">大纲编辑器</span>
              </div>
              <div className="flex items-center gap-4">
                {/* Token信息显示 */}
                {(isStreaming || isComplete || (outputMode === 'traditional' && traditionalTokens.total > 0)) && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-black text-gray-400">输入:</span>
                      <span className="text-xs font-bold text-blue-600">
                        {isStreaming || isComplete ? streamingTokens.prompt : traditionalTokens.prompt}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-black text-gray-400">输出:</span>
                      <span className="text-xs font-bold text-green-600">
                        {isStreaming || isComplete ? streamingTokens.completion : traditionalTokens.completion}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-black text-gray-400">总计:</span>
                      <span className="text-xs font-bold text-purple-600">
                        {isStreaming || isComplete ? streamingTokens.total : traditionalTokens.total}
                      </span>
                    </div>
                    {isStreaming && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>}
                  </div>
                )}
                <button 
                  onClick={() => onUpdate({ outline: '' })}
                  className="text-[10px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                >
                  重置内容
                </button>
              </div>
            </div>
            <textarea 
              className="flex-1 w-full p-10 text-gray-700 leading-loose outline-none resize-none font-serif text-lg bg-transparent custom-scrollbar"
              value={outlineContent}
              onChange={(e) => onUpdate({ outline: e.target.value })}
              placeholder="融合角色细节的大纲将在这里生成。您可以直接编辑或补充具体的桥段冲突..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepOutline;
