'use strict';
// Host-only diagnostic provenance regression; no compiler execution claim.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');
const {matchesCompilerDiagnosticPath} = require('../lib/diagnostic-path');

test('machine diagnostics preserve explicit source origin without laundering malformed siblings', () => {
  const cwd = path.resolve(process.cwd(), 'wave61');
  const active = path.join(cwd, 'src', 'main.ores');
  const records = parseCompilerOutputRecords(JSON.stringify({
    version: 1, diagnostics: [
      {path: 'src/main.ores', message: 'active', severity: 'warning', line: 4, column: 2},
      {path: '../foreign/main.ores', message: 'foreign', severity: 'error', line: 5, column: 2},
      {path: {spoofed: true}, message: 'forged', line: 6, column: 2},
      {path: null, message: 'unlocated', line: 7, column: 2},
    ]
  }));
  assert.deepEqual(records.map(r => r.message), ['active', 'foreign', 'unlocated']);
  assert.deepEqual(records.map(r => r.path), ['src/main.ores', '../foreign/main.ores', null]);
  assert.deepEqual(records.map(r => r.severity), ['warning', 'error', 'error']);
  assert.deepEqual(records.map(r => matchesCompilerDiagnosticPath(r.path, active, cwd)),
    [true, false, true]);
});

test('malformed machine version never falls back to parsing embedded plain-text diagnostics', () => {
  const records = parseCompilerOutputRecords(JSON.stringify({
    version: 2,
    diagnostics: [{path: 'src/main.ores', message: 'src/main.ores:2:3: error: not valid'}],
  }));
  assert.deepEqual(records, []);
});
