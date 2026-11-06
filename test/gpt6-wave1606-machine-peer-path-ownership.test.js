'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');
const { matchesCompilerDiagnosticPath } = require('../lib/diagnostic-path');

test('malformed machine records cannot suppress a valid same-document peer', () => {
  const cwd = path.resolve(process.cwd(), 'wave1606-diagnostics');
  const active = path.join(cwd, 'current.atto');
  const payload = { version: 1, diagnostics: [
    { path: 'current.atto', severity: 'warning', message: 'legitimate issue',
      range: { start: { line: 3, column: 4 }, end: { line: 3, column: 8 } } },
    { path: 'current.atto', message: 'malformed range', range: ['bad'] },
    { path: 'current.atto\u0000other', message: 'NUL origin', line: 1, column: 1 },
    { path: 'other.atto', message: 'foreign peer', line: 8, column: 1 },
    { path: 'current.atto', message: 'invalid fraction', line: 1.25, column: 1 },
    { path: 'current.atto', message: 'invalid reversed range',
      range: { start: { line: 4, column: 8 }, end: { line: 4, column: 7 } } }
  ] };
  const parsed = parseCompilerOutputRecords(JSON.stringify(payload));
  assert.deepEqual(parsed.map(d => d.message), ['legitimate issue', 'foreign peer']);
  const ours = parsed.filter(d => matchesCompilerDiagnosticPath(d.path, active, cwd));
  assert.equal(ours.length, 1);
  assert.equal(ours[0].message, 'legitimate issue');
  assert.deepEqual([ours[0].line, ours[0].column, ours[0].endColumn], [3, 4, 8]);
  assert.equal(matchesCompilerDiagnosticPath(null, active, cwd), true);
  assert.equal(matchesCompilerDiagnosticPath(null, 'relative.atto', cwd), false);
  assert.equal(matchesCompilerDiagnosticPath('current.atto', active, 'relative'), false);
});
