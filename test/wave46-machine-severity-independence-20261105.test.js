'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('invalid severity does not poison adjacent valid compiler records', () => {
  const diagnostics = [
    { path: 'src/one.ores', line: 1, column: 2, message: '  first  ', severity: 'WARNING' },
    { path: 'src/two.ores', line: 3, column: 4, message: 'second', severity: 'not-a-level' },
    { path: 'src/three.ores', line: 5, column: 6, message: 'third', severity: 123 },
    { path: null, line: 7, column: 8, message: 'fourth', severity: 'HINT' },
  ];
  const result = parseCompilerOutputRecords(JSON.stringify({ version: 1, diagnostics }));
  assert.deepEqual(result.map(record => [record.path, record.severity, record.message]), [
    ['src/one.ores', 'warning', 'first'],
    ['src/two.ores', 'error', 'second'],
    ['src/three.ores', 'error', 'third'],
    [null, 'hint', 'fourth'],
  ]);
  assert.deepEqual(result.map(record => [record.line, record.column, record.endColumn]), [
    [1, 2, 3], [3, 4, 5], [5, 6, 7], [7, 8, 9],
  ]);
});
