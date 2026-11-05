'use strict';
// Host-only machine protocol parser checks, not compiler or guest execution.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('intentional unlocated diagnostics remain valid, malformed explicit paths do not', () => {
  const payload = { version: 1, diagnostics: [
    { path: null, message: 'unlocated explicitly', line: 4, column: 6 },
    { message: 'unlocated implicitly', line: 5, column: 2 },
    { path: 0, message: 'invalid numeric origin', line: 7, column: 3 },
    { path: '', message: 'invalid empty origin', line: 8, column: 3 },
    { path: 'src/safe.ores', message: 'located neighbor', line: 9, column: 1 },
  ] };
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(payload)), [
    { path: null, line: 4, column: 6, endLine: 4, endColumn: 7, severity: 'error', message: 'unlocated explicitly' },
    { path: null, line: 5, column: 2, endLine: 5, endColumn: 3, severity: 'error', message: 'unlocated implicitly' },
    { path: 'src/safe.ores', line: 9, column: 1, endLine: 9, endColumn: 2, severity: 'error', message: 'located neighbor' },
  ]);
});
