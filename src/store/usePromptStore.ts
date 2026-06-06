import { create } from 'zustand';
import { db, Prompt, Folder } from '@/lib/db';
import { generateId } from '@/lib/utils';


interface PromptState {
  // Current active selections
  activeFolderId: string | null;
  activePromptId: string | null;
  activeTag: string | null;
  searchQuery: string;
  isCommandPaletteOpen: boolean;

  // Actions
  setActiveFolder: (id: string | null) => void;
  setActivePrompt: (id: string | null) => void;
  setActiveTag: (tag: string | null) => void;
  setSearchQuery: (query: string) => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;

  // DB Operations (Wrapped for UI convenience)
  createPrompt: (folderId?: string | null) => Promise<string>;
  updatePrompt: (id: string, data: Partial<Prompt>) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  
  createFolder: (name: string, parentId?: string | null) => Promise<string>;
  deleteFolder: (id: string) => Promise<void>;
}

export const usePromptStore = create<PromptState>((set, get) => ({
  activeFolderId: null,
  activePromptId: null,
  activeTag: null,
  searchQuery: '',
  isCommandPaletteOpen: false,

  setActiveFolder: (id) => set({ activeFolderId: id, activeTag: null, activePromptId: null }),
  setActivePrompt: (id) => set({ activePromptId: id }),
  setActiveTag: (tag) => set({ activeTag: tag, activeFolderId: null, activePromptId: null }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCommandPaletteOpen: (isOpen) => set({ isCommandPaletteOpen: isOpen }),

  createPrompt: async (folderId: string | null = null) => {
    const newPrompt: Prompt = {
      id: generateId(),
      title: 'Untitled Prompt',
      content: '',
      folderId,
      tags: [],
      isFavorite: false,
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.prompts.add(newPrompt);
    set({ activePromptId: newPrompt.id });
    return newPrompt.id;
  },

  updatePrompt: async (id, data) => {
    await db.prompts.update(id, { ...data, updatedAt: Date.now() });
  },

  deletePrompt: async (id) => {
    await db.prompts.delete(id);
    const { activePromptId } = get();
    if (activePromptId === id) {
      set({ activePromptId: null });
    }
  },

  createFolder: async (name: string, parentId: string | null = null) => {
    const newFolder: Folder = {
      id: generateId(),
      name,
      parentId,
      createdAt: Date.now(),
    };
    await db.folders.add(newFolder);
    return newFolder.id;
  },

  deleteFolder: async (id) => {
    await db.folders.delete(id);
    // Also delete or orphan prompts? Let's just orphan them for MVP
    await db.prompts.where('folderId').equals(id).modify({ folderId: null });
    const { activeFolderId } = get();
    if (activeFolderId === id) {
      set({ activeFolderId: null });
    }
  }
}));
