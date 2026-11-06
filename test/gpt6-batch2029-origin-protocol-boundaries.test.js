'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');
const {matchesCompilerDiagnosticPath} = require('../lib/diagnostic-path');

const root = path.resolve(process.cwd(), 'gpt6-2029-project');
const active = path.join(root, 'src', 'main.atto');

test('structured diagnostics keep valid active and imported origins isolated', () => {
  const records = parseCompilerOutputRecords(JSON.stringify({
    version: 1,
    ok: false,
    diagnostics: [
      {path: 'src/main.atto', severity: 'warning', message: 'active span',
       range: {start: {line: 3, column: 8}, end: {line: 4, column: 2}}},
      {path: 'src/main.atto.bak', severity: 'error', message: 'imported neighboring file'},
      {path: 'src/main.atto\u0000evil', severity: 'error', message: 'spoofed NUL origin'},
      {path: {}, severity: 'error', message: 'hostile origin type'},
      {path: null, severity: 'hint', message: 'unlocated fallback'}
    ]
  }));
  assert.deepEqual(records.map(r => r.message),
    ['active span', 'imported neighboring file', 'unlocated fallback']);
  assert.deepEqual(records.filter(r => matchesCompilerDiagnosticPath(r.path, active, root))
    .map(r => r.message), ['active span', 'unlocated fallback']);
  assert.equal(records[0].endLine, 4);
  assert.equal(records[0].endColumn, 2);
});

test('legacy CRLF positions retain owning .atto file and reject prefix aliases', () => {
  const output = [
    'src/main.atto:9:5: error: actual: expected value',
    'src/main.attox:10:2: warning: unrelated sibling',
    'src/../outside.atto:11:4: error: relative outside owner',
    'Oreslang parse error at 12:7: local parsing failure'
  ].join('\r\n');
  const records = parseCompilerOutputRecords(output);
  assert.equal(records.length, 4);
  assert.deepEqual(records.filter(r => matchesCompilerDiagnosticPath(r.path, active, root))
    .map(r => r.message), ['actual: expected value', 'local parsing failure']);
  assert.deepEqual(records.map(r => r.severity),
    ['error', 'warning', 'error', 'error']);
  assert.equal(matchesCompilerDiagnosticPath(null, active + '\0evil', root), false,
    'invalid active editor context must not admit even unlocated errors');
});
