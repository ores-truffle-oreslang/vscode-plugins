'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const childProcess=require('node:child_process');
const {launchCompiler}=require('../lib/compiler-process');

// Executes real Node children as host controls; does not invoke an AttoLang compiler.
const launch=(script,args,maxBuffer)=>new Promise(resolve=>{
  launchCompiler(childProcess,process.execPath,['-e',script,...args],{
    cwd:process.cwd(),timeout:10000,maxBuffer
  },(error,stdout,stderr)=>resolve({error,stdout,stderr}));
});

test('literal shell metacharacters reach an actual child as one inert argv element',async()=>{
  const adversarial='name;$(echo surprise)&| > file \u0000';
  // NUL is rejected by the OS spawn API, so use an otherwise hostile literal argument.
  const arg=adversarial.slice(0,-1);
  const script="process.stdout.write(JSON.stringify(process.argv.slice(1)));process.stderr.write('💠')";
  const observed=await launch(script,[arg],4096);
  assert.equal(observed.error,null);
  assert.deepEqual(JSON.parse(observed.stdout),[arg]);
  assert.equal(observed.stderr,'💠');
});

test('aggregate real stdout/stderr bytes admit the boundary and deny one-byte-over',async()=>{
  const script="process.stdout.write('A'.repeat(47));process.stderr.write('💠')";
  const atLimit=await launch(script,[],51);
  assert.equal(atLimit.error,null);
  assert.equal(atLimit.stdout,'A'.repeat(47));
  assert.equal(atLimit.stderr,'💠');
  const over=await launch(script,[],50);
  assert.ok(over.error);
  assert.match(over.error.message,/bounded output budget/);
});
