import React, { useState } from 'react';
import { Character, Project, Faction, Location, RuleSystem } from '../../../shared/types';

interface CharacterModalProps {
  character: Character;
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<Character>) => void;
}

const CharacterModal: React.FC<CharacterModalProps> = ({ character, project, isOpen, onClose, onUpdate }) => {
  if (!isOpen) return null;

  // 根据角色类型获取颜色
  const getRoleColor = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('主')) return 'text-amber-600';
    if (roleLower.includes('反')) return 'text-red-600';
    if (roleLower.includes('配')) return 'text-blue-600';
    return 'text-gray-600';
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackgroundClick}
    >
      <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[98vh] overflow-hidden shadow-2xl flex flex-col">
        {/* 模态窗口头部 - 固定高度不滚动 */}
        <div className="px-10 py-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-start flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <i className="fas fa-user-tag text-blue-500 text-xl"></i>
            </div>
            <div className="flex-1">
              <div className="mb-2">
                <label className="text-xs font-bold text-gray-500 block mb-1">角色名字</label>
                <input 
                  className="w-full text-lg font-black text-gray-900 bg-white px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  value={character.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder="输入角色名字"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 block mb-1">角色类型</label>
                  <select 
                    className={`w-full text-xs font-black px-3 py-1.5 rounded-lg border ${getRoleColor(character.role)} bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300`}
                    value={character.role}
                    onChange={(e) => onUpdate({ role: e.target.value })}
                  >
                    <option value="主角">主角</option>
                    <option value="反派">反派</option>
                    <option value="配角">配角</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 block mb-1">性别</label>
                  <select 
                    className="w-full text-xs font-black px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    value={character.gender}
                    onChange={(e) => onUpdate({ gender: e.target.value })}
                  >
                    <option value="男">男</option>
                    <option value="女">女</option>
                    <option value="其他">其他</option>
                    <option value="未知">未知</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 block mb-1">年龄</label>
                  <input 
                    className="w-full text-xs text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    value={character.age}
                    onChange={(e) => onUpdate({ age: e.target.value })}
                    placeholder="例如：25岁"
                  />
                </div>
              </div>
              
              {/* Phase 3: 出生信息（可选） */}
              <BirthInfoEditor character={character} onUpdate={onUpdate} />
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* 模态窗口内容 - 可滚动区域，自动填充剩余空间 */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 左侧列：基本信息和外观 */}
            <div className="space-y-8">
              {/* 基本信息卡片 */}
              <div className="bg-blue-50/20 p-6 rounded-3xl border border-blue-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <i className="fas fa-id-card text-blue-400"></i>
                  <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">基本信息</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">职业/身份</label>
                    <input 
                      className="w-full text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      value={character.occupation || ''}
                      onChange={(e) => onUpdate({ occupation: e.target.value })}
                      placeholder="例如：骑士、法师、商人..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">动机/目标</label>
                    <textarea 
                      className="w-full h-24 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 resize-none"
                      value={character.motivation || ''}
                      onChange={(e) => onUpdate({ motivation: e.target.value })}
                      placeholder="角色的核心驱动力和目标..."
                    />
                  </div>
                </div>
              </div>

              {/* 外观特征卡片 */}
              <div className="bg-purple-50/20 p-6 rounded-3xl border border-purple-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <i className="fas fa-eye text-purple-400"></i>
                  <h3 className="text-[10px] font-black text-purple-600 uppercase tracking-widest">外观特征</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">外观描述</label>
                    <textarea 
                      className="w-full h-32 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-100 focus:border-purple-300 resize-none"
                      value={character.appearance || ''}
                      onChange={(e) => onUpdate({ appearance: e.target.value })}
                      placeholder="身高、体型、发色、眼睛颜色、服装风格等..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">标志性特征</label>
                    <textarea 
                      className="w-full h-20 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-100 focus:border-purple-300 resize-none"
                      value={character.distinctiveFeatures || ''}
                      onChange={(e) => onUpdate({ distinctiveFeatures: e.target.value })}
                      placeholder="特别的标记、饰品、疤痕、纹身等..."
                    />
                  </div>
                </div>
              </div>

              {/* 性格特征卡片 */}
              <div className="bg-amber-50/20 p-6 rounded-3xl border border-amber-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <i className="fas fa-brain text-amber-400"></i>
                  <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">性格特征</h3>
                </div>
                <textarea 
                  className="w-full h-40 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-100 focus:border-amber-300 resize-none"
                  value={character.personality || ''}
                  onChange={(e) => onUpdate({ personality: e.target.value })}
                  placeholder="性格特点、价值观、习惯、口头禅等..."
                />
              </div>
            </div>

            {/* 右侧列：背景和能力 */}
            <div className="space-y-8">
              {/* 背景设定卡片 */}
              <div className="bg-emerald-50/20 p-6 rounded-3xl border border-emerald-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <i className="fas fa-scroll text-emerald-400"></i>
                  <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">背景设定</h3>
                </div>
                <textarea 
                  className="w-full h-40 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 resize-none"
                  value={character.background || ''}
                  onChange={(e) => onUpdate({ background: e.target.value })}
                  placeholder="出身、家庭背景、重要经历、转折点等..."
                />
              </div>

              {/* 能力与弱点卡片 */}
              <div className="bg-red-50/20 p-6 rounded-3xl border border-red-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <i className="fas fa-shield-alt text-red-400"></i>
                  <h3 className="text-[10px] font-black text-red-600 uppercase tracking-widest">能力与弱点</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">优势/能力</label>
                    <textarea 
                      className="w-full h-24 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-100 focus:border-red-300 resize-none"
                      value={character.strengths || ''}
                      onChange={(e) => onUpdate({ strengths: e.target.value })}
                      placeholder="特殊技能、天赋、装备、资源等..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">弱点/缺陷</label>
                    <textarea 
                      className="w-full h-24 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-100 focus:border-red-300 resize-none"
                      value={character.weaknesses || ''}
                      onChange={(e) => onUpdate({ weaknesses: e.target.value })}
                      placeholder="生理/心理弱点、恐惧、限制、创伤等..."
                    />
                  </div>
                </div>
              </div>

              {/* 关系网和成长弧线 */}
              <div className="grid grid-cols-1 gap-8">
                {/* 关系网卡片 */}
                <div className="bg-indigo-50/20 p-6 rounded-3xl border border-indigo-50/50">
                  <div className="flex items-center gap-3 mb-4">
                    <i className="fas fa-share-nodes text-indigo-400"></i>
                    <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">角色关系网</h3>
                  </div>
                  <textarea 
                    className="w-full h-32 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-none"
                    value={character.relationships || ''}
                    onChange={(e) => onUpdate({ relationships: e.target.value })}
                    placeholder="与其他角色的关系、社交网络、盟友/敌人等..."
                  />
                </div>

                {/* 成长弧线卡片 */}
                <div className="bg-cyan-50/20 p-6 rounded-3xl border border-cyan-50/50">
                  <div className="flex items-center gap-3 mb-4">
                    <i className="fas fa-chart-line text-cyan-400"></i>
                    <h3 className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">角色成长弧线</h3>
                  </div>
                  <textarea 
                    className="w-full h-32 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-100 focus:border-cyan-300 resize-none"
                    value={character.characterArc || ''}
                    onChange={(e) => onUpdate({ characterArc: e.target.value })}
                    placeholder="角色的发展轨迹、转变过程、最终归宿等..."
                  />
                </div>
              </div>

              {/* 世界关联信息 - 跨两列显示 */}
              <WorldRelationEditor 
                character={character} 
                project={project} 
                onUpdate={onUpdate} 
              />
            </div>
          </div>
        </div>

        {/* 模态窗口底部 */}
        <div className="px-10 py-6 border-t border-gray-100 bg-gray-50/30 flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-gray-900 text-white rounded-xl text-sm font-black hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg"
          >
            <i className="fas fa-check text-xs"></i>
            保存并关闭
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 出生信息编辑器（Phase 3）
 */
