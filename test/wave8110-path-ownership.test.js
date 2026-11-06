'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

test('imports resolve against compiler cwd; parent traversal cannot steal current document', () => {
  const root = path.resolve(path.sep, 'workspace', 'wave8110');
  const cwd = path.join(root, 'src');
  const active = path.join(root, 'src', 'main.ores');
  assert.equal(matchesCompilerDiagnosticPath('main.ores', active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath('./lib/../main.ores', active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath(active, active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath('../src/dependency.ores', active, cwd), false);
  assert.equal(matchesCompilerDiagnosticPath(path.join(root, 'imported.ores'), active, cwd), false);
  assert.equal(matchesCompilerDiagnosticPath('main.ores/../dependency.ores', active, cwd), false);
});

test('even unlocated diagnostics require valid absolute active file and compiler cwd', () => {
  const cwd = path.resolve(path.sep, 'workspace', 'wave8110');
  const active = path.join(cwd, 'main.ores');
  assert.equal(matchesCompilerDiagnosticPath(null, active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath(undefined, active, cwd), true);
  for (const record of [null, undefined, 'main.ores']) {
    assert.equal(matchesCompilerDiagnosticPath(record, 'relative.ores', cwd), false);
    assert.equal(matchesCompilerDiagnosticPath(record, active, 'relative-dir'), false);
    assert.equal(matchesCompilerDiagnosticPath(record, active + '\0suffix', cwd), false);
    assert.equal(matchesCompilerDiagnosticPath(record, active, cwd + '\0suffix'), false);
  }
  assert.equal(matchesCompilerDiagnosticPath({ path: active }, active, cwd), false);
});
