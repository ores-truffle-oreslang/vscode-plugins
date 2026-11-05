'use strict';
// Host CLI-output parsing only; no compiler guest was executed.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('CRLF noisy stdout preserves source origin, severity and error order', () => {
  const output = [
    'build cache warm',
    'Oreslang type error at 12:3: cannot borrow',
    'src/main.ores:8:4: WARNING[WR02]: check this',
    'C:\\work\\other.ores:9:11: info: imported clue',
    'build failed',
  ].join('\r\n');
  assert.deepEqual(parseCompilerOutputRecords(output), [
    { path: null, line: 12, column: 3, endLine: 12, endColumn: 4,
      severity: 'error', message: 'cannot borrow' },
    { path: 'src/main.ores', line: 8, column: 4, endLine: 8, endColumn: 5,
      severity: 'warning', message: 'check this' },
    { path: 'C:\\work\\other.ores', line: 9, column: 11,
      endLine: 9, endColumn: 12, severity: 'info', message: 'imported clue' },
  ]);
});
