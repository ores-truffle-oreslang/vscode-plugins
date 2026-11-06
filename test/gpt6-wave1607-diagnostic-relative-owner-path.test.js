'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');
const {matchesCompilerDiagnosticPath} = require('../lib/diagnostic-path');

test('only canonical same-document diagnostics survive mixed relative origins', () => {
  const cwd = path.resolve(process.cwd(), 'gpt6-wave1607-workspace');
  const activePath = path.join(cwd, 'src', 'current.atto');
  const lines = [
    'src/current.atto:3:5: warning: current document',
    'src/../src/current.atto:5:4: error: normalized current document',
    'src/other.atto:7:2: error: foreign sibling',
    '../unrelated.atto:9:2: error: foreign parent'
  ];
  const diagnostics = parseCompilerOutputRecords(lines.join('\r\n'));
  assert.equal(diagnostics.length, 4);
  const matching = diagnostics.filter(item =>
    matchesCompilerDiagnosticPath(item.path, activePath, cwd));
  assert.deepEqual(matching.map(x => x.message),
    ['current document', 'normalized current document']);
  assert.deepEqual(matching.map(x => x.severity), ['warning', 'error']);
  assert.ok(!matchesCompilerDiagnosticPath(null, activePath, 'relative/cwd'));
  assert.ok(!matchesCompilerDiagnosticPath('src/current.atto', 'relative.atto', cwd));
  assert.ok(!matchesCompilerDiagnosticPath('src/current.atto\u0000other', activePath, cwd));
});
