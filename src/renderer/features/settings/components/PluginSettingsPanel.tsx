/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 插件状态面板（docs/design/04 §2）：状态汇总 + 错误详情 + 一键禁用/启用。 */
import { type AssemblyRow, assemblyTree, DEFAULT_RELEASE_PROFILE, type PluginStatus,PROFILE_CHANGED_EVENT, profileByName, RELEASE_PROFILES } from '@core/plugin';
import { builtinRegistry } from '@core/types-registry';
import { STORAGE_KEYS } from '@shared/constants/storageKeys';
import React, { useEffect, useState } from 'react';

import { useSettingsStore } from '@/app/stores/settingsStore';
import { pluginHostPromise, saveDisabledList } from '@/features/assistant/services/aiRuntime';
import { useTranslation } from '@/i18n';
import { localStore } from '@/shared/services/localStore';
import { connectServer, disconnectServer, fetchServerTools } from '@/shared/services/mcpClient';
import { saveTrustedPluginKeys } from '@/shared/services/pluginService';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { LoadingState } from '@/shared/ui/LoadingState';
import { defaultFromSchema, type JsonSchemaObject, SchemaForm } from '@/shared/ui/SchemaForm';
import { Slot } from '@/shared/ui/Slot';
import { Spinner } from '@/shared/ui/Spinner';
import { Textarea } from '@/shared/ui/Textarea';

import type { McpServerConfig } from '../../../../shared/types';
import UserSkillsCard from './UserSkillsCard';

/** 装配树实时视图：行随当前发行档即时重算，切换档位不用开关重看。 */
const AssemblyTreeView: React.FC<{ rows: AssemblyRow[] }> = ({ rows }) => (
  <div className="mt-2 overflow-x-auto rounded-lg border border-border p-3 font-mono text-xs">
    {rows.map((row) => (
      <div key={row.feature} className={row.enabled ? 'text-foreground' : 'text-muted-foreground'}>
        {row.enabled ? '✓' : '✗'} {row.feature} <span className="text-muted-foreground">← {row.source}{row.reason ? `（${row.reason}）` : ''}</span>
      </div>
    ))}
  </div>
);

/** 单插件设置：按 manifest.settingsSchema 渲染，值持久化在 plugin.<id>.settings。 */
const PluginSchemaSettings: React.FC<{ pluginId: string; schema: JsonSchemaObject }> = ({ pluginId, schema }) => {
  const key = `plugin.${pluginId}.settings`;
  const [value, setValue] = useState<Record<string, unknown>>(() => {
    const raw = localStore.getItem(key);
    if (raw) {
      try {
        return { ...defaultFromSchema(schema), ...(JSON.parse(raw) as Record<string, unknown>) };
      } catch {
        // 损坏配置回默认
      }
    }
    return defaultFromSchema(schema);
  });
  const update = (next: Record<string, unknown>): void => {
    setValue(next);
    localStore.setItem(key, JSON.stringify(next));
  };
  return (
    <div className="mt-2 rounded-md border border-border p-2">
      <SchemaForm schema={schema} value={value} onChange={update} idPrefix={`plugin-${pluginId}`} />
    </div>
  );
};

/** 受信任签名公钥：PEM 列表（空行分隔），保存即生效。 */
const TrustedKeysSection: React.FC = () => {
  const { t } = useTranslation(['settings']);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const save = (): void => {
    const keys = text
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter((block) => block.includes('BEGIN PUBLIC KEY'));
    saveTrustedPluginKeys(keys);
    setSaved(true);
  };
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-1 text-sm font-medium">{t('plugins.trust.title')}</div>
      <p className="mb-2 text-xs text-muted-foreground">{t('plugins.trust.hint')}</p>
      <Textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setSaved(false);
        }}
        rows={4}
        className="font-mono text-xs"
        placeholder="-----BEGIN PUBLIC KEY-----"
      />
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" onClick={save}>
          {t('plugins.trust.save')}
        </Button>
        {saved && <span className="text-xs text-muted-foreground">{t('plugins.trust.saved')}</span>}
      </div>
    </div>
  );
};

