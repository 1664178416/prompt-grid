import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(
  readFileSync(new URL('../src/lib/openai-stream.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;
const exports = {};
runInNewContext(source, { exports, TextDecoder });
const { readChatCompletionStream } = exports;

test('cancels the remaining response and unlocks it after DONE', async () => {
  let cancelled = false;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(
        'data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: [DONE]\n\n',
      ));
      // A provider can leave the connection open after the final event.
    },
    cancel() { cancelled = true; },
  });
  const content = [];
  await readChatCompletionStream({ response: new Response(body), onContent: (text) => content.push(text) });
  assert.deepEqual(content, ['hello']);
  assert.equal(cancelled, true);
  assert.equal(body.locked, false);
});

test('unlocks a normally closed stream and preserves fragmented UTF-8 and usage', async () => {
  const bytes = new TextEncoder().encode(
    'data: {"choices":[{"delta":{"content":"你好"}}]}\r\n\r\n'
    + 'data: {"usage":{"total_tokens":7}}',
  );
  const body = new ReadableStream({
    start(controller) {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
      controller.close();
    },
  });
  const content = [];
  let totalTokens;
  await readChatCompletionStream({
    response: new Response(body),
    onContent: (text) => content.push(text),
    onUsage: (usage) => { totalTokens = usage.total_tokens; },
  });
  assert.deepEqual(content, ['你好']);
  assert.equal(totalTokens, 7);
  assert.equal(body.locked, false);
});

test('unlocks a failed response and propagates the read error', async () => {
  const failure = new Error('connection lost');
  const body = new ReadableStream({ start(controller) { controller.error(failure); } });
  await assert.rejects(
    readChatCompletionStream({ response: new Response(body), onContent: () => {} }),
    (error) => error === failure,
  );
  assert.equal(body.locked, false);
});
