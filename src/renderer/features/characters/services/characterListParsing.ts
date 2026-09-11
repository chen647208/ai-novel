/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 从自由文本（AI 批量角色输出）解析多个角色：逐行"字段：值"，落库前归一化枚举。
 * 纯函数，便于单测。
 */
import { uuidv7 } from '@core/entities';

import { type CharacterDraft, type CharacterDraftField,normalizeGenderId, normalizeRoleId } from '@/shared/utils/characterKinds';

import { type Character } from '../../../../shared/types';

type CharacterRoleArg = Parameters<typeof normalizeRoleId>[1];

function emptyDraft(id: string, name: string, role: string): CharacterDraft {
  return {
    id,
    name,
    gender: 'unknown',
    age: '未知',
    role,
    personality: '',
    background: '',
    relationships: '',
    appearance: '',
    distinctiveFeatures: '',
    occupation: '',
    motivation: '',
    strengths: '',
    weaknesses: '',
    characterArc: '',
  };
}

function finalize(draft: CharacterDraft, defaultRole: CharacterRoleArg): Character {
  return {
    id: draft.id || uuidv7(),
    name: draft.name || '',
    gender: normalizeGenderId(draft.gender),
    age: draft.age || '未知',
    role: normalizeRoleId(draft.role, defaultRole),
    personality: draft.personality || '',
    background: draft.background || '',
    relationships: draft.relationships || '',
    appearance: draft.appearance || '',
    distinctiveFeatures: draft.distinctiveFeatures || '',
    occupation: draft.occupation || '',
    motivation: draft.motivation || '',
    strengths: draft.strengths || '',
    weaknesses: draft.weaknesses || '',
    characterArc: draft.characterArc || '',
  };
}

export function parseCharactersFromText(text: string): Character[] {
  const chars: Character[] = [];
  const cleanLines = text.replace(/[*#_]/g, '').split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  // 解析草稿：role/gender 先收原始文本，落库前经 normalizeRoleId/normalizeGenderId 归一化
  let activeChar: CharacterDraft | null = null;
  let currentField: CharacterDraftField | null = null;

  cleanLines.forEach((line) => {
    const nameMatch = line.match(/^(?:角色名|姓名|名字|名称|身份)[:：\s]*(.*)/i);
    if (nameMatch && nameMatch[1]?.trim()) {
      if (activeChar && activeChar.name) {
        chars.push(finalize(activeChar, 'protagonist'));
      }
      activeChar = emptyDraft(uuidv7(), nameMatch[1]?.trim() ?? '', 'protagonist');
      currentField = 'name';
      return;
    }
    if (!activeChar) return;

    const genderMatch = line.match(/^(?:性别|性别类型)[:：\s]*(.*)/i);
    const ageMatch = line.match(/^(?:年龄|岁数)[:：\s]*(.*)/i);
    const roleMatch = line.match(/^(?:类型|角色类型|定位|身份)[:：\s]*(.*)/i);
    const personalityMatch = line.match(/^(?:性格|特质|性格特征)[:：\s]*(.*)/i);
    const backgroundMatch = line.match(/^(?:背景|出身|生平)[:：\s]*(.*)/i);
    const relationshipMatch = line.match(/^(?:关系|角色关系|社交)[:：\s]*(.*)/i);
    const appearanceMatch = line.match(/^(?:外观|外貌|长相|外表)[:：\s]*(.*)/i);
    const featuresMatch = line.match(/^(?:特征|标志性特征|特点)[:：\s]*(.*)/i);
    const occupationMatch = line.match(/^(?:职业|身份|职位)[:：\s]*(.*)/i);
    const motivationMatch = line.match(/^(?:动机|目标|目的)[:：\s]*(.*)/i);
    const strengthsMatch = line.match(/^(?:优势|能力|特长)[:：\s]*(.*)/i);
    const weaknessesMatch = line.match(/^(?:弱点|缺陷|缺点)[:：\s]*(.*)/i);
    const arcMatch = line.match(/^(?:成长|弧线|发展)[:：\s]*(.*)/i);

    if (genderMatch) { activeChar.gender = genderMatch[1]?.trim() ?? ''; currentField = 'gender'; }
    else if (ageMatch) { activeChar.age = ageMatch[1]?.trim() ?? ''; currentField = 'age'; }
    else if (roleMatch) { activeChar.role = roleMatch[1]?.trim() ?? ''; currentField = 'role'; }
    else if (personalityMatch) { activeChar.personality = personalityMatch[1]?.trim() ?? ''; currentField = 'personality'; }
    else if (backgroundMatch) { activeChar.background = backgroundMatch[1]?.trim() ?? ''; currentField = 'background'; }
    else if (relationshipMatch) { activeChar.relationships = relationshipMatch[1]?.trim() ?? ''; currentField = 'relationships'; }
    else if (appearanceMatch) { activeChar.appearance = appearanceMatch[1]?.trim() ?? ''; currentField = 'appearance'; }
    else if (featuresMatch) { activeChar.distinctiveFeatures = featuresMatch[1]?.trim() ?? ''; currentField = 'distinctiveFeatures'; }
    else if (occupationMatch) { activeChar.occupation = occupationMatch[1]?.trim() ?? ''; currentField = 'occupation'; }
    else if (motivationMatch) { activeChar.motivation = motivationMatch[1]?.trim() ?? ''; currentField = 'motivation'; }
    else if (strengthsMatch) { activeChar.strengths = strengthsMatch[1]?.trim() ?? ''; currentField = 'strengths'; }
    else if (weaknessesMatch) { activeChar.weaknesses = weaknessesMatch[1]?.trim() ?? ''; currentField = 'weaknesses'; }
    else if (arcMatch) { activeChar.characterArc = arcMatch[1]?.trim() ?? ''; currentField = 'characterArc'; }
    else if (currentField && currentField !== 'id') {
      activeChar[currentField] = ((activeChar[currentField] || '') + ' ' + line).trim();
    }
  });

  // forEach 闭包内的赋值对外层 CFA 不可见：此处断言回完整并集（勿删，否则收窄为 null）
  const char = activeChar as CharacterDraft | null;
  if (char && char.name) {
    chars.push(finalize(char, 'protagonist'));
  }
  return chars;
}
