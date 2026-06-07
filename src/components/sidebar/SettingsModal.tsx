'use client';

import { useState } from 'react';
import { useSettingsStore, i18n } from '@/store/useSettingsStore';
import { useTheme } from 'next-themes';
import { X, Moon, Sun, Settings as SettingsIcon, Download, Upload } from 'lucide-react';
import { db } from '@/lib/db';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { 
    language, setLanguage, 
    apiKey, setApiKey, 
    apiBaseUrl, setApiBaseUrl, 
    defaultModel, setDefaultModel 
  } = useSettingsStore();
  
  const { theme, setTheme } = useTheme();
  const t = i18n[language];

  // Local state for the inputs to avoid frequent renders if needed, 
  // but direct binding to store is fine for these simple inputs
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localApiBaseUrl, setLocalApiBaseUrl] = useState(apiBaseUrl);
  const [localDefaultModel, setLocalDefaultModel] = useState(defaultModel);

  const handleSave = () => {
    setApiKey(localApiKey);
    setApiBaseUrl(localApiBaseUrl);
    setDefaultModel(localDefaultModel);
    onClose();
  };

  const handleExport = async () => {
    try {
      const folders = await db.folders.toArray();
      const prompts = await db.prompts.toArray();
      const backupData = JSON.stringify({ folders, prompts }, null, 2);
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PromptGrid-Backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.folders && data.prompts) {
          await db.transaction('rw', db.folders, db.prompts, async () => {
            // Bulk put overrides items with same IDs, keeping existing ones
            if (data.folders.length > 0) await db.folders.bulkPut(data.folders);
            if (data.prompts.length > 0) await db.prompts.bulkPut(data.prompts);
          });
          alert(t.importSuccess);
        } else {
          alert(t.importError);
        }
      } catch (err) {
        alert(t.importError);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-panel border border-border rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <SettingsIcon size={18} className="text-indigo-500" />
            <h2 className="font-semibold text-lg">{t.settings}</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* General Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t.theme}</span>
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-1">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-1.5 rounded-md transition-colors ${theme === 'light' ? 'bg-panel shadow-sm text-indigo-500' : 'text-gray-500 hover:text-foreground'}`}
                >
                  <Sun size={16} />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-1.5 rounded-md transition-colors ${theme === 'dark' ? 'bg-panel shadow-sm text-indigo-500' : 'text-gray-500 hover:text-foreground'}`}
                >
                  <Moon size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t.language}</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-500/50"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <hr className="border-border" />

          {/* Data Management */}
          <div>
            <h3 className="text-sm font-semibold mb-4 text-indigo-500">{t.dataManagement || 'Data Management'}</h3>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleExport}
                className="flex items-center justify-center gap-2 flex-1 bg-background border border-border hover:bg-panel text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Download size={16} className="text-indigo-400" />
                {t.exportData || 'Export Backup'}
              </button>
              
              <label className="flex items-center justify-center gap-2 flex-1 bg-background border border-border hover:bg-panel text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer">
                <Upload size={16} className="text-emerald-400" />
                {t.importData || 'Import Backup'}
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImport}
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          <hr className="border-border" />

          {/* API Settings */}
          <div>
            <h3 className="text-sm font-semibold mb-4 text-indigo-500">{t.apiConfig}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.apiBaseUrl}</label>
                <input
                  type="text"
                  value={localApiBaseUrl}
                  onChange={(e) => setLocalApiBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.apiKey}</label>
                <input
                  type="password"
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.defaultModel}</label>
                <input
                  type="text"
                  value={localDefaultModel}
                  onChange={(e) => setLocalDefaultModel(e.target.value)}
                  placeholder="gpt-3.5-turbo"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-panel/50 flex justify-end">
          <button
            onClick={handleSave}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            {t.saveSettings}
          </button>
        </div>

      </div>
    </div>
  );
}
