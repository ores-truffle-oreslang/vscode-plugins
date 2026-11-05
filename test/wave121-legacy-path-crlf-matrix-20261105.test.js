'use strict';
// Legacy compiler records: CRLF, Windows drive colons and malformed peers.
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

test('CRLF legacy diagnostics preserve per-line source identity and coordinates', () => {
  const output = [
    'C:\\src\\app.ores:3:4: warning:  build warning  ',
    'src/bad.ores:0:2: error: invalid',
    '/opt/atto/src/healthy.ores:7:9: info:  checked',
    'Oreslang error at 11:12: fallback assertion',
    'src/overflow.ores:99999999:3: error: dropped',
  ].join('\r\n');
  assert.deepEqual(parseCompilerOutputRecords(output), [
    {path:'C:\\src\\app.ores',line:3,column:4,endLine:3,endColumn:5,severity:'warning',message:'build warning'},
    {path:'/opt/atto/src/healthy.ores',line:7,column:9,endLine:7,endColumn:10,severity:'info',message:'checked'},
    {path:null,line:11,column:12,endLine:11,endColumn:13,severity:'error',message:'fallback assertion'},
  ]);
});

test('plain text lines without positions never become source diagnostics', () => {
  assert.deepEqual(parseCompilerOutputRecords([
    'src/app.ores: error: no position',
    'not a diagnostic',
    'src/app.ores:6:0: error: invalid column',
  ].join('\n')), []);
});
