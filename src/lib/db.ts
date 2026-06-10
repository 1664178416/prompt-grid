import Dexie, { type Table } from 'dexie';
import { generateId } from './utils';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

export interface Prompt {
  id: string;
  title: string;
  systemPrompt?: string;
  content: string;
  folderId: string | null;
  tags: string[];
  isFavorite: boolean;
  status: 'draft' | 'active' | 'archived';
  modelConfig?: {
    modelName: string;
    temperature: number;
  };
  testCases?: {
    id: string;
    name: string;
    values: Record<string, string>;
  }[];
  createdAt: number;
  updatedAt: number;
}

export class PromptGridDatabase extends Dexie {
  folders!: Table<Folder, string>;
  prompts!: Table<Prompt, string>;

  constructor() {
    super('PromptGridDB');
    this.version(1).stores({
      folders: 'id, parentId, createdAt',
      prompts: 'id, folderId, *tags, isFavorite, status, createdAt, updatedAt'
    });
    
    this.on('populate', async () => {
      const demoFolderId = generateId();
      await this.folders.add({
        id: demoFolderId,
        name: 'Getting Started',
        parentId: null,
        createdAt: Date.now()
      });
      
      await this.prompts.add({
        id: generateId(),
        title: 'Welcome to PromptGrid',
        content: `Welcome to PromptGrid, your local-first prompt workspace.

Dynamic variables use double curly braces, like {{topic}} and {{tone}}.
The Playground will extract them into reusable inputs automatically.

Try filling {{topic}} and {{tone}}, then use Text or JSON copy in the Playground.`,
        folderId: demoFolderId,
        tags: ['tutorial', 'demo'],
        isFavorite: true,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    });
  }
}

export const db = new PromptGridDatabase();
