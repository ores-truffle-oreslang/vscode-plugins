'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {matchesCompilerDiagnosticPath} = require('../lib/diagnostic-path');

test('relative path normalization accepts only the active file, not same-name siblings', () => {
  const root = path.resolve('/tmp/wave2630/project');
  const cwd = path.join(root, 'src');
  const active = path.join(cwd, 'main.atto');
  const allowed = [
    active,
    'main.atto',
    './main.atto',
    'sub/../main.atto',
    '../src/main.atto',
  ];
  for (const origin of allowed) {
    assert.equal(matchesCompilerDiagnosticPath(origin, active, cwd), true, JSON.stringify(origin));
  }
  const denied = [
    'main.atto.bak',
    '../other/main.atto',
    '../../project-sibling/src/main.atto',
    path.join(root, 'other', 'main.atto'),
    path.join(root + '-malicious', 'src', 'main.atto'),
    'src/main.atto',
    'bad\0.atto',
    '',
    {},
  ];
  for (const origin of denied) {
    assert.equal(matchesCompilerDiagnosticPath(origin, active, cwd), false, JSON.stringify(origin));
  }
});
test('unlocated legacy diagnostics still need a valid absolute active editor context', () => {
  const cwd = path.resolve('/tmp/wave2630/project/src');
  const active = path.join(cwd, 'main.atto');
  assert.equal(matchesCompilerDiagnosticPath(null, active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath(undefined, active, cwd), true);
  for (const invalidActive of ['main.atto', '', null, 'bad\0.atto']) {
    assert.equal(matchesCompilerDiagnosticPath(null, invalidActive, cwd), false);
  }
  for (const invalidCwd of ['', 'relative-dir', null, cwd + '\0']) {
    assert.equal(matchesCompilerDiagnosticPath(null, active, invalidCwd), false);
  }
});
