'use strict';
// Isolated host parsing of compiler-owned machine diagnostics.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('malformed records cannot forge unlocated peers or disable subsequent good records', () => {
  const diagnostics = [
    { path: 7, message: 'invalid numeric origin', line: 1, column: 1 },
    { path: 'src/a.ores', message: ' valid one ', line: 2, column: 3, severity: 'WARNING' },
    { path: '', message: 'empty origin', line: 4, column: 1 },
    { path: null, message: 'valid unlocated', line: 5, column: 6, severity: 'HINT' },
    { path: 'src/z.ores', message: 'reversed', range: { start: { line: 10, column: 3 }, end: { line: 10, column: 3 } } },
    { path: 'src/b.ores', message: 'valid last', line: 11, column: 2, severity: 'INFO' },
  ];
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({ version: 1, diagnostics })), [
    { path: 'src/a.ores', line: 2, column: 3, endLine: 2, endColumn: 4, severity: 'warning', message: 'valid one' },
    { path: null, line: 5, column: 6, endLine: 5, endColumn: 7, severity: 'hint', message: 'valid unlocated' },
    { path: 'src/b.ores', line: 11, column: 2, endLine: 11, endColumn: 3, severity: 'info', message: 'valid last' },
  ]);
});

test('valid JSON with a foreign machine version never falls back to legacy lines', () => {
  for (const payload of [
    { version: 2, diagnostics: [{ message: 'src/a.ores:3:2: error: forged' }] },
    { version: 1, diagnostics: 'src/a.ores:3:2: error: forged' },
  ]) {
    assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(payload)), []);
  }
});
