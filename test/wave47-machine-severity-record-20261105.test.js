'use strict';
// Host-only untrusted diagnostic admission; not a source compiler parity claim.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('malformed siblings cannot alter admitted machine severity and origin', () => {
  const diagnostics = [
    null,
    'not a record',
    [],
    { message: '  ', path: 'src/ignored.ores' },
    { message: 'array path', path: ['src/forged.ores'] },
    { message: 'fraction', line: 1.25, column: 2 },
    {
      message: ' admitted warning ', severity: 'WARNING', path: 'src/actual.ores',
      range: { start: { line: 2, column: 4 } },
    },
    { message: 'unknown severity', severity: 'FATAL_INTERNAL' },
  ];
  const records = parseCompilerOutputRecords(JSON.stringify({ version: 1, diagnostics }));
  assert.deepEqual(records, [
    {
      path: 'src/actual.ores', line: 2, column: 4,
      endLine: 2, endColumn: 5, severity: 'warning', message: 'admitted warning',
    },
    {
      path: null, line: 1, column: 1,
      endLine: 1, endColumn: 2, severity: 'error', message: 'unknown severity',
    },
  ]);
});
