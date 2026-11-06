'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');
const {matchesCompilerDiagnosticPath} = require('../lib/diagnostic-path');

test('legacy mixed stderr keeps origin and severity but never crosses active files', () => {
  const cwd = path.resolve(process.cwd(), 'wave652911-legacy');
  const active = path.join(cwd, 'src', '🍀.atto');
  const other = path.join(cwd, 'src', 'other.atto');
  const output = [
    'src/../src/🍀.atto:7:9: warning[W-17]:  the: actual: problem  ',
    'src/other.atto:8:2: info: imported file diagnostic',
    'src/🍀.atto.bak:9:1: error: suffix collision',
    'src/🍀.atto:0:4: error: invalid line',
    'Oreslang parse error at 3:4: unlocated parse error',
  ].join('\r\n');
  for (let attempt = 0; attempt < 8; attempt++) {
    const parsed = parseCompilerOutputRecords(output);
    assert.deepEqual(parsed.map(d => d.message), [
      'the: actual: problem', 'imported file diagnostic',
      'suffix collision', 'unlocated parse error'
    ]);
    const current = parsed.filter(d => matchesCompilerDiagnosticPath(d.path, active, cwd));
    assert.deepEqual(current.map(d => [d.line, d.column, d.severity, d.message]), [
      [7, 9, 'warning', 'the: actual: problem'],
      [3, 4, 'error', 'unlocated parse error'],
    ]);
    const imported = parsed.filter(d => matchesCompilerDiagnosticPath(d.path, other, cwd));
    assert.deepEqual(imported.map(d => d.message),
      ['imported file diagnostic', 'unlocated parse error']);
    assert.equal(matchesCompilerDiagnosticPath('src/🍀.atto.bak', active, cwd), false);
  }
});
