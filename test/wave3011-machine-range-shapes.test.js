'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('explicit malformed machine range shapes cannot forge default positions', () => {
  const payload = {
    version: 1,
    diagnostics: [
      { message: 'range array', range: [] },
      { message: 'range string', range: 'garbage' },
      { message: 'nested start array', range: { start: [] } },
      { message: 'nested end number', range: { start: { line: 2, column: 3 }, end: 7 } },
      { message: 'valid specific', path: 'src/main.ores',
        range: { start: { line: 3, column: 7 } } },
      { message: 'valid without optional range', path: null, line: 8, column: 5 },
    ],
  };
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(payload)), [
    { path: 'src/main.ores', line: 3, column: 7, endLine: 3, endColumn: 8,
      severity: 'error', message: 'valid specific' },
    { path: null, line: 8, column: 5, endLine: 8, endColumn: 6,
      severity: 'error', message: 'valid without optional range' },
  ]);
});
