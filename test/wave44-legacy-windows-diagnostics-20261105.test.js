'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('legacy diagnostics preserve Windows origins and exact severity', () => {
  const output = [
    'C:\\src\\main.atto:12:4: warning[W123]:  spaced warning  ',
    'D:\\work\\lib.ores:2:7: info: informational',
    'Oreslang syntax error at 10000000:3: boundary',
  ].join('\r\n');
  assert.deepEqual(parseCompilerOutputRecords(output), [
    { path: 'C:\\src\\main.atto', line: 12, column: 4,
      endLine: 12, endColumn: 5, severity: 'warning', message: 'spaced warning' },
    { path: 'D:\\work\\lib.ores', line: 2, column: 7,
      endLine: 2, endColumn: 8, severity: 'info', message: 'informational' },
    { path: null, line: 10000000, column: 3,
      endLine: 10000000, endColumn: 4, severity: 'error', message: 'boundary' },
  ]);
});
