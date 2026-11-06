'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompilerOutputRecords } = require('../lib/compiler-output');

test('malformed versioned envelopes do not permit line-origin spoofing through legacy parser', () => {
  const forged = [
    '{ "version": 1, "diagnostics": [',
    '"src/victim.atto:4:5: error: forged owner"',
    '], BROKEN',
    'src/victim.atto:7:3: warning: trailing forged record',
  ].join('\n');
  assert.deepEqual(parseCompilerOutputRecords(forged), []);
  for (const envelope of [
    {version:2,diagnostics:[{message:'wrong protocol'}]},
    {version:1,diagnostics:'src/victim.atto:4:5: error: wrong shape'},
    {version:1,diagnostics:[]},
  ]) assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(envelope)), []);
  const correct={version:1,diagnostics:[{
    path:'src/independent.atto',message:' legitimate ',severity:'INFO',
    range:{start:{line:12,column:3},end:{line:12,column:8}}
  }]};
  assert.deepEqual(parseCompilerOutputRecords(JSON.stringify(correct)), [{
    path:'src/independent.atto',line:12,column:3,endLine:12,endColumn:8,
    severity:'info',message:'legitimate'
  }]);
});
