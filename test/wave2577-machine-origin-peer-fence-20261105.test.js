'use strict';
// Host machine-diagnostic admission, not an AttoLang guest execution test.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('invalid-origin and boolean-position peers cannot contaminate valid Unicode records', () => {
  const payload = {
    version: 1,
    diagnostics: [
      {
        path: 'src/猫.ores', severity: 'HINT', message: '  keep relative origin  ',
        range: { start: { line: 2, column: 5 }, end: { line: 3, column: 1 } },
      },
      { path: 'src/\u0000forged.ores', message: 'poison', line: 1, column: 1 },
      { path: 'src/invalid.ores', message: 'boolean', line: true, column: 1 },
      { path: null, severity: 'unknown', message: '  unlocated valid  ',
        range: { start: { line: 8, column: 9 } } },
    ],
  };
  const text = JSON.stringify(payload);
  const result = parseCompilerOutputRecords(text);
  assert.deepEqual(result, [
    { path: 'src/猫.ores', line: 2, column: 5, endLine: 3, endColumn: 1,
      severity: 'hint', message: 'keep relative origin' },
    { path: null, line: 8, column: 9, endLine: 8, endColumn: 10,
      severity: 'error', message: 'unlocated valid' },
  ]);
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({
    version: '1', diagnostics: payload.diagnostics,
  })), [], 'malformed envelope cannot be interpreted as legacy lines');
});
