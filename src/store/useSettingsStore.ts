import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'zh';

interface SettingsState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'zh', // 默认中文
      setLanguage: (language) => set({ language }),
    }),
    { name: 'prompt-grid-settings' }
  )
);

export const i18n = {
  en: {
    allPrompts: 'All Prompts',
    favorites: 'Favorites',
    folders: 'Folders',
    searchCommands: 'Search commands...',
    prompts: 'Prompts',
    filter: 'Filter...',
    noPrompts: 'No prompts found.',
    untitled: 'Untitled Prompt',
    emptyPrompt: 'Empty prompt...',
    selectPrompt: 'Select a prompt or press ⌘K to search',
    promptTitle: 'Prompt Title',
    writePrompt: 'Write your prompt here... Use {{variable}} to create dynamic inputs.',
    playground: 'Playground',
    variables: 'Variables',
    noVariables: 'No variables detected. Use {{name}} syntax.',
    runTest: 'Run Test',
    copyPrompt: 'Copy Filled Prompt',
    newFolder: 'New folder...',
    settings: 'Settings',
    theme: 'Theme',
    language: 'Language',
    light: 'Light',
    dark: 'Dark',
    // Command Palette
    searchPlaceholder: 'Search prompts or commands...',
    noResults: 'No results found.',
    actions: 'Actions',
    createPromptAction: 'Create New Prompt',
    createFolderAction: 'Create New Folder',
    switchThemeAction: 'Switch Theme',
    switchLangAction: 'Switch Language',
    copySuccess: 'Copied to clipboard!',
  },
  zh: {
    allPrompts: '所有提示词',
    favorites: '我的收藏',
    folders: '文件夹',
    searchCommands: '全局搜索 / 快捷指令',
    prompts: '提示词列表',
    filter: '过滤查找...',
    noPrompts: '暂无提示词。',
    untitled: '未命名提示词',
    emptyPrompt: '空白提示词...',
    selectPrompt: '请在列表中选择一个提示词，或按 ⌘K 搜索',
    promptTitle: '提示词标题',
    writePrompt: '在此输入你的提示词... 使用 {{变量名}} 来创建动态填空。',
    playground: '测试沙盒',
    variables: '动态变量',
    noVariables: '未检测到变量。请使用 {{name}} 语法。',
    runTest: '测试运行 (未配置 API)',
    copyPrompt: '一键复制最终结果',
    newFolder: '新建文件夹...',
    settings: '偏好设置',
    theme: '外观主题',
    language: '显示语言',
    light: '浅色模式',
    dark: '深色模式',
    // Command Palette
    searchPlaceholder: '搜索提示词或快捷指令...',
    noResults: '未找到任何结果。',
    actions: '快捷操作',
    createPromptAction: '新建提示词',
    createFolderAction: '新建文件夹',
    switchThemeAction: '切换外观主题',
    switchLangAction: '切换显示语言',
    copySuccess: '已复制到剪贴板！',
  }
};
