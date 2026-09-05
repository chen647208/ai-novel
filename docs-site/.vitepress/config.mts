import { defineConfig } from 'vitepress';

// 文档站（design/08 M5）：以 docs/ 设计与指南为内容源，VitePress 静态输出。
export default defineConfig({
  lang: 'zh-CN',
  title: 'AI小说家 (ai-novel)',
  description: '本地优先的 AI 小说创作助手——设计蓝图与使用指南',
  srcDir: 'src',
  themeConfig: {
    siteTitle: 'AI小说家 (ai-novel)',
    nav: [
      { text: '设计蓝图', link: '/design/08-roadmap', activeMatch: '/design/' },
      { text: '使用指南', link: '/guides/project-structure', activeMatch: '/guides/' },
      { text: '功能说明', link: '/features/workflow', activeMatch: '/features/' },
    ],
    sidebar: {
      '/design/': [
        {
          text: '目标设计',
          items: [
            { text: '01 现状评估', link: '/design/01-current-state' },
            { text: '02 目标架构', link: '/design/02-target-architecture' },
            { text: '03 数据层', link: '/design/03-data-layer' },
            { text: '04 插件系统', link: '/design/04-plugin-system' },
            { text: '05 AI 层', link: '/design/05-ai-layer' },
            { text: '06 编辑器与 UI', link: '/design/06-editor-and-ui' },
            { text: '07 导出构建', link: '/design/07-export-build' },
            { text: '08 路线图', link: '/design/08-roadmap' },
          ],
        },
      ],
      '/guides/': [
        {
          text: '指南',
          items: [
            { text: '项目结构', link: '/guides/project-structure' },
            { text: '构建与发布', link: '/guides/build-and-release' },
            { text: 'CI 与发布流程', link: '/guides/ci-and-release' },
            { text: '许可说明', link: '/guides/licensing' },
          ],
        },
      ],
      '/features/': [
        {
          text: '功能说明',
          items: [
            { text: '创作流程', link: '/features/workflow' },
            { text: 'AI 层', link: '/features/ai-layer' },
            { text: '写作', link: '/features/writing' },
            { text: '伏笔追踪', link: '/features/foreshadowing' },
            { text: '知识库', link: '/features/knowledge' },
            { text: '助手', link: '/features/assistant' },
            { text: '世界构建', link: '/features/world' },
            { text: '设置', link: '/features/settings' },
          ],
        },
      ],
    },
  },
});
