/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

/**
 * 六实体 —— 全库统一的存储单元（设计依据 docs/design/03 §1）。
 *
 * 一切内容（章节/场景/人物卡/地点/伏笔/叙事线……）皆 Node；
 * 结构树与引用关系皆 Edge；元数据皆 Attribute；变更留底皆 Revision；
 * 二进制皆 Blob+Attachment；同步/审计/撤销的统一地基皆 EntityChange。
 *
 * 不变量：
 *  1. 一切写操作必须产生 EntityChange（由 Store/Repository 层保证）；
 *  2. 删除 = erased 软删（归档语义：退出索引但保留数据）；
 *  3. 乱序写入允许骨架实体（引用到不存在的 id 时建占位，后到填充）。
 */

/** 实体表名，同时是 EntityChange.entityName 的取值域 */
export type EntityName = 'nodes' | 'edges' | 'attrs' | 'revisions' | 'attachments' | 'blobs';

/** 边种类：树父子 / 正文硬链接 / @tag 软引用（Twine 硬软二分） */
export type EdgeKind = 'contain' | 'link-hard' | 'ref-soft';

/** 属性类型：label（值）与 relation（带目标的引用） */
export type AttributeType = 'label' | 'relation';

/** 内容单元。body 为开放文本 DSL（见 core/dsl），二进制内容经 Attachment 指向 Blob。 */
export interface NodeEntity {
  id: string;
  /** 类型模板 id（core/types-registry），如 'novel.chapter' | 'card.character' */
  type: string;
  title: string;
  bookId: string;
  body: string;
  /** DSL 文件相对路径（文件为源时的投影锚点），DB 主存模式可为空 */
  path?: string;
  createdAt: number;
  updatedAt: number;
  /** 软删标记（归档语义） */
  erased: boolean;
}

/** 边：多父结构 + 关系。position 取代旧 chapters[] 的数组序。 */
export interface EdgeEntity {
  id: string;
  fromId: string;
  toId: string;
  kind: EdgeKind;
  /** 语义角色：'pov' | 'character' | 'location' | 'plot' | 'foreshadow' | 'virtual' … */
  role?: string;
  position: number;
  bookId: string;
  erased: boolean;
}

/** 属性：label 的 value 为字符串（支持 "显示名|描述" promoted 串）；relation 的 value 为目标标签/id。 */
export interface AttributeEntity {
  id: string;
  nodeId: string;
  type: AttributeType;
  /** 'status' | 'importance' | 'motivation' | 'pov' | 'tag' … */
  name: string;
  value: string;
  /** 可继承属性（子节点未声明时取祖先值，Trilium promoted 模式） */
  inheritable: boolean;
  position: number;
  erased: boolean;
}

/** 版本留底：每次变更自动产生（取代手动快照语义）。author='user' 或 agentId（AI 审计免费获得）。 */
export interface RevisionEntity {
  id: string;
  nodeId: string;
  /** 同一 node 内单调递增 */
  seq: number;
  body: string;
  author: string;
  /** 触发本次变更的 toolCallId/commandId */
  cause?: string;
  createdAt: number;
}

/** 附件：节点与 Blob 的多对多挂接 */
export interface AttachmentEntity {
  id: string;
  nodeId: string;
  role: string;
  mime: string;
  blobId: string;
  erased: boolean;
}

/** 二进制内容。enc 预留逐条加密（Trilium protected 模式）。 */
export interface BlobEntity {
  id: string;
  bytes: Uint8Array;
  enc?: string;
}

/** 变更日志行：同步/审计/撤销的统一地基 */
export interface EntityChange {
  /** DB 自增主键；内存构造时缺省 */
  id?: number;
  entityName: EntityName;
  entityId: string;
  /** 字段集由 HASHED_PROPERTIES 声明（Trilium hashedProperties 模式） */
  hash: string;
  isErased: boolean;
  /** 进程级实例 id（启动时生成，用于多端同步去重） */
  instanceId: string;
  /** 'user' | 'ai:<tool>' | 'import' —— 比 Trilium 多这一列，审计到 agent 粒度 */
  agentId: string;
  utcDateChanged: number;
}

/** 一本书的实体集合（索引器/投影层的统一输入） */
export interface BookEntities {
  nodes: NodeEntity[];
  edges: EdgeEntity[];
  attrs: AttributeEntity[];
}

export type AnyEntity =
  | NodeEntity
  | EdgeEntity
  | AttributeEntity
  | RevisionEntity
  | AttachmentEntity
  | BlobEntity;

/** 实体 id 访问器（跨类型取主键） */
export function entityId(entity: AnyEntity): string {
  return entity.id;
}
