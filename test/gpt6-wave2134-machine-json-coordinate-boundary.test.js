'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('machine diagnostics retain exactly bounded coordinates and isolate malformed neighbors', () => {
  const diagnostics = [
    {path: 'accepted.atto', message: '  upper boundary  ', severity:'WARNING',
      range: {start: {line:10000000, column:9999999}}},
    {path: 'too-wide.atto', message:'unbounded end',
      range: {start: {line:1, column:10000000}}},
    {path: 'too-tall.atto', message:'unbounded line',
      range: {start: {line:10000001, column:1}}},
    {path: 'float.atto', message:'fractional coordinate',
      range: {start: {line:1.5, column:1}}},
    {path: 'bad' + '\0' + '.atto', message:'NUL origin',
      range: {start: {line:1, column:1}}},
    {path: 'array.atto', message:'array range', range: [{line:1, column:1}]},
    {path: 'good.atto', message:'still visible', severity:'info',
      range: {start: {line:4, column:2}, end:{line:4,column:3}}},
  ];
  const actual = parseCompilerOutputRecords(JSON.stringify({version:1, diagnostics}));
  assert.deepEqual(actual.map(x=>[x.path,x.message,x.severity,x.line,x.column,x.endColumn]), [
    ['accepted.atto','upper boundary','warning',10000000,9999999,10000000],
    ['good.atto','still visible','info',4,2,3],
  ]);
});

test('broken versioned compiler JSON never falls through to forged legacy diagnostics', () => {
  const untrusted = '{"version":1,"diagnostics":[\nforeign.atto:9:8: error: forged\n';
  assert.deepEqual(parseCompilerOutputRecords(untrusted), []);
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({version:2,diagnostics:[]})), []);
});
