'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

// Source-owned host diagnostic parser, not AttoLang compiler guest execution.
test('legacy coded error, warning, info and hint preserve severity and literal origin', () => {
  const lines = [
    'src/main.atto:4:5: warning[W-004]:  inspect this code  ',
    'C:\\source\\🍓 app.atto:8:2: error[E12]: undefined binding',
    './src/lib.atto:6:9: info[I_AB]: contextual note',
    '/tmp/hint.ores:1:1: hint[H-8]: safe suggestion',
    '/tmp/bad.ores:0:1: error[E00]: reject zero line',
    '/tmp/bad.ores:2:10000000: error[E99]: reject out-of-bound end',
    'unstructured compiler banner',
  ];
  const parsed = parseCompilerOutputRecords(lines.join('\r\n'));
  assert.deepEqual(parsed.map(d => d.path), [
    'src/main.atto', 'C:\\source\\🍓 app.atto', './src/lib.atto', '/tmp/hint.ores',
  ]);
  assert.deepEqual(parsed.map(d => d.message), [
    'inspect this code', 'undefined binding', 'contextual note', 'safe suggestion',
  ]);
  assert.deepEqual(parsed.map(d => d.severity), ['warning', 'error', 'info', 'hint']);
  assert.deepEqual(parsed.map(d => [d.line, d.column, d.endLine, d.endColumn]), [
    [4, 5, 4, 6], [8, 2, 8, 3], [6, 9, 6, 10], [1, 1, 1, 2],
  ]);
  assert.deepEqual(parseCompilerOutputRecords(lines.join('\r\n')), parsed);
});