interface BirthInfoEditorProps {
  character: Character;
  onUpdate: (updates: Partial<Character>) => void;
}

const BirthInfoEditor: React.FC<BirthInfoEditorProps> = ({ character, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const birthInfo = character.birthInfo || {
    calculationType: 'manual' as const
  };

  const updateBirthInfo = (updates: Partial<Character['birthInfo']>) => {
    onUpdate({
      birthInfo: { ...birthInfo, ...updates } as Character['birthInfo']
    });
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
      >
        <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
        <span>出生信息（可选）</span>
        {birthInfo.date && <span className="text-indigo-500">已设置</span>}
      </button>

      {isExpanded && (
        <div className="mt-3 grid grid-cols-2 gap-3 animate-in fade-in">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">年龄计算方式</label>
            <select
              value={birthInfo.calculationType}
              onChange={(e) => updateBirthInfo({ calculationType: e.target.value as 'manual' | 'auto' })}
              className="w-full text-xs bg-white px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
            >
              <option value="manual">手动输入</option>
              <option value="auto">自动计算（需设置出生日期）</option>
            </select>
          </div>

          {birthInfo.calculationType === 'manual' ? (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">当前年龄</label>
              <input
                type="text"
                value={birthInfo.currentAge || character.age || ''}
                onChange={(e) => updateBirthInfo({ currentAge: e.target.value })}
                placeholder="例如：25岁"
                className="w-full text-xs bg-white px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">故事当前时间</label>
              <input
                type="text"
                value={birthInfo.storyCurrentDate?.display || birthInfo.storyCurrentDate?.year?.toString() || ''}
                onChange={(e) => updateBirthInfo({
                  storyCurrentDate: { year: parseInt(e.target.value) || 0, display: e.target.value }
                })}
                placeholder="例如：第三纪元100年"
                className="w-full text-xs bg-white px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
              />
            </div>
          )}

          {/* 出生日期 */}
          <div className="col-span-2 bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
            <label className="block text-xs font-bold text-indigo-600 mb-2">出生日期</label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">年</label>
                <input
                  type="number"
                  value={birthInfo.date?.year || ''}
                  onChange={(e) => updateBirthInfo({
                    date: { ...birthInfo.date, year: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full text-xs bg-white px-2 py-1.5 rounded border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">月</label>
                <input
                  type="number"
                  value={birthInfo.date?.month || ''}
                  onChange={(e) => updateBirthInfo({
                    date: { ...birthInfo.date, year: birthInfo.date?.year ?? 0, month: e.target.value ? parseInt(e.target.value) : undefined }
                  })}
                  className="w-full text-xs bg-white px-2 py-1.5 rounded border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">日</label>
                <input
                  type="number"
                  value={birthInfo.date?.day || ''}
                  onChange={(e) => updateBirthInfo({
                    date: { ...birthInfo.date, year: birthInfo.date?.year ?? 0, day: e.target.value ? parseInt(e.target.value) : undefined }
                  })}
                  className="w-full text-xs bg-white px-2 py-1.5 rounded border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">显示文本</label>
                <input
                  type="text"
                  value={birthInfo.date?.display || ''}
                  onChange={(e) => updateBirthInfo({
                    date: { ...birthInfo.date, year: birthInfo.date?.year ?? 0, display: e.target.value }
                  })}
                  placeholder="第三纪元元年"
                  className="w-full text-xs bg-white px-2 py-1.5 rounded border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                />
              </div>
            </div>
            
            {/* 年龄预览（自动计算模式下） */}
            {birthInfo.calculationType === 'auto' && birthInfo.date?.year !== undefined && birthInfo.storyCurrentDate?.year !== undefined && (
              <div className="mt-2 text-xs text-indigo-600">
                <i className="fas fa-calculator mr-1"></i>
                计算年龄：{birthInfo.storyCurrentDate.year - birthInfo.date.year} 岁
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 世界关联信息编辑器（Phase 1 Integration）
 * 用于编辑角色与世界观数据的关联
 */
interface WorldRelationEditorProps {
  character: Character;
  project: Project;
  onUpdate: (updates: Partial<Character>) => void;
}

const WorldRelationEditor: React.FC<WorldRelationEditorProps> = ({ character, project, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const factions = project.factions || [];
  const locations = project.locations || [];
  const ruleSystems = project.ruleSystems || [];
  const timeline = project.timeline;

  // 获取角色当前所属的势力
  const currentFaction = factions.find(f => f.id === character.factionId);
  
  // 获取角色出身地点
  const homeLocation = locations.find(l => l.id === character.homeLocationId);
  
  // 获取角色当前地点
  const currentLocation = locations.find(l => l.id === character.currentLocationId);
  
  // 获取角色当前的规则系统
  const currentRuleSystem = ruleSystems.find(r => r.id === character.ruleSystemLevel?.systemId);
  
  // 获取当前等级
  const currentLevel = currentRuleSystem?.levels.find(
    l => l.name === character.ruleSystemLevel?.levelName
  );

  return (
    <div className="col-span-1 lg:col-span-2 bg-gradient-to-r from-amber-50/30 via-orange-50/30 to-red-50/30 p-6 rounded-3xl border border-amber-200/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <i className="fas fa-globe-asia text-amber-500 text-lg"></i>
          <div>
            <h3 className="text-sm font-black text-gray-800">世界关联信息</h3>
            <p className="text-xs text-gray-500">
              {currentFaction || homeLocation || currentLocation 
                ? `已关联: ${[currentFaction?.name, homeLocation?.name].filter(Boolean).join(', ')}`
                : '设置角色在世界中的位置和归属'}
            </p>
          </div>
        </div>
        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-gray-400 transition-transform`}></i>
      </button>

      {isExpanded && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in">
          {/* 所属势力 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <i className="fas fa-flag text-amber-500"></i>
              所属势力
            </label>
            <select
              value={character.factionId || ''}
              onChange={(e) => onUpdate({ factionId: e.target.value || undefined })}
              className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-100 focus:border-amber-300"
            >
              <option value="">-- 无 --</option>
              {factions.map(faction => (
                <option key={faction.id} value={faction.id}>
                  {faction.name} ({faction.type})
                </option>
              ))}
            </select>
            {currentFaction && (
              <div className="text-xs text-gray-500 bg-white/50 p-2 rounded-lg">
                <div className="font-medium text-amber-700">{currentFaction.name}</div>
                <div className="text-gray-400 truncate">{currentFaction.description?.substring(0, 50)}...</div>
              </div>
            )}
          </div>

          {/* 出身地点 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <i className="fas fa-home text-emerald-500"></i>
              出身地点
            </label>
            <select
              value={character.homeLocationId || ''}
              onChange={(e) => onUpdate({ homeLocationId: e.target.value || undefined })}
              className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300"
            >
              <option value="">-- 无 --</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.type})
                </option>
              ))}
            </select>
            {homeLocation && (
              <div className="text-xs text-gray-500 bg-white/50 p-2 rounded-lg">
                <div className="font-medium text-emerald-700">{homeLocation.name}</div>
                <div className="text-gray-400">{homeLocation.type}</div>
              </div>
            )}
          </div>

          {/* 当前地点 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <i className="fas fa-map-marker-alt text-blue-500"></i>
              当前地点
            </label>
            <select
              value={character.currentLocationId || ''}
              onChange={(e) => onUpdate({ currentLocationId: e.target.value || undefined })}
              className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            >
              <option value="">-- 无 --</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.type})
                </option>
              ))}
            </select>
            {currentLocation && (
              <div className="text-xs text-gray-500 bg-white/50 p-2 rounded-lg">
                <div className="font-medium text-blue-700">{currentLocation.name}</div>
                <div className="text-gray-400">{currentLocation.type}</div>
              </div>
            )}
          </div>

          {/* 等级体系 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <i className="fas fa-layer-group text-purple-500"></i>
              等级体系
            </label>
            <div className="space-y-2">
              <select
                value={character.ruleSystemLevel?.systemId || ''}
                onChange={(e) => {
                  const systemId = e.target.value || undefined;
                  onUpdate({ 
                    ruleSystemLevel: systemId ? {
                      systemId,
                      levelName: ''
                    } : undefined
                  });
                }}
                className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-100 focus:border-purple-300"
              >
                <option value="">-- 无 --</option>
                {ruleSystems.map(system => (
                  <option key={system.id} value={system.id}>
                    {system.name}
                  </option>
                ))}
              </select>
              
              {character.ruleSystemLevel?.systemId && currentRuleSystem && (
                <select
                  value={character.ruleSystemLevel.levelName || ''}
                  onChange={(e) => onUpdate({ 
                    ruleSystemLevel: {
                      systemId: character.ruleSystemLevel!.systemId,
                      levelName: e.target.value
                    }
                  })}
                  className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-100 focus:border-purple-300"
                >
                  <option value="">-- 选择等级 --</option>
                  {currentRuleSystem.levels.map(level => (
                    <option key={level.order} value={level.name}>
                      {level.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {currentLevel && (
              <div className="text-xs text-gray-500 bg-white/50 p-2 rounded-lg">
                <div className="font-medium text-purple-700">{currentLevel.name}</div>
                <div className="text-gray-400 truncate">{currentLevel.description?.substring(0, 40)}...</div>
              </div>
            )}
          </div>

          {/* 出生日期 - 如果有时间线 */}
          {timeline && (
            <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-2 pt-4 border-t border-amber-200/30">
              <label className="text-xs font-bold text-gray-600 flex items-center gap-2 mb-3">
                <i className="fas fa-calendar-alt text-indigo-500"></i>
                出生日期 ({timeline.config.calendarSystem})
              </label>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">年</label>
                  <input
                    type="number"
                    value={character.birthDate?.year || ''}
                    onChange={(e) => onUpdate({
                      birthDate: {
                        ...character.birthDate,
                        year: parseInt(e.target.value) || 0
                      }
                    })}
                    className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    placeholder={timeline.config.startYear?.toString() || '0'}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">月</label>
                  <input
                    type="number"
                    value={character.birthDate?.month || ''}
                    onChange={(e) => onUpdate({
                      birthDate: {
                        ...character.birthDate,
                        year: character.birthDate?.year ?? timeline.config.startYear ?? 0,
                        month: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })}
                    className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    placeholder="1-12"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">日</label>
                  <input
                    type="number"
                    value={character.birthDate?.day || ''}
                    onChange={(e) => onUpdate({
                      birthDate: {
                        ...character.birthDate,
                        year: character.birthDate?.year ?? timeline.config.startYear ?? 0,
                        day: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })}
                    className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    placeholder="1-31"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">显示文本</label>
                  <input
                    type="text"
                    value={character.birthDate?.display || ''}
                    onChange={(e) => onUpdate({
                      birthDate: {
                        ...character.birthDate,
                        year: character.birthDate?.year ?? timeline.config.startYear ?? 0,
                        display: e.target.value
                      }
                    })}
                    className="w-full text-sm bg-white px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    placeholder="例如：第三纪元元年"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CharacterModal;






