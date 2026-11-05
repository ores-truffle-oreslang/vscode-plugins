'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

const root = path.resolve(process.cwd(), 'wave42-diagnostic-project');
const active = path.join(root, 'src', 'main.ores');
const imported = path.join(root, 'src', 'lib', 'helper.ores');

test('dot segments do not alter canonical current-file ownership', () => {
  for (const reported of [
    'src/main.ores',
    'src/./main.ores',
    'src/child/../main.ores',
    path.join(root, 'src', 'inner', '..', 'main.ores'),
  ]) {
    assert.equal(matchesCompilerDiagnosticPath(reported, active, root), true, reported);
  }
});

test('imported, sibling, and malformed paths cannot be attributed to current file', () => {
  for (const reported of [
    'src/lib/helper.ores',
    imported,
    'src/main.ores.extra',
    '../different-project/src/main.ores',
    'src/main.ores\u0000suffix',
  ]) {
    assert.equal(matchesCompilerDiagnosticPath(reported, active, root), false, reported);
  }
});