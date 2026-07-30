'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState, useRef } from 'react';
import { usePromptStore } from '@/store/usePromptStore';
import { useSettingsStore, i18n } from '@/store/useSettingsStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Search, FileText, FolderPlus, Plus, Download, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createBackupData, downloadJsonBackup, importBackupData, parseBackupData } from '@/lib/backup';
import { useShallow } from 'zustand/react/shallow';

const MAX_PROMPT_RESULTS = 50;

export default function CommandPalette() {
  const { isCommandPaletteOpen, setCommandPaletteOpen, setActivePrompt, createPrompt, createFolder } = usePromptStore(
    useShallow((state) => ({
      isCommandPaletteOpen: state.isCommandPaletteOpen,
      setCommandPaletteOpen: state.setCommandPaletteOpen,
      setActivePrompt: state.setActivePrompt,
      createPrompt: state.createPrompt,
      createFolder: state.createFolder,
    }))
  );
  const language = useSettingsStore((state) => state.language);
  const t = i18n[language];

  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const deferredSearch = useDeferredValue(search);

  const allPrompts = useLiveQuery(
    () => isCommandPaletteOpen ? db.prompts.toArray() : [],
    [isCommandPaletteOpen],
    []
  );
  
  const filteredPrompts = useMemo(() => {
    const q = deferredSearch.toLowerCase();
    const results = [];

    for (const prompt of allPrompts || []) {
      if (
        !q ||
        prompt.title.toLowerCase().includes(q) ||
        prompt.content.toLowerCase().includes(q)
      ) {
        results.push(prompt);
        if (results.length === MAX_PROMPT_RESULTS) break;
      }
    }

    return results;
  }, [allPrompts, deferredSearch]);

  const actions = useMemo(() => [
    { id: 'new-prompt', label: t.createPromptAction, icon: <Plus size={16} /> },
    { id: 'new-folder', label: t.createFolderAction, icon: <FolderPlus size={16} /> },
    { id: 'export-data', label: t.exportData, icon: <Download size={16} /> },
    { id: 'import-data', label: t.importData, icon: <Upload size={16} /> }
  ].filter(a => a.label.toLowerCase().includes(search.toLowerCase())), [search, t.createPromptAction, t.createFolderAction, t.exportData, t.importData]);

  const totalItems = filteredPrompts.length + actions.length;
  const safeSelectedIndex = totalItems === 0 ? 0 : Math.min(selectedIndex, totalItems - 1);

  const handleExport = useCallback(async () => {
    downloadJsonBackup(await createBackupData());
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = parseBackupData(text);
        if (window.confirm(t.confirmImportMerge)) {
          await importBackupData(data, 'merge');
          window.alert(t.importSuccess);
        }
      } catch {
        window.alert(t.importError);
      }
    };
    input.click();
  }, [t.confirmImportMerge, t.importError, t.importSuccess]);

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
      const timer = window.setTimeout(() => {
        setSearch('');
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [isCommandPaletteOpen]);

  const executeAction = useCallback(async (index: number) => {
    if (index < filteredPrompts.length) {
      // It's a prompt
      setActivePrompt(filteredPrompts[index].id!);
      setCommandPaletteOpen(false);
    } else {
      // It's an action
      const actionIndex = index - filteredPrompts.length;
      const action = actions[actionIndex];
      if (!action) return;

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
  }, [actions, createFolder, createPrompt, filteredPrompts, handleExport, handleImport, setActivePrompt, setCommandPaletteOpen]);

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
        executeAction(safeSelectedIndex);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [executeAction, isCommandPaletteOpen, safeSelectedIndex, totalItems]);

  if (!isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh]">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={() => setCommandPaletteOpen(false)} />
      
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.searchPlaceholder}
        className="relative w-full max-w-xl bg-panel border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
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
                    safeSelectedIndex === i ? "bg-indigo-500/10 text-indigo-400" : "text-gray-300 hover:bg-panel-hover"
                  )}
                >
                  <FileText size={16} className={safeSelectedIndex === i ? "text-indigo-400" : "text-gray-500"} />
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
                      safeSelectedIndex === i ? "bg-indigo-500/10 text-indigo-400" : "text-gray-300 hover:bg-panel-hover"
                    )}
                  >
                    <div className={safeSelectedIndex === i ? "text-indigo-400" : "text-gray-500"}>{a.icon}</div>
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
