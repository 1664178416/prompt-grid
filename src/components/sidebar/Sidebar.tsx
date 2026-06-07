'use client';

import { usePromptStore } from '@/store/usePromptStore';
import { useSettingsStore, i18n } from '@/store/useSettingsStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { FolderPlus, Inbox, Star, Layers, Folder, Search, Settings, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { useEnvironment } from '@/hooks/useEnvironment';
import SettingsModal from './SettingsModal';

export default function Sidebar() {
  const { activeFolderId, setActiveFolder, createFolder } = usePromptStore();
  const { language } = useSettingsStore();
  const t = i18n[language];
  const { isInstallable, install } = usePwaInstall();
  const { isWeb } = useEnvironment();
  
  const folders = useLiveQuery(() => db.folders.toArray()) || [];
  const prompts = useLiveQuery(() => db.prompts.toArray()) || [];
  
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      await createFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full h-full bg-panel border-r border-border flex flex-col shrink-0">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-border">
        <div className="flex items-center gap-2 font-medium text-sm text-foreground">
          <div className="w-5 h-5 rounded bg-indigo-500 flex items-center justify-center text-white">
            <Layers size={12} />
          </div>
          PromptGrid
        </div>
      </div>

      {/* Main Nav */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-6">
        <div className="space-y-0.5">
          <NavItem icon={<Inbox size={16} />} label={t.allPrompts} active={activeFolderId === null} onClick={() => setActiveFolder(null)} count={prompts.length} />
          <NavItem icon={<Star size={16} />} label={t.favorites} active={activeFolderId === 'favorites'} onClick={() => setActiveFolder('favorites')} count={prompts.filter(p => p.isFavorite).length} />
        </div>

        {/* Folders */}
        <div>
          <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
            <span>{t.folders}</span>
            <button onClick={() => setIsCreating(true)} className="hover:text-gray-300">
              <FolderPlus size={14} />
            </button>
          </div>
          <div className="space-y-0.5">
            {folders.map(folder => (
              <NavItem 
                key={folder.id} 
                icon={<Folder size={16} className="text-gray-400" />} 
                label={folder.name} 
                active={activeFolderId === folder.id} 
                onClick={() => setActiveFolder(folder.id)} 
                count={prompts.filter(p => p.folderId === folder.id).length}
              />
            ))}
            
            {isCreating && (
              <form onSubmit={handleCreateFolder} className="px-3 py-1 flex items-center gap-2">
                <Folder size={16} className="text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onBlur={() => setIsCreating(false)}
                  placeholder={t.newFolder}
                  className="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder:text-gray-600"
                />
              </form>
            )}
          </div>
        </div>

        {/* Tags Section */}
        <div className="pt-2">
          <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
            <span>{t.tags}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 px-3">
            {Array.from(new Set(prompts.flatMap(p => p.tags || []))).map(tag => (
              <button
                key={tag}
                onClick={() => {
                  const { activeTag, setActiveTag } = usePromptStore.getState();
                  setActiveTag(activeTag === tag ? null : tag);
                }}
                className={cn(
                  "px-2 py-1 text-[10px] font-medium rounded-full transition-colors border",
                  usePromptStore.getState().activeTag === tag
                    ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                    : "bg-panel border-border text-gray-500 hover:text-gray-300 hover:border-gray-600"
                )}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Area */}
      <div className="p-4 border-t border-border mt-auto bg-panel/50 space-y-2">
        <button 
          onClick={() => usePromptStore.getState().setCommandPaletteOpen(true)}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg bg-background border border-border shadow-sm text-sm text-gray-400 hover:text-foreground hover:border-indigo-500/50 hover:shadow-indigo-500/10 transition-all group"
        >
          <Search size={15} />
          <span className="font-medium truncate">{t.searchCommands}</span>
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-mono bg-panel px-1.5 py-0.5 rounded text-gray-500 border border-border group-hover:border-gray-400 transition-colors">⌘</span>
            <span className="text-[10px] font-mono bg-panel px-1.5 py-0.5 rounded text-gray-500 border border-border group-hover:border-gray-400 transition-colors">K</span>
          </div>
        </button>

        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-500 hover:text-foreground hover:bg-panel-hover rounded-md transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings size={16} />
            <span>{t.settings}</span>
          </div>
        </button>

        {isWeb && (
          <a 
            href="https://github.com/wyh/prompt-grid/releases/latest" 
            target="_blank" 
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-md transition-colors shadow-sm"
          >
            <Download size={16} />
            <span>Download Desktop App</span>
          </a>
        )}
      </div>

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, count }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void, count?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center w-full gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
        active 
          ? "bg-indigo-500/10 text-indigo-400" 
          : "text-gray-400 hover:bg-panel-hover hover:text-gray-200"
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto text-xs text-gray-600">{count}</span>
      )}
    </button>
  );
}
