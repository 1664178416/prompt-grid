'use client';

import { usePromptStore } from '@/store/usePromptStore';
import { useSettingsStore, i18n } from '@/store/useSettingsStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Prompt } from '@/lib/db';
import { cn } from '@/lib/utils';
import { Plus, MoreHorizontal, Sun, Moon, Languages } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-7 h-7" />;

  const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-foreground hover:bg-panel-hover transition-colors"
      title="Toggle theme"
    >
      {isDark ? <Moon size={14} /> : <Sun size={14} />}
    </button>
  );
}

function LangToggle() {
  const { language, setLanguage } = useSettingsStore();
  
  return (
    <button
      onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
      className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-foreground hover:bg-panel-hover transition-colors font-semibold text-[10px]"
      title="Toggle Language"
    >
      {language === 'zh' ? 'EN' : '中'}
    </button>
  );
}

export default function PromptList() {
  const { activeFolderId, activePromptId, setActivePrompt, createPrompt, searchQuery, setSearchQuery } = usePromptStore();
  const { language } = useSettingsStore();
  const t = i18n[language];
  
  // Fetch all prompts to filter locally based on current folder/search
  const allPrompts = useLiveQuery(() => db.prompts.toArray()) || [];
  
  const prompts = useMemo(() => {
    let filtered = allPrompts;
    if (activeFolderId === 'favorites') {
      filtered = filtered.filter(p => p.isFavorite);
    } else if (activeFolderId !== null) {
      filtered = filtered.filter(p => p.folderId === activeFolderId);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
    }
    
    // Sort by updated time desc
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [allPrompts, activeFolderId, searchQuery]);

  const handleCreate = async () => {
    const id = await createPrompt(activeFolderId === 'favorites' ? null : activeFolderId);
    setActivePrompt(id);
  };

  return (
    <div className="w-[320px] h-full bg-background border-r border-border flex flex-col shrink-0">
      <div className="h-14 flex items-center px-4 border-b border-border justify-between">
        <h2 className="font-semibold text-sm">{t.prompts}</h2>
        <div className="flex items-center gap-1">
          <LangToggle />
          <ThemeToggle />
          <button 
            onClick={handleCreate}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-panel-hover text-gray-400 hover:text-gray-200 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      
      <div className="p-2 border-b border-border">
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.filter} 
          className="w-full bg-panel text-sm px-3 py-1.5 rounded-md border border-border focus:border-indigo-500/50 focus:outline-none transition-colors placeholder:text-gray-600"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {prompts.length === 0 ? (
          <div className="text-center py-10 text-xs text-gray-500">{t.noPrompts}</div>
        ) : (
          prompts.map(prompt => (
            <PromptCard 
              key={prompt.id} 
              prompt={prompt} 
              isActive={activePromptId === prompt.id}
              onClick={() => setActivePrompt(prompt.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PromptCard({ prompt, isActive, onClick }: { prompt: Prompt, isActive: boolean, onClick: () => void }) {
  const { language } = useSettingsStore();
  const t = i18n[language];
  // Simple token estimator (words * 1.3)
  const estimatedTokens = Math.ceil((prompt.content.split(/\s+/).filter(Boolean).length || 0) * 1.3);
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all duration-200 group flex flex-col gap-1.5",
        isActive 
          ? "bg-panel border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.05)]" 
          : "bg-transparent border-transparent hover:bg-panel-hover hover:border-border"
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-foreground truncate pr-2">
          {prompt.title || t.untitled}
        </h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal size={14} className="text-gray-500 hover:text-gray-300" />
        </div>
      </div>
      
      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
        {prompt.content || t.emptyPrompt}
      </p>
      
      <div className="flex items-center gap-2 mt-1">
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded uppercase font-medium tracking-wider",
          prompt.status === 'active' ? "bg-emerald-500/10 text-emerald-400" :
          prompt.status === 'draft' ? "bg-gray-500/10 text-gray-400" :
          "bg-amber-500/10 text-amber-400"
        )}>
          {prompt.status}
        </span>
        <span className="text-[10px] text-gray-600 font-mono">
          ~{estimatedTokens} tkns
        </span>
      </div>
    </button>
  );
}
