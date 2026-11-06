const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

// Host parser evidence; this does not compile AttoLang source.
test('versioned machine diagnostics isolate rejected ranges and paths from valid peers', () => {
  const max = 10000000;
  const valid = [
    {path: 'src/🍀.atto', message: 'boundary', severity: 'hint',
      range: {start: {line: 1, column: max - 1}, end: {line: 1, column: max}}},
    {path: 'src/next.atto', message: 'multiline', severity: 'warning',
      range: {start: {line: 4, column: 8}, end: {line: 5}}},
    {path: 'src/default.atto', line: 7, column: 3, message: 'implicit range'},
  ];
  const bad = [
    {path: 'bad.atto', message: 'beyond end', line: 1, column: max},
    {path: 'bad.atto', message: 'negative end',
      range: {start: {line: 2, column: 3}, end: {line: 2, column: -1}}},
    {path: 'bad.atto', message: 'backward end',
      range: {start: {line: 2, column: 3}, end: {line: 1, column: 9}}},
    {path: 'bad.atto', message: 'float', line: 1.5, column: 1},
    {path: 'bad.atto', message: 'array', range: []},
    {path: 'bad\0path.atto', message: 'tainted origin', line: 1, column: 1},
    {path: [], message: 'typed origin', line: 1, column: 1},
  ];
  const diagnostics = parseCompilerOutputRecords(JSON.stringify({
    version: 1, diagnostics: [bad[0], valid[0], bad[1], valid[1], ...bad.slice(2), valid[2]],
  }));
  assert.deepEqual(diagnostics.map(d => d.message), ['boundary', 'multiline', 'implicit range']);
  assert.deepEqual(diagnostics.map(d => [d.path, d.line, d.column, d.endLine, d.endColumn]), [
    ['src/🍀.atto', 1, max - 1, 1, max],
    ['src/next.atto', 4, 8, 5, 1],
    ['src/default.atto', 7, 3, 7, 4],
  ]);
  assert.deepEqual(diagnostics.map(d => d.severity), ['hint', 'warning', 'error']);
});
