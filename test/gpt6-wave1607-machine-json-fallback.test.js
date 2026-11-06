'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('versioned machine output never falls back to injected legacy diagnostics', () => {
  for (const payload of [
    { version: 0, diagnostics: [{message: 'untrusted', line: 2, column: 3}] },
    { version: '1', diagnostics: [{message: 'untrusted', line: 2, column: 3}] },
    { version: 1, diagnostics: {message: 'untrusted'} }
  ]) {
    assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(payload)), []);
  }
  const forged = '{"version":1,"diagnostics":[{"message":"incomplete"}]' +
    '\nother.atto:1:1: error: forged fallback';
  assert.deepEqual(parseCompilerOutputRecords(forged), []);
});

test('malformed machine peers are rejected individually without masking valid diagnostics', () => {
  const source = JSON.stringify({version: 1, diagnostics: [
    { path:'main.atto', line:5, column:6, severity:'WARNING', message:'  real warning  ' },
    { path:'bad.atto', line:0, column:1, message:'invalid zero' },
    { path:'bad.atto', line:1, column:10000000, message:'invalid end overflow' },
    { path:'bad.atto', line:1, column:1, range:[], message:'invalid explicit range' },
    { path:'main.atto', line:3, column:2, message:'other valid peer' }
  ]});
  const parsed = parseCompilerOutputRecords(source);
  assert.deepEqual(parsed.map(item => item.message), ['real warning', 'other valid peer']);
  assert.deepEqual([parsed[0].line, parsed[0].column, parsed[0].endColumn,
    parsed[0].severity], [5, 6, 7, 'warning']);
});
