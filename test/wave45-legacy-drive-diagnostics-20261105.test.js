'use strict';
// Host-only compiler output fallback regression, not compiler guest validation.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('legacy diagnostics preserve Windows drive and Unicode origin across CRLF', () => {
  const source = [
    'C:\\workspace\\λ.ores:9:12: warning[W123]: typed diagnostic',
    'src/β.ores:3:4: info: another record',
    'src/rejected.ores:0:1: error: invalid zero coordinate',
  ].join('\r\n');
  assert.deepEqual(parseCompilerOutputRecords(source), [
    { path: 'C:\\workspace\\λ.ores', line: 9, column: 12, endLine: 9,
      endColumn: 13, severity: 'warning', message: 'typed diagnostic' },
    { path: 'src/β.ores', line: 3, column: 4, endLine: 3,
      endColumn: 5, severity: 'info', message: 'another record' },
  ]);
});
