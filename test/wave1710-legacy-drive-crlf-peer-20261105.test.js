'use strict';
// Legacy stderr acceptance and sibling isolation in the source-owned parser.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('mixed newline compiler output preserves Windows drives, colons and valid peers', () => {
  const input = [
    'C:\\work\\src\\actor.atto:7:4: warning[W77]: keep: inner: colon  ',
    'src/main.atto:2:5: info: second',
    'src/invalid.atto:0:5: error: reject coordinate zero',
    'C:\\repo\\bad.atto:1:10000000: error: reject terminal column',
    'Oreslang syntax error at 8:2: mismatch',
  ].join('\r\n');
  const expected = [
    { path: 'C:\\work\\src\\actor.atto', line: 7, column: 4, endLine: 7,
      endColumn: 5, severity: 'warning', message: 'keep: inner: colon' },
    { path: 'src/main.atto', line: 2, column: 5, endLine: 2,
      endColumn: 6, severity: 'info', message: 'second' },
    { path: null, line: 8, column: 2, endLine: 8, endColumn: 3,
      severity: 'error', message: 'mismatch' },
  ];
  assert.deepEqual(parseCompilerOutputRecords(input), expected);
  assert.deepEqual(parseCompilerOutputRecords(input.replaceAll('\r\n', '\n')), expected);
});
