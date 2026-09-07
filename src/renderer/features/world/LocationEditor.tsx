/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { type Location, type Faction } from '../../../shared/types';
import { dialogService } from '@/shared/services/dialogService';
import { cn } from '@/shared/utils/cn';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { Flag, MapPinned, Mountain, Plus, Save, Search, Trash2, X } from 'lucide-react';

interface LocationEditorProps {
  projectId: string;
  locations: Location[];
  factions: Faction[];
  onSave: (locations: Location[]) => void;
  /** 外部导航（一致性检查/智能推荐「跳转到编辑」）时预选中的地点 id */
  initialSelectedId?: string | null;
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
  onSave,
  initialSelectedId
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

  // 外部导航：id 变化时选中对应地点（挂载即生效，重复点击同一目标也生效）
  useEffect(() => {
    if (initialSelectedId && (locations || []).some(l => l.id === initialSelectedId)) {
      setSelectedLocationId(initialSelectedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedId]);

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
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('location.searchPlaceholder')}
            className="pl-9"
          />
        </div>
        <Button onClick={addLocation}>
          <Plus className="size-4" />
          {t('location.add')}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 地点列表 */}
        <div className="col-span-1 overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border bg-muted/30 p-3">
            <h4 className="text-sm font-medium">
              {t('location.listTitle', { count: filteredLocations.length })}
            </h4>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {filteredLocations.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchQuery ? t('location.noMatch') : t('location.empty')}
              </div>
            ) : (
              filteredLocations.map(location => (
                <div
                  key={location.id}
                  onClick={() => setSelectedLocationId(location.id)}
                  className={cn(
                    'cursor-pointer border-b border-border p-3 transition-colors last:border-0',
                    selectedLocationId === location.id
                      ? 'border-l-4 border-l-primary bg-primary/5'
                      : 'border-l-4 border-l-transparent hover:bg-accent/40'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-serif text-sm font-medium">
                      {location.name}
                    </span>
                    <span className="shrink-0 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-xs text-muted-foreground">
                      {getLocationTypeLabel(location.type)}
                    </span>
                  </div>
                  {location.controlledBy && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Flag className="size-3.5" />
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
            <div className="space-y-4 rounded-lg border border-border bg-card p-4">
              {/* 头部 */}
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="text-sm font-medium">{t('location.detailsTitle')}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => deleteLocation(selectedLocation.id)}
                >
                  <Trash2 className="size-4" />
                  {t('location.delete')}
                </Button>
              </div>

              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t('location.nameLabel')}</Label>
                  <Input
                    type="text"
                    value={selectedLocation.name}
                    onChange={(e) => updateLocation(selectedLocation.id, { name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t('location.typeLabel')}</Label>
                  <Select
                    value={selectedLocation.type}
                    onChange={(e) => updateLocation(selectedLocation.id, { type: e.target.value as Location['type'] })}
                  >
                    {(['city', 'region', 'building', 'landmark', 'dungeon', 'wilderness', 'other'] as Location['type'][]).map(ty => (
                      <option key={ty} value={ty}>{t(`location.type.${ty}`)}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* 描述 */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('location.descLabel')}</Label>
                <Textarea
                  value={selectedLocation.description}
                  onChange={(e) => updateLocation(selectedLocation.id, { description: e.target.value })}
                  placeholder={t('location.descPlaceholder')}
                  rows={3}
                />
              </div>

              {/* 地理属性 */}
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <h5 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Mountain className="size-3.5" />
                  {t('location.geoTitle')}
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('location.terrainLabel')}</Label>
                    <Input
                      type="text"
                      value={selectedLocation.geography?.terrain || ''}
                      onChange={(e) => updateLocation(selectedLocation.id, {
                        geography: { terrain: e.target.value, climate: selectedLocation.geography?.climate || '' }
                      })}
                      placeholder={t('location.terrainPlaceholder')}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('location.climateLabel')}</Label>
                    <Input
                      type="text"
                      value={selectedLocation.geography?.climate || ''}
                      onChange={(e) => updateLocation(selectedLocation.id, {
                        geography: { terrain: selectedLocation.geography?.terrain || '', climate: e.target.value }
                      })}
                      placeholder={t('location.climatePlaceholder')}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('location.resourcesLabel')}</Label>
                  <Input
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
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* 标签 */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('location.tagsLabel')}</Label>
                <Input
                  type="text"
                  value={selectedLocation.tags?.join(', ') || ''}
                  onChange={(e) => updateLocation(selectedLocation.id, {
                    tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder={t('location.tagsPlaceholder')}
                />
              </div>

              {/* 势力控制 */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('location.controlledByLabel')}</Label>
                <Select
                  value={selectedLocation.controlledBy || ''}
                  onChange={(e) => updateLocation(selectedLocation.id, { controlledBy: e.target.value || undefined })}
                >
                  <option value="">{t('location.noFactionOption')}</option>
                  {factions.map(faction => (
                    <option key={faction.id} value={faction.id}>{faction.name}</option>
                  ))}
                </Select>
              </div>

              {/* 地点关联 */}
              <div className="border-t border-border pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">{t('location.connectionsLabel')}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary"
                    onClick={() => addConnection(selectedLocation.id)}
                  >
                    <Plus className="size-4" /> {t('location.addConnection')}
                  </Button>
                </div>

                {selectedLocation.connectedLocations?.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground">{t('location.noConnections')}</p>
                ) : (
                  <div className="space-y-2">
                    {selectedLocation.connectedLocations?.map((conn, index) => (
                      <div key={index} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
                        <Select
                          value={conn.locationId}
                          onChange={(e) => updateConnection(selectedLocation.id, index, { locationId: e.target.value })}
                          className="h-8 flex-1 text-sm"
                        >
                          {localLocations
                            .filter(l => l.id !== selectedLocation.id)
                            .map(loc => (
                              <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </Select>
                        <Select
                          value={conn.relation}
                          onChange={(e) => updateConnection(selectedLocation.id, index, { relation: e.target.value as NonNullable<Location['connectedLocations']>[0]['relation'] })}
                          className="h-8 w-32 text-sm"
                        >
                          {(['adjacent', 'trade', 'conflict', 'ally', 'subordinate'] as NonNullable<Location['connectedLocations']>[0]['relation'][]).map(rt => (
                            <option key={rt} value={rt}>{t(`location.connectionType.${rt}`)}</option>
                          ))}
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeConnection(selectedLocation.id, index)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapPinned className="mx-auto mb-2 size-10 opacity-30" strokeWidth={1.5} />
                <p className="text-sm">{t('location.selectHint')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 保存按钮 */}
      {hasChanges && (
        <div className="flex justify-end border-t border-border pt-4">
          <Button onClick={handleSave}>
            <Save className="size-4" />
            {t('location.save')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default LocationEditor;



