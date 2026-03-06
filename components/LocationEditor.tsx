import React, { useState, useEffect } from 'react';
import { Location, Faction } from '../types';

interface LocationEditorProps {
  projectId: string;
  locations: Location[];
  factions: Faction[];
  onSave: (locations: Location[]) => void;
}

/**
 * 地点编辑器组件
 * 
 * 功能：
 * - 创建/编辑/删除地点
 * - 地点类型选择（城市、区域、建筑、地标等）
 * - 地理属性（地形、气候、资源）
 * - 势力控制关联
 * - 地点间关系（相邻、贸易、冲突等）
 */
export const LocationEditor: React.FC<LocationEditorProps> = ({
  projectId,
  locations,
  factions,
  onSave
}) => {
  const [localLocations, setLocalLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 初始化本地状态
  useEffect(() => {
    setLocalLocations(locations || []);
  }, [locations]);

  // 获取选中的地点
  const selectedLocation = localLocations.find(l => l.id === selectedLocationId);

  // 添加新地点
  const addLocation = () => {
    const newLocation: Location = {
      id: `location_${Date.now()}`,
      projectId,
      name: '新地点',
      type: 'city',
      description: '',
      geography: {
        terrain: '',
        climate: ''
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setLocalLocations([...localLocations, newLocation]);
    setSelectedLocationId(newLocation.id);
    setHasChanges(true);
  };

  // 更新地点
  const updateLocation = (id: string, updates: Partial<Location>) => {
    setLocalLocations(prev => prev.map(loc => 
      loc.id === id 
        ? { ...loc, ...updates, updatedAt: Date.now() }
        : loc
    ));
    setHasChanges(true);
  };

  // 删除地点
  const deleteLocation = (id: string) => {
    if (window.confirm('确定要删除这个地点吗？相关的关联关系也会被清除。')) {
      // 删除地点时，同时清除其他地点对该地点的引用
      setLocalLocations(prev => prev
        .filter(loc => loc.id !== id)
        .map(loc => ({
          ...loc,
          connectedLocations: loc.connectedLocations?.filter(
            conn => conn.locationId !== id
          )
        }))
      );
      if (selectedLocationId === id) {
        setSelectedLocationId(null);
      }
      setHasChanges(true);
    }
  };

  // 添加地点关联
  const addConnection = (locationId: string) => {
    const location = localLocations.find(l => l.id === locationId);
    if (!location) return;

    const availableLocations = localLocations.filter(l => l.id !== locationId);
    if (availableLocations.length === 0) {
      alert('没有可关联的其他地点');
      return;
    }

    const newConnection = {
      locationId: availableLocations[0].id,
      relation: 'adjacent' as const,
      description: ''
    };

    updateLocation(locationId, {
      connectedLocations: [...(location.connectedLocations || []), newConnection]
    });
  };

  // 更新地点关联
  const updateConnection = (locationId: string, index: number, updates: Partial<NonNullable<Location['connectedLocations']>[0]>) => {
    const location = localLocations.find(l => l.id === locationId);
    if (!location?.connectedLocations) return;

    const newConnections = [...location.connectedLocations];
    newConnections[index] = { ...newConnections[index], ...updates };
    updateLocation(locationId, { connectedLocations: newConnections });
  };

  // 删除地点关联
  const removeConnection = (locationId: string, index: number) => {
    const location = localLocations.find(l => l.id === locationId);
    if (!location?.connectedLocations) return;

    const newConnections = location.connectedLocations.filter((_, i) => i !== index);
    updateLocation(locationId, { connectedLocations: newConnections });
  };

  // 保存所有更改
  const handleSave = () => {
    onSave(localLocations);
    setHasChanges(false);
  };

  // 过滤地点列表
  const filteredLocations = localLocations.filter(loc =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 获取地点类型显示名称
  const getLocationTypeLabel = (type: Location['type']) => {
    const labels: Record<Location['type'], string> = {
      city: '城市',
      region: '区域',
      building: '建筑',
      landmark: '地标',
      dungeon: '副本/迷宫',
      wilderness: '野外',
      other: '其他'
    };
    return labels[type] || type;
  };

  // 获取关联类型显示名称
  const getRelationLabel = (relation: NonNullable<Location['connectedLocations']>[0]['relation']) => {
    const labels = {
      adjacent: '相邻',
      trade: '贸易',
      conflict: '冲突',
      ally: '同盟',
      subordinate: '从属'
    };
    return (labels as Record<string, string>)[relation] || relation;
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
            placeholder="搜索地点..."
            className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none"
          />
        </div>
        <button
          onClick={addLocation}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          <i className="fas fa-plus"></i>
          添加地点
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 地点列表 */}
        <div className="col-span-1 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-100">
            <h4 className="text-sm font-bold text-gray-700">
              地点列表 ({filteredLocations.length})
            </h4>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {filteredLocations.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                {searchQuery ? '无匹配地点' : '暂无地点，点击添加'}
              </div>
            ) : (
              filteredLocations.map(location => (
                <div
                  key={location.id}
                  onClick={() => setSelectedLocationId(location.id)}
                  className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${
                    selectedLocationId === location.id
                      ? 'bg-emerald-50 border-l-4 border-l-emerald-500'
                      : 'hover:bg-gray-100 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-800 truncate">
                      {location.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                      {getLocationTypeLabel(location.type)}
                    </span>
                  </div>
                  {location.controlledBy && (
                    <div className="mt-1 text-xs text-emerald-600">
                      <i className="fas fa-flag mr-1"></i>
                      {factions.find(f => f.id === location.controlledBy)?.name || '未知势力'}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 地点详情编辑 */}
        <div className="col-span-2 max-h-[400px] overflow-y-auto">
          {selectedLocation ? (
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-4 animate-in fade-in">
              {/* 头部 */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h4 className="font-bold text-gray-800">地点详情</h4>
                <button
                  onClick={() => deleteLocation(selectedLocation.id)}
                  className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                >
                  <i className="fas fa-trash"></i>
                  删除
                </button>
              </div>

              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">地点名称</label>
                  <input
                    type="text"
                    value={selectedLocation.name}
                    onChange={(e) => updateLocation(selectedLocation.id, { name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">地点类型</label>
                  <select
                    value={selectedLocation.type}
                    onChange={(e) => updateLocation(selectedLocation.id, { type: e.target.value as Location['type'] })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none"
                  >
                    <option value="city">城市</option>
                    <option value="region">区域</option>
                    <option value="building">建筑</option>
                    <option value="landmark">地标</option>
                    <option value="dungeon">副本/迷宫</option>
                    <option value="wilderness">野外</option>
                    <option value="other">其他</option>
                  </select>
                </div>
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">地点描述</label>
                <textarea
                  value={selectedLocation.description}
                  onChange={(e) => updateLocation(selectedLocation.id, { description: e.target.value })}
                  placeholder="描述这个地点的外观、氛围、特色..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none resize-none"
                />
              </div>

              {/* 地理属性 */}
              <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                <h5 className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1">
                  <i className="fas fa-mountain"></i>
                  地理属性
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">地形</label>
                    <input
                      type="text"
                      value={selectedLocation.geography?.terrain || ''}
                      onChange={(e) => updateLocation(selectedLocation.id, {
                        geography: { terrain: e.target.value, climate: selectedLocation.geography?.climate || '' }
                      })}
                      placeholder="如：平原、山脉、森林"
                      className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-emerald-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">气候</label>
                    <input
                      type="text"
                      value={selectedLocation.geography?.climate || ''}
                      onChange={(e) => updateLocation(selectedLocation.id, {
                        geography: { terrain: selectedLocation.geography?.terrain || '', climate: e.target.value }
                      })}
                      placeholder="如：温带、热带、寒冷"
                      className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-emerald-200 outline-none"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-xs text-gray-600 mb-1">资源（逗号分隔）</label>
                  <input
                    type="text"
                    value={selectedLocation.geography?.resources?.join(', ') || ''}
                    onChange={(e) => updateLocation(selectedLocation.id, {
                      geography: { 
                        terrain: selectedLocation.geography?.terrain || '',
                        climate: selectedLocation.geography?.climate || '',
                        resources: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }
                    })}
                    placeholder="如：铁矿、木材、魔晶"
                    className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                </div>
              </div>

              {/* 标签 */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">特征标签（逗号分隔）</label>
                <input
                  type="text"
                  value={selectedLocation.tags?.join(', ') || ''}
                  onChange={(e) => updateLocation(selectedLocation.id, {
                    tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="如：繁华、危险、神秘、古老"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none"
                />
              </div>

              {/* 势力控制 */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">控制势力</label>
                <select
                  value={selectedLocation.controlledBy || ''}
                  onChange={(e) => updateLocation(selectedLocation.id, { controlledBy: e.target.value || undefined })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none"
                >
                  <option value="">无（中立/无主）</option>
                  {factions.map(faction => (
                    <option key={faction.id} value={faction.id}>{faction.name}</option>
                  ))}
                </select>
              </div>

              {/* 地点关联 */}
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-600">地点关联</label>
                  <button
                    onClick={() => addConnection(selectedLocation.id)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                  >
                    <i className="fas fa-plus"></i> 添加关联
                  </button>
                </div>
                
                {selectedLocation.connectedLocations?.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">暂无关联地点</p>
                ) : (
                  <div className="space-y-2">
                    {selectedLocation.connectedLocations?.map((conn, index) => (
                      <div key={index} className="flex gap-2 items-center bg-gray-50 p-2 rounded">
                        <select
                          value={conn.locationId}
                          onChange={(e) => updateConnection(selectedLocation.id, index, { locationId: e.target.value })}
                          className="flex-1 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-emerald-200 outline-none"
                        >
                          {localLocations
                            .filter(l => l.id !== selectedLocation.id)
                            .map(loc => (
                              <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                        <select
                          value={conn.relation}
                          onChange={(e) => updateConnection(selectedLocation.id, index, { relation: e.target.value as any })}
                          className="px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-emerald-200 outline-none"
                        >
                          <option value="adjacent">相邻</option>
                          <option value="trade">贸易</option>
                          <option value="conflict">冲突</option>
                          <option value="ally">同盟</option>
                          <option value="subordinate">从属</option>
                        </select>
                        <button
                          onClick={() => removeConnection(selectedLocation.id, index)}
                          className="text-red-500 hover:text-red-600 px-1"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <i className="fas fa-map-marked-alt text-4xl mb-2 opacity-30"></i>
                <p className="text-sm">选择左侧地点进行编辑</p>
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
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <i className="fas fa-save"></i>
            保存地点设定
          </button>
        </div>
      )}
    </div>
  );
};

export default LocationEditor;
