import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Exercise the editor's actual substitution function without mounting its UI or database.
const editorSource = ts.createSourceFile(
  'Editor.tsx',
  readFileSync(new URL('../src/components/editor/Editor.tsx', import.meta.url), 'utf8'),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
);
let builder;
function findBuilder(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(editorSource) === 'buildFilledPrompt') {
    builder = node.initializer.getText(editorSource);
  }
  ts.forEachChild(node, findBuilder);
}
findBuilder(editorSource);
assert.ok(builder, 'Editor must provide its prompt substitution function');

const utilsSource = ts.createSourceFile(
  'utils.ts', readFileSync(new URL('../src/lib/utils.ts', import.meta.url), 'utf8'),
  ts.ScriptTarget.Latest, true,
);
const escapeFunction = utilsSource.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'escapeRegExp',
);
assert.ok(escapeFunction);
const source = ts.transpileModule(
  `${escapeFunction.getText(utilsSource)}\nexports.buildFilledPrompt = ${builder};`,
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;

function fill(content, variables, filledVars) {
  const exports = {};
  runInNewContext(source, { exports, content, variables, filledVars });
  return exports.buildFilledPrompt();
}

test('preserves literal dollar sequences in variable values', () => {
  for (const value of ['$&', '$$', '$`', "$'", '$1', '$<name>', '价格 $5，表达式 $$x$$']) {
    assert.equal(fill('Before {{value}} after', ['value'], { value }), `Before ${value} after`);
  }
});

test('retains repeated variables, whitespace, regex characters and empty values', () => {
  assert.equal(fill('{{a.b}} / {{ a.b }} / {{missing}}', ['a.b', 'missing'], { 'a.b': 'hello' }),
    'hello / hello / ');
  assert.equal(fill('{{a.b}} {{axb}}', ['a.b'], { 'a.b': 'literal' }), 'literal {{axb}}');
  assert.equal(fill('no variables', [], {}), 'no variables');
});
