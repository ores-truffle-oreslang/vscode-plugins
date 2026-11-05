'use strict';
// Host legacy stderr parser regression, not compiler guest execution.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('legacy coordinate overflow is isolated from adjacent valid diagnostics', () => {
  const output = [
    'src/invalid.ores:10000001:2: error: huge line',
    'src/one.ores:2:3: warning: first issue',
    'src/invalid.ores:1:10000001: error: huge column',
    'src/invalid.ores:0:2: error: zero line',
    'C:\\work\\two.ores:9999999:9999999: info: second issue',
  ].join('\r\n');
  assert.deepEqual(parseCompilerOutputRecords(output), [
    { path: 'src/one.ores', line: 2, column: 3, endLine: 2, endColumn: 4,
      severity: 'warning', message: 'first issue' },
    { path: 'C:\\work\\two.ores', line: 9999999, column: 9999999,
      endLine: 9999999, endColumn: 10000000,
      severity: 'info', message: 'second issue' },
  ]);
});
