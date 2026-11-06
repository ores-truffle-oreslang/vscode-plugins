'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('legacy diagnostics retain Windows drive origin, coded severity and message colons', () => {
  const output = [
    'C:\\workspace\\δοκιμή\\src\\main.atto:12:4: warning[W-17]: warning: has: multiple: colons  ',
    '/tmp/module.atto:3:1: info[I7]: imported module note',
    'C:\\workspace\\δοκιμή\\src\\main.atto:9:2: hint[H-1]: completion detail',
    'C:\\workspace\\δοκιμή\\src\\main.atto:0:3: error: invalid zero line',
    'C:\\workspace\\δοκιμή\\src\\main.atto:1:0: error: invalid zero column',
    'Oreslang parse error at 7:6: valid active fallback',
  ].join('\r\n');
  const expected = [
    ['C:\\workspace\\δοκιμή\\src\\main.atto', 12, 4, 'warning', 'warning: has: multiple: colons'],
    ['/tmp/module.atto', 3, 1, 'info', 'imported module note'],
    ['C:\\workspace\\δοκιμή\\src\\main.atto', 9, 2, 'hint', 'completion detail'],
    [null, 7, 6, 'error', 'valid active fallback'],
  ];
  for (let iteration = 0; iteration < 24; iteration++) {
    const records = parseCompilerOutputRecords(output);
    assert.deepEqual(records.map(r => [r.path, r.line, r.column, r.severity, r.message]), expected);
    assert.deepEqual(records.map(r => [r.endLine, r.endColumn]),
      [[12, 5], [3, 2], [9, 3], [7, 7]]);
  }
});
