import Dexie, { type Table } from 'dexie';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  tags: string[];
  isFavorite: boolean;
  status: 'draft' | 'active' | 'archived';
  modelConfig?: {
    modelName: string;
    temperature: number;
  };
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
  }
}

export const db = new PromptGridDatabase();
