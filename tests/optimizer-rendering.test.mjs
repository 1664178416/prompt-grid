import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = ts.transpileModule(
  readFileSync(new URL('../src/components/editor/PromptOptimizerModal.tsx', import.meta.url), 'utf8'),
  { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } },
).outputText;

function renderResult(system, user) {
  // Seed the modal's completed response; render the real SimpleEditor with React.
  const state = ['success', `### SYSTEM PROMPT\n${system}\n### USER PROMPT\n${user}`, ''];
  const exports = {};
  runInNewContext(source, {
    exports,
    require: (name) => {
      if (name === 'react') return {
        ...React,
        useState: () => [state.shift(), () => {}],
        useMemo: (factory) => factory(),
        useEffect: () => {},
        useRef: () => ({ current: null }),
      };
      if (name === '@/store/useSettingsStore') return {
        useSettingsStore: (selector) => selector({ language: 'en' }), i18n: { en: {} },
      };
      if (name === 'zustand/react/shallow') return { useShallow: (selector) => selector };
      if (name === '@/lib/utils' || name === '@/lib/openai-stream') return {};
      return require(name);
    },
  });
  return renderToStaticMarkup(React.createElement(exports.default, {
    isOpen: true, onClose: () => {}, onApply: () => {},
    currentSystemPrompt: '', currentContent: '',
  }));
}

for (const section of ['system', 'user']) {
  test(`renders ${section} optimization output as literal text`, () => {
    const payload = '<img src=x onerror="alert(1)"><b>hello</b> & {{topic}}';
    const html = renderResult(section === 'system' ? payload : 'System', section === 'user' ? payload : 'User');
    assert.doesNotMatch(html, /<img\b|<b>hello<\/b>/i);
    const previews = [...html.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/g)];
    assert.equal(previews.length, 2);
    const preview = previews[section === 'system' ? 0 : 1][1];
    assert.match(preview, /&lt;img/);
    assert.match(preview, /&lt;b&gt;hello&lt;\/b&gt;/);
    assert.match(preview, /&amp; \{\{topic\}\}/);
  });
}
