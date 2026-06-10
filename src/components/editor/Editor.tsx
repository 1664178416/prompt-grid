'use client';

import { usePromptStore } from '@/store/usePromptStore';
import { useSettingsStore, i18n } from '@/store/useSettingsStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Prompt } from '@/lib/db';
import { useCallback, useEffect, useState, useRef } from 'react';
import { Play, Copy, Star, Trash2, Folder, ChevronDown, Check, Loader2, Settings2, Save, FileJson, Sparkles } from 'lucide-react';
import { cn, escapeRegExp, generateId, getErrorMessage } from '@/lib/utils';
import { readChatCompletionStream, readChatError, type ChatUsage } from '@/lib/openai-stream';
import SimpleEditor from 'react-simple-code-editor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import PromptOptimizerModal from './PromptOptimizerModal';

function extractPromptVariables(text: string) {
  if (!text) return [];
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = Array.from(text.matchAll(regex)).map(m => m[1].trim());
  return Array.from(new Set(matches));
}

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const CodeBlock = ({ inline, className, children, ...props }: CodeBlockProps) => {
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');
  
  const [isCopied, setIsCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="relative group rounded-md overflow-hidden border border-border my-4 shadow-xl">
        <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-white/10 text-xs text-gray-400 font-sans select-none">
          <div className="flex gap-1.5 items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
            <span className="ml-2 font-mono uppercase opacity-70">{lang}</span>
          </div>
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:text-white"
          >
            {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{isCopied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={lang}
          PreTag="div"
          customStyle={{ margin: 0, padding: '1rem', background: '#1e1e1e', fontSize: '0.85rem' }}
          {...props}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  }
  return (
    <code className={cn("bg-panel px-1.5 py-0.5 rounded text-indigo-400 text-sm", className)} {...props}>
      {children}
    </code>
  );
};

export default function Editor() {
  const { activePromptId, updatePrompt, deletePrompt, setCommandPaletteOpen } = usePromptStore();
  const { language, apiKey, apiBaseUrl, defaultModel } = useSettingsStore();
  const t = i18n[language];
  
  const prompt = useLiveQuery(
    () => activePromptId ? db.prompts.get(activePromptId) : undefined,
    [activePromptId]
  );

  const [title, setTitle] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [content, setContent] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isJsonCopied, setIsJsonCopied] = useState(false);
  
  // Local state for extracted variables
  const [variables, setVariables] = useState<string[]>([]);
  const [filledVars, setFilledVars] = useState<Record<string, string>>({});
  
  // Tag input state
  const [tagInput, setTagInput] = useState('');
  
  // Custom dropdown state
  const [isFolderSelectOpen, setIsFolderSelectOpen] = useState(false);
  
  // API Test state
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState('');
  const [testUsage, setTestUsage] = useState<ChatUsage | null>(null);
  const [testDuration, setTestDuration] = useState<number | null>(null);
  const [isModelConfigOpen, setIsModelConfigOpen] = useState(false);
  const [activeTestCaseId, setActiveTestCaseId] = useState<string | null>(null);
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
  const [isSavingTestCase, setIsSavingTestCase] = useState(false);
  const [testCaseName, setTestCaseName] = useState('');
  const pendingPromptUpdate = useRef<{ id: string; data: Partial<Prompt> } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncedPromptId = useRef<string | null>(null);
  
  const folders = useLiveQuery(() => db.folders.toArray()) || [];

  const flushPendingPromptUpdate = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    if (pendingPromptUpdate.current) {
      const { id, data } = pendingPromptUpdate.current;
      pendingPromptUpdate.current = null;
      updatePrompt(id, data);
    }
  }, [updatePrompt]);

  const queuePromptUpdate = useCallback((data: Partial<Prompt>) => {
    if (!activePromptId) return;

    pendingPromptUpdate.current = {
      id: activePromptId,
      data: {
        ...(pendingPromptUpdate.current?.id === activePromptId ? pendingPromptUpdate.current.data : {}),
        ...data,
      },
    };

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushPendingPromptUpdate, 450);
  }, [activePromptId, flushPendingPromptUpdate]);

  // Sync state when active prompt changes
  useEffect(() => {
    flushPendingPromptUpdate();
    const nextPromptId = prompt?.id ?? null;
    if (syncedPromptId.current === nextPromptId) return;
    syncedPromptId.current = nextPromptId;

    const timer = window.setTimeout(() => {
      if (prompt) {
        setTitle(prompt.title || '');
        setSystemPrompt(prompt.systemPrompt || '');
        setContent(prompt.content || '');
        setVariables(extractPromptVariables(prompt.content || ''));
        setTagInput('');
        setTestStatus('idle');
        setTestResult('');
        setTestUsage(null);
        setTestDuration(null);
        setIsSavingTestCase(false);
        setTestCaseName('');
      } else {
        setTitle('');
        setSystemPrompt('');
        setContent('');
        setVariables([]);
        setTestStatus('idle');
        setTestResult('');
        setTestUsage(null);
        setTestDuration(null);
        setFilledVars({});
        setActiveTestCaseId(null);
        setIsSavingTestCase(false);
        setTestCaseName('');
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [flushPendingPromptUpdate, prompt]);

  useEffect(() => {
    return () => flushPendingPromptUpdate();
  }, [flushPendingPromptUpdate]);

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const currentTags = prompt?.tags || [];
      const newTag = tagInput.trim().toLowerCase();
      if (!currentTags.includes(newTag)) {
        updatePrompt(activePromptId!, { tags: [...currentTags, newTag] });
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = prompt?.tags || [];
    updatePrompt(activePromptId!, { tags: currentTags.filter(t => t !== tagToRemove) });
  };

  const highlightVariables = (code: string) => {
    if (!code) return '';
    return code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\{\{([^}]+)\}\}/g, '<span class="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10 px-0.5 rounded">{{$1}}</span>');
  };

  const buildFilledPrompt = () => {
    let finalPrompt = content;
    variables.forEach(v => {
      const regex = new RegExp(`\\{\\{\\s*${escapeRegExp(v)}\\s*\\}\\}`, 'g');
      finalPrompt = finalPrompt.replace(regex, filledVars[v] || '');
    });
    return finalPrompt;
  };

  const handleSystemPromptValueChange = (value: string) => {
    setSystemPrompt(value);
    queuePromptUpdate({ systemPrompt: value });
  };

  const handleContentValueChange = (value: string) => {
    setContent(value);
    setVariables(extractPromptVariables(value));
    queuePromptUpdate({ content: value });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    queuePromptUpdate({ title: val });
  };

  const toggleFavorite = () => {
    if (activePromptId && prompt) {
      updatePrompt(activePromptId, { isFavorite: !prompt.isFavorite });
    }
  };

  const handleDelete = () => {
    if (activePromptId && window.confirm(t.confirmDeletePrompt)) {
      deletePrompt(activePromptId);
    }
  };

  const handleCopy = async () => {
    const finalPrompt = buildFilledPrompt();
    
    try {
      await navigator.clipboard.writeText(finalPrompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleCopyJson = async () => {
    const finalPrompt = buildFilledPrompt();
    
    const messages = [];
    if (systemPrompt.trim()) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: finalPrompt });

    try {
      await navigator.clipboard.writeText(JSON.stringify(messages, null, 2));
      setIsJsonCopied(true);
      setTimeout(() => setIsJsonCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy json: ', err);
    }
  };

  const handleSaveTestCase = () => {
    const name = testCaseName.trim();
    if (!name || !activePromptId) return;
    const currentCases = prompt?.testCases || [];
    const newCase = { id: generateId(), name, values: { ...filledVars } };
    updatePrompt(activePromptId, { testCases: [...currentCases, newCase] });
    setActiveTestCaseId(newCase.id);
    setTestCaseName('');
    setIsSavingTestCase(false);
  };

  const handleRunTest = async () => {
    if (!apiKey) {
      setTestStatus('error');
      setTestResult(t.apiKeyMissing);
      return;
    }

    const finalPrompt = buildFilledPrompt();

    const messages = [];
    if (systemPrompt.trim()) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: finalPrompt });

    setTestStatus('testing');
    setTestResult('');
    setTestUsage(null);
    setTestDuration(null);
    
    const startTime = Date.now();
    
    const cleanBaseUrl = apiBaseUrl.trim().replace(/\/+$/, '');
    const cleanApiKey = apiKey.trim();
    
    try {
      const response = await fetch(`${cleanBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanApiKey}`
        },
        body: JSON.stringify({
          model: prompt?.modelConfig?.modelName || defaultModel || 'gpt-3.5-turbo',
          messages: messages,
          temperature: prompt?.modelConfig?.temperature ?? 0.7,
          stream: true,
          stream_options: { include_usage: true }
        })
      });
      
      if (!response.ok) {
        throw new Error(await readChatError(response));
      }

      await readChatCompletionStream({
        response,
        onContent: (text) => setTestResult(prev => prev + text),
        onUsage: setTestUsage,
      });
      setTestStatus('success');
      setTestDuration(Date.now() - startTime);
    } catch (err: unknown) {
      setTestStatus('error');
      setTestDuration(Date.now() - startTime);
      setTestResult(getErrorMessage(err, 'Unknown error occurred.'));
    }
  };

  if (!activePromptId || !prompt) {
    return (
      <div className="flex-1 h-full bg-background flex flex-col items-center justify-center text-gray-500">
        <button 
          onClick={() => setCommandPaletteOpen(true)}
          className="w-16 h-16 border-2 border-dashed border-border rounded-lg mb-4 flex items-center justify-center bg-panel/30 hover:bg-panel transition-colors cursor-pointer"
        >
          <span className="text-xs font-mono text-gray-400">⌘K</span>
        </button>
        <p className="text-sm font-medium">{t.selectPrompt}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex bg-background">
      {/* Editor Main Area */}
      <div className="flex-1 flex flex-col border-r border-border min-w-0">
        <div className="h-14 flex items-center px-6 border-b border-border justify-between bg-panel/30">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder={t.promptTitle}
            className="bg-transparent border-none outline-none font-semibold text-lg text-foreground placeholder:text-gray-400 dark:placeholder:text-gray-600 flex-1 min-w-0 mr-4"
          />
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsOptimizerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-colors text-xs font-semibold shadow-sm"
            >
              <Sparkles size={14} />
              {t.optimizePrompt}
            </button>
            <div className="w-px h-4 bg-border mx-1"></div>
            <button 
              onClick={toggleFavorite}
              className={cn("w-8 h-8 rounded flex items-center justify-center transition-colors hover:bg-panel", prompt.isFavorite ? "text-amber-400" : "text-gray-400")}
            >
              <Star size={16} className={prompt.isFavorite ? "fill-amber-400" : ""} />
            </button>
            <button 
              onClick={handleDelete}
              className="w-8 h-8 rounded flex items-center justify-center transition-colors hover:bg-red-500/10 text-gray-400 hover:text-red-400"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Metadata Bar */}
        <div className="px-6 py-3 border-b border-border bg-panel/10 flex flex-col gap-3">
          {/* Premium Folder Selector */}
          <div className="flex items-center gap-2 relative">
            <span className="text-xs font-medium text-gray-500 w-16 pt-1">{t.moveFolder}</span>
            <button
              onClick={() => setIsFolderSelectOpen(!isFolderSelectOpen)}
              className="bg-background hover:bg-panel-hover border border-border rounded-md text-sm px-3 py-1.5 text-foreground outline-none transition-colors flex items-center justify-between min-w-[180px] shadow-sm"
            >
              <div className="flex items-center gap-2 truncate">
                <Folder size={14} className="text-indigo-400 shrink-0" />
                <span className="truncate">
                  {prompt.folderId ? folders.find(f => f.id === prompt.folderId)?.name : t.noFolder}
                </span>
              </div>
              <ChevronDown size={14} className="text-gray-500 shrink-0 ml-2" />
            </button>
            
            {isFolderSelectOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsFolderSelectOpen(false)} 
                />
                <div className="absolute top-full left-[72px] mt-1 w-48 bg-panel border border-border rounded-lg shadow-xl z-50 overflow-hidden flex flex-col py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={() => {
                      updatePrompt(activePromptId!, { folderId: null });
                      setIsFolderSelectOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors text-left group"
                  >
                    <Folder size={14} className="text-gray-400 group-hover:text-indigo-400" />
                    <span>{t.noFolder}</span>
                    {!prompt.folderId && <Check size={14} className="ml-auto text-indigo-500" />}
                  </button>
                  <div className="h-px bg-border my-1 w-full" />
                  {folders.map(f => (
                    <button
                      key={f.id}
                      onClick={() => {
                        updatePrompt(activePromptId!, { folderId: f.id });
                        setIsFolderSelectOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors text-left group"
                    >
                      <Folder size={14} className="text-indigo-400/70 group-hover:text-indigo-400" />
                      <span className="truncate">{f.name}</span>
                      {prompt.folderId === f.id && <Check size={14} className="ml-auto text-indigo-500" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* Tag Input */}
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-gray-500 w-16 pt-1.5">{t.tags}</span>
            <div className="flex-1 flex flex-wrap gap-2 items-center">
              {prompt.tags?.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-indigo-500">×</button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
                placeholder={t.addTagPlaceholder}
                className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-gray-400 dark:placeholder:text-gray-600 w-48 py-1"
              />
            </div>
          </div>
        </div>
        
        {/* System Prompt Area */}
        <div className="border-b border-border p-6 bg-panel/20">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
            {t.systemInstructions}
          </div>
          <div className="relative w-full">
            {systemPrompt === '' && (
              <div className="absolute top-0.5 left-0 text-sm text-gray-400 dark:text-gray-600 pointer-events-none font-sans w-full truncate pr-4">
                {t.systemInstructionsPlaceholder}
              </div>
            )}
            <SimpleEditor
              value={systemPrompt}
              onValueChange={handleSystemPromptValueChange}
              highlight={code => code}
              padding={0}
              textareaClassName="focus:outline-none"
              className="w-full text-sm font-mono leading-relaxed text-gray-600 dark:text-gray-400 min-h-[40px]"
            />
          </div>
        </div>

        {/* User Prompt Area */}
        <div className="flex-1 relative overflow-y-auto p-6">
          {content === '' && (
            <div className="absolute top-6 left-6 text-sm text-gray-400 dark:text-gray-700 pointer-events-none font-sans">
              {t.writePrompt}
            </div>
          )}
          <SimpleEditor
            value={content}
            onValueChange={handleContentValueChange}
            highlight={highlightVariables}
            padding={0}
            textareaClassName="focus:outline-none"
            className="w-full min-h-full text-sm font-mono leading-relaxed text-gray-800 dark:text-gray-300"
          />
        </div>
      </div>

      {/* Variables & Playground Area */}
      <div className="w-80 h-full bg-panel shrink-0 flex flex-col border-l border-border">
        <div className="h-14 flex items-center px-4 border-b border-border">
          <h2 className="font-semibold text-sm">{t.playground}</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Variables Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t.variables}</h3>
              {variables.length > 0 && (
                <button 
                  onClick={() => setIsSavingTestCase(true)}
                  className="text-xs flex items-center gap-1 text-indigo-500 hover:text-indigo-400 transition-colors font-medium"
                  title={t.saveTestCaseValues}
                >
                  <Save size={12} />
                  {t.saveTestCase}
                </button>
              )}
            </div>
            {isSavingTestCase && variables.length > 0 && (
              <div className="mb-4 rounded-lg border border-border bg-background p-3 space-y-2">
                <label className="block text-xs font-medium text-gray-500">{t.testCaseName}</label>
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={testCaseName}
                    onChange={(e) => setTestCaseName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTestCase();
                      if (e.key === 'Escape') {
                        setIsSavingTestCase(false);
                        setTestCaseName('');
                      }
                    }}
                    placeholder={t.testCaseNamePlaceholder}
                    className="min-w-0 flex-1 bg-panel text-sm px-2 py-1.5 rounded border border-border focus:border-indigo-500/50 outline-none"
                  />
                  <button
                    onClick={handleSaveTestCase}
                    disabled={!testCaseName.trim()}
                    className="px-2.5 py-1.5 rounded bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium"
                  >
                    {t.saveTestCase}
                  </button>
                </div>
              </div>
            )}
            
            {prompt?.testCases && prompt.testCases.length > 0 && (
              <div className="mb-4">
                <select 
                  className="w-full bg-background border border-border rounded text-xs px-2 py-1.5 outline-none focus:border-indigo-500/50"
                  value={activeTestCaseId || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    setActiveTestCaseId(id);
                    if (id) {
                      const tc = prompt.testCases?.find(c => c.id === id);
                      if (tc) setFilledVars(tc.values);
                    }
                  }}
                >
                  <option value="">{t.loadTestCase}</option>
                  {prompt.testCases.map(tc => (
                    <option key={tc.id} value={tc.id}>{tc.name}</option>
                  ))}
                </select>
              </div>
            )}

            {variables.length === 0 ? (
              <p className="text-xs text-gray-600">{t.noVariables}</p>
            ) : (
              <div className="space-y-3">
                {variables.map(v => (
                  <div key={v}>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{v}</label>
                    <input
                      type="text"
                      value={filledVars[v] || ''}
                      onChange={(e) => setFilledVars({...filledVars, [v]: e.target.value})}
                      className="w-full bg-background text-sm px-3 py-2 rounded border border-border focus:border-indigo-500/50 focus:outline-none transition-colors"
                      placeholder={`${v}...`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Action Section */}
          <div className="pt-4 border-t border-border flex flex-col gap-2">
             <button 
               onClick={handleRunTest}
               disabled={testStatus === 'testing'}
               className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
             >
               {testStatus === 'testing' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
               {testStatus === 'testing' ? t.testing : `${t.runTest}${!apiKey ? ` ${t.unconfigured}` : ''}`}
             </button>
             <div className="flex items-center gap-2 mt-2">
               <button 
                 onClick={handleCopy}
                 className="flex-1 flex items-center justify-center gap-2 bg-transparent border border-border hover:bg-background text-gray-400 hover:text-gray-200 px-3 py-2 rounded-md text-xs font-medium transition-colors"
               >
                 {isCopied ? <span className="text-emerald-400">{t.copied}</span> : (
                   <>
                     <Copy size={14} />
                     {t.copyText}
                   </>
                 )}
               </button>
               <button 
                 onClick={handleCopyJson}
                 className="flex-1 flex items-center justify-center gap-2 bg-transparent border border-border hover:bg-background text-gray-400 hover:text-gray-200 px-3 py-2 rounded-md text-xs font-medium transition-colors"
               >
                 {isJsonCopied ? <span className="text-emerald-400">{t.copied}</span> : (
                   <>
                     <FileJson size={14} />
                     {t.copyJson}
                   </>
                 )}
               </button>
             </div>
          </div>

          {/* Model Config Section */}
          <div className="pt-4 border-t border-border">
            <button 
              onClick={() => setIsModelConfigOpen(!isModelConfigOpen)}
              className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Settings2 size={14} />
                {t.modelOverride}
              </div>
              <ChevronDown size={14} className={cn("transition-transform", isModelConfigOpen && "rotate-180")} />
            </button>
            
            {isModelConfigOpen && (
              <div className="mt-3 space-y-3 p-3 bg-background border border-border rounded-lg text-sm">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t.modelName}</label>
                  <input 
                    type="text"
                    value={prompt.modelConfig?.modelName || ''}
                    onChange={(e) => updatePrompt(activePromptId, { modelConfig: { ...prompt.modelConfig, modelName: e.target.value, temperature: prompt.modelConfig?.temperature || 0.7 }})}
                    placeholder={defaultModel}
                    className="w-full bg-panel text-sm px-2 py-1.5 rounded border border-border focus:border-indigo-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t.temperature} ({prompt.modelConfig?.temperature ?? 0.7})</label>
                  <input 
                    type="range"
                    min="0" max="2" step="0.1"
                    value={prompt.modelConfig?.temperature ?? 0.7}
                    onChange={(e) => updatePrompt(activePromptId, { modelConfig: { ...prompt.modelConfig, modelName: prompt.modelConfig?.modelName || '', temperature: parseFloat(e.target.value) }})}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Test Result Section */}
          {(testResult || testStatus !== 'idle') && (
            <div className="pt-4 border-t border-border flex flex-col h-[400px]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center justify-between">
                {t.testResult}
                {testStatus === 'error' && <span className="text-red-500 lowercase normal-case">{t.testError}</span>}
              </h3>
              <div className="flex-1 overflow-y-auto bg-background rounded-lg border border-border p-4 relative">
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{ code: CodeBlock }}
                  >
                    {testResult}
                  </ReactMarkdown>
                  {testStatus === 'testing' && (
                    <span className="inline-block w-2 h-4 bg-indigo-500 ml-1 animate-pulse" />
                  )}
                </div>
              </div>
              
              {/* Test Metadata Bar */}
              {(testUsage || testDuration) && testStatus !== 'testing' && (
                <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500 bg-panel/30 px-3 py-1.5 rounded border border-border/50">
                  <div className="flex items-center gap-3">
                    {testDuration && <span>⏱️ {(testDuration / 1000).toFixed(2)}s</span>}
                    {testUsage && (
                      <>
                        <span title="Prompt Tokens">📥 {testUsage.prompt_tokens}</span>
                        <span title="Completion Tokens">📤 {testUsage.completion_tokens}</span>
                        <span className="font-semibold text-gray-400" title="Total Tokens">🧮 {testUsage.total_tokens}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <PromptOptimizerModal 
        isOpen={isOptimizerOpen}
        onClose={() => setIsOptimizerOpen(false)}
        currentSystemPrompt={systemPrompt}
        currentContent={content}
        onApply={(newSystem, newContent) => {
          setSystemPrompt(newSystem);
          setContent(newContent);
          setVariables(extractPromptVariables(newContent));
          if (activePromptId) {
            flushPendingPromptUpdate();
            updatePrompt(activePromptId, { systemPrompt: newSystem, content: newContent });
          }
        }}
      />
    </div>
  );
}
