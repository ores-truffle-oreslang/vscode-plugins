'use strict';
// Host-only CRLF compiler diagnostics, rejecting bad lines without losing siblings.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('legacy multiline CRLF output preserves diagnostic source identity and order', () => {
  const stdout = [
    'C:\\project\\src\\main.ores:9:1: warning[W84]:  windows warning ',
    'src/main.ores:10000001:2: error: over-limit',
    'Oreslang parse error at 5:2: expected fi',
    'src/other.ores:4:3: info[I84]:  imported source ',
    'src/main.ores:0:1: error: zero coordinate',
    'src/main.ores:2:2: hint: final record',
  ].join('\r\n') + '\r\n';
  assert.deepEqual(parseCompilerOutputRecords(stdout), [
    { path: 'C:\\project\\src\\main.ores', line: 9, column: 1,
      endLine: 9, endColumn: 2, severity: 'warning', message: 'windows warning' },
    { path: null, line: 5, column: 2,
      endLine: 5, endColumn: 3, severity: 'error', message: 'expected fi' },
    { path: 'src/other.ores', line: 4, column: 3,
      endLine: 4, endColumn: 4, severity: 'info', message: 'imported source' },
    { path: 'src/main.ores', line: 2, column: 2,
      endLine: 2, endColumn: 3, severity: 'hint', message: 'final record' },
  ]);
});
