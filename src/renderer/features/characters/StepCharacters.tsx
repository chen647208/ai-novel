
import React, { useState, useMemo, useEffect } from 'react';
import { Project, PromptTemplate, ModelConfig, Character } from '../../../shared/types';
import { AIService } from '../assistant/services/aiService';
import RelationshipDiagram from './RelationshipDiagram';
import CompactCharacterCard from './CompactCharacterCard';
import CharacterModal from './CharacterModal';

interface StepCharactersProps {
  project: Project;
  prompts: PromptTemplate[];
  activeModel: ModelConfig;
  onUpdate: (updates: Partial<Project>) => void;
  onOpenSettings?: () => void;
}

const StepCharacters: React.FC<StepCharactersProps> = ({ project, prompts, activeModel, onUpdate, onOpenSettings }) => {
  const [loading, setLoading] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);
  const [modalCharacterId, setModalCharacterId] = useState<string | null>(null);
  
  // 传统输出模式的token信息
  const [traditionalTokens, setTraditionalTokens] = useState({ prompt: 0, completion: 0, total: 0 });
  
  // Knowledge Base Selection State
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<Set<string>>(new Set());
  
  // 双重确认状态管理
  const [clearConfirm, setClearConfirm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 自动重置确认状态（3秒后自动取消删除状态，防止误触）
  useEffect(() => {
    if (deleteConfirmId) {
      const timer = setTimeout(() => setDeleteConfirmId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteConfirmId]);

  useEffect(() => {
    if (clearConfirm) {
      const timer = setTimeout(() => setClearConfirm(false), 3000);
      return () => clearTimeout(timer);
    }
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
      const titleMatch = sec.match(/(?:书名|标题|##)[:：]?\s*([^\n,，:：]+)/) || 
                         sec.match(/【([^】]+)】/) || 
                         [null, sec.split('\n')[0].replace(/^\d+\s*[.、]\s*/, '').trim()];
      const title = (titleMatch[1] || '未命名故事').replace(/[#*【】]/g, '').trim();
      const summary = sec.replace(titleMatch[0] || '', '').replace(/^[，,]\s*/, '').trim();
      return { title, summary };
    });
  }, [project.intro, project.title]);

  const activeInspiration = inspirationOptions[selectedIndex] || { title: project.title, summary: project.intro };

  const parseCharactersFromText = (text: string): Character[] => {
    const chars: Character[] = [];
    const cleanLines = text.replace(/[*#_]/g, '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let activeChar: Partial<Character> | null = null;
    let currentField: keyof Omit<Character, 'birthInfo' | 'ruleSystemLevel' | 'birthDate'> | null = null;

    cleanLines.forEach(line => {
      const nameMatch = line.match(/^(?:角色名|姓名|名字|名称|身份)[:：\s]*(.*)/i);
      if (nameMatch && nameMatch[1].trim()) {
        if (activeChar && activeChar.name) {
          // 为新字段提供默认值
          const completeChar: Character = {
            id: Math.random().toString(36).substr(2, 9),
            name: activeChar.name || '',
            gender: activeChar.gender || '未知',
            age: activeChar.age || '未知',
            role: activeChar.role || '主角',
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
          name: nameMatch[1].trim(), 
          gender: '未知',
          age: '未知', 
          role: '主角', 
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
      // 为新字段提供默认值
      const completeChar: Character = {
        id: char.id || Math.random().toString(36).substr(2, 9),
        name: char.name || '',
        gender: char.gender || '未知',
        age: char.age || '未知',
        role: char.role || '主角',
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
    if (!activeInspiration.summary) return;
    
    setLoading(true);

    let finalPrompt = (activePrompt?.content || '').replace('{title}', activeInspiration.title).replace('{intro}', activeInspiration.summary);
    
    // Inject Knowledge
    if (selectedKnowledgeIds.size > 0 && project.knowledge) {
       const kContent = project.knowledge
         .filter(k => selectedKnowledgeIds.has(k.id))
         .map(k => `【参考资料：${k.name}】\n${k.content.substring(0, 8000)}`)
         .join('\n\n');
       if (kContent) finalPrompt += `\n\n### 必须参考的世界观/设定资料 (Knowledge Base)\n请务必参考以下设定资料来构建角色（如种族、职业、阵营等）：\n${kContent}`;
    }

    try {
      // 使用传统调用
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
            templateName: activePrompt?.name || '角色生成模板',
            batchGeneration: false,
            chapterTitle: '角色生成'
          }
        );
        
        // 将历史记录添加到虚拟章节
        const updatedVirtualChapters = project.virtualChapters || [];
        const charactersChapter = updatedVirtualChapters.find(c => c.id === 'characters-virtual-chapter') || {
          id: 'characters-virtual-chapter',
          title: '角色生成',
          summary: '角色生成历史记录',
          content: '',
          order: -100, // 特殊顺序，使其不在章节列表中显示
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
        });
      } else {
        alert("识别失败，请检查模型输出格式。");
      }
    } catch (err) {
      console.error(err);
      alert("生成过程中发生错误。");
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
    <div className="max-w-7xl mx-auto h-full flex flex-col p-8 space-y-6 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 overflow-hidden">
        
        {/* 左侧：世界观与策略 */}
        <div className="lg:col-span-4 flex flex-col space-y-6 overflow-y-auto pr-2 pb-10 custom-scrollbar text-left">
          <div className="bg-gray-900 rounded-[2rem] p-6 text-white shadow-2xl relative border border-white/5">
            <header className="mb-6 flex justify-between">
              <div className="text-left">
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">AI 核心策略</h4>
                <p className="text-[10px] text-gray-400">基于世界观自动塑造灵魂</p>
              </div>
              <button onClick={onOpenSettings} className="text-gray-500 hover:text-white transition-colors"><i className="fas fa-cog"></i></button>
            </header>
            
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-left">
                 <span className="text-[9px] text-gray-500 block mb-0.5">选择解析模板</span>
                 <select value={selectedPromptId} onChange={(e) => setSelectedPromptId(e.target.value)} className="w-full bg-transparent border-none p-0 text-white font-bold outline-none cursor-pointer text-[11px]">
                  {characterPrompts.map(p => <option key={p.id} value={p.id} className="bg-gray-900">{p.name}</option>)}
                </select>
              </div>
              
              {/* 生成按钮 */}
              <div className="space-y-3">
                <button 
                  onClick={generateCharacters} 
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95"
                >
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-wand-sparkles text-[10px]"></i>}
                  <span>{loading ? '正在挖掘角色档案...' : '一键生成世界体系'}</span>
                </button>
                
                {/* Token消耗显示 */}
                {traditionalTokens.total > 0 && (
                  <div className="bg-white/10 border border-white/20 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="text-[8px] font-black text-gray-300 uppercase tracking-widest">输入Token</div>
                        <div className="text-xs font-bold text-blue-300">
                          {traditionalTokens.prompt}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[8px] font-black text-gray-300 uppercase tracking-widest">输出Token</div>
                        <div className="text-xs font-bold text-green-300">
                          {traditionalTokens.completion}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[8px] font-black text-gray-300 uppercase tracking-widest">总计</div>
                        <div className="text-xs font-bold text-purple-300">
                          {traditionalTokens.total}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-[10px] text-gray-300">生成完成</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 世界蓝本选择 */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm text-left">
            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">世界蓝本选择</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {inspirationOptions.map((opt, idx) => (
                <div key={idx} onClick={() => setSelectedIndex(idx)} className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all ${selectedIndex === idx ? 'border-blue-500 bg-blue-50/50' : 'border-gray-50 bg-gray-50 hover:border-gray-200'}`}>
                  <h5 className="font-bold text-gray-800 text-[10px] truncate">{idx + 1}. {opt.title}</h5>
                </div>
              ))}
            </div>
          </div>

          {/* Knowledge Base Selection Card */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm text-left">
             <div className="flex justify-between items-center mb-3">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">引用知识库资料</h4>
                {(project.knowledge || []).filter(k => k.category === 'character').length > 0 && (
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
             </div>
             <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {(project.knowledge || []).filter(k => k.category === 'character').length === 0 ? <p className="text-xs text-gray-300 italic">暂无资料</p> : 
                  project.knowledge.filter(k => k.category === 'character').map(k => (
                     <div 
                        key={k.id}
                        onClick={() => toggleKnowledge(k.id)}
                        className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                           selectedKnowledgeIds.has(k.id) ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-50 hover:border-gray-200'
                        }`}
                     >
                        <div className={`w-3 h-3 rounded border flex items-center justify-center ${selectedKnowledgeIds.has(k.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-300'}`}>
                           {selectedKnowledgeIds.has(k.id) && <i className="fas fa-check text-[6px]"></i>}
                        </div>
                        <span className={`text-[10px] font-bold truncate ${selectedKnowledgeIds.has(k.id) ? 'text-emerald-800' : 'text-gray-600'}`}>{k.name}</span>
                     </div>
                  ))
                }
             </div>
          </div>
          
          <button onClick={() => setShowDiagram(true)} className="w-full py-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center gap-2 border border-emerald-100">
            <i className="fas fa-project-diagram"></i> 开启命运关系图谱
          </button>
        </div>

        {/* 右侧：角色档案列表 */}
        <div className="lg:col-span-8 flex flex-col h-full bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden">
          <div className="px-10 py-6 border-b flex justify-between items-center bg-gray-50/30">
            <div className="text-left">
              <h3 className="text-xl font-black text-gray-900 tracking-tighter">世界与角色档案库</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">LOCAL DATA ARCHIVE ({project.characters?.length || 0})</p>
            </div>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={handleClearClick}
                disabled={(project.characters || []).length === 0}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 border ${
                  clearConfirm
                    ? 'bg-red-600 text-white border-red-600 hover:bg-red-700 animate-pulse'
                    : (project.characters || []).length === 0 
                      ? 'text-gray-300 border-gray-100 bg-gray-50 cursor-not-allowed opacity-50' 
                      : 'text-red-500 border-red-100 bg-red-50 hover:bg-red-100'
                }`}
              >
                <i className={`fas ${clearConfirm ? 'fa-exclamation-circle' : 'fa-trash-can'} text-[9px]`}></i> 
                {clearConfirm ? '确定清空？' : '清空库'}
              </button>
              <button 
                type="button"
                onClick={() => onUpdate({ 
                  characters: [...(project.characters || []), { 
                    id: Date.now().toString(), 
                    name: '新角色', 
                    gender: '未知',
                    age: '未知', 
                    role: '主角', 
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
                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg active:scale-95"
              >
                <i className="fas fa-plus text-[9px]"></i> 手动添加
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-10 bg-gray-50/20 custom-scrollbar">
            {(project.characters || []).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-gray-300">
                <i className="fas fa-user-tag text-5xl mb-6 opacity-20"></i>
                <h3 className="text-base font-black text-gray-400">目前没有任何档案</h3>
                <p className="text-[10px] mt-2 opacity-60">请从左侧一键生成或手动点击右上角"手动添加"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(project.characters || []).map((char) => (
                  <div key={char.id} className="relative group">
                    <CompactCharacterCard
                      character={char}
                      onClick={() => handleOpenModal(char.id)}
                    />
                    {/* 删除按钮 - 悬浮在卡片右上角 */}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(char.id);
                      }}
                      className={`absolute top-4 right-4 z-10 w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                        deleteConfirmId === char.id 
                          ? 'bg-red-500 text-white w-20' 
                          : 'bg-white/80 backdrop-blur-sm text-gray-400 hover:text-red-500 hover:bg-red-50/80'
                      }`}
                    >
                      {deleteConfirmId === char.id ? (
                        <span className="text-xs font-bold animate-pulse">删除?</span>
                      ) : (
                        <i className="fas fa-trash-alt text-sm"></i>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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








