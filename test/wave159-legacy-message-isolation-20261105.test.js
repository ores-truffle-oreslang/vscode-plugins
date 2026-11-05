'use strict';
// Source-owned legacy stdout parsing; no compiler guest or extension-host parity.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('CRLF legacy parser keeps order, trimmed messages, source identity, and severity', () => {
  const input = [
    'src/first.ores:2:3: warning[W1]:  first issue ',
    'src/invalid.ores:0:3: error: invalid zero coordinate',
    'Oreslang type error at 3:2: type mismatch',
    'src/other.ores:9:1: info: last issue',
  ].join('\r\n');
  assert.deepEqual(parseCompilerOutputRecords(input), [
    {path: 'src/first.ores', line: 2, column: 3, endLine: 2, endColumn: 4,
      severity: 'warning', message: 'first issue'},
    {path: null, line: 3, column: 2, endLine: 3, endColumn: 3,
      severity: 'error', message: 'type mismatch'},
    {path: 'src/other.ores', line: 9, column: 1, endLine: 9, endColumn: 2,
      severity: 'info', message: 'last issue'},
  ]);
});
