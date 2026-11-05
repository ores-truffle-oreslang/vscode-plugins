'use strict';
// Host legacy CLI diagnostic parser: bound source locations across CRLF gaps.
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseCompilerOutputRecords}=require('../lib/compiler-output');

test('malformed coordinate rows never suppress adjacent valid legacy records',()=>{
  const lines=[
    'C:\\work\\entry.atto:2:3: warning:  warning retained  ',
    'C:\\work\\bad.atto:0:4: error: invalid line',
    '/work/src/core.atto:10000000:9999999: info: boundary retained',
    '/work/src/bad.atto:2:10000000: error: end overflow',
    'Oreslang error at 8:9: canonical compiler failure',
    'not a compiler diagnostic',
  ];
  assert.deepEqual(parseCompilerOutputRecords(lines.join('\r\n')),[
    {path:'C:\\work\\entry.atto',line:2,column:3,endLine:2,endColumn:4,
      severity:'warning',message:'warning retained'},
    {path:'/work/src/core.atto',line:10000000,column:9999999,
      endLine:10000000,endColumn:10000000,severity:'info',
      message:'boundary retained'},
    {path:null,line:8,column:9,endLine:8,endColumn:10,severity:'error',
      message:'canonical compiler failure'},
  ]);
});

test('unpositioned compiler output and all-invalid lines yield no diagnostics',()=>{
  const rows=['untrusted stdout','file.atto:0:1: error: zero line',
    'file.atto:1:0: error: zero column','file.atto:1:10000000: error: end overflow'];
  assert.deepEqual(parseCompilerOutputRecords(rows.join('\n')),[]);
});
