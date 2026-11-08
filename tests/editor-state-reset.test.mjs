import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../src/components/editor/Editor.tsx', import.meta.url), 'utf8');
const promptBranch = source.match(/if \(prompt\) \{([\s\S]*?)\n      \} else \{/i)?.[1];
assert.ok(promptBranch, 'Editor prompt synchronization branch should exist');

test('clears variable inputs and selected test case when the active prompt changes', () => {
  assert.match(promptBranch, /setFilledVars\(\{\}\)/);
  assert.match(promptBranch, /setActiveTestCaseId\(null\)/);
});
