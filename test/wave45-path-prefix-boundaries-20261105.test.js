'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

// Source-backed diagnostic ownership only; not an editor GUI or compiler guest test.
const cwd = path.resolve(process.cwd(), 'wave45-source-root');
const current = path.join(cwd, 'src', 'café.atto');

test('normalized aliases for exactly the same source file are admitted', () => {
  for (const candidate of [
    'src/café.atto',
    './src/../src/café.atto',
    path.join(cwd, 'src', 'café.atto'),
  ]) {
    assert.equal(matchesCompilerDiagnosticPath(candidate, current, cwd), true, candidate);
  }
});

test('lookalike Unicode names, percent escapes and path prefixes stay distinct', () => {
  for (const candidate of [
    'src/cafe\u0301.atto',
    'src/café.atto ',
    'src/café.atto.bak',
    'src/%63afé.atto',
    '../wave45-source-root-extra/src/café.atto',
    'src/café.atto/child',
  ]) {
    assert.equal(matchesCompilerDiagnosticPath(candidate, current, cwd), false, candidate);
  }
  assert.equal(matchesCompilerDiagnosticPath('src/café.atto', current, 'relative'), false);
});
