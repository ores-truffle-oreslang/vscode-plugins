'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createRequire} = require('node:module');
const filename = path.resolve(__dirname, '../extension.js');
const realRequire = createRequire(filename);

function fixture() {
  const callbacks = [], published = [];
  const vscode = {
    workspace: {
      getConfiguration: () => ({get: (_key, fallback) => fallback}),
      getWorkspaceFolder: () => undefined,
    },
    Position: class { constructor(line, character) { Object.assign(this, {line, character}); } },
    Range: class { constructor(start, end) { Object.assign(this, {start, end}); } },
    Diagnostic: class { constructor(range, message, severity) { Object.assign(this, {range, message, severity}); } },
    DiagnosticSeverity: {Error: 0, Warning: 1, Information: 2, Hint: 3},
  };
  const context = vm.createContext({
    require: id => id === 'vscode' ? vscode :
      ['child_process', 'node:child_process'].includes(id) ? {execFile: (...args) => callbacks.push(args.at(-1))} : realRequire(id),
    module: {exports: {}},
    mockDiagnostics: {set: (_uri, items) => published.push(items)},
  });
  vm.runInContext(fs.readFileSync(filename, 'utf8'), context, {filename});
  vm.runInContext('compilerDiagnostics = mockDiagnostics', context);
  const document = {languageId: 'oreslang', version: 1, isDirty: false, isClosed: false,
    fileName: '/tmp/demo.ores', uri: {scheme: 'file', fsPath: '/tmp/demo.ores', toString: () => 'file:///tmp/demo.ores'}};
  const complete = (index, message) => callbacks[index](null, JSON.stringify({version: 1, diagnostics: [{message, line: 1}]}), '');
  return {context, document, published, complete};
}

test('older compiler completion cannot overwrite the newer check for the same version', async () => {
  const f = fixture();
  const older = f.context.runCompilerCheck(f.document, false);
  const newer = f.context.runCompilerCheck(f.document, false);
  f.complete(1, 'newer');
  f.complete(0, 'older');
  await Promise.all([older, newer]);
  assert.equal(f.published.length, 1);
  assert.equal(f.published[0][0].message, 'newer');
});

test('edits and closure revoke an in-flight compiler result', async () => {
  for (const change of [doc => { doc.version++; }, doc => { doc.isDirty = true; }, doc => { doc.isClosed = true; }]) {
    const f = fixture();
    const pending = f.context.runCompilerCheck(f.document, false);
    change(f.document);
    f.complete(0, 'stale');
    await pending;
    assert.equal(f.published.length, 0);
  }
});
