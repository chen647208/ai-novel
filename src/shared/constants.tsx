
import { PromptTemplate } from './types';

export const DEFAULT_PROMPTS: PromptTemplate[] = [
  {
    id: 'p1',
    category: 'inspiration',
    name: '经典创意生成',
    content: '根据我的这些灵感碎片：{inspiration}。请生成三个极具吸引力的小说名字和简介。格式要求：使用“1. 书名：xxx，简介：xxx”的形式。'
  },
  {
    id: 'p2',
    category: 'character',
    name: '多维角色构建',
    content: '基于小说《{title}》及其简介：{intro}。请为我构思一套完整的角色体系。包含核心主角、重要配角、关键反派。请务必使用以下格式列出每个角色（不要使用Markdown加粗）：\n\n角色名：[姓名]\n性别：[性别]\n年龄：[年龄]\n角色类型：[主角/配角/反派]\n性格：[性格描述]\n背景：[生平背景]\n关系：[与其他角色的关系]\n外观：[外观描述]\n标志性特征：[标志性特征]\n职业：[职业/身份]\n动机：[动机/目标]\n优势：[优势/能力]\n弱点：[弱点/缺陷]\n成长弧线：[角色成长弧线]\n---'
  },
  {
    id: 'p3',
    category: 'outline',
    name: '深度角色驱动大纲',
    content: '根据小说《{title}》，简介：{intro}。人物设定如下：{characters}。请编写一个逻辑自洽、冲突强烈的小说大纲。'
  },
  {
    id: 'p4',
    category: 'chapter',
    name: '全量章节细纲生成',
    content: '根据大纲：{outline}。请直接从“第一章”开始输出详细章节列表（至少20章）。格式：\n第1章：[标题]\n剧情细纲：[描述]\n---'
  },
  {
    id: 'p4-continue',
    category: 'chapter',
    name: '续写后续章节细纲',
    content: '根据全书大纲：{outline}。\n\n目前已经完成了前 {count} 章的细纲，已知章节如下：\n{existing_chapters}\n\n请紧接上述内容，从“第 {next_count} 章”开始，继续输出后续的章节细纲（约20章）。请确保剧情逻辑连贯，符合大纲走向。格式保持一致：\n第N章：[标题]\n剧情细纲：[描述]\n---'
  },
  {
    id: 'p5',
    category: 'writing',
    name: '沉浸式正文创作',
    content: '根据小说大纲及角色设定，请为我创作《{title}》的正式内容。当前章节：{chapter_title}，细纲：{summary}。要求注重细节描写。'
  },
  {
    id: 'p-w2',
    category: 'writing',
    name: '智能逻辑续写',
    content: '请根据当前正文内容：{content}，结合本章细纲：{summary}，进行逻辑严密的续写。保持文风一致，推动剧情发展。'
  },
  {
    id: 'p6',
    category: 'edit',
    name: '文学性精修',
    content: '请对以下正文进行润色，增强文学性和情感描写：{content}'
  },
  {
    id: 'p-e2',
    category: 'edit',
    name: '细节扩充',
    content: '请扩充以下内容：{content}。要求增加更多环境描写、心理描写和动作细节，使其更加丰满生动。'
  },
  {
    id: 'p-e3',
    category: 'edit',
    name: '对白优化',
    content: '请优化以下内容中的对白：{content}。使人物性格通过对话更加鲜明，增加对话的张力和真实感。'
  },
  {
    id: 'p-s1',
    category: 'summary',
    name: '章节正文摘要提取',
    content: '请为以下章节正文提取一个简洁的摘要，突出主要情节、关键事件和人物发展：{content}。摘要应控制在100-200字以内，保持客观准确。'
  },
  {
    id: 'p-s2',
    category: 'summary',
    name: '智能章节摘要生成',
    content: '基于以下章节内容：{content}，请生成一个结构化的摘要，包含：1. 主要情节 2. 关键转折点 3. 人物表现 4. 情感基调。每个部分用简短段落描述。'
  },
  {
    id: 'p-s3',
    category: 'summary',
    name: '多章节摘要整合',
    content: '请为以下多个章节内容生成一个连贯的摘要：{content}。摘要应体现章节间的连贯性和剧情发展脉络，突出整体故事进展。'
  }
];

export const INITIAL_MODELS = [
  {
    id: 'default-gemini',
    name: 'Gemini (Default)',
    provider: 'gemini' as const,
    modelName: 'gemini-3-flash-preview',
    supportsStreaming: true  // 添加此字段
  }
];
