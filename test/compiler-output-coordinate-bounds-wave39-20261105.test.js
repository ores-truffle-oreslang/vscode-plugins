'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

function parse(diagnostics) {
  return parseCompilerOutputRecords(JSON.stringify({version: 1, diagnostics}));
}

test('compiler JSON accepts bounded positive coordinates and normalizes severity', () => {
  const received = parse([{
    path: 'src/main.ores',
    message: '  real issue  ',
    severity: 'WARNING',
    range: {start: {line: 9999999, column: 9999999},
      end: {line: 9999999, column: 10000000}}
  }]);
  assert.deepEqual(received, [{
    path: 'src/main.ores', line: 9999999, column: 9999999,
    endLine: 9999999, endColumn: 10000000,
    severity: 'warning', message: 'real issue'
  }]);
});

test('machine records reject out-of-policy start and end ranges independently', () => {
  const cases = [
    {line: 0, column: 1},
    {line: 10000001, column: 1},
    {line: 1.5, column: 1},
    {line: 1, column: 10000001},
    {line: '1', column: 1},
  ];
  const diagnostics = cases.map((start, i) => ({
    message: 'invalid-' + i, range: {start}
  }));
  diagnostics.push({
    message: 'invalid-end', range: {
      start: {line: 2, column: 2}, end: {line: 2, column: 10000001}
    }
  }, {
    message: 'valid', range: {
      start: {line: 2, column: 2}, end: {line: 3, column: 1}
    }
  });
  assert.deepEqual(parse(diagnostics).map(x => x.message), ['valid']);
});

test('unsupported protocol versions cannot be reinterpreted as plain-text errors', () => {
  for (const version of [0, 2, '1', null]) {
    assert.deepEqual(
      parseCompilerOutputRecords(JSON.stringify({version, diagnostics: [
        {message: 'should not be admitted'}
      ]})), [],
    );
  }
});
