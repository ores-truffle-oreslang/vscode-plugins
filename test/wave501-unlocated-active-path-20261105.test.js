'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

test('unlocated diagnostics cannot bypass missing or relative active-editor context', () => {
  const cwd = path.resolve(process.cwd(), 'wave501-workspace');
  const active = path.join(cwd, 'src', 'main.ores');
  for (const recordPath of [null, undefined]) {
    assert.equal(matchesCompilerDiagnosticPath(recordPath, active, cwd), true);
    for (const invalidActive of [null, '', 'src/main.ores', [], {}]) {
      assert.equal(matchesCompilerDiagnosticPath(recordPath, invalidActive, cwd), false);
    }
    for (const invalidCwd of [null, '', '.', [], {}]) {
      assert.equal(matchesCompilerDiagnosticPath(recordPath, active, invalidCwd), false);
    }
  }
  assert.equal(matchesCompilerDiagnosticPath('src/main.ores', active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath('src/other.ores', active, cwd), false);
  assert.equal(matchesCompilerDiagnosticPath('src/main.ores\0suffix', active, cwd), false);
});
