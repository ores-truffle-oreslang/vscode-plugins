'use strict';
// Host-only legacy CLI diagnostic parsing, not native compiler execution.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('CRLF fallback retains Windows drive, error labels, and message colons', () => {
  const lines = [
    'C:\\pkg\\main.ores:7:2: error[TYPE_7]: expected id: found : string',
    '../imports/helper.ores:8:3: warning: import: consider moving',
    'Oreslang parse error at 4:1: nested: declaration',
    'unrelated: compiler startup',
  ];
  const actual = parseCompilerOutputRecords(lines.join('\r\n'));
  assert.deepEqual(actual, [
    {
      path: 'C:\\pkg\\main.ores', line: 7, column: 2, endLine: 7,
      endColumn: 3, severity: 'error', message: 'expected id: found : string',
    },
    {
      path: '../imports/helper.ores', line: 8, column: 3, endLine: 8,
      endColumn: 4, severity: 'warning', message: 'import: consider moving',
    },
    {
      path: null, line: 4, column: 1, endLine: 4,
      endColumn: 2, severity: 'error', message: 'nested: declaration',
    },
  ]);
});
