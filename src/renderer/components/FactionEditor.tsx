import React, { useState, useEffect } from 'react';
import { Faction, Location, Character } from '../types';

interface FactionEditorProps {
  projectId: string;
  factions: Faction[];
  locations: Location[];
  characters: Character[];
  onSave: (factions: Faction[]) => void;
}

/**
 * 势力编辑器组件
 * 
 * 功能：
 * - 创建/编辑/删除势力
 * - 势力类型选择（王国、门派、公会等）
 * - 实力评估（军事、经济、影响力）
 * - 势力关系网（同盟、敌对、从属等）
 * - 成员和领地管理
 */
export const FactionEditor: React.FC<FactionEditorProps> = ({
  projectId,
  factions,
  locations,
  characters,
  onSave
}) => {
  const [localFactions, setLocalFactions] = useState<Faction[]>([]);
  const [selectedFactionId, setSelectedFactionId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 初始化本地状态
  useEffect(() => {
    setLocalFactions(factions || []);
  }, [factions]);

  // 获取选中的势力
  const selectedFaction = localFactions.find(f => f.id === selectedFactionId);

  // 添加新势力
  const addFaction = () => {
    const newFaction: Faction = {
      id: `faction_${Date.now()}`,
      projectId,
      name: '新势力',
      type: 'organization',
      description: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setLocalFactions([...localFactions, newFaction]);
    setSelectedFactionId(newFaction.id);
    setHasChanges(true);
  };

  // 更新势力
  const updateFaction = (id: string, updates: Partial<Faction>) => {
    setLocalFactions(prev => prev.map(faction => 
      faction.id === id 
        ? { ...faction, ...updates, updatedAt: Date.now() }
        : faction
    ));
    setHasChanges(true);
  };

  // 删除势力
  const deleteFaction = (id: string) => {
    if (window.confirm('确定要删除这个势力吗？相关的关联关系也会被清除。')) {
      // 删除势力时，同时清除其他势力对该势力的引用
      setLocalFactions(prev => prev
        .filter(f => f.id !== id)
        .map(f => ({
          ...f,
          relations: f.relations?.filter(r => r.factionId !== id)
        }))
      );
      // 同时清除地点对该势力的引用
      // 注意：这里只更新本地状态，实际地点数据需要在父组件中处理
      if (selectedFactionId === id) {
        setSelectedFactionId(null);
      }
      setHasChanges(true);
    }
  };

  // 添加势力关系
  const addRelation = (factionId: string) => {
    const faction = localFactions.find(f => f.id === factionId);
    if (!faction) return;

    const availableFactions = localFactions.filter(f => f.id !== factionId);
    if (availableFactions.length === 0) {
      alert('没有可关联的其他势力');
      return;
    }

    const newRelation = {
      factionId: availableFactions[0].id,
      type: 'neutral' as const,
      description: ''
    };

    updateFaction(factionId, {
      relations: [...(faction.relations || []), newRelation]
    });
  };

  // 更新势力关系
  const updateRelation = (factionId: string, index: number, updates: Partial<NonNullable<Faction['relations']>[0]>) => {
    const faction = localFactions.find(f => f.id === factionId);
    if (!faction?.relations) return;

    const newRelations = [...faction.relations];
    newRelations[index] = { ...newRelations[index], ...updates };
    updateFaction(factionId, { relations: newRelations });
  };

  // 删除势力关系
  const removeRelation = (factionId: string, index: number) => {
    const faction = localFactions.find(f => f.id === factionId);
    if (!faction?.relations) return;

    const newRelations = faction.relations.filter((_, i) => i !== index);
    updateFaction(factionId, { relations: newRelations });
  };

  // 切换地点控制
  const toggleLocationControl = (factionId: string, locationId: string) => {
    const faction = localFactions.find(f => f.id === factionId);
    if (!faction) return;

    const currentLocations = faction.controlledLocationIds || [];
    const newLocations = currentLocations.includes(locationId)
      ? currentLocations.filter(id => id !== locationId)
      : [...currentLocations, locationId];

    updateFaction(factionId, { controlledLocationIds: newLocations });
  };

  // 切换成员
  const toggleMember = (factionId: string, characterId: string) => {
    const faction = localFactions.find(f => f.id === factionId);
    if (!faction) return;

    const currentMembers = faction.memberCharacterIds || [];
    const newMembers = currentMembers.includes(characterId)
      ? currentMembers.filter(id => id !== characterId)
      : [...currentMembers, characterId];

    updateFaction(factionId, { memberCharacterIds: newMembers });
  };

  // 保存所有更改
  const handleSave = () => {
    onSave(localFactions);
    setHasChanges(false);
  };

  // 过滤势力列表
  const filteredFactions = localFactions.filter(faction =>
    faction.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faction.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 获取势力类型显示名称
  const getFactionTypeLabel = (type: Faction['type']) => {
    const labels: Record<Faction['type'], string> = {
      kingdom: '王国',
      empire: '帝国',
      sect: '门派/宗派',
      guild: '公会/行会',
      family: '家族',
      tribe: '部落',
      organization: '组织',
      alliance: '联盟',
      other: '其他'
    };
    return (labels as Record<string, string>)[type] || type;
  };

  // 获取关系类型显示名称
  const getRelationTypeLabel = (type: NonNullable<Faction['relations']>[0]['type']) => {
    const labels = {
      ally: '同盟',
      enemy: '敌对',
      neutral: '中立',
      vassal: '附庸',
      suzerain: '宗主',
      rival: '竞争',
      trade: '贸易'
    };
    return (labels as Record<string, string>)[type] || type;
  };

  // 获取关系类型颜色
  const getRelationTypeColor = (type: NonNullable<Faction['relations']>[0]['type']) => {
    const colors = {
      ally: 'text-blue-600 bg-blue-50',
      enemy: 'text-red-600 bg-red-50',
      neutral: 'text-gray-600 bg-gray-50',
      vassal: 'text-purple-600 bg-purple-50',
      suzerain: 'text-amber-600 bg-amber-50',
      rival: 'text-orange-600 bg-orange-50',
      trade: 'text-green-600 bg-green-50'
    };
    return (colors as Record<string, string>)[type] || 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索势力..."
            className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-200 outline-none"
          />
        </div>
        <button
          onClick={addFaction}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 transition-colors flex items-center gap-2"
        >
          <i className="fas fa-plus"></i>
          添加势力
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 势力列表 */}
        <div className="col-span-1 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-100">
            <h4 className="text-sm font-bold text-gray-700">
              势力列表 ({filteredFactions.length})
            </h4>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {filteredFactions.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                {searchQuery ? '无匹配势力' : '暂无势力，点击添加'}
              </div>
            ) : (
              filteredFactions.map(faction => (
                <div
                  key={faction.id}
                  onClick={() => setSelectedFactionId(faction.id)}
                  className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${
                    selectedFactionId === faction.id
                      ? 'bg-amber-50 border-l-4 border-l-amber-500'
                      : 'hover:bg-gray-100 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-800 truncate">
                      {faction.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                      {getFactionTypeLabel(faction.type)}
                    </span>
                    {faction.leaderId && (
                      <span className="text-xs text-amber-600">
                        <i className="fas fa-crown mr-1"></i>
                        {characters.find(c => c.id === faction.leaderId)?.name || '未知'}
                      </span>
                    )}
                  </div>
                  {((faction.controlledLocationIds?.length ?? 0) > 0 || (faction.memberCharacterIds?.length ?? 0) > 0) && (
                    <div className="mt-1 flex gap-2 text-xs text-gray-500">
                      {(faction.controlledLocationIds?.length ?? 0) > 0 && (
                        <span><i className="fas fa-map-marker-alt mr-1"></i>{faction.controlledLocationIds?.length ?? 0}领地</span>
                      )}
                      {(faction.memberCharacterIds?.length ?? 0) > 0 && (
                        <span><i className="fas fa-users mr-1"></i>{faction.memberCharacterIds?.length ?? 0}成员</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 势力详情编辑 */}
        <div className="col-span-2 max-h-[400px] overflow-y-auto">
          {selectedFaction ? (
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-4 animate-in fade-in">
              {/* 头部 */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h4 className="font-bold text-gray-800">势力详情</h4>
                <button
                  onClick={() => deleteFaction(selectedFaction.id)}
                  className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                >
                  <i className="fas fa-trash"></i>
                  删除
                </button>
              </div>

              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">势力名称</label>
                  <input
                    type="text"
                    value={selectedFaction.name}
                    onChange={(e) => updateFaction(selectedFaction.id, { name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">势力类型</label>
                  <select
                    value={selectedFaction.type}
                    onChange={(e) => updateFaction(selectedFaction.id, { type: e.target.value as Faction['type'] })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-200 outline-none"
                  >
                    <option value="kingdom">王国</option>
                    <option value="empire">帝国</option>
                    <option value="sect">门派/宗派</option>
                    <option value="guild">公会/行会</option>
                    <option value="family">家族</option>
                    <option value="tribe">部落</option>
                    <option value="organization">组织</option>
                    <option value="alliance">联盟</option>
                    <option value="other">其他</option>
                  </select>
                </div>
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">势力描述</label>
                <textarea
                  value={selectedFaction.description}
                  onChange={(e) => updateFaction(selectedFaction.id, { description: e.target.value })}
                  placeholder="描述这个势力的历史、目标和特点..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-200 outline-none resize-none"
                />
              </div>

              {/* 理念 */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">理念/信仰</label>
                <input
                  type="text"
                  value={selectedFaction.ideology || ''}
                  onChange={(e) => updateFaction(selectedFaction.id, { ideology: e.target.value })}
                  placeholder="如：正义、秩序、自由、征服..."
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-200 outline-none"
                />
              </div>

              {/* 标志 */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">标志/旗帜</label>
                <input
                  type="text"
                  value={selectedFaction.emblem || ''}
                  onChange={(e) => updateFaction(selectedFaction.id, { emblem: e.target.value })}
                  placeholder="描述势力的标志或旗帜..."
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-200 outline-none"
                />
              </div>

              {/* 创立时间 */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">创立时间</label>
                <input
                  type="text"
                  value={selectedFaction.foundedDate || ''}
                  onChange={(e) => updateFaction(selectedFaction.id, { foundedDate: e.target.value })}
                  placeholder="如：第三纪元45年"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-200 outline-none"
                />
              </div>

              {/* 实力评估 */}
              <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                <h5 className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1">
                  <i className="fas fa-chart-bar"></i>
                  实力评估
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">军事实力</label>
                    <input
                      type="text"
                      value={selectedFaction.strength?.military || ''}
                      onChange={(e) => updateFaction(selectedFaction.id, {
                        strength: { military: e.target.value, overall: selectedFaction.strength?.overall || '' }
                      })}
                      placeholder="如：强大、中等、弱小"
                      className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-amber-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">经济实力</label>
                    <input
                      type="text"
                      value={selectedFaction.strength?.economic || ''}
                      onChange={(e) => updateFaction(selectedFaction.id, {
                        strength: { economic: e.target.value, overall: selectedFaction.strength?.overall || '' }
                      })}
                      placeholder="如：富裕、一般、贫困"
                      className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-amber-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">影响力</label>
                    <input
                      type="text"
                      value={selectedFaction.strength?.influence || ''}
                      onChange={(e) => updateFaction(selectedFaction.id, {
                        strength: { influence: e.target.value, overall: selectedFaction.strength?.overall || '' }
                      })}
                      placeholder="如：广泛、区域、有限"
                      className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-amber-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">综合评估</label>
                    <input
                      type="text"
                      value={selectedFaction.strength?.overall || ''}
                      onChange={(e) => updateFaction(selectedFaction.id, {
                        strength: { ...selectedFaction.strength, overall: e.target.value }
                      })}
                      placeholder="如：一流、二流、三流"
                      className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-amber-200 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 势力领袖 */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">势力领袖</label>
                <select
                  value={selectedFaction.leaderId || ''}
                  onChange={(e) => updateFaction(selectedFaction.id, { leaderId: e.target.value || undefined })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-200 outline-none"
                >
                  <option value="">未设置</option>
                  {characters.map(char => (
                    <option key={char.id} value={char.id}>{char.name}</option>
                  ))}
                </select>
              </div>

              {/* 势力关系 */}
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-600">势力关系</label>
                  <button
                    onClick={() => addRelation(selectedFaction.id)}
                    className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1"
                  >
                    <i className="fas fa-plus"></i> 添加关系
                  </button>
                </div>
                
                {!selectedFaction.relations || selectedFaction.relations.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">暂无势力关系</p>
                ) : (
                  <div className="space-y-2">
                    {selectedFaction.relations.map((relation, index) => (
                      <div key={index} className="flex gap-2 items-center bg-gray-50 p-2 rounded">
                        <span className="text-xs text-gray-500">与</span>
                        <select
                          value={relation.factionId}
                          onChange={(e) => updateRelation(selectedFaction.id, index, { factionId: e.target.value })}
                          className="flex-1 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-amber-200 outline-none"
                        >
                          {localFactions
                            .filter(f => f.id !== selectedFaction.id)
                            .map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                        <select
                          value={relation.type}
                          onChange={(e) => updateRelation(selectedFaction.id, index, { type: e.target.value as any })}
                          className={`px-2 py-1 text-xs font-bold rounded border-0 ${getRelationTypeColor(relation.type)}`}
                        >
                          <option value="ally">同盟</option>
                          <option value="enemy">敌对</option>
                          <option value="neutral">中立</option>
                          <option value="vassal">附庸</option>
                          <option value="suzerain">宗主</option>
                          <option value="rival">竞争</option>
                          <option value="trade">贸易</option>
                        </select>
                        <input
                          type="text"
                          value={relation.description || ''}
                          onChange={(e) => updateRelation(selectedFaction.id, index, { description: e.target.value })}
                          placeholder="关系描述"
                          className="flex-1 px-2 py-1 text-xs border rounded focus:ring-2 focus:ring-amber-200 outline-none"
                        />
                        <button
                          onClick={() => removeRelation(selectedFaction.id, index)}
                          className="text-red-500 hover:text-red-600 px-1"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 控制领地 */}
              <div className="border-t border-gray-100 pt-3">
                <label className="block text-xs font-bold text-gray-600 mb-2">控制领地</label>
                {locations.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">暂无地点，请先创建地点</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {locations.map(location => (
                      <label
                        key={location.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          selectedFaction.controlledLocationIds?.includes(location.id)
                            ? 'bg-emerald-50 border border-emerald-200'
                            : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFaction.controlledLocationIds?.includes(location.id) || false}
                          onChange={() => toggleLocationControl(selectedFaction.id, location.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs truncate">{location.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 成员列表 */}
              <div className="border-t border-gray-100 pt-3">
                <label className="block text-xs font-bold text-gray-600 mb-2">势力成员</label>
                {characters.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">暂无角色，请先创建角色</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {characters.map(character => (
                      <label
                        key={character.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          selectedFaction.memberCharacterIds?.includes(character.id)
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFaction.memberCharacterIds?.includes(character.id) || false}
                          onChange={() => toggleMember(selectedFaction.id, character.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs truncate">{character.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <i className="fas fa-flag text-4xl mb-2 opacity-30"></i>
                <p className="text-sm">选择左侧势力进行编辑</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 保存按钮 */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t border-gray-100 animate-in fade-in">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition-colors flex items-center gap-2"
          >
            <i className="fas fa-save"></i>
            保存势力设定
          </button>
        </div>
      )}
    </div>
  );
};

export default FactionEditor;
