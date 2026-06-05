'use client';

import { useEffect, useState, useRef } from 'react';
import { usePromptStore } from '@/store/usePromptStore';
import { useSettingsStore, i18n } from '@/store/useSettingsStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Search, FileText, FolderPlus, Plus, Download, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

export default function CommandPalette() {
  const { isCommandPaletteOpen, setCommandPaletteOpen, setActivePrompt, createPrompt, createFolder } = usePromptStore();
  const { language, setLanguage } = useSettingsStore();
  const t = i18n[language];
  const { theme, setTheme, systemTheme } = useTheme();

  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const prompts = useLiveQuery(() => db.prompts.toArray()) || [];
  
  const filteredPrompts = prompts.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.content.toLowerCase().includes(search.toLowerCase())
  );

  const actions = [
    { id: 'new-prompt', label: t.createPromptAction, icon: <Plus size={16} /> },
    { id: 'new-folder', label: t.createFolderAction, icon: <FolderPlus size={16} /> },
    { id: 'export-data', label: t.exportData, icon: <Download size={16} /> },
    { id: 'import-data', label: t.importData, icon: <Upload size={16} /> }
  ].filter(a => a.label.toLowerCase().includes(search.toLowerCase()));

  const totalItems = filteredPrompts.length + actions.length;

  const handleExport = async () => {
    const allPrompts = await db.prompts.toArray();
    const allFolders = await db.folders.toArray();
    const data = { prompts: allPrompts, folders: allFolders, version: 1 };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promptgrid-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (data.prompts && data.folders) {
          await db.transaction('rw', db.prompts, db.folders, async () => {
            await db.prompts.clear();
            await db.folders.clear();
            await db.prompts.bulkAdd(data.prompts);
            await db.folders.bulkAdd(data.folders);
          });
          alert(t.importSuccess);
        }
      } catch (err) {
        alert('Invalid backup file.');
      }
    };
    input.click();
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  const executeAction = async (index: number) => {
    if (index < filteredPrompts.length) {
      // It's a prompt
      setActivePrompt(filteredPrompts[index].id!);
      setCommandPaletteOpen(false);
    } else {
      // It's an action
      const actionIndex = index - filteredPrompts.length;
      const action = actions[actionIndex];
      if (action.id === 'new-prompt') {
        const id = await createPrompt(null);
        setActivePrompt(id);
      } else if (action.id === 'new-folder') {
        // Just create a default folder for now
        await createFolder('New Folder');
      } else if (action.id === 'export-data') {
        await handleExport();
      } else if (action.id === 'import-data') {
        handleImport();
      }
      setCommandPaletteOpen(false);
    }
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!isCommandPaletteOpen || totalItems === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        executeAction(selectedIndex);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isCommandPaletteOpen, totalItems, selectedIndex, filteredPrompts, actions]); // Note: execution depends on exact snapshot

  if (!isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh]">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={() => setCommandPaletteOpen(false)} />
      
      <div className="relative w-full max-w-xl bg-panel border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Search Input */}
        <div 
          className="flex items-center px-4 py-4 border-b border-border gap-3 cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          <Search size={20} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={t.searchPlaceholder}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-gray-500 text-lg w-full"
          />
          <div className="text-[10px] font-mono bg-background px-1.5 py-0.5 rounded text-gray-500 border border-border cursor-default">ESC</div>
        </div>

        {/* Results list */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {totalItems === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">{t.noResults}</div>
          )}

          {filteredPrompts.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.prompts}</div>
              {filteredPrompts.map((p, i) => (
                <div
                  key={p.id}
                  onClick={() => executeAction(i)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                    selectedIndex === i ? "bg-indigo-500/10 text-indigo-400" : "text-gray-300 hover:bg-panel-hover"
                  )}
                >
                  <FileText size={16} className={selectedIndex === i ? "text-indigo-400" : "text-gray-500"} />
                  <span className="truncate">{p.title || t.untitled}</span>
                </div>
              ))}
            </div>
          )}

          {actions.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.actions}</div>
              {actions.map((a, idx) => {
                const i = filteredPrompts.length + idx;
                return (
                  <div
                    key={a.id}
                    onClick={() => executeAction(i)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                      selectedIndex === i ? "bg-indigo-500/10 text-indigo-400" : "text-gray-300 hover:bg-panel-hover"
                    )}
                  >
                    <div className={selectedIndex === i ? "text-indigo-400" : "text-gray-500"}>{a.icon}</div>
                    <span>{a.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
