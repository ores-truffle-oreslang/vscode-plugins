'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

test('compiler diagnostics attach to active file only, including normalized relative paths', () => {
  const active = path.resolve('repo', 'src', 'entry.atto');
  const cwd = path.dirname(active);
  const output = [
    'entry.atto:7:3: warning: local',
    '../foreign/entry.atto:8:4: error: same basename, different directory',
    'Oreslang error at 9:2: unlocated legacy',
  ].join('\n');
  const parsed = parseCompilerOutputRecords(output);
  assert.equal(parsed.length, 3);
  const allowed = parsed.filter(record => matchesCompilerDiagnosticPath(record.path, active, cwd));
  assert.deepEqual(allowed.map(record=>record.message), ['local', 'unlocated legacy']);
  assert.equal(matchesCompilerDiagnosticPath('sub/../entry.atto', active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath(path.resolve(cwd,'..','foreign','entry.atto'),active,cwd), false);
  assert.equal(matchesCompilerDiagnosticPath('entry.atto' + '\0', active, cwd), false);
});

test('unlocated diagnostics cannot bypass malformed active editor or cwd origins', () => {
  const active = path.resolve('repo', 'src', 'main.atto');
  const cwd = path.dirname(active);
  assert.equal(matchesCompilerDiagnosticPath(null, active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath(null, 'relative/main.atto', cwd), false);
  assert.equal(matchesCompilerDiagnosticPath(null, active, 'relative/workspace'), false);
  assert.equal(matchesCompilerDiagnosticPath(null, active + '\0', cwd), false);
  assert.equal(matchesCompilerDiagnosticPath(null, active, cwd + '\0'), false);
});
