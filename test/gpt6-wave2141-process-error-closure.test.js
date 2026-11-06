'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {launchCompiler}=require('../lib/compiler-process');

function makeChild() {
  const child=new EventEmitter();
  child.stdout=new EventEmitter();
  child.stderr=new EventEmitter();
  child.pid=0; // no OS process group to signal in this synthetic test
  child.kills=0;
  child.kill=()=>{child.kills++;return true;};
  return child;
}

test('no-shell launch enforces aggregate UTF-8 byte budget and settles callback once',()=>{
  const child=makeChild();
  const captures=[];
  const fakeSpawn={
    spawn(command,args,options){
      captures.push({command,args,options});
      return child;
    }
  };
  const callbacks=[];
  const args=Object.freeze(['check','--format=json','literal;echo-not-a-shell']);
  const result=launchCompiler(fakeSpawn,'compiler',args,{cwd:'/tmp',timeout:3000,maxBuffer:4},
    (err,out,errOut)=>callbacks.push({err,out,errOut}));
  assert.equal(result,child);
  assert.equal(captures.length,1);
  assert.equal(captures[0].options.shell,false);
  assert.deepEqual(captures[0].options.stdio,['ignore','pipe','pipe']);
  assert.deepEqual(captures[0].args,args);
  child.stdout.emit('data',Buffer.from('AA'));
  child.stderr.emit('data',Buffer.from('✓')); // 3 additional UTF-8 bytes > total 4
  assert.equal(child.kills,1);
  assert.equal(callbacks.length,1);
  assert.match(callbacks[0].err.message,/bounded output budget/);
  assert.equal(callbacks[0].out,'AA');
  assert.equal(callbacks[0].errOut,'');
  child.stdout.emit('data',Buffer.from('late'));
  child.emit('close',0,null);
  child.emit('error',new Error('late failure'));
  assert.equal(callbacks.length,1,'late process events must not publish diagnostics');
});

test('early spawn error settles once despite a subsequent close, preserving prefix',()=>{
  const child=makeChild();
  const callbacks=[];
  launchCompiler({spawn:()=>child},'compiler',[],{cwd:'/tmp',timeout:3000,maxBuffer:64},
    (err,out,errOut)=>callbacks.push({err,out,errOut}));
  child.stderr.emit('data',Buffer.from('warning: ready'));
  child.emit('error',new Error('ENOENT'));
  child.emit('close',127,null);
  child.stderr.emit('data',Buffer.from('late'));
  assert.equal(callbacks.length,1);
  assert.match(callbacks[0].err.message,/ENOENT/);
  assert.equal(callbacks[0].errOut,'warning: ready');
});
