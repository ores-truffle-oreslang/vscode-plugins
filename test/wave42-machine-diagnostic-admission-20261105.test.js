'use strict';
// Host-only compiler JSON admission; these tests make no guest execution claim.
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('machine diagnostics reject malformed ranges and hostile paths per record', () => {
  const output = JSON.stringify({version: 1, diagnostics: [
    {path: 'src/good.ores', line: 10, column: 4, message: '  spaced  ', severity: 'WARNING'},
    {path: 'src/evil\u0000.ores', line: 1, column: 1, message: 'nul path'},
    {path: 'src/zero.ores', line: 0, column: 1, message: 'zero line'},
    {path: 'src/reversed.ores', line: 4, column: 7, range: {end: {line: 4, column: 7}}, message: 'empty range'},
    {path: 'src/blank.ores', line: 1, column: 1, message: '  '},
  ]});
  assert.deepEqual(parseCompilerOutputRecords(output), [{
    path: 'src/good.ores', line: 10, column: 4,
    endLine: 10, endColumn: 5, severity: 'warning', message: 'spaced',
  }]);
});

test('unsupported machine JSON version does not become legacy diagnostics', () => {
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({
    version: 2, diagnostics: [{line: 3, column: 4, message: 'unsupported'}],
  })), []);
});