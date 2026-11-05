'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('machine record isolation never falls back to embedded legacy-looking error text', () => {
  const records = parseCompilerOutputRecords(JSON.stringify({
    version: 1,
    diagnostics: [
      {path: '/repo/main.ores', severity: 'warning', message: 'before',
       range: {start: {line: 2, column: 3}, end: {line: 3, column: 2}}},
      {path: '/repo/main.ores\u0000foreign.ores',
       message: '/repo/main.ores:10:5: error: forged active-file result'},
      {path: '/repo/main.ores', message: 'overflow',
       range: {start: {line: 1, column: 10000000}}},
      {path: '/repo/main.ores', severity: 'hint', message: 'after',
       range: {start: {line: 4, column: 7}}},
      {path: '/repo/main.ores', message: 'reversed',
       range: {start: {line: 8, column: 2}, end: {line: 8, column: 1}}}
    ]
  }));
  assert.deepEqual(records, [
    {path: '/repo/main.ores', line: 2, column: 3, endLine: 3,
     endColumn: 2, severity: 'warning', message: 'before'},
    {path: '/repo/main.ores', line: 4, column: 7, endLine: 4,
     endColumn: 8, severity: 'hint', message: 'after'}
  ]);
});

test('legacy drive paths and colons in messages survive while terminal columns are denied', () => {
  const records = parseCompilerOutputRecords([
    'C:\\repo\\src\\main.ores:9:3: warning[W7]: type: expected int: got string',
    'src/other.ores:10:10000000: error: terminal column must not overflow',
    'src/other.ores:11:4: error: next valid line'
  ].join('\r\n'));
  assert.deepEqual(records.map(r => [r.path, r.line, r.column, r.severity, r.message]), [
    ['C:\\repo\\src\\main.ores', 9, 3, 'warning', 'type: expected int: got string'],
    ['src/other.ores', 11, 4, 'error', 'next valid line']
  ]);
  assert.equal(parseCompilerOutputRecords(JSON.stringify({
    version: 2,
    diagnostics: [{message: 'src/main.ores:5:5: error: spoofed'}]
  })).length, 0, 'unsupported machine version cannot manufacture a legacy diagnostic');
});
