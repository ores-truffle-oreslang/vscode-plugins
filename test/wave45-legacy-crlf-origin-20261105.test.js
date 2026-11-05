'use strict';
// Source-owned CRLF legacy compiler diagnostics: preserve record boundaries and origins.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('CRLF diagnostics preserve Windows drive origin, severity code, and record order', () => {
  const output = [
    'C:\\workspace\\src\\main.ores:12:7: warning[W101]:  first issue ',
    'Oreslang parse error at 2:3: expression missing',
    'src/main.ores:4:2: info: second issue',
    'src/main.ores:10000001:1: error: out of range',
    'src/main.ores:0:1: error: invalid line',
  ].join('\r\n') + '\r\n';
  assert.deepEqual(parseCompilerOutputRecords(output), [
    { path: 'C:\\workspace\\src\\main.ores', line: 12, column: 7,
      endLine: 12, endColumn: 8, severity: 'warning', message: 'first issue' },
    { path: null, line: 2, column: 3,
      endLine: 2, endColumn: 4, severity: 'error', message: 'expression missing' },
    { path: 'src/main.ores', line: 4, column: 2,
      endLine: 4, endColumn: 3, severity: 'info', message: 'second issue' },
  ]);
});
