'use strict';
// Host-only editor diagnostic origin regression.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {matchesCompilerDiagnosticPath} = require('../lib/diagnostic-path');

const cwd = path.resolve(process.cwd(), 'wave41 project 🦊');
const active = path.join(cwd, 'src', 'unicode file.ores');

test('canonical dot and Unicode aliases attach only to the active source', () => {
  for (const reported of [
    'src/unicode file.ores',
    './src/./unicode file.ores',
    'src/other/../unicode file.ores',
    active,
  ]) {
    assert.equal(matchesCompilerDiagnosticPath(reported, active, cwd), true, reported);
  }
});

test('prefix-matched sibling directories and source extensions are not active aliases', () => {
  for (const reported of [
    'src/unicode file.ores.bak',
    'src/unicode file.ores/../other.ores',
    '../wave41 project 🦊-evil/src/unicode file.ores',
    path.resolve(cwd, '..', 'wave41 project 🦊-evil', 'src', 'unicode file.ores'),
  ]) {
    assert.equal(matchesCompilerDiagnosticPath(reported, active, cwd), false, reported);
  }
  assert.equal(matchesCompilerDiagnosticPath('src/unicode file.ores', active, 'relative'), false);
  assert.equal(matchesCompilerDiagnosticPath('src/unicode file.ores', 'src/unicode file.ores', cwd), false);
});
