'use strict';
// Fail-closed legacy path admission, preserving unrelated compiler diagnostics.
// Source-owned parser test; does not claim AttoLang guest/backend execution.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('legacy NUL origin paths are denied without suppressing valid neighbors', () => {
  const nul = String.fromCharCode(0);
  const input = [
    'src/good.atto:2:3: warning: valid before',
    'src/forged' + nul + '.atto:9:9: error: forged origin',
    'C:\\workspace\\' + nul + 'shadow.atto:7:4: error: forged drive origin',
    'C:\\workspace\\good.atto:4:8: info: valid Windows origin',
    'Oreslang parse error at 5:6: valid unlocated',
    'src/last.atto:8:1: error: valid after',
  ].join('\r\n');
  const expected = [
    { path: 'src/good.atto', line: 2, column: 3, endLine: 2,
      endColumn: 4, severity: 'warning', message: 'valid before' },
    { path: 'C:\\workspace\\good.atto', line: 4, column: 8, endLine: 4,
      endColumn: 9, severity: 'info', message: 'valid Windows origin' },
    { path: null, line: 5, column: 6, endLine: 5, endColumn: 7,
      severity: 'error', message: 'valid unlocated' },
    { path: 'src/last.atto', line: 8, column: 1, endLine: 8,
      endColumn: 2, severity: 'error', message: 'valid after' },
  ];
  for (const value of [input, input.replaceAll('\r\n', '\n')]) {
    assert.deepEqual(parseCompilerOutputRecords(value), expected);
    assert.equal(parseCompilerOutputRecords(value).length, 4);
  }
});

test('machine JSON path admission remains consistent with legacy NUL denial', () => {
  const nul = String.fromCharCode(0);
  const records = parseCompilerOutputRecords(JSON.stringify({
    version: 1,
    diagnostics: [
      { path: 'unsafe' + nul + '.atto', line: 1, column: 1,
        message: 'should not reach editor' },
      { path: 'safe.atto', line: 3, column: 2,
        severity: 'WARNING', message: 'valid peer' },
    ],
  }));
  assert.deepEqual(records, [
    { path: 'safe.atto', line: 3, column: 2, endLine: 3,
      endColumn: 3, severity: 'warning', message: 'valid peer' },
  ]);
});
