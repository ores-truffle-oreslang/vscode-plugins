'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('mixed line endings preserve origins and valid neighbors in legacy output', () => {
  const output = [
    'src/main.atto:1:2: warning[W42]: hello  ',
    'Oreslang syntax error at 4:7: mismatch',
    'src/invalid.atto:0:4: error: zero coordinate',
    'C:\\repo\\actor.atto:9:3: hint: note',
    'src/invalid.atto:10000001:1: error: excessive coordinate',
  ].join('\r\n');
  assert.deepEqual(parseCompilerOutputRecords(output), [
    { path: 'src/main.atto', line: 1, column: 2,
      endLine: 1, endColumn: 3, severity: 'warning', message: 'hello' },
    { path: null, line: 4, column: 7,
      endLine: 4, endColumn: 8, severity: 'error', message: 'mismatch' },
    { path: 'C:\\repo\\actor.atto', line: 9, column: 3,
      endLine: 9, endColumn: 4, severity: 'hint', message: 'note' },
  ]);
});
