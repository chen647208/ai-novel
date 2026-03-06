import type { Project, PromptTemplate } from '../../../shared/types';
import type { AssistantCategory, EditingData } from './types';

export const buildAssistantContextContent = (
  project: Project | null,
  activeCategory: AssistantCategory,
  subSelectionId: string,
) => {
  if (!project) {
    return '当前未打开任何项目。';
  }

  switch (activeCategory) {
    case 'inspiration':
      return `【书名】\n${project.title}\n\n【原始灵感】\n${project.inspiration || '无'}\n\n【简介方案】\n${project.intro || '无'}`;
    case 'knowledge':
      if (subSelectionId === 'all') {
        return (project.knowledge || []).map((item) => `- ${item.name} (${item.type})`).join('\n') || '知识库为空';
      }
      const knowledgeItem = project.knowledge?.find((item) => item.id === subSelectionId);
      return knowledgeItem ? `【资料：${knowledgeItem.name}】\n${knowledgeItem.content}` : '未找到资料';
    case 'characters':
      if ((project.characters || []).length === 0) {
        return '暂无角色档案';
      }
      return (project.characters || []).map((character) =>
        `角色名：${character.name || '未命名'}\n`
        + `性别：${character.gender || '未知'}\n`
        + `年龄：${character.age || '未知'}\n`
        + `角色类型：${character.role || '未知'}\n`
        + `性格：${character.personality || '暂无描述'}\n`
        + `背景：${character.background || '暂无背景'}\n`
        + `关系：${character.relationships || '暂无关系'}\n`
        + `外观：${character.appearance || '暂无描述'}\n`
        + `标志性特征：${character.distinctiveFeatures || '暂无特征'}\n`
        + `职业：${character.occupation || '暂无'}\n`
        + `动机：${character.motivation || '暂无'}\n`
        + `优势：${character.strengths || '暂无'}\n`
        + `弱点：${character.weaknesses || '暂无'}\n`
        + `成长弧线：${character.characterArc || '暂无'}`,
      ).join('\n\n----------------\n\n');
    case 'outline':
      return project.outline || '暂无大纲内容';
    case 'chapters':
      if (subSelectionId === 'all') {
        return (project.chapters || [])
          .sort((a, b) => a.order - b.order)
          .map((chapter) => `第${chapter.order + 1}章：${chapter.title}`)
          .join('\n') || '暂无章节';
      }
      const chapter = project.chapters?.find((item) => item.id === subSelectionId);
      return chapter ? `【第${chapter.order + 1}章：${chapter.title}】\n\n细纲：\n${chapter.summary}` : '未找到章节';
    default:
      return '';
  }
};

export const findRelevantAnalysisPromptId = (activeCategory: AssistantCategory, prompts: PromptTemplate[]) => {
  const relevantPrompt = prompts.find((prompt) => {
    if (activeCategory === 'inspiration') {
      return prompt.category === 'inspiration';
    }
    if (activeCategory === 'characters') {
      return prompt.category === 'character';
    }
    if (activeCategory === 'outline') {
      return prompt.category === 'outline';
    }
    if (activeCategory === 'chapters') {
      return prompt.category === 'chapter';
    }
    return prompt.category === 'edit';
  });

  return relevantPrompt?.id || prompts[0]?.id || '';
};

export const getChapterContentFromEditingData = (
  project: Project | null,
  editingData: EditingData,
  chapterId: string,
) => {
  if (!project) {
    return '';
  }

  if (editingData.chapters && editingData.chapters.length > 0) {
    const editedChapter = editingData.chapters.find((chapter) => chapter.id === chapterId);
    if (editedChapter && editedChapter.content !== undefined) {
      return editedChapter.content;
    }
  }

  const chapter = project.chapters.find((item) => item.id === chapterId);
  return chapter?.content || '';
};
