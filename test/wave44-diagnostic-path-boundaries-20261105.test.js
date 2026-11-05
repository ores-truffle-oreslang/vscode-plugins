'use strict';
// Host-only diagnostic ownership tests; not native compiler certification.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

const workspace = path.resolve(process.cwd(), 'wave44-workspace');
const active = path.join(workspace, 'src', 'module.ores');

test('path prefix and basename similarities never grant diagnostic ownership', () => {
  for (const reported of [
    'src/module.ores.bak',
    'src/module.ores2',
    'src/sub/module.ores',
    'other/module.ores',
    '../module.ores',
  ]) {
    assert.equal(matchesCompilerDiagnosticPath(reported, active, workspace), false, reported);
  }
});

test('normalized in-workspace aliases preserve exact active file ownership', () => {
  for (const reported of [
    'src/module.ores',
    './src/module.ores',
    './src/temp/../module.ores',
    active,
  ]) {
    assert.equal(matchesCompilerDiagnosticPath(reported, active, workspace), true, reported);
  }
  assert.equal(matchesCompilerDiagnosticPath(null, active, workspace), true);
});
