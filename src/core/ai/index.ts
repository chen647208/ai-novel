/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** core/ai 编排层出口（docs/design/05 §1）：prompt 装配器 + 工具注册表 + 内置 sections。 */
export {
  PromptAssembler,
  truncateText,
  type PromptContext,
  type PromptSection,
  type AssembleResult,
} from './promptAssembler.js';
export {
  ApprovalBroker,
  ApprovalRouter,
  type ApprovalRequest,
  type ApprovalDecision,
  type ApprovalProposal,
  type McpProposalExec,
  type ApprovalVerdict,
  type PendingApproval,
} from './approval.js';
export {
  runAgentSession,
  parseAgentReply,
  type AgentLoopDeps,
  type AgentTurnResult,
  type AgentTurnToolCall,
} from './agentLoop.js';
export {
  AiSession,
  serializeEvent,
  parseEventLine,
  type AiEvent,
  type SessionSink,
  type SessionOptions,
} from './session.js';
export {
  SkillCatalog,
  parseSkillMd,
  type Skill,
  type SkillCatalogOptions,
  type SkillParseError,
  type ParsedSkillFile,
} from './skills.js';
export {
  ToolRegistry,
  lintToolSchema,
  type ToolPermission,
  type ToolCallRequest,
  type ToolContext,
  type ToolOutput,
  type ToolSpec,
} from './tools.js';
export {
  registerBuiltinSections,
  renderWorldDigest,
  renderIndexDigest,
  identitySection,
  aiPolicySection,
  bookMetaSection,
  worldDigestSection,
  indexDigestSection,
  activeSkillSection,
  toolSchemasSection,
  historySection,
  userTaskSection,
  type WorldDigestOptions,
} from './builtinSections.js';
