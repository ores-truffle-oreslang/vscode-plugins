'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {launchCompiler}=require('../lib/compiler-process');

function fake(){
  const child=new EventEmitter();
  child.stdout=new EventEmitter();
  child.stderr=new EventEmitter();
  let kills=0;
  child.kill=()=>{kills++;return true};
  return {child,killed:()=>kills};
}
function runScenario(bytes){
  const {child,killed}=fake();
  const events=[];
  const runner={spawn(cmd,args,opts){
    assert.equal(cmd,'atto');
    assert.deepEqual(args,['check','two words;$(not-executed).atto']);
    assert.equal(opts.shell,false);
    assert.deepEqual(opts.stdio,['ignore','pipe','pipe']);
    return child;
  }};
  launchCompiler(runner,'atto',['check','two words;$(not-executed).atto'],{
    cwd:process.cwd(),maxBuffer:bytes,timeout:20000,
  },(error,stdout,stderr)=>events.push({error,stdout,stderr}));
  child.stdout.emit('data',Buffer.from('a💠','utf8'));
  child.stderr.emit('data',Buffer.from('β','utf8'));
  return {child,events,killed};
}
test('UTF-8 bytes across both pipes, not UTF-16 character count, determine ceiling',()=>{
  const valid=runScenario(7); // a=1, astral=4, beta=2
  valid.child.emit('close',0,null);
  assert.equal(valid.events.length,1);
  assert.equal(valid.events[0].error,null);
  assert.equal(valid.events[0].stdout,'a💠');
  assert.equal(valid.events[0].stderr,'β');
  assert.equal(valid.killed(),0);
  const denied=runScenario(6);
  assert.equal(denied.events.length,1);
  assert.match(denied.events[0].error.message,/bounded output budget/);
  assert.equal(denied.killed(),1);
  denied.child.stdout.emit('data',Buffer.from('late'));
  denied.child.emit('error',new Error('late'));
  denied.child.emit('close',1,'SIGKILL');
  assert.equal(denied.events.length,1);
});
test('spontaneous process error settles once without swallowing or duplicating output',()=>{
  const obj=fake(), received=[];
  launchCompiler({spawn:()=>obj.child},'atto',[],{
    cwd:process.cwd(),timeout:20000,maxBuffer:64
  },(err,out,other)=>received.push({err,out,other}));
  obj.child.stdout.emit('data',Buffer.from('prefix'));
  obj.child.emit('error',new Error('ENOENT sentinel'));
  obj.child.emit('close',127,null);
  obj.child.stderr.emit('data',Buffer.from('late'));
  assert.equal(received.length,1);
  assert.match(received[0].err.message,/ENOENT sentinel/);
  assert.equal(received[0].out,'prefix');
  assert.equal(received[0].other,'');
});
