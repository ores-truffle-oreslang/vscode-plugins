'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('invalid machine diagnostic peers do not corrupt independent valid records', () => {
  const output = JSON.stringify({
    version: 1,
    ok: false,
    diagnostics: [
      {
        path: 'src/library.atto',
        message: '  imported 🙂 warning  ',
        severity: 'WARNING',
        range: { start: { line: 2, column: 3 }, end: { line: 3, column: 2 } }
      },
      {
        path: { impersonates: 'src/current.atto' },
        message: 'malformed explicit owner'
      },
      {
        path: 'src/current.atto',
        message: 'boolean coordinate',
        range: { start: { line: true, column: 1 } }
      },
      {
        path: 'src/current.atto',
        message: 'reverse span',
        range: { start: { line: 7, column: 9 }, end: { line: 7, column: 2 } }
      },
      {
        path: null,
        message: ' final hint ',
        severity: 'HINT',
        range: { start: { line: 10, column: 1 } }
      }
    ]
  });
  const expected = [
    {
      path: 'src/library.atto',
      line: 2, column: 3, endLine: 3, endColumn: 2,
      severity: 'warning', message: 'imported 🙂 warning'
    },
    {
      path: null,
      line: 10, column: 1, endLine: 10, endColumn: 2,
      severity: 'hint', message: 'final hint'
    }
  ];
  assert.deepEqual(parseCompilerOutputRecords(output), expected);
  assert.deepEqual(parseCompilerOutputRecords(output), expected);
});
