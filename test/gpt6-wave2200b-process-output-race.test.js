// Exercise deterministic no-shell child event races using a real EventEmitter.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {launchCompiler} = require('../lib/compiler-process');

function fakeProcess(){
  const child=new EventEmitter();
  child.stdout=new EventEmitter();
  child.stderr=new EventEmitter();
  child.signals=[];
  child.kill=signal=>{child.signals.push(signal);return true;};
  return child;
}

test('combined UTF-8 byte budget terminates and settles once under late events',()=>{
  const child=fakeProcess();
  const invocation=[];
  const cp={spawn:(command,args,options)=>{invocation.push({command,args,options});return child;}};
  const settlements=[];
  launchCompiler(cp,'atto',['check','file.ores'],
    {cwd:'/tmp',timeout:5000,maxBuffer:5},
    (...result)=>settlements.push(result));
  assert.equal(invocation.length,1);
  assert.equal(invocation[0].options.shell,false);
  assert.deepEqual(invocation[0].options.stdio,['ignore','pipe','pipe']);
  child.stdout.emit('data',Buffer.from('A🙂')); // five UTF-8 bytes
  child.stderr.emit('data',Buffer.from('x'));   // six total, over budget
  child.emit('error',new Error('late spawn failure'));
  child.emit('close',1,'SIGKILL');
  child.stderr.emit('data',Buffer.from('ignored'));
  assert.equal(settlements.length,1);
  assert.match(settlements[0][0].message,/bounded output budget/);
  assert.equal(settlements[0][1],'A🙂');
  assert.equal(settlements[0][2],'');
  assert.ok(child.signals.includes('SIGKILL'));
});

test('exact shared budget accepts both pipes and ignores later close',()=>{
  const child=fakeProcess();
  const values=[];
  launchCompiler({spawn:()=>child},'atto',['check'],
    {cwd:'/tmp',timeout:5000,maxBuffer:5},
    (...value)=>values.push(value));
  child.stdout.emit('data',Buffer.from('ab'));
  child.stderr.emit('data',Buffer.from('cde'));
  child.emit('close',0,null);
  child.emit('close',2,null);
  child.emit('error',new Error('late failure'));
  assert.equal(values.length,1);
  assert.equal(values[0][0],null);
  assert.equal(values[0][1],'ab');
  assert.equal(values[0][2],'cde');
  assert.deepEqual(child.signals,[]);
});
