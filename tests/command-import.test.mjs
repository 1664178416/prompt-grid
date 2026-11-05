import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const component = ts.createSourceFile(
  'CommandPalette.tsx',
  readFileSync(new URL('../src/components/command-palette/CommandPalette.tsx', import.meta.url), 'utf8'),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
);
let handler;
function findHandler(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(component) === 'handleImport') {
    handler = node.initializer.arguments[0].getText(component);
  }
  ts.forEachChild(node, findHandler);
}
findHandler(component);
assert.ok(handler);
const source = ts.transpileModule(`exports.handleImport = ${handler};`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function importer() {
  const calls = [];
  const input = { click: () => calls.push('choose-file') };
  const exports = {};
  runInNewContext(source, {
    exports,
    document: { createElement: () => input },
    window: {
      confirm: () => true,
      alert: (message) => calls.push(message),
    },
    t: { importSuccess: 'success', importError: 'error', confirmImportMerge: 'confirm' },
    require: (name) => {
      assert.equal(name, '@/lib/backup');
      return {
        parseBackupData: JSON.parse,
        importBackupData: async (data, mode) => calls.push(['import', data, mode]),
      };
    },
  });
  exports.handleImport();
  return { input, calls };
}

test('reports a file read failure without rejecting the change handler or importing data', async () => {
  const { input, calls } = importer();
  const file = { text: async () => { throw new Error('File is no longer readable'); } };
  await assert.doesNotReject(input.onchange({ target: { files: [file] } }));
  assert.deepEqual(calls, ['choose-file', 'error']);
});

test('leaves data alone when file selection is cancelled', async () => {
  const { input, calls } = importer();
  await input.onchange({ target: { files: [] } });
  assert.deepEqual(calls, ['choose-file']);
});

test('still merges a readable backup and reports success', async () => {
  const { input, calls } = importer();
  const data = { folders: [], prompts: [] };
  await input.onchange({ target: { files: [{ text: async () => JSON.stringify(data) }] } });
  assert.deepEqual(calls, ['choose-file', ['import', data, 'merge'], 'success']);
});
