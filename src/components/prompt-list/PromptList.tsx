'use client';

import { usePromptStore } from '@/store/usePromptStore';
import { useSettingsStore, i18n } from '@/store/useSettingsStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Prompt } from '@/lib/db';
import { cn } from '@/lib/utils';
import { Plus, Sun, Moon, Star, Trash2 } from 'lucide-react';
import { useMemo, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useHydrated } from '@/hooks/useHydrated';

function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const { language } = useSettingsStore();
  const t = i18n[language];
  const mounted = useHydrated();

  if (!mounted) return <div className="w-7 h-7" />;

  const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-foreground hover:bg-panel-hover transition-colors"
      title={t.toggleTheme}
    >
      {isDark ? <Moon size={14} /> : <Sun size={14} />}
    </button>
  );
}

function LangToggle() {
  const { language, setLanguage } = useSettingsStore();
  const t = i18n[language];
  
  return (
    <button
      onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
      className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-foreground hover:bg-panel-hover transition-colors font-semibold text-[10px]"
      title={t.toggleLanguage}
    >
      {language === 'zh' ? 'EN' : '中'}
    </button>
  );
}

export default function PromptList() {
  const { activeFolderId, activeTag, activePromptId, setActivePrompt, createPrompt, updatePrompt, deletePrompt, searchQuery, setSearchQuery } = usePromptStore();
  const { language } = useSettingsStore();
  const t = i18n[language];
  
  const livePrompts = useLiveQuery(() => db.prompts.toArray());
  const allPrompts = useMemo(() => livePrompts || [], [livePrompts]);
  
  const prompts = useMemo(() => {
    let filtered = allPrompts;
    
    if (activeTag) {
      filtered = filtered.filter(p => p.tags && p.tags.includes(activeTag));
    } else if (activeFolderId === 'favorites') {
      filtered = filtered.filter(p => p.isFavorite);
    } else if (activeFolderId !== null) {
      filtered = filtered.filter(p => p.folderId === activeFolderId);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
    }
    
    return [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [allPrompts, activeFolderId, activeTag, searchQuery]);

  const handleCreate = async () => {
    const id = await createPrompt(activeFolderId === 'favorites' ? null : activeFolderId);
    setActivePrompt(id);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA' || 
        document.activeElement?.tagName === 'SELECT' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      
      if (!prompts.length) return;
      
      const currentIndex = prompts.findIndex(p => p.id === activePromptId);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < prompts.length - 1 ? currentIndex + 1 : 0;
        setActivePrompt(prompts[nextIndex].id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : prompts.length - 1;
        setActivePrompt(prompts[prevIndex].id);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompts, activePromptId, setActivePrompt]);

  return (
    <div className="w-full h-full bg-background border-r border-border flex flex-col shrink-0">
      <div className="h-14 flex items-center px-4 border-b border-border justify-between">
        <h2 className="font-semibold text-sm truncate pr-2 text-foreground">
          {activeTag ? `#${activeTag}` : t.prompts}
        </h2>
        <div className="flex items-center gap-1">
          <LangToggle />
          <ThemeToggle />
          <button 
            onClick={handleCreate}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-panel-hover text-gray-400 hover:text-foreground transition-colors"
            title={t.createPromptAction}
            aria-label={t.createPromptAction}
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
          className="w-full bg-panel text-sm px-3 py-1.5 rounded-md border border-border focus:border-indigo-500/50 focus:outline-none transition-colors placeholder:text-gray-500 text-foreground"
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
              onDelete={(e) => {
                e.stopPropagation();
                if (window.confirm(t.confirmDeletePrompt)) {
                  deletePrompt(prompt.id);
                }
              }}
              onToggleFavorite={(e) => {
                e.stopPropagation();
                updatePrompt(prompt.id, { isFavorite: !prompt.isFavorite });
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PromptCard({ prompt, isActive, onClick, onDelete, onToggleFavorite }: { prompt: Prompt, isActive: boolean, onClick: () => void, onDelete: (e: React.MouseEvent<HTMLButtonElement>) => void, onToggleFavorite: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  const { language } = useSettingsStore();
  const t = i18n[language];
  const estimatedTokens = Math.ceil(((prompt.content || '').split(/\s+/).filter(Boolean).length || 0) * 1.3);
  
  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-current={isActive ? 'true' : undefined}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all duration-200 group flex flex-col gap-1.5 cursor-pointer",
        isActive 
          ? "bg-panel border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.05)]" 
          : "bg-transparent border-transparent hover:bg-panel-hover hover:border-border"
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-foreground truncate pr-2">
          {prompt.title || t.untitled}
        </h3>
        <div className={cn("flex items-center gap-1 transition-opacity", prompt.isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
          <button 
            onClick={onToggleFavorite}
            className="text-gray-400 hover:text-amber-400 transition-colors p-1"
            title={prompt.isFavorite ? t.removeFavorite : t.addFavorite}
            aria-label={prompt.isFavorite ? t.removeFavorite : t.addFavorite}
          >
            <Star size={12} className={prompt.isFavorite ? "fill-amber-400 text-amber-400" : ""} />
          </button>
          <button 
            onClick={onDelete}
            className="text-gray-400 hover:text-red-400 transition-colors p-1"
            title={t.deletePrompt}
            aria-label={t.deletePrompt}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      
      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
        {prompt.content || t.emptyPrompt}
      </p>
      
      <div className="flex items-center justify-between mt-1">
        <div className="flex flex-wrap gap-1">
          {prompt.tags && prompt.tags.map(tag => (
            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded border border-border bg-background text-gray-500 font-medium">
              #{tag}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-gray-400 dark:text-gray-600 font-mono shrink-0">
          ~{estimatedTokens} tkns
        </span>
      </div>
    </div>
  );
}
