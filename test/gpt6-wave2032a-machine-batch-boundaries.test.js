'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('malformed machine ranges cannot suppress or alter adjacent valid diagnostics', () => {
  const entry = (message, range, extras = {}) => ({
    version: 1, message, path: 'src/current.ores', severity: 'WARNING', range, ...extras
  });
  const diagnostics = [
    entry('array range', [], {}),
    entry('array start', { start: [1, 2] }),
    entry('array end', { start: { line: 2, column: 3 }, end: [2, 4] }),
    entry('float start', { start: { line: 1.2, column: 3 } }),
    entry('reversed same line', { start: { line: 2, column: 4 }, end: { line: 2, column: 3 } }),
    entry('end past cap', { start: { line: 2, column: 5 }, end: { line: 2, column: 10000001 } }),
    entry('inferred end past cap', { start: { line: 2, column: 10000000 } }),
    entry('hostile NUL path', { start: { line: 1, column: 2 } }, { path: 'src/current.ores\0wrong' }),
    entry('valid edge', { start: { line: 2, column: 9999999 }, end: { line: 2, column: 10000000 } }),
    entry('valid cross-line', { start: { line: 5, column: 23 }, end: { line: 6, column: 1 } },
      { severity: 'hint', message: '  valid cross-line  ' }),
  ];
  const output = JSON.stringify({ version: 1, diagnostics });
  for (let iteration = 0; iteration < 12; iteration++) {
    const records = parseCompilerOutputRecords(output);
    assert.deepEqual(records.map((v) => v.message), ['valid edge', 'valid cross-line']);
    assert.deepEqual(records.map((v) => v.severity), ['warning', 'hint']);
    assert.deepEqual(records.map((v) => [v.line, v.column, v.endLine, v.endColumn]), [
      [2, 9999999, 2, 10000000], [5, 23, 6, 1]
    ]);
    assert.ok(records.every(v => v.path === 'src/current.ores'));
  }
  assert.deepEqual(parseCompilerOutputRecords('{ "version": 1, "diagnostics": [] }'), []);
  assert.deepEqual(parseCompilerOutputRecords('unrelated logs without compiler positions'), []);
});
