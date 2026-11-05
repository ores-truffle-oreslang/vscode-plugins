'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {matchesCompilerDiagnosticPath} = require('../lib/diagnostic-path');

const cwd = path.resolve(process.cwd(), 'wave39-project');
const current = path.join(cwd, 'src', 'active.ores');

test('diagnostic relative dot-segment aliases resolve only to the active source', () => {
  for (const reported of [
    'src/active.ores',
    './src/active.ores',
    'src/../src/active.ores',
    current,
  ]) {
    assert.equal(matchesCompilerDiagnosticPath(reported, current, cwd), true, reported);
  }
});

test('a sibling path sharing a string prefix cannot steal active-file diagnostics', () => {
  for (const reported of [
    'src/active.ores.bak',
    'src/active.ores/other',
    'src/active.ores2',
    'src/elsewhere.ores',
    '../wave39-project-evil/src/active.ores',
    path.resolve(cwd, '..', 'wave39-project-evil', 'src', 'active.ores'),
  ]) {
    assert.equal(matchesCompilerDiagnosticPath(reported, current, cwd), false, reported);
  }
});

test('malformed paths fail closed, while legacy genuinely unlocated errors remain', () => {
  for (const reported of ['', 0, true, {}, '\0', 'src/active.ores\0tail']) {
    assert.equal(matchesCompilerDiagnosticPath(reported, current, cwd), false);
  }
  assert.equal(matchesCompilerDiagnosticPath(null, current, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath(undefined, current, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath('src/active.ores', 'relative.ores', cwd), false);
  assert.equal(matchesCompilerDiagnosticPath('src/active.ores', current, 'relative-dir'), false);
});
