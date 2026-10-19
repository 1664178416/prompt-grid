import { db, type Folder, type Prompt } from './db';

export type ImportMode = 'merge' | 'replace';

export interface BackupData {
  version: number;
  exportedAt: string;
  folders: Folder[];
  prompts: Prompt[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFolder(value: unknown): value is Folder {
  return isRecord(value)
    && isId(value.id)
    && typeof value.name === 'string'
    && (value.parentId === null || isId(value.parentId))
    && isTimestamp(value.createdAt);
}

function isPrompt(value: unknown): value is Prompt {
  if (!isRecord(value)) return false;

  const validModelConfig = value.modelConfig === undefined || (
    isRecord(value.modelConfig)
    && typeof value.modelConfig.modelName === 'string'
    && isTimestamp(value.modelConfig.temperature)
  );
  const validTestCases = value.testCases === undefined || (
    Array.isArray(value.testCases)
    && value.testCases.every((testCase: unknown) => (
      isRecord(testCase)
      && isId(testCase.id)
      && typeof testCase.name === 'string'
      && isRecord(testCase.values)
      && Object.values(testCase.values).every((entry) => typeof entry === 'string')
    ))
  );

  return isId(value.id)
    && typeof value.title === 'string'
    && typeof value.content === 'string'
    && (value.systemPrompt === undefined || typeof value.systemPrompt === 'string')
    && (value.folderId === null || isId(value.folderId))
    && Array.isArray(value.tags)
    && value.tags.every((tag: unknown) => typeof tag === 'string')
    && typeof value.isFavorite === 'boolean'
    && typeof value.status === 'string'
    && ['draft', 'active', 'archived'].includes(value.status)
    && isTimestamp(value.createdAt)
    && isTimestamp(value.updatedAt)
    && validModelConfig
    && validTestCases;
}

function normalizeArray<T>(value: unknown, name: string, isValid: (entry: unknown) => entry is T): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Backup is missing ${name}.`);
  }
  for (const [index, entry] of value.entries()) {
    if (!isValid(entry)) {
      throw new Error(`Backup has invalid ${name}[${index}].`);
    }
  }
  return value as T[];
}

export async function createBackupData(): Promise<BackupData> {
  const [folders, prompts] = await Promise.all([
    db.folders.toArray(),
    db.prompts.toArray(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    folders,
    prompts,
  };
}

export function downloadJsonBackup(data: BackupData) {
  const backupData = JSON.stringify(data, null, 2);
  const blob = new Blob([backupData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `promptgrid-backup-${new Date().toISOString().split('T')[0]}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseBackupData(text: string): BackupData {
  const data: unknown = JSON.parse(text);

  if (!isRecord(data)) {
    throw new Error('Backup root must be an object.');
  }

  return {
    version: typeof data.version === 'number' ? data.version : 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    folders: normalizeArray(data.folders, 'folders', isFolder),
    prompts: normalizeArray(data.prompts, 'prompts', isPrompt),
  };
}

export async function importBackupData(data: BackupData, mode: ImportMode) {
  // Validate the complete backup before a replace import can clear existing data.
  const folders = normalizeArray(data.folders, 'folders', isFolder);
  const prompts = normalizeArray(data.prompts, 'prompts', isPrompt);

  await db.transaction('rw', db.folders, db.prompts, async () => {
    if (mode === 'replace') {
      await db.prompts.clear();
      await db.folders.clear();
    }

    if (folders.length > 0) {
      await db.folders.bulkPut(folders);
    }
    if (prompts.length > 0) {
      await db.prompts.bulkPut(prompts);
    }
  });
}

