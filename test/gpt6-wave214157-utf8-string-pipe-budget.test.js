'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {launchCompiler}=require('../lib/compiler-process');

// A fake child emits *text* data as if setEncoding('utf8') were enabled.
// Native spawn usually emits Buffer, but the byte quota must hold for both.
function setup(maxBuffer){
  const child=new EventEmitter();
  child.stdout=new EventEmitter();
  child.stderr=new EventEmitter();
  let kills=0;
  child.kill=()=>{kills++;return true};
  const callbacks=[];
  const spawnCalls=[];
  const provider={spawn:(command,args,options)=>{
    spawnCalls.push({command,args,options});
    return child;
  }};
  const result=launchCompiler(provider,'atto',['check','literal 💠.atto'],
    {cwd:'/tmp',timeout:1000,maxBuffer},
    (error,stdout,stderr)=>callbacks.push({error,stdout,stderr}));
  assert.equal(result,child);
  assert.equal(spawnCalls.length,1);
  assert.equal(spawnCalls[0].options.shell,false);
  assert.deepEqual(spawnCalls[0].args,['check','literal 💠.atto']);
  return {child,callbacks,get kills(){return kills}};
}
test('combined stdout/stderr budget counts UTF-8 bytes, not text code units',()=>{
  const ok=setup(4);
  ok.child.stdout.emit('data','é'); // 2 bytes
  ok.child.stderr.emit('data','é'); // 2 bytes
  ok.child.emit('close',0,null);
  assert.equal(ok.callbacks.length,1);
  assert.equal(ok.callbacks[0].error,null);
  assert.deepEqual([ok.callbacks[0].stdout,ok.callbacks[0].stderr],['é','é']);
  assert.equal(ok.kills,0);

  const over=setup(3);
  over.child.stdout.emit('data','é'); // 2 bytes
  over.child.stderr.emit('data','é'); // would exceed 3 bytes
  assert.equal(over.kills,1);
  assert.equal(over.callbacks.length,1);
  assert.match(over.callbacks[0].error.message,/bounded output budget/);
  assert.deepEqual([over.callbacks[0].stdout,over.callbacks[0].stderr],['é','']);
  over.child.stderr.emit('data','late event');
  over.child.emit('close',1,'SIGKILL');
  over.child.emit('error',new Error('late failure'));
  assert.equal(over.callbacks.length,1);
});
test('one astral Unicode scalar consumes four bytes before close',()=>{
  const over=setup(3);
  over.child.stdout.emit('data','💠');
  assert.equal(over.kills,1);
  assert.equal(over.callbacks.length,1);
  assert.match(over.callbacks[0].error.message,/bounded output budget/);
  assert.equal(over.callbacks[0].stdout,'');
});
