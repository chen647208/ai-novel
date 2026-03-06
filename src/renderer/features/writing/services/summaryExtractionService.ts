import { AIService } from '../../assistant/services/aiService';
import type { Chapter, ModelConfig, Project, PromptTemplate } from '../../../../shared/types';

interface ExtractChapterSummaryArgs {
  activeChapter: Chapter | undefined;
  summaryPrompts: PromptTemplate[];
  selectedSummaryPromptId: string;
  prompts: PromptTemplate[];
  project: Project;
  activeModel: ModelConfig;
  onUpdate: (updates: Partial<Project>) => void;
}

export const extractChapterSummary = async ({
  activeChapter,
  summaryPrompts,
  selectedSummaryPromptId,
  prompts,
  project,
  activeModel,
  onUpdate,
}: ExtractChapterSummaryArgs) => {
  if (!activeChapter || !activeChapter.content || activeChapter.content.trim().length === 0) {
    alert('当前章节没有正文内容，无法提取摘要。');
    return;
  }

  if (summaryPrompts.length === 0) {
    alert('没有可用的摘要提示词模板，请先添加摘要类别的提示词。');
    return;
  }

  const selectedPromptId = selectedSummaryPromptId || summaryPrompts[0]?.id || '';
  if (!selectedPromptId) {
    alert('请选择摘要提示词模板。');
    return;
  }

  const template = prompts.find((prompt) => prompt.id === selectedPromptId);
  if (!template) {
    alert('选择的摘要提示词模板不存在。');
    return;
  }

  let finalPrompt = template.content;
  const context = activeChapter.content;

  if (!finalPrompt.includes('{content}') && context) {
    finalPrompt += `\n\n需要处理的原文内容：\n"""\n${context}\n"""\n\n请根据上述内容进行处理。`;
  }

  finalPrompt = finalPrompt
    .replace('{content}', context)
    .replace('{title}', project.title)
    .replace('{chapter_title}', activeChapter.title)
    .replace('{summary}', activeChapter.summary)
    .replace('{inspiration}', project.inspiration);

  const result = await AIService.call(activeModel, finalPrompt);
  if (result.error) {
    alert(`AI 提取摘要失败: ${result.error}`);
    return;
  }

  const chaptersWithSummary = project.chapters.map((chapter) => {
    if (chapter.id !== activeChapter.id) {
      return chapter;
    }

    return {
      ...chapter,
      contentSummary: result.content,
    };
  });

  const historyRecord = AIService.buildHistoryRecordData(
    activeChapter.id,
    finalPrompt,
    result.content,
    activeModel,
    result,
    {
      templateName: template.name,
      batchGeneration: false,
      chapterTitle: activeChapter.title,
      operationType: 'summary_extraction',
    },
  );

  const updatedChapters = chaptersWithSummary.map((chapter) => {
    if (chapter.id !== activeChapter.id) {
      return chapter;
    }

    return {
      ...chapter,
      history: [...(chapter.history || []), historyRecord],
    };
  });

  onUpdate({ chapters: updatedChapters });
  alert('章节正文摘要提取成功！');
};

