/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 类型注册表 —— “各类型数据通用”的落点（设计依据 docs/design/03 §2）。
 * 新数据类型 = 新模板，零 schema 迁移；插件可注册新模板（贡献点 #1）。
 */

export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'list'
  | 'ref'
  | 'image'
  | 'richtext'
  | 'enum'
  | 'json';

export interface FieldDef {
  /** 属性名（Attribute.name） */
  key: string;
  label: string;
  labelEn?: string;
  type: FieldType;
  /** type='enum' 的取值域 */
  enum?: string[];
  /** type='ref' 指向的模板 id */
  refType?: string;
  required?: boolean;
  /** 卡片分区（UI 按 group 折叠） */
  group?: string;
}

export type TemplateCategory = 'novel' | 'card' | 'meta';
export type TagKind = 'character' | 'location' | 'plot' | 'object' | 'entity' | 'custom';
export type TemplateView = 'outline' | 'corkboard' | 'table' | 'graph' | 'sheet';

export interface TypeTemplate {
  /** 'card.character' | 'novel.chapter' … */
  id: string;
  label: string;
  labelEn?: string;
  icon: string;
  category: TemplateCategory;
  /** novelWriter Root 语义：该类型节点声明的 @tag 关键字类别 */
  tagKind?: TagKind;
  /** Manuskript 模板驱动字段 */
  fields: FieldDef[];
  views: TemplateView[];
  /** novelWriter 双标签体系按类别绑定 */
  statusLabels?: 'status' | 'importance';
  dslHint?: { headingLevel: 1 | 2 | 3 };
}

/** 注册表：id → 模板。register 幂等覆盖（插件重载/unwind 场景），unregister 支持回退。 */
export class TypeRegistry {
  private readonly templates = new Map<string, TypeTemplate>();

  constructor(builtins: readonly TypeTemplate[] = []) {
    for (const t of builtins) this.templates.set(t.id, t);
  }

  register(template: TypeTemplate): void {
    this.templates.set(template.id, template);
  }

  unregister(id: string): boolean {
    return this.templates.delete(id);
  }

  get(id: string): TypeTemplate | undefined {
    return this.templates.get(id);
  }

  /** 取模板，不存在则抛错（写路径用，错误信息带可用类型列表） */
  require(id: string): TypeTemplate {
    const t = this.templates.get(id);
    if (!t) {
      throw new Error(`未注册的类型模板: ${id}（可用: ${[...this.templates.keys()].sort().join(', ')}）`);
    }
    return t;
  }

  has(id: string): boolean {
    return this.templates.has(id);
  }

  list(category?: TemplateCategory): TypeTemplate[] {
    const all = [...this.templates.values()];
    return (category ? all.filter((t) => t.category === category) : all).sort((a, b) =>
      a.id.localeCompare(b.id)
    );
  }
}
