'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');
const {matchesCompilerDiagnosticPath} = require('../lib/diagnostic-path');

// Integration: parse untrusted compiler JSON, then enforce editor-file ownership.
test('hostile machine peers cannot attach imported or malformed records to active editor', () => {
  const cwd = path.resolve(process.cwd(), 'wave652911-project');
  const active = path.join(cwd, 'src', '🌱.atto');
  const input = JSON.stringify({version: 1, diagnostics: [
    {path: 'src/🌱.atto', severity: 'WARNING', message: '  active file  ',
      range: {start: {line: 7, column: 3}, end: {line: 8, column: 2}}},
    {path: 'src/imported.atto', message: 'imported origin',
      range: {start: {line: 9, column: 1}}},
    {path: 'src/🌱.atto\u0000forged', message: 'nul origin'},
    {path: ['src/🌱.atto'], message: 'array origin'},
    {path: null, message: 'unlocated compiler diagnostic',
      range: {start: {line: 2, column: 5}}},
  ]});
  for (let attempt = 0; attempt < 8; attempt++) {
    const parsed = parseCompilerOutputRecords(input);
    assert.deepEqual(parsed.map(r => r.message),
      ['active file', 'imported origin', 'unlocated compiler diagnostic']);
    const visible = parsed.filter(r => matchesCompilerDiagnosticPath(r.path, active, cwd));
    assert.deepEqual(visible, [
      {path: 'src/🌱.atto', line: 7, column: 3, endLine: 8, endColumn: 2,
        severity: 'warning', message: 'active file'},
      {path: null, line: 2, column: 5, endLine: 2, endColumn: 6,
        severity: 'error', message: 'unlocated compiler diagnostic'},
    ]);
    assert.equal(matchesCompilerDiagnosticPath('src/imported.atto', active, cwd), false);
  }
});
