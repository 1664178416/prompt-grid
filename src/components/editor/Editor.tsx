'use client';

import { usePromptStore } from '@/store/usePromptStore';
import { useSettingsStore, i18n } from '@/store/useSettingsStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useEffect, useState, useRef } from 'react';
import { Play, Copy, Star, Trash2, Folder, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import SimpleEditor from 'react-simple-code-editor';

export default function Editor() {
  const { activePromptId, updatePrompt, deletePrompt, setCommandPaletteOpen } = usePromptStore();
  const { language } = useSettingsStore();
  const t = i18n[language];
  
  const prompt = useLiveQuery(
    () => activePromptId ? db.prompts.get(activePromptId) : undefined,
    [activePromptId]
  );

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  
  // Local state for extracted variables
  const [variables, setVariables] = useState<string[]>([]);
  const [filledVars, setFilledVars] = useState<Record<string, string>>({});
  
  // Tag input state
  const [tagInput, setTagInput] = useState('');
  
  // Custom dropdown state
  const [isFolderSelectOpen, setIsFolderSelectOpen] = useState(false);
  
  const folders = useLiveQuery(() => db.folders.toArray()) || [];

  // Sync state when active prompt changes
  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setContent(prompt.content);
      extractVariables(prompt.content);
      setTagInput('');
    } else {
      setTitle('');
      setContent('');
      setVariables([]);
    }
  }, [prompt?.id]);

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

  const extractVariables = (text: string) => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = Array.from(text.matchAll(regex)).map(m => m[1].trim());
    const uniqueVars = Array.from(new Set(matches));
    setVariables(uniqueVars);
  };

  const highlightVariables = (code: string) => {
    return code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\{\{([^}]+)\}\}/g, '<span class="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10 px-0.5 rounded">{{$1}}</span>');
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    extractVariables(val);
    if (activePromptId) {
      updatePrompt(activePromptId, { content: val });
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (activePromptId) {
      updatePrompt(activePromptId, { title: val });
    }
  };

  const toggleFavorite = () => {
    if (activePromptId && prompt) {
      updatePrompt(activePromptId, { isFavorite: !prompt.isFavorite });
    }
  };

  const handleDelete = () => {
    if (activePromptId) {
      deletePrompt(activePromptId);
    }
  };

  const handleCopy = async () => {
    let finalPrompt = content;
    variables.forEach(v => {
      const regex = new RegExp(`\\{\\{${v}\\}\\}`, 'g');
      finalPrompt = finalPrompt.replace(regex, filledVars[v] || '');
    });
    
    try {
      await navigator.clipboard.writeText(finalPrompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
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
                placeholder="Add tag and press Enter..."
                className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-gray-400 dark:placeholder:text-gray-600 w-48 py-1"
              />
            </div>
          </div>
        </div>
        
        <div className="flex-1 relative overflow-y-auto p-6">
          {content === '' && (
            <div className="absolute top-6 left-6 text-sm text-gray-400 dark:text-gray-700 pointer-events-none font-sans">
              {t.writePrompt}
            </div>
          )}
          <SimpleEditor
            value={content}
            onValueChange={val => handleContentChange({ target: { value: val } } as any)}
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">{t.variables}</h3>
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
          <div className="pt-4 border-t border-border">
             <button className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20">
               <Play size={16} />
               {t.runTest}
             </button>
             <button 
               onClick={handleCopy}
               className="w-full flex items-center justify-center gap-2 bg-transparent border border-border hover:bg-background text-gray-300 px-4 py-2 rounded-md text-sm font-medium transition-colors mt-2"
             >
               {isCopied ? <span className="text-emerald-400">{t.copySuccess}</span> : (
                 <>
                   <Copy size={16} />
                   {t.copyPrompt}
                 </>
               )}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
