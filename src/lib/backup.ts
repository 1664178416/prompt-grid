import { db, type Folder, type Prompt } from './db';

export type ImportMode = 'merge' | 'replace';

export interface BackupData {
  version: number;
  exportedAt: string;
  folders: Folder[];
  prompts: Prompt[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeArray<T>(value: unknown, name: string): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Backup is missing ${name}.`);
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
    folders: normalizeArray<Folder>(data.folders, 'folders'),
    prompts: normalizeArray<Prompt>(data.prompts, 'prompts'),
  };
}

export async function importBackupData(data: BackupData, mode: ImportMode) {
  await db.transaction('rw', db.folders, db.prompts, async () => {
    if (mode === 'replace') {
      await db.prompts.clear();
      await db.folders.clear();
    }

    if (data.folders.length > 0) {
      await db.folders.bulkPut(data.folders);
    }
    if (data.prompts.length > 0) {
      await db.prompts.bulkPut(data.prompts);
    }
  });
}

