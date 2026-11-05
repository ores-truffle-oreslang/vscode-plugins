'use strict';
// Host-level editor attribution: canonical/relative paths vs neighboring files.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

test('Unicode imported and traversal diagnostic origins cannot spoof active editor file', () => {
  const cwd = path.resolve(process.cwd(), 'wave1711-project');
  const active = path.join(cwd, 'src', '🍃.atto');
  const target = 'src/🍃.atto';
  for (const reported of [
    active, target, './src/🍃.atto', 'src/../src/🍃.atto',
  ]) {
    assert.equal(matchesCompilerDiagnosticPath(reported, active, cwd), true, reported);
  }
  for (const reported of [
    'src/🍃.atto.backup', 'src2/🍃.atto', 'src/other.atto',
    '../outside.atto', '', 7, {}, 'src/🍃.atto\0malicious',
  ]) {
    assert.equal(matchesCompilerDiagnosticPath(reported, active, cwd), false,
      JSON.stringify(reported));
  }
  assert.equal(matchesCompilerDiagnosticPath(null, active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath(undefined, active, cwd), true);
  for (const broken of ['', null, 'src/🍃.atto']) {
    assert.equal(matchesCompilerDiagnosticPath(null, broken, cwd), false);
  }
  assert.equal(matchesCompilerDiagnosticPath(null, active, 'relative-workspace'), false);
});
