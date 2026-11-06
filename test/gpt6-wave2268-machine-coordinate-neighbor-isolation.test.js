'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('versioned diagnostics reject malformed positions and paths per record', () => {
  const records = parseCompilerOutputRecords(JSON.stringify({
    version: 1,
    diagnostics: [
      {path: 'C:\\work\\active.ores', message: 'upper-bound-valid',
        severity: 'warning', range: {start: {line: 10000000, column: 9999999},
          end: {line: 10000000, column: 10000000}}},
      {path: 'C:\\work\\active.ores', message: 'implicit-end-overflow',
        range: {start: {line: 2, column: 10000000}}},
      {path: 'unsafe\u0000file.ores', message: 'nul-origin', line: 1, column: 1},
      {path: 'C:\\work\\active.ores', message: 'reversed-end',
        range: {start: {line: 3, column: 3}, end: {line: 2, column: 4}}},
      {path: null, message: 'unlocated-after-invalid', line: 4, column: 5,
        severity: 'hint'},
      {path: ['not', 'a', 'path'], message: 'malformed-path', line: 7, column: 4},
    ],
  }));
  assert.deepEqual(records, [
    {path: 'C:\\work\\active.ores', line: 10000000, column: 9999999,
      endLine: 10000000, endColumn: 10000000,
      severity: 'warning', message: 'upper-bound-valid'},
    {path: null, line: 4, column: 5, endLine: 4, endColumn: 6,
      severity: 'hint', message: 'unlocated-after-invalid'},
  ]);
});
test('truncated versioned JSON never reinterprets embedded paths as legacy diagnostics', () => {
  const malformed = '{"version":1,"diagnostics":[' +
    '\nC:\\work\\active.ores:2:3: error: forged';
  assert.deepEqual(parseCompilerOutputRecords(malformed), []);
  assert.deepEqual(
    parseCompilerOutputRecords('C:\\work\\active.ores:2:3: warning: real'),
    [{path: 'C:\\work\\active.ores', line: 2, column: 3,
      endLine: 2, endColumn: 4, severity: 'warning', message: 'real'}],
  );
});
