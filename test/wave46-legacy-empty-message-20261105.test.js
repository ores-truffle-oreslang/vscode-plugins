'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

// Legacy compiler stderr is untrusted, even without a machine JSON envelope.
test('legacy diagnostics with whitespace-only messages are not published to the editor', () => {
  const lines = [
    'src/a.ores:2:4: error:   ',
    'Oreslang parse error at 3:5:    ',
    'src/a.ores:4:7: warning:  real issue  ',
  ];
  assert.deepEqual(parseCompilerOutputRecords(lines.join('\n')), [{
    path: 'src/a.ores', line: 4, column: 7,
    endLine: 4, endColumn: 8, severity: 'warning', message: 'real issue',
  }]);
});
