'use strict';
// Host-only editor origin boundary tests; no compiler guest execution claim.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

const cwd = path.resolve(process.cwd(), 'wave42 source-trust');
const active = path.join(cwd, 'src', 'target.ores');

test('hostile or malformed diagnostic origins cannot attach to the active file', () => {
  for (const reported of ['', 0, false, {}, [], 'src/target.ores\0spoof', 'src/target.ores.bak']) {
    assert.equal(matchesCompilerDiagnosticPath(reported, active, cwd), false, String(reported));
  }
  for (const invalidActive of ['', 1, 'src/target.ores', null]) {
    assert.equal(matchesCompilerDiagnosticPath('src/target.ores', invalidActive, cwd), false);
  }
  for (const invalidCwd of ['', false, 'relative/workspace']) {
    assert.equal(matchesCompilerDiagnosticPath('src/target.ores', active, invalidCwd), false);
  }
});

test('canonical active-file aliases remain valid and legacy unlocated errors remain unlocated', () => {
  for (const reported of ['src/target.ores', './src/../src/target.ores', active]) {
    assert.equal(matchesCompilerDiagnosticPath(reported, active, cwd), true, reported);
  }
  assert.equal(matchesCompilerDiagnosticPath(null, active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath(undefined, active, cwd), true);
});
