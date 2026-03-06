import React, { useState, useEffect } from 'react';
import { RuleSystem, RuleSystemType, RuleLevel, Character } from '../../../shared/types';

interface RuleSystemEditorProps {
  projectId: string;
  ruleSystems: RuleSystem[];
  characters: Character[];
  onSave: (ruleSystems: RuleSystem[]) => void;
}

/**
 * 规则系统编辑器组件
 * 
 * 功能：
 * - 创建/编辑/删除规则系统
 * - 支持多种类型：修炼、魔法、科技、货币、组织、职业、称号
 * - 等级/层次管理
 * - 角色关联分配
 */
export const RuleSystemEditor: React.FC<RuleSystemEditorProps> = ({
  projectId,
  ruleSystems,
  characters,
  onSave
}) => {
  const [localRuleSystems, setLocalRuleSystems] = useState<RuleSystem[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 初始化本地状态
  useEffect(() => {
    setLocalRuleSystems(ruleSystems || []);
  }, [ruleSystems]);

  // 获取选中的规则系统
  const selectedSystem = localRuleSystems.find(s => s.id === selectedSystemId);

  // 获取规则类型显示名称
  const getRuleTypeLabel = (type: RuleSystemType): string => {
    const labels: Record<RuleSystemType, string> = {
      cultivation: '修炼体系',
      magic: '魔法等级',
      tech: '科技等级',
      currency: '货币体系',
      organization: '组织制度',
      profession: '职业体系',
      title: '称号/爵位',
      custom: '自定义'
    };
    return labels[type];
  };

  // 获取规则类型图标
  const getRuleTypeIcon = (type: RuleSystemType): string => {
    const icons: Record<RuleSystemType, string> = {
      cultivation: 'fa-dumbbell',
      magic: 'fa-hat-wizard',
      tech: 'fa-microchip',
      currency: 'fa-coins',
      organization: 'fa-sitemap',
      profession: 'fa-briefcase',
      title: 'fa-crown',
      custom: 'fa-cog'
    };
    return icons[type];
  };

  // 获取规则类型颜色
  const getRuleTypeColor = (type: RuleSystemType): string => {
    const colors: Record<RuleSystemType, string> = {
      cultivation: 'text-rose-600 bg-rose-50 border-rose-200',
      magic: 'text-purple-600 bg-purple-50 border-purple-200',
      tech: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      currency: 'text-amber-600 bg-amber-50 border-amber-200',
      organization: 'text-blue-600 bg-blue-50 border-blue-200',
      profession: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      title: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      custom: 'text-gray-600 bg-gray-50 border-gray-200'
    };
    return colors[type];
  };

  // 添加新规则系统
  const addRuleSystem = (type: RuleSystemType) => {
    const newSystem: RuleSystem = {
      id: `rulesystem_${Date.now()}`,
      projectId,
      type,
      name: `新${getRuleTypeLabel(type)}`,
      description: '',
      levels: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setLocalRuleSystems([...localRuleSystems, newSystem]);
    setSelectedSystemId(newSystem.id);
    setHasChanges(true);
  };

  // 更新规则系统
  const updateSystem = (id: string, updates: Partial<RuleSystem>) => {
    setLocalRuleSystems(prev => prev.map(sys => 
      sys.id === id 
        ? { ...sys, ...updates, updatedAt: Date.now() }
        : sys
    ));
    setHasChanges(true);
  };

  // 删除规则系统
  const deleteSystem = (id: string) => {
    if (window.confirm('确定要删除这个规则系统吗？相关的角色关联也会被清除。')) {
      setLocalRuleSystems(prev => prev.filter(sys => sys.id !== id));
      if (selectedSystemId === id) {
        setSelectedSystemId(null);
      }
      setHasChanges(true);
    }
  };

  // 添加等级
  const addLevel = (systemId: string) => {
    const system = localRuleSystems.find(s => s.id === systemId);
    if (!system) return;

    const newLevel: RuleLevel = {
      name: `等级 ${system.levels.length + 1}`,
      description: '',
      order: system.levels.length
    };
    updateSystem(systemId, {
      levels: [...system.levels, newLevel]
    });
  };

  // 更新等级
  const updateLevel = (systemId: string, index: number, updates: Partial<RuleLevel>) => {
    const system = localRuleSystems.find(s => s.id === systemId);
    if (!system) return;

    const newLevels = [...system.levels];
    newLevels[index] = { ...newLevels[index], ...updates };
    updateSystem(systemId, { levels: newLevels });
  };

  // 删除等级
  const removeLevel = (systemId: string, index: number) => {
    const system = localRuleSystems.find(s => s.id === systemId);
    if (!system) return;

    const newLevels = system.levels.filter((_, i) => i !== index);
    // 重新排序
    newLevels.forEach((level, i) => level.order = i);
    updateSystem(systemId, { levels: newLevels });
  };

  // 移动等级
  const moveLevel = (systemId: string, index: number, direction: 'up' | 'down') => {
    const system = localRuleSystems.find(s => s.id === systemId);
    if (!system) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= system.levels.length) return;

    const newLevels = [...system.levels];
    [newLevels[index], newLevels[newIndex]] = [newLevels[newIndex], newLevels[index]];
    // 重新排序
    newLevels.forEach((level, i) => level.order = i);
    updateSystem(systemId, { levels: newLevels });
  };

  // 切换角色关联
  const toggleCharacter = (systemId: string, characterId: string) => {
    const system = localRuleSystems.find(s => s.id === systemId);
    if (!system) return;

    const currentIds = system.appliedToCharacterIds || [];
    const newIds = currentIds.includes(characterId)
      ? currentIds.filter(id => id !== characterId)
      : [...currentIds, characterId];

    updateSystem(systemId, { appliedToCharacterIds: newIds });
  };

  // 保存所有更改
  const handleSave = () => {
    onSave(localRuleSystems);
    setHasChanges(false);
  };

  // 按类型分组的规则系统
  const groupedSystems = localRuleSystems.reduce((acc, system) => {
    if (!acc[system.type]) acc[system.type] = [];
    acc[system.type].push(system);
    return acc;
  }, {} as Record<RuleSystemType, RuleSystem[]>);

  return (
    <div className="space-y-4">
      {/* 添加新规则系统 */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <h4 className="text-sm font-bold text-gray-700 mb-3">添加规则系统</h4>
        <div className="grid grid-cols-4 gap-2">
          {(['cultivation', 'magic', 'tech', 'currency', 'organization', 'profession', 'title', 'custom'] as RuleSystemType[]).map(type => (
            <button
              key={type}
              onClick={() => addRuleSystem(type)}
              className={`p-3 rounded-lg border transition-all text-center hover:shadow-md ${getRuleTypeColor(type)}`}
            >
              <i className={`fas ${getRuleTypeIcon(type)} text-lg mb-1 block`}></i>
              <span className="text-xs font-bold">{getRuleTypeLabel(type)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 规则系统列表 */}
      {localRuleSystems.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <i className="fas fa-cogs text-4xl mb-2 opacity-30"></i>
          <p className="text-sm">暂无规则系统，点击上方按钮添加</p>
        </div>
      ) : (
        <div className="space-y-3">
          {localRuleSystems.map(system => (
            <div
              key={system.id}
              className={`border rounded-xl overflow-hidden transition-all ${
                selectedSystemId === system.id
                  ? 'border-rose-300 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* 系统头部 */}
              <div
                onClick={() => setSelectedSystemId(selectedSystemId === system.id ? null : system.id)}
                className={`p-4 cursor-pointer flex items-center justify-between ${getRuleTypeColor(system.type)}`}
              >
                <div className="flex items-center gap-3">
                  <i className={`fas ${getRuleTypeIcon(system.type)} text-xl`}></i>
                  <div>
                    <h4 className="font-bold text-gray-800">{system.name}</h4>
                    <p className="text-xs text-gray-500">
                      {getRuleTypeLabel(system.type)} · {system.levels.length} 个等级
                      {(system.appliedToCharacterIds?.length ?? 0) > 0 && ` · ${system.appliedToCharacterIds?.length ?? 0} 个角色`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSystem(system.id);
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                  <i className={`fas fa-chevron-${selectedSystemId === system.id ? 'up' : 'down'} text-gray-400`}></i>
                </div>
              </div>

              {/* 系统详情编辑 */}
              {selectedSystemId === system.id && (
                <div className="p-4 bg-white animate-in fade-in">
                  {/* 基本信息 */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">系统名称</label>
                      <input
                        type="text"
                        value={system.name}
                        onChange={(e) => updateSystem(system.id, { name: e.target.value })}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-rose-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">系统描述</label>
                      <textarea
                        value={system.description}
                        onChange={(e) => updateSystem(system.id, { description: e.target.value })}
                        placeholder="描述这个规则系统的基本原理和应用范围..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-rose-200 outline-none resize-none"
                      />
                    </div>
                  </div>

                  {/* 等级管理 */}
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-bold text-gray-700">等级/层次</h5>
                      <button
                        onClick={() => addLevel(system.id)}
                        className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
                      >
                        <i className="fas fa-plus"></i> 添加等级
                      </button>
                    </div>

                    {system.levels.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">暂无等级</p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {system.levels.map((level, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-gray-400 w-8">#{index + 1}</span>
                              <input
                                type="text"
                                value={level.name}
                                onChange={(e) => updateLevel(system.id, index, { name: e.target.value })}
                                placeholder="等级名称"
                                className="flex-1 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-rose-200 outline-none"
                              />
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => moveLevel(system.id, index, 'up')}
                                  disabled={index === 0}
                                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                >
                                  <i className="fas fa-arrow-up"></i>
                                </button>
                                <button
                                  onClick={() => moveLevel(system.id, index, 'down')}
                                  disabled={index === system.levels.length - 1}
                                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                >
                                  <i className="fas fa-arrow-down"></i>
                                </button>
                                <button
                                  onClick={() => removeLevel(system.id, index)}
                                  className="p-1 text-red-400 hover:text-red-600"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 ml-8">
                              <textarea
                                value={level.description}
                                onChange={(e) => updateLevel(system.id, index, { description: e.target.value })}
                                placeholder="等级描述"
                                rows={2}
                                className="px-2 py-1 text-xs border rounded focus:ring-2 focus:ring-rose-200 outline-none resize-none"
                              />
                              <div className="space-y-1">
                                <input
                                  type="text"
                                  value={level.requirements || ''}
                                  onChange={(e) => updateLevel(system.id, index, { requirements: e.target.value })}
                                  placeholder="晋升条件"
                                  className="w-full px-2 py-1 text-xs border rounded focus:ring-2 focus:ring-rose-200 outline-none"
                                />
                                <input
                                  type="text"
                                  value={level.abilities || ''}
                                  onChange={(e) => updateLevel(system.id, index, { abilities: e.target.value })}
                                  placeholder="等级能力/特权"
                                  className="w-full px-2 py-1 text-xs border rounded focus:ring-2 focus:ring-rose-200 outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 角色关联 */}
                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <h5 className="text-sm font-bold text-gray-700 mb-2">适用角色</h5>
                    {characters.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">暂无角色</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                        {characters.map(character => (
                          <label
                            key={character.id}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                              system.appliedToCharacterIds?.includes(character.id)
                                ? 'bg-rose-50 border border-rose-200'
                                : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={system.appliedToCharacterIds?.includes(character.id) || false}
                              onChange={() => toggleCharacter(system.id, character.id)}
                              className="rounded text-rose-600 focus:ring-rose-500"
                            />
                            <span className="text-xs truncate">{character.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 保存按钮 */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t border-gray-100 animate-in fade-in">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition-colors flex items-center gap-2"
          >
            <i className="fas fa-save"></i>
            保存规则系统
          </button>
        </div>
      )}
    </div>
  );
};

export default RuleSystemEditor;



