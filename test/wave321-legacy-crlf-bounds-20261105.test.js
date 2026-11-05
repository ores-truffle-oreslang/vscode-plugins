'use strict';
// Source-owned legacy compiler output parser boundary tests, not guest execution.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('CRLF input preserves drive-letter origins and good peers around invalid bounds', () => {
  const lines = [
    'C:\\project\\src\\main.ores:12:9: warning[W321]:  first issue ',
    'src/main.ores:10000001:2: error: overflow line',
    'Oreslang parse error at 4:5: expected expression',
    'src/main.ores:2:10000001: error: overflow column',
    'lib/second.ores:7:1: hint: final issue',
    'lib/second.ores:0:1: error: zero line',
  ].join('\r\n') + '\r\n';
  assert.deepEqual(parseCompilerOutputRecords(lines), [
    { path: 'C:\\project\\src\\main.ores', line: 12, column: 9,
      endLine: 12, endColumn: 10, severity: 'warning', message: 'first issue' },
    { path: null, line: 4, column: 5, endLine: 4, endColumn: 6,
      severity: 'error', message: 'expected expression' },
    { path: 'lib/second.ores', line: 7, column: 1,
      endLine: 7, endColumn: 2, severity: 'hint', message: 'final issue' },
  ]);
});

test('unparseable legacy lines never overwrite valid records on either side', () => {
  assert.deepEqual(parseCompilerOutputRecords([
    'a.ores:1:1: error: before',
    'compiler: an unstructured line',
    'b.ores:3:4: warning: after',
  ].join('\n')).map(({ path, message }) => [path, message]),
  [['a.ores', 'before'], ['b.ores', 'after']]);
});
