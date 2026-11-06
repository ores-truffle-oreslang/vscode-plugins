'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('malformed peers never discard valid imported-file and multiline diagnostics', () => {
  const records = parseCompilerOutputRecords(JSON.stringify({
    version: 1,
    diagnostics: [
      { path: '/workspace/src/dep.ores', severity: 'WARNING',
        message: '  dependency issue  ',
        range: { start: { line: 2, column: 8 }, end: { line: 3, column: 4 } } },
      { path: { forged: true }, message: 'invalid foreign origin' },
      { message: 'invalid array start', range: { start: [4, 2] } },
      { message: 'invalid backward span',
        range: { start: { line: 5, column: 8 }, end: { line: 4, column: 3 } } },
      { path: '/workspace/main.ores', severity: 'HINT', message: '  final issue  ',
        range: { start: { line: 6, column: 1 }, end: { line: 6, column: 3 } } }
    ]
  }));
  assert.deepEqual(records, [
    { path: '/workspace/src/dep.ores', line: 2, column: 8, endLine: 3,
      endColumn: 4, severity: 'warning', message: 'dependency issue' },
    { path: '/workspace/main.ores', line: 6, column: 1, endLine: 6,
      endColumn: 3, severity: 'hint', message: 'final issue' }
  ]);
});

test('explicit invalid machine ranges cannot silently downgrade to default (1,1)', () => {
  for (const invalid of [false, 4, [], 'line', { start: [] }, { end: '5' }]) {
    const output = JSON.stringify({ version: 1, diagnostics: [
      { message: 'must drop', range: invalid },
      { message: 'must stay', path: 'src/stable.ores', line: 2, column: 3 }
    ] });
    const actual = parseCompilerOutputRecords(output);
    assert.deepEqual(actual.map(item => item.message), ['must stay']);
    assert.equal(actual[0].path, 'src/stable.ores');
    assert.equal(actual[0].line, 2);
    assert.equal(actual[0].column, 3);
  }
});
