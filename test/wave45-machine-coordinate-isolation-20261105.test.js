'use strict';
// Source-owned diagnostic protocol test; no guest compiler execution implied.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('bad or reversed machine ranges do not contaminate valid sibling records', () => {
  const input = {
    version: 1, ok: false,
    diagnostics: [
      { path: 'src/first.ores', message: ' first ', severity: 'WARNING',
        range: { start: { line: 1, column: 1 } } },
      { path: 'src/forged.ores', message: 'huge',
        range: { start: { line: 10000001, column: 1 } } },
      { path: 'src/forged.ores', message: 'fractional',
        range: { start: { line: 2.5, column: 1 } } },
      { path: 'src/forged.ores', message: 'reversed',
        range: { start: { line: 4, column: 8 }, end: { line: 4, column: 8 } } },
      { path: null, message: ' second ', severity: 'UNRECOGNIZED',
        range: { start: { line: 7, column: 10 }, end: { line: 8, column: 2 } } },
    ],
  };
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(input)), [
    { path: 'src/first.ores', line: 1, column: 1, endLine: 1,
      endColumn: 2, severity: 'warning', message: 'first' },
    { path: null, line: 7, column: 10, endLine: 8,
      endColumn: 2, severity: 'error', message: 'second' },
  ]);
});

test('unknown protocol versions fail closed instead of parsing adjacent records', () => {
  for (const version of [0, 2, '1', null]) {
    assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({
      version, diagnostics: [{ message: 'forged', line: 1, column: 1 }],
    })), []);
  }
});
