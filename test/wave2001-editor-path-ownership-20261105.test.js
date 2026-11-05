'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');
const {matchesCompilerDiagnosticPath} = require('../lib/diagnostic-path');

test('active editor receives owned, normalized and unlocated diagnostics but not imports', () => {
  const cwd = path.resolve(process.cwd(), 'wave2001-editor-workspace');
  const active = path.join(cwd, 'src', 'main.atto');
  const records = [
    {path: 'src/main.atto', line: 2, column: 1, message: 'owned direct'},
    {path: 'src/../src/main.atto', line: 3, column: 2, message: 'owned normalized'},
    {path: 'src/main.atto.bak', line: 4, column: 3, message: 'unowned suffix'},
    {path: 'src/sub/main.atto', line: 5, column: 4, message: 'unowned nested'},
    {path: path.join(cwd, 'other', 'main.atto'), line: 6, column: 5, message: 'unowned absolute'},
    {path: 'src/main.atto\u0000.fake', line: 7, column: 6, message: 'forged nul'},
    {path: null, line: 8, column: 1, message: 'legacy unlocated'},
  ];
  const parsed = parseCompilerOutputRecords(JSON.stringify({version: 1, diagnostics: records}));
  assert.equal(parsed.length, 6, 'NUL path must be rejected, not normalized to null');
  const owned = parsed.filter(r => matchesCompilerDiagnosticPath(r.path, active, cwd));
  assert.deepEqual(owned.map(r => r.message),
    ['owned direct', 'owned normalized', 'legacy unlocated']);
  assert.ok(parsed.some(r => r.message === 'unowned suffix'));
  assert.ok(parsed.some(r => r.message === 'unowned absolute'));
  assert.equal(matchesCompilerDiagnosticPath(null, 'src/main.atto', cwd), false);
  assert.equal(matchesCompilerDiagnosticPath(null, active, 'relative-workspace'), false);
  assert.equal(matchesCompilerDiagnosticPath('src/main.atto.bak', active, cwd), false);
});
