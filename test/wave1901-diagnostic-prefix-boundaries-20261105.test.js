'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

test('normalized same-file paths do not admit sibling prefixes or aliases', () => {
  const root = path.resolve(process.cwd(), 'wave1901-fixture-project');
  const active = path.join(root, 'src', 'target.atto');
  for (const candidate of [
    active,
    'src/target.atto',
    'src/./target.atto',
    'src/subdirectory/../target.atto'
  ]) {
    assert.equal(matchesCompilerDiagnosticPath(candidate, active, root), true, candidate);
  }
  for (const candidate of [
    'src/target.atto.bak',
    'src/target.atto/../other.atto',
    '../wave1901-fixture-project-sibling/src/target.atto',
    'src/target.atto\u0000suffix',
    'src/%74arget.atto',
    'src/target.atto/child'
  ]) {
    assert.equal(matchesCompilerDiagnosticPath(candidate, active, root), false, candidate);
  }
  assert.equal(matchesCompilerDiagnosticPath(null, 'src/target.atto', root), false);
  assert.equal(matchesCompilerDiagnosticPath(null, active, 'relative-project'), false);
});
