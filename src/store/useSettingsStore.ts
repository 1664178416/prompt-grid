import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'zh';

interface SettingsState {
  language: Language;
  apiKey: string;
  apiBaseUrl: string;
  defaultModel: string;
  setLanguage: (lang: Language) => void;
  setApiKey: (key: string) => void;
  setApiBaseUrl: (url: string) => void;
  setDefaultModel: (model: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'zh', // 默认中文
      apiKey: '',
      apiBaseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-3.5-turbo',
      setLanguage: (language) => set({ language }),
      setApiKey: (apiKey) => set({ apiKey }),
      setApiBaseUrl: (apiBaseUrl) => set({ apiBaseUrl }),
      setDefaultModel: (defaultModel) => set({ defaultModel }),
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
    unconfigured: '(Not Configured)',
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
    // Phase 2
    tags: 'Tags',
    allTags: 'All Tags',
    addTagPlaceholder: 'Add tag and press Enter...',
    moveFolder: 'Move to Folder...',
    exportData: 'Export All Data',
    importData: 'Import Data',
    exportSuccess: 'Data exported successfully!',
    importSuccess: 'Data imported successfully!',
    noFolder: 'No Folder',
    // API Settings
    apiConfig: 'API Configuration',
    apiKey: 'API Key',
    apiBaseUrl: 'Base URL',
    defaultModel: 'Default Model',
    saveSettings: 'Save Settings',
    testResult: 'Test Result',
    testing: 'Testing...',
    testError: 'Test Error',
    modelOverride: 'Override Model',
    temperature: 'Temperature',
    // Phase 4
    systemInstructions: 'System Instructions',
    systemInstructionsPlaceholder: 'Enter system instructions here (e.g. "You are an expert assistant...")',
    saveTestCase: 'Save',
    loadTestCase: '-- Load Test Case --',
    copyText: 'Text',
    copyJson: 'JSON',
    copied: 'Copied!',
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
    runTest: '测试运行',
    unconfigured: '(未配置 API)',
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
    // Phase 2
    tags: '标签',
    allTags: '全部标签',
    addTagPlaceholder: '输入标签后按回车添加...',
    moveFolder: '移动到文件夹...',
    exportData: '导出备份数据',
    importData: '导入备份数据',
    exportSuccess: '数据导出成功！',
    importSuccess: '数据导入成功！',
    noFolder: '未分类',
    // API Settings
    apiConfig: 'API 接口配置',
    apiKey: 'API 密钥 (API Key)',
    apiBaseUrl: '接口地址 (Base URL)',
    defaultModel: '默认模型',
    saveSettings: '保存设置',
    testResult: '测试结果',
    testing: '正在请求...',
    testError: '测试发生错误',
    modelOverride: '模型配置',
    temperature: '随机性 (Temperature)',
    // Phase 4
    systemInstructions: '系统提示词 (System Instructions)',
    systemInstructionsPlaceholder: '在此输入系统设定（如："你是一个人工智能助手..."）',
    saveTestCase: '保存用例',
    loadTestCase: '-- 载入测试用例 --',
    copyText: '纯文本',
    copyJson: 'JSON',
    copied: '已复制！',
  }
};
