'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {launchCompiler} = require('../lib/compiler-process');
const {parseCompilerOutputRecords} = require('../lib/compiler-output');

function fakeProcess() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => { child.killed = (child.killed || 0) + 1; return true; };
  return child;
}

test('versioned compiler stdout reaches parser without stderr path spoof or duplicate callbacks', () => {
  const child = fakeProcess();
  const payload = JSON.stringify({version: 1, diagnostics: [
    {path:'src/current.atto', severity:'warning', message:'  real 🚀  ',
      range:{start:{line:3,column:2},end:{line:3,column:5}}},
    {path:'src/current.atto\0spoof',message:'untrusted peer'}
  ]});
  const calls=[];
  const stub={spawn: (cmd, args, opts) => {
    assert.equal(cmd, 'atto');
    assert.deepEqual(args, ['check', 'src/current.atto']);
    assert.equal(opts.shell, false);
    assert.equal(opts.cwd, '/tmp');
    return child;
  }};
  assert.equal(launchCompiler(stub,'atto',['check','src/current.atto'],
    {cwd:'/tmp',timeout:5000,maxBuffer:4096},
    (...params)=>calls.push(params)), child);
  child.stdout.emit('data',Buffer.from(payload,'utf8'));
  child.stderr.emit('data',Buffer.from('src/other.atto:1:1: error: foreign'));
  child.emit('close',0,null);
  child.emit('close',1,'SIGKILL');
  child.emit('error',new Error('late'));
  assert.equal(calls.length,1);
  assert.equal(calls[0][0],null);
  assert.equal(calls[0][1],payload);
  assert.deepEqual(parseCompilerOutputRecords(calls[0][1]), [{
    path:'src/current.atto',line:3,column:2,endLine:3,endColumn:5,
    severity:'warning',message:'real 🚀'
  }]);
  assert.match(calls[0][2],/other.atto/);
});

test('two pipes share exact byte limit and reject a one-byte overflow once', () => {
  const child=fakeProcess(), calls=[];
  launchCompiler({spawn:()=>child},'atto',['check'],
    {cwd:'/tmp',timeout:5000,maxBuffer:5},
    (...values)=>calls.push(values));
  child.stdout.emit('data',Buffer.from('abc'));
  child.stderr.emit('data',Buffer.from('de'));
  child.stdout.emit('data',Buffer.from('f'));
  child.emit('close',0,null);
  child.stderr.emit('data',Buffer.from('late'));
  assert.equal(child.killed,1);
  assert.equal(calls.length,1);
  assert.match(calls[0][0].message,/bounded output budget/);
  assert.equal(calls[0][1], 'abc');
  assert.equal(calls[0][2], 'de');
});
