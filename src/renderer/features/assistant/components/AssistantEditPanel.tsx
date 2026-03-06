import React from 'react';
import type { AssistantEditPanelProps } from '../types';

const AssistantEditPanel: React.FC<AssistantEditPanelProps> = ({
  project,
  editCategory,
  editingData,
  syncStatus,
  characterGenerationPrompt,
  isGeneratingCharacter,
  setEditingData,
  setEditCategory,
  setSyncStatus,
  setEditPanelOpen,
  setCharacterGenerationPrompt,
  handleOpenEditPanel,
  handleSaveEdit,
  handleGenerateCharacter,
  getChapterContent,
}) => {
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

export default AssistantEditPanel;
