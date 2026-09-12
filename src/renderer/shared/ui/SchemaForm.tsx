/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * schema 驱动设置表单（docs/design/04 §13.2）：按 JSON Schema 渲染字段，替代每种贡献手写面板。
 * 支持 string / number / integer / boolean / enum（下拉）/ object（递归嵌套）。
 */
import * as React from 'react';

import { Input } from './Input';
import { Label } from './Label';
import { Select } from './Select';
import { Switch } from './Switch';

export interface JsonSchemaProperty {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'object';
  title?: string;
  description?: string;
  default?: unknown;
  /** 枚举：渲染为下拉，保留原始值类型。 */
  enum?: unknown[];
  /** type=object 时的嵌套字段。 */
  properties?: Record<string, JsonSchemaProperty>;
}

export interface JsonSchemaObject {
  type?: 'object';
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

/** 依 schema 生成默认值（用于首次呈现）；嵌套对象递归。 */
export function defaultFromSchema(schema: JsonSchemaObject): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    if (prop.default !== undefined) out[key] = prop.default;
    else if (Array.isArray(prop.enum) && prop.enum.length > 0) out[key] = prop.enum[0];
    else if (prop.type === 'boolean') out[key] = false;
    else if (prop.type === 'number' || prop.type === 'integer') out[key] = 0;
    else if (prop.type === 'object') out[key] = defaultFromSchema({ type: 'object', properties: prop.properties });
    else if (prop.type === 'string') out[key] = '';
  }
  return out;
}

export interface SchemaFormProps {
  schema: JsonSchemaObject;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  idPrefix?: string;
}

export function SchemaForm({ schema, value, onChange, idPrefix = 'schema' }: SchemaFormProps): React.ReactElement {
  const properties = schema.properties ?? {};
  return (
    <div className="space-y-3">
      {Object.entries(properties).map(([key, prop]) => {
        const id = `${idPrefix}-${key}`;
        const label = prop.title ?? key;
        const current = value[key] ?? prop.default;

        if (Array.isArray(prop.enum) && prop.enum.length > 0) {
          return (
            <div key={key} className="space-y-1">
              <Label htmlFor={id}>{label}</Label>
              <Select
                id={id}
                value={current === undefined ? '' : String(current)}
                onChange={(event) => {
                  const selected = prop.enum?.find((option) => String(option) === event.target.value);
                  onChange({ ...value, [key]: selected });
                }}
              >
                {prop.enum.map((option) => (
                  <option key={String(option)} value={String(option)}>
                    {String(option)}
                  </option>
                ))}
              </Select>
              {prop.description && <p className="text-xs text-muted-foreground">{prop.description}</p>}
            </div>
          );
        }

        if (prop.type === 'object' && prop.properties) {
          const nested = (current && typeof current === 'object' && !Array.isArray(current) ? current : {}) as Record<string, unknown>;
          return (
            <div key={key} className="space-y-2 rounded-md border border-border p-2">
              <div className="text-xs font-medium text-muted-foreground">{label}</div>
              <SchemaForm
                schema={{ type: 'object', properties: prop.properties, required: [] }}
                value={nested}
                onChange={(next) => onChange({ ...value, [key]: next })}
                idPrefix={id}
              />
            </div>
          );
        }

        if (prop.type === 'boolean') {
          return (
            <div key={key} className="flex items-center justify-between gap-2">
              <Label htmlFor={id}>{label}</Label>
              <Switch
                id={id}
                checked={Boolean(current)}
                onCheckedChange={(checked) => onChange({ ...value, [key]: checked })}
              />
            </div>
          );
        }

        const isNumber = prop.type === 'number' || prop.type === 'integer';
        return (
          <div key={key} className="space-y-1">
            <Label htmlFor={id}>{label}</Label>
            <Input
              id={id}
              type={isNumber ? 'number' : 'text'}
              value={current === undefined ? '' : String(current)}
              onChange={(event) =>
                onChange({ ...value, [key]: isNumber ? Number(event.target.value) : event.target.value })
              }
            />
            {prop.description && <p className="text-xs text-muted-foreground">{prop.description}</p>}
          </div>
        );
      })}
    </div>
  );
}
