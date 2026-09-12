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
 * 支持 string / number / integer / boolean；enum 与嵌套对象留待后续。
 */
import * as React from 'react';

import { Input } from './Input';
import { Label } from './Label';
import { Switch } from './Switch';

export interface JsonSchemaProperty {
  type?: 'string' | 'number' | 'integer' | 'boolean';
  title?: string;
  description?: string;
  default?: unknown;
}

export interface JsonSchemaObject {
  type?: 'object';
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

/** 依 schema 生成默认值（用于首次呈现）。 */
export function defaultFromSchema(schema: JsonSchemaObject): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    if (prop.default !== undefined) out[key] = prop.default;
    else if (prop.type === 'boolean') out[key] = false;
    else if (prop.type === 'number' || prop.type === 'integer') out[key] = 0;
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
