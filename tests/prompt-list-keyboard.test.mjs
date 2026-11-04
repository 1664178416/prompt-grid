import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const component = ts.createSourceFile(
  'PromptList.tsx',
  readFileSync(new URL('../src/components/prompt-list/PromptList.tsx', import.meta.url), 'utf8'),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
);
let handler;
function findHandler(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(component) === 'handleKeyDown') {
    handler = node.initializer.getText(component);
  }
  ts.forEachChild(node, findHandler);
}
findHandler(component);
assert.ok(handler);
const source = ts.transpileModule(`exports.handleKeyDown = ${handler};`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function navigate(key, { handled = false, activePromptId = 'a', activeElement = { tagName: 'BUTTON' } } = {}) {
  const selected = [];
  const exports = {};
  runInNewContext(source, {
    exports, document: { activeElement },
    prompts: [{ id: 'a' }, { id: 'b' }], activePromptId,
    setActivePrompt: (id) => selected.push(id),
  });
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperty(event, 'key', { value: key });
  if (handled) event.preventDefault();
  exports.handleKeyDown(event);
  return { selected, prevented: event.defaultPrevented };
}

test('does not change the background prompt after another handler consumes an arrow key', () => {
  for (const key of ['ArrowUp', 'ArrowDown']) {
    assert.deepEqual(navigate(key, { handled: true }).selected, []);
  }
});

test('keeps normal arrow navigation and wraparound working', () => {
  assert.deepEqual(navigate('ArrowDown'), { selected: ['b'], prevented: true });
  assert.deepEqual(navigate('ArrowDown', { activePromptId: 'b' }).selected, ['a']);
  assert.deepEqual(navigate('ArrowUp').selected, ['b']);
  assert.deepEqual(navigate('ArrowUp', { activePromptId: 'b' }).selected, ['a']);
});

test('leaves typing controls and unrelated keys alone', () => {
  for (const activeElement of [
    { tagName: 'INPUT' }, { tagName: 'TEXTAREA' }, { tagName: 'SELECT' }, { isContentEditable: true },
  ]) {
    assert.deepEqual(navigate('ArrowDown', { activeElement }), { selected: [], prevented: false });
  }
  assert.deepEqual(navigate('Escape'), { selected: [], prevented: false });
});
