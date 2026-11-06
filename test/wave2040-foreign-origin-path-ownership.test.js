'use strict';
// Source-file ownership is a security boundary: foreign compiler diagnostics
// must never be attributed to the currently opened document.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {matchesCompilerDiagnosticPath: owns} = require('../lib/diagnostic-path');

test('only canonical active-file path survives relative traversal and alias forms', () => {
  const cwd = path.resolve(process.cwd(), 'project-root');
  const active = path.join(cwd, 'src', 'current.atto');
  assert.equal(owns('src/current.atto', active, cwd), true);
  assert.equal(owns('src/./current.atto', active, cwd), true);
  assert.equal(owns('src/other/../current.atto', active, cwd), true);
  assert.equal(owns(active, active, cwd), true);

  for (const foreign of [
    'src/current.atto.backup',
    'src/../secrets.atto',
    '../project-root-other/src/current.atto',
    '../project-root/src/foreign.atto',
    path.resolve(cwd, 'src', 'other.atto'),
    'src/' + String.fromCharCode(0) + 'current.atto'
  ]) {
    assert.equal(owns(foreign, active, cwd), false, foreign);
  }
});

test('unlocated diagnostics require a trusted absolute active file and cwd', () => {
  const cwd = path.resolve(process.cwd(), 'project-root');
  const active = path.join(cwd, 'src', 'current.atto');
  assert.equal(owns(null, active, cwd), true);
  assert.equal(owns(undefined, active, cwd), true);
  for (const invalid of [null, undefined, 4, '', 'src/current.atto',
    active + String.fromCharCode(0)]) {
    assert.equal(owns(null, invalid, cwd), false);
  }
  for (const invalid of [null, undefined, 4, '', 'relative/dir',
    cwd + String.fromCharCode(0)]) {
    assert.equal(owns(null, active, invalid), false);
  }
  // Hostile objects cannot smuggle a fabricated filename via coercion.
  const evil = {toString() {throw Error('should not coerce origin');}};
  assert.equal(owns(evil, active, cwd), false);
  assert.equal(owns(null, evil, cwd), false);
});
