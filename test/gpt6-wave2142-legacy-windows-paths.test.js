'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('legacy diagnostics retain Windows drive colons and severity while dropping hostile neighbors', () => {
  const output = [
    'C:\\workspace\\src\\hello.atto:7:9: warning[W42]:  first warning  ',
    'Oreslang parse error at 3:4:  unlocated error',
    'D:\\checkout\\src\\other.atto:2:1: info: second file',
    'C:\\workspace\\src\\bad.atto:1:10000000: error: end exceeds cap',
    'C:\\workspace\\src\\bad.atto:10000001:1: error: row exceeds cap',
    'C:\\workspace\\src\\bad' + '\0' + '.atto:4:2: error: NUL source',
  ].join('\r\n');
  assert.deepEqual(parseCompilerOutputRecords(output).map(d=>[d.path,d.line,d.column,d.endColumn,d.severity,d.message]), [
    ['C:\\workspace\\src\\hello.atto',7,9,10,'warning','first warning'],
    [null,3,4,5,'error','unlocated error'],
    ['D:\\checkout\\src\\other.atto',2,1,2,'info','second file'],
  ]);
});

test('legacy parser rejects numeric impostors without dropping valid peers', () => {
  const output = 'file.atto:5:6: error: valid\nfile.atto:1:0000000001: error: overlong column\nfile.atto:000000001:1: invalid line';
  const expected = [{path:'file.atto',line:5,column:6,endLine:5,endColumn:7,severity:'error',message:'valid'}];
  for (let i=0;i<7;i++) assert.deepEqual(parseCompilerOutputRecords(output),expected);
});
