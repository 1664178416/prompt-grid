import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Load the real backup module while keeping these validation tests off the user's database.
const source = ts.transpileModule(
  readFileSync(new URL('../src/lib/backup.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;

function loadBackup({ browser = false } = {}) {
  const calls = [];
  const table = (name) => ({
    clear: async () => { calls.push(`${name}.clear`); },
    bulkPut: async (records) => { calls.push([`${name}.bulkPut`, records]); },
  });
  const db = {
    folders: table('folders'),
    prompts: table('prompts'),
    transaction: async (_mode, _folders, _prompts, callback) => {
      calls.push('transaction');
      await callback();
    },
  };
  const exports = {};
  const context = {
    exports,
    require: (name) => {
      assert.equal(name, './db');
      return { db };
    },
  };
  if (browser) {
    context.Blob = Blob;
    context.setTimeout = setTimeout;
    context.window = { setTimeout };
    context.URL = {
      createObjectURL: () => {
        calls.push('URL.createObjectURL');
        return 'blob:test';
      },
      revokeObjectURL: (url) => calls.push(['URL.revokeObjectURL', url]),
    };
    context.document = {
      createElement: (tagName) => {
        assert.equal(tagName, 'a');
        return {
          click: () => calls.push('anchor.click'),
        };
      },
    };
  }
  runInNewContext(source, context);
  return { ...exports, calls };
}

function backup() {
  return {
    version: 1,
    exportedAt: '2026-10-19T01:00:00.000Z',
    folders: [{ id: 'folder-1', name: 'Examples', parentId: null, createdAt: 1 }],
    prompts: [{
      id: 'prompt-1', title: '', content: '', folderId: 'folder-1', tags: ['demo'],
      isFavorite: false, status: 'draft', createdAt: 1, updatedAt: 2,
    }],
  };
}

test('accepts exported records, empty backups, and legacy metadata defaults', () => {
  const { parseBackupData } = loadBackup();
  const data = backup();
  data.prompts[0].systemPrompt = '';
  data.prompts[0].modelConfig = { modelName: '', temperature: 0.7 };
  data.prompts[0].testCases = [{ id: 'case-1', name: 'Example', values: { topic: 'hello' } }];
  assert.equal(JSON.stringify(parseBackupData(JSON.stringify(data))), JSON.stringify(data));
  const legacy = parseBackupData('{"folders":[],"prompts":[]}');
  assert.equal(legacy.version, 1);
  assert.equal(legacy.exportedAt, '');
  assert.equal(legacy.folders.length + legacy.prompts.length, 0);
});

test('rejects invalid roots, missing arrays, and malformed folder records', () => {
  const { parseBackupData } = loadBackup();
  for (const data of [null, [], {}, { folders: {}, prompts: [] }]) {
    assert.throws(() => parseBackupData(JSON.stringify(data)));
  }
  for (const record of [null, [], {}, { ...backup().folders[0], id: '' },
    { ...backup().folders[0], name: 42 }, { ...backup().folders[0], parentId: 12 },
    { ...backup().folders[0], createdAt: 'yesterday' }]) {
    assert.throws(() => parseBackupData(JSON.stringify({ ...backup(), folders: [record] })), /folders\[0\]/);
  }
});

test('rejects malformed prompt fields and optional nested records', () => {
  const { parseBackupData } = loadBackup();
  const invalidFields = [
    { id: '' }, { title: null }, { content: 42 }, { systemPrompt: {} },
    { folderId: 12 }, { tags: 'demo' }, { tags: [42] }, { isFavorite: 'false' },
    { status: 'unknown' }, { createdAt: null }, { updatedAt: 'today' },
    { modelConfig: null }, { modelConfig: { modelName: 12, temperature: 0.7 } },
    { modelConfig: { modelName: 'model', temperature: '0.7' } },
    { testCases: {} }, { testCases: [null] },
    { testCases: [{ id: 'case', name: 'Example', values: { topic: 42 } }] },
    { testCases: [{ id: 'case', name: 'Example', values: [] }] },
  ];
  for (const fields of invalidFields) {
    const data = backup();
    Object.assign(data.prompts[0], fields);
    assert.throws(() => parseBackupData(JSON.stringify(data)), /prompts\[0\]/);
  }
});

test('invalid direct imports never start a transaction or clear existing data', async () => {
  for (const mode of ['merge', 'replace']) {
    for (const invalidPart of ['folders', 'prompts']) {
      const api = loadBackup();
      const data = backup();
      data[invalidPart].push({ id: 'broken' });
      await assert.rejects(api.importBackupData(data, mode), /invalid/);
      assert.deepEqual(api.calls, []);
    }
    const api = loadBackup();
    const data = backup();
    data.prompts[0].updatedAt = Infinity;
    await assert.rejects(api.importBackupData(data, mode), /invalid/);
    assert.deepEqual(api.calls, []);
  }
});

test('valid merge and replace retain their original write behavior', async () => {
  for (const mode of ['merge', 'replace']) {
    const api = loadBackup();
    const data = backup();
    await api.importBackupData(data, mode);
    assert.deepEqual(api.calls, [
      'transaction',
      ...(mode === 'replace' ? ['prompts.clear', 'folders.clear'] : []),
      ['folders.bulkPut', data.folders], ['prompts.bulkPut', data.prompts],
    ]);
  }
});

test('keeps the backup Blob URL alive until the download starts', async () => {
  const { downloadJsonBackup, calls } = loadBackup({ browser: true });

  downloadJsonBackup(backup());
  assert.deepEqual(calls, ['URL.createObjectURL', 'anchor.click']);

  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.deepEqual(calls, [
    'URL.createObjectURL',
    'anchor.click',
    ['URL.revokeObjectURL', 'blob:test'],
  ]);
});
