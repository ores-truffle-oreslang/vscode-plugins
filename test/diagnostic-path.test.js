'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

const base = path.resolve(process.cwd(), 'fixture-project');
const current = path.join(base, 'src', 'current.ores');
const other = path.join(base, 'src', 'other.ores');

test('compiler JSON reports current and imported files without misattribution', () => {
  assert.equal(matchesCompilerDiagnosticPath(current, current, base), true);
  assert.equal(matchesCompilerDiagnosticPath('src/current.ores', current, base), true);
  assert.equal(matchesCompilerDiagnosticPath(other, current, base), false);
  assert.equal(matchesCompilerDiagnosticPath('src/other.ores', current, base), false);
  assert.equal(matchesCompilerDiagnosticPath('../outside.ores', current, base), false);
});
test('unlocated legacy diagnostic still targets the current file', () => {
  assert.equal(matchesCompilerDiagnosticPath(null, current, base), true);
  assert.equal(matchesCompilerDiagnosticPath(undefined, current, base), true);
});
test('hostile malformed paths are never accepted for current-file diagnostics', () => {
  assert.equal(matchesCompilerDiagnosticPath('', current, base), false);
  assert.equal(matchesCompilerDiagnosticPath(123, current, base), false);
  assert.equal(matchesCompilerDiagnosticPath('src/current.ores\0bad', current, base), false);
  assert.equal(matchesCompilerDiagnosticPath('src/current.ores', 'relative.ores', base), false);
  assert.equal(matchesCompilerDiagnosticPath('src/current.ores', current, 'relative-dir'), false);
});
