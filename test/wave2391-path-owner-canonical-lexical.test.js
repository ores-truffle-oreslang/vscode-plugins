'use strict';
// Editor path-origin ownership contracts; lexical and host-only.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

test('relative dot aliases resolve to precisely the active source, never a sibling', () => {
  const root = path.resolve(process.cwd(), 'wave2391 virtual workspace [literal]');
  const cwd = path.join(root, 'packages', 'web');
  const active = path.join(root, 'packages', 'web', 'src', 'main.atto');
  const aliases = [
    './src/main.atto',
    'src/./main.atto',
    'src/imported/../main.atto',
    path.relative(cwd, active),
    active,
    path.join(root, 'packages', 'web', '.', 'src', 'main.atto'),
  ];
  for (const candidate of aliases) {
    assert.equal(matchesCompilerDiagnosticPath(candidate, active, cwd), true,
      'canonical same-file alias: ' + candidate);
  }
  for (const candidate of [
    'src/other.atto',
    'src/../../foreign/main.atto',
    '../other/src/main.atto',
    path.join(root, 'packages', 'api', 'src', 'main.atto'),
    'src/main.atto.bak',
  ]) {
    assert.equal(matchesCompilerDiagnosticPath(candidate, active, cwd), false,
      'foreign file must never bind: ' + candidate);
  }
});

test('an unlocated diagnostic cannot bypass invalid editor context', () => {
  const root = path.resolve(process.cwd(), 'wave2391 exact workspace');
  const active = path.join(root, 'main.atto');
  for (const origin of [null, undefined]) {
    assert.equal(matchesCompilerDiagnosticPath(origin, active, root), true);
    assert.equal(matchesCompilerDiagnosticPath(origin, 'main.atto', root), false);
    assert.equal(matchesCompilerDiagnosticPath(origin, active, '.'), false);
    assert.equal(matchesCompilerDiagnosticPath(origin, active + '\0evil', root), false);
    assert.equal(matchesCompilerDiagnosticPath(origin, active, root + '\0evil'), false);
  }
  for (const origin of [null, undefined, '', 42, [], {}, 'main.atto\0other']) {
    const expected = origin === null || origin === undefined;
    assert.equal(matchesCompilerDiagnosticPath(origin, active, root), expected);
  }
});

test('case folding follows host path semantics; an unrelated path never gains authority', () => {
  const root = path.resolve(process.cwd(), 'wave2391-CASE');
  const active = path.join(root, 'Case.atto');
  const changedCase = path.join(root, 'case.atto');
  assert.equal(matchesCompilerDiagnosticPath(changedCase, active, root),
    process.platform === 'win32');
  assert.equal(matchesCompilerDiagnosticPath(path.join(root, 'other.atto'), active, root), false);
});
