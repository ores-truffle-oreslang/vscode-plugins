'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

// A path-qualified foreign error must not be laundered as a local,
// unlocated "Oreslang ... error at ..." suffix.
test('qualified compiler-message suffix retains foreign source path and first position', () => {
  const output = [
    'src/external.atto:8:4: Oreslang parse error at 99:2: reported from imported file',
    'Oreslang lexer error at 3:7: actual unlocated active issue',
    'C:\\deps\\foreign.atto:12:5: Oreslang parse error at 21:9: dependency failure',
    'build wrapper: Oreslang parse error at 30:2: must not become local issue',
    'src/local.atto:4:6: warning: plain local diagnostic',
  ].join('\r\n');
  assert.deepEqual(parseCompilerOutputRecords(output), [
    {path:'src/external.atto',line:8,column:4,endLine:8,endColumn:5,
      severity:'error',message:'Oreslang parse error at 99:2: reported from imported file'},
    {path:null,line:3,column:7,endLine:3,endColumn:8,
      severity:'error',message:'actual unlocated active issue'},
    {path:'C:\\deps\\foreign.atto',line:12,column:5,endLine:12,endColumn:6,
      severity:'error',message:'Oreslang parse error at 21:9: dependency failure'},
    {path:'src/local.atto',line:4,column:6,endLine:4,endColumn:7,
      severity:'warning',message:'plain local diagnostic'},
  ]);
});

test('out-of-range path-qualified peers do not masquerade as valid unlocated errors', () => {
  const output = [
    'src/bad.atto:0:9: Oreslang parse error at 2:2: reject foreign envelope',
    'vendor.atto:10000001:3: Oreslang parse error at 5:5: reject external coordinate',
    'Oreslang parse error at 6:3: valid bare issue',
  ].join('\n');
  assert.deepEqual(parseCompilerOutputRecords(output), [
    {path:null,line:6,column:3,endLine:6,endColumn:4,severity:'error',
      message:'valid bare issue'},
  ]);
});
