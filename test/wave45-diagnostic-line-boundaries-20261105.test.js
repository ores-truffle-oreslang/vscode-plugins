'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

// Host parser admission only, not live compiler execution.
test('coordinate limits reject invalid siblings without losing valid boundary records', () => {
  const body = {
    version: 1, ok: false, diagnostics: [
      { path: 'src/high.atto', message: ' upper boundary ', severity: 'HINT',
        range: { start: { line: 9999999, column: 9999999 },
          end: { line: 9999999, column: 10000000 } } },
      { path: 'src/overflow.atto', message: 'bad', line: 10000001, column: 1 },
      { path: 'src/reversed.atto', message: 'bad',
        range: { start: { line: 8, column: 7 },
          end: { line: 7, column: 8 } } },
      { path: 'src/empty.atto', message: 'bad',
        range: { start: { line: 8, column: 7 },
          end: { line: 8, column: 7 } } },
      { path: null, message: ' last valid ', severity: 'URGENT',
        range: { start: { line: 10000000, column: 3 },
          end: { line: 10000000, column: 4 } } },
    ],
  };
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(body)), [
    { path: 'src/high.atto', line: 9999999, column: 9999999,
      endLine: 9999999, endColumn: 10000000, severity: 'hint', message: 'upper boundary' },
    { path: null, line: 10000000, column: 3,
      endLine: 10000000, endColumn: 4, severity: 'error', message: 'last valid' },
  ]);
});

test('legacy CRLF records keep Windows drive paths distinct from relative paths', () => {
  assert.deepEqual(parseCompilerOutputRecords(
    'C:\\code\\first.atto:2:3: warning[E42]: first\r\n' +
    'src/second.atto:3:4: info: second\r\n'
  ), [
    { path: 'C:\\code\\first.atto', line: 2, column: 3,
      endLine: 2, endColumn: 4, severity: 'warning', message: 'first' },
    { path: 'src/second.atto', line: 3, column: 4,
      endLine: 3, endColumn: 5, severity: 'info', message: 'second' },
  ]);
});
