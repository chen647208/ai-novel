/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { type Location, type Faction } from '../../../shared/types';
import { dialogService } from '@/shared/services/dialogService';
import { Flag, MapPinned, Mountain, Plus, Save, Search, Trash, X } from 'lucide-react';

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
  const { t } = useTranslation('world');
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
      name: t('location.defaultName'),
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
  const deleteLocation = async (id: string) => {
    if (await dialogService.confirm({ message: t('location.deleteConfirm'), danger: true })) {
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
      dialogService.alert(t('location.noOtherLocations'));
      return;
    }

    const newConnection = {
      locationId: availableLocations[0]?.id ?? '',
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
    const current = newConnections[index];
    if (!current) return;
    newConnections[index] = { ...current, ...updates };
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
  const getLocationTypeLabel = (type: Location['type']) => t(`location.type.${type}`);

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('location.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none"
          />
        </div>
        <button
          onClick={addLocation}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          <Plus className="size-4" />
          {t('location.add')}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 地点列表 */}
        <div className="col-span-1 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-100">
            <h4 className="text-sm font-bold text-gray-700">
              {t('location.listTitle', { count: filteredLocations.length })}
            </h4>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {filteredLocations.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                {searchQuery ? t('location.noMatch') : t('location.empty')}
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
                      <Flag className="size-4 mr-1" />
                      {factions.find(f => f.id === location.controlledBy)?.name || t('location.unknownFaction')}
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
                <h4 className="font-bold text-gray-800">{t('location.detailsTitle')}</h4>
                <button
                  onClick={() => deleteLocation(selectedLocation.id)}
                  className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                >
                  <Trash className="size-4" />
                  {t('location.delete')}
                </button>
              </div>

              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">{t('location.nameLabel')}</label>
                  <input
                    type="text"
                    value={selectedLocation.name}
                    onChange={(e) => updateLocation(selectedLocation.id, { name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">{t('location.typeLabel')}</label>
                  <select
                    value={selectedLocation.type}
                    onChange={(e) => updateLocation(selectedLocation.id, { type: e.target.value as Location['type'] })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none"
                  >
                    {(['city', 'region', 'building', 'landmark', 'dungeon', 'wilderness', 'other'] as Location['type'][]).map(ty => (
                      <option key={ty} value={ty}>{t(`location.type.${ty}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{t('location.descLabel')}</label>
                <textarea
                  value={selectedLocation.description}
                  onChange={(e) => updateLocation(selectedLocation.id, { description: e.target.value })}
                  placeholder={t('location.descPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none resize-none"
                />
              </div>

              {/* 地理属性 */}
              <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                <h5 className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1">
                  <Mountain className="size-4" />
                  {t('location.geoTitle')}
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('location.terrainLabel')}</label>
                    <input
                      type="text"
                      value={selectedLocation.geography?.terrain || ''}
                      onChange={(e) => updateLocation(selectedLocation.id, {
                        geography: { terrain: e.target.value, climate: selectedLocation.geography?.climate || '' }
                      })}
                      placeholder={t('location.terrainPlaceholder')}
                      className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-emerald-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('location.climateLabel')}</label>
                    <input
                      type="text"
                      value={selectedLocation.geography?.climate || ''}
                      onChange={(e) => updateLocation(selectedLocation.id, {
                        geography: { terrain: selectedLocation.geography?.terrain || '', climate: e.target.value }
                      })}
                      placeholder={t('location.climatePlaceholder')}
                      className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-emerald-200 outline-none"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-xs text-gray-600 mb-1">{t('location.resourcesLabel')}</label>
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
                    placeholder={t('location.resourcesPlaceholder')}
                    className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                </div>
              </div>

              {/* 标签 */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{t('location.tagsLabel')}</label>
                <input
                  type="text"
                  value={selectedLocation.tags?.join(', ') || ''}
                  onChange={(e) => updateLocation(selectedLocation.id, {
                    tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder={t('location.tagsPlaceholder')}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none"
                />
              </div>

              {/* 势力控制 */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{t('location.controlledByLabel')}</label>
                <select
                  value={selectedLocation.controlledBy || ''}
                  onChange={(e) => updateLocation(selectedLocation.id, { controlledBy: e.target.value || undefined })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none"
                >
                  <option value="">{t('location.noFactionOption')}</option>
                  {factions.map(faction => (
                    <option key={faction.id} value={faction.id}>{faction.name}</option>
                  ))}
                </select>
              </div>

              {/* 地点关联 */}
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-600">{t('location.connectionsLabel')}</label>
                  <button
                    onClick={() => addConnection(selectedLocation.id)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                  >
                    <Plus className="size-4" /> {t('location.addConnection')}
                  </button>
                </div>

                {selectedLocation.connectedLocations?.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">{t('location.noConnections')}</p>
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
                          onChange={(e) => updateConnection(selectedLocation.id, index, { relation: e.target.value as NonNullable<Location['connectedLocations']>[0]['relation'] })}
                          className="px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-emerald-200 outline-none"
                        >
                          {(['adjacent', 'trade', 'conflict', 'ally', 'subordinate'] as NonNullable<Location['connectedLocations']>[0]['relation'][]).map(rt => (
                            <option key={rt} value={rt}>{t(`location.connectionType.${rt}`)}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeConnection(selectedLocation.id, index)}
                          className="text-red-500 hover:text-red-600 px-1"
                        >
                          <X className="size-4" />
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
                <MapPinned className="size-10 mb-2 opacity-30" />
                <p className="text-sm">{t('location.selectHint')}</p>
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
            <Save className="size-4" />
            {t('location.save')}
          </button>
        </div>
      )}
    </div>
  );
};

export default LocationEditor;



