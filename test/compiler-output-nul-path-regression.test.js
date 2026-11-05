'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('machine diagnostics reject actual embedded NUL paths before editor ownership checks', () => {
  const payload = {
    version: 1,
    diagnostics: [
      { path: '/tmp/guest\0injected.ores', message: 'NUL path must be dropped' },
      { path: 'C:\\source\\0\\main.ores', message: 'literal digit-zero folder is allowed' },
      { path: 'src/main.ores', message: 'legitimate diagnostic' }
    ]
  };
  const parsed = parseCompilerOutputRecords(JSON.stringify(payload));
  assert.deepEqual(parsed.map(x => x.message), [
    'literal digit-zero folder is allowed', 'legitimate diagnostic'
  ]);
  assert.equal(parsed[0].path, 'C:\\source\\0\\main.ores');
  assert.equal(parsed[1].path, 'src/main.ores');
});