const PluginSettingsPanel: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  const [statuses, setStatuses] = useState<PluginStatus[] | null>(null);
  const [manifests, setManifests] = useState<Record<string, unknown>>({});
  const [showTree, setShowTree] = useState(false);
  const [profile, setProfile] = useState<string>(() => localStore.getItem(STORAGE_KEYS.profileCurrent) ?? DEFAULT_RELEASE_PROFILE);
  const registeredTypes = builtinRegistry.list();

  useEffect(() => {
    let alive = true;
    void pluginHostPromise.then((host) => {
      if (!alive) return;
      setStatuses(host.list());
      const schemaMap: Record<string, unknown> = {};
      for (const status of host.list()) {
        const schema = host.manifest(status.id)?.settingsSchema;
        if (schema) schemaMap[status.id] = schema;
      }
      setManifests(schemaMap);
    });
    return () => {
      alive = false;
    };
  }, []);

  const applyProfile = (name: string): void => {
    setProfile(name);
    localStore.setItem(STORAGE_KEYS.profileCurrent, name);
    window.dispatchEvent(new CustomEvent(PROFILE_CHANGED_EVENT));
    // AI 拦截由 aiRuntime 的 aiGate 按档位实时生效（覆盖所有网关出口），此处只改档位。
  };

  const toggle = (id: string, disabled: boolean): void => {
    void pluginHostPromise.then((host) => {
      if (disabled) {
        host.enable(id);
        host.activate(id);
      } else {
        host.disable(id);
      }
      saveDisabledList(host.list().filter((st) => st.state === 'disabled').map((st) => st.id));
      setStatuses(host.list());
    });
  };

  if (statuses === null) {
    return <LoadingState className="py-16" />;
  }

  const failed = statuses.filter((s) => s.state === 'failed').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-base font-medium">{t('plugins.title')}</h3>
        <Badge variant="secondary">{statuses.length}</Badge>
        {failed > 0 && <Badge variant="destructive">{t('plugins.failedCount', { count: failed })}</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">{t('plugins.description')}</p>

      <UserSkillsCard />

      <TrustedKeysSection />

      <div className="rounded-lg border border-border p-3">
        <div className="mb-2 text-sm font-medium">{t('plugins.panel.title')}</div>
        <Slot id="plugin.panel" />
      </div>

      <div>
        <div className="mb-1 text-sm font-medium">{t('plugins.profile.title')}</div>
        <div className="flex flex-wrap gap-2">
          {RELEASE_PROFILES.map(({ name }) => (
            <Button
              key={name}
              size="sm"
              variant={profile === name ? 'default' : 'outline'}
              onClick={() => applyProfile(name)}
            >
              {t(`plugins.profile.${name}`)}
            </Button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t('plugins.profile.hint')}</p>
      </div>

      <div>
          <Button size="sm" variant="outline" onClick={() => setShowTree((v) => !v)}>
            {showTree ? t('plugins.tree.hide') : t('plugins.tree.show')}
          </Button>
          {showTree && <AssemblyTreeView rows={assemblyTree(profileByName(profile))} />}
      </div>

      {/* 类型注册表（只读）：内置 + 插件贡献的类型模板，供排查"新文体是否已装载" */}
      <div className="rounded-lg border border-border p-3">
        <div className="mb-2 text-sm font-medium">{t('plugins.types.title', { count: registeredTypes.length })}</div>
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {registeredTypes.map((tpl) => (
            <Badge key={tpl.id} variant="outline" className="rounded-full text-2xs font-normal" title={tpl.id}>
              {tpl.label}
            </Badge>
          ))}
        </div>
      </div>

      {!statuses.length && <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">{t('plugins.empty')}</div>}

      <div className="space-y-2">
        {statuses.map((s) => (
          <div key={s.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{s.id}</span>
                  <Badge variant={s.state === 'active' ? 'default' : s.state === 'failed' ? 'destructive' : 'secondary'}>
                    {t(`plugins.state.${s.state}`)}
                  </Badge>
                </div>
                {s.error && <div className="mt-1 text-xs text-destructive">{s.error.phase}: {s.error.message}</div>}
                {s.error && s.error.cause.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">cause: {s.error.cause.join(' ← ')}</div>
                )}
                {manifests[s.id] ? (
                  <PluginSchemaSettings pluginId={s.id} schema={manifests[s.id] as JsonSchemaObject} />
                ) : null}
              </div>
              {s.state === 'disabled' ? (
                <Button size="sm" variant="outline" onClick={() => toggle(s.id, true)}>
                  {t('plugins.enable')}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => toggle(s.id, false)}>
                  {t('plugins.disable')}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <McpServersSection />
    </div>
  );
};

/** MCP 外部服务：stdio 命令管理 + 连通测试 + 启用开关（工具以 mcp.* 进注册表）。 */
const McpServersSection: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  const servers = useSettingsStore((s) => s.mcpServers ?? []);
  const setMcpServers = useSettingsStore((s) => s.setMcpServers);
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const save = (next: McpServerConfig[]): void => {
    setMcpServers(next);
  };

  const addServer = (): void => {
    const cleanName = name.trim();
    const cleanCommand = command.trim();
    if (!cleanName || !cleanCommand) return;
    const id = `mcp-${Date.now().toString(36)}`;
    save([...servers, { id, name: cleanName, command: cleanCommand, args: [], enabled: false }]);
    setName('');
    setCommand('');
  };

  const testServer = async (server: McpServerConfig): Promise<void> => {
    setTestingId(server.id);
    setTestResult(null);
    try {
      await connectServer(server);
      const tools = await fetchServerTools(server);
      setTestResult(t('plugins.mcp.testOk', { count: tools.length }));
    } catch (err) {
      setTestResult(t('plugins.mcp.testFailed', { error: err instanceof Error ? err.message : String(err) }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="text-base font-medium">{t('plugins.mcp.title')}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t('plugins.mcp.hint')}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('plugins.mcp.namePlaceholder')}
          className="h-8 flex-1 text-xs"
        />
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder={t('plugins.mcp.commandPlaceholder')}
          className="h-8 flex-[2] font-mono text-xs"
        />
        <Button size="sm" onClick={addServer} disabled={!name.trim() || !command.trim()}>
          {t('plugins.mcp.add')}
        </Button>
      </div>
      <div className="mt-3 space-y-2">
        {servers.length === 0 && (
          <p className="text-xs italic text-muted-foreground">{t('plugins.mcp.empty')}</p>
        )}
        {servers.map((server) => (
          <div key={server.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">{server.name}</span>
                <Badge variant={server.enabled ? 'default' : 'secondary'}>
                  {server.enabled ? t('plugins.mcp.enabled') : t('plugins.mcp.disabled')}
                </Badge>
              </div>
              <div className="mt-0.5 truncate font-mono text-2xs text-muted-foreground">{server.command}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={testingId === server.id}
                onClick={() => void testServer(server)}
              >
                {testingId === server.id ? <Spinner className="size-3.5" /> : t('plugins.mcp.test')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => save(servers.map((s) => (s.id === server.id ? { ...s, enabled: !s.enabled } : s)))}
              >
                {server.enabled ? t('plugins.disable') : t('plugins.enable')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => {
                  void disconnectServer(server.id).catch(() => {});
                  save(servers.filter((s) => s.id !== server.id));
                }}
              >
                {t('common:delete')}
              </Button>
            </div>
          </div>
        ))}
      </div>
      {testResult && <p className="mt-2 text-xs text-muted-foreground">{testResult}</p>}
    </div>
  );
};

export default PluginSettingsPanel;
