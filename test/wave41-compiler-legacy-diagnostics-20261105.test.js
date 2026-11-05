'use strict';
// Host-only legacy diagnostics origin and numeric-boundary regression.
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('legacy compiler messages preserve Windows drive paths, severities and CRLF boundaries', () => {
  const records = parseCompilerOutputRecords([
    'C:\\workspace\\src\\main.ores:12:4: warning[W002]: possible issue',
    'Oreslang type error at 3:2: type mismatch',
    'src/next.ores:9:1: info: next item',
  ].join('\r\n'));
  assert.deepEqual(records, [
    {path: 'C:\\workspace\\src\\main.ores', line: 12, column: 4,
      endLine: 12, endColumn: 5, severity: 'warning', message: 'possible issue'},
    {path: null, line: 3, column: 2,
      endLine: 3, endColumn: 3, severity: 'error', message: 'type mismatch'},
    {path: 'src/next.ores', line: 9, column: 1,
      endLine: 9, endColumn: 2, severity: 'info', message: 'next item'},
  ]);
});

test('legacy parsing ignores malformed and out-of-range coordinate records', () => {
  const records = parseCompilerOutputRecords([
    'src/a.ores:0:1: error: zero line',
    'src/a.ores:1:0: error: zero column',
    'src/a.ores:10000001:1: error: huge line',
    'src/a.ores:1:10000001: error: huge column',
    'src/a.ores:5:6: warning: valid',
  ].join('\n'));
  assert.deepEqual(records.map(x => x.message), ['valid']);
  assert.equal(records[0].line, 5);
  assert.equal(records[0].column, 6);
});
