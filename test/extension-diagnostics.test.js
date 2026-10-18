'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const filename = path.resolve(__dirname, '../extension.js');
const realRequire = createRequire(filename);
const vscode = {
  Position: class Position { constructor(line, character) { Object.assign(this,{line,character}); } },
  Range: class Range { constructor(start,end) { Object.assign(this,{start,end}); } },
  Diagnostic: class Diagnostic { constructor(range,message,severity) { Object.assign(this,{range,message,severity}); } },
  DiagnosticSeverity: {Error:0, Warning:1, Information:2, Hint:3},
};
const context = {require:id => id === 'vscode' ? vscode : realRequire(id),module:{exports:{}}};
vm.runInNewContext(fs.readFileSync(filename,'utf8'),context,{filename});
const payload = record => JSON.stringify({version:1,diagnostics:[record]});

test('a multiline diagnostic retains its short ending column', () => {
  const [diagnostic] = context.parseCompilerOutput(null,payload({message:'multiline',
    range:{start:{line:2,column:50},end:{line:4,column:2}}}));
  assert.equal(diagnostic.range.start.line,1);
  assert.equal(diagnostic.range.start.character,49);
  assert.equal(diagnostic.range.end.line,3);
  assert.equal(diagnostic.range.end.character,1);
});
test('compiler info is Information instead of Error', () => {
  const [diagnostic] = context.parseCompilerOutput(null,payload({message:'informational',severity:'info'}));
  assert.equal(diagnostic.severity,vscode.DiagnosticSeverity.Information);
});
test('machine diagnostics require an integer protocol version', () => {
  const {parseCompilerOutputRecords} = realRequire('./lib/compiler-output');
  for (const version of [true,'1',[1]]) {
    assert.deepEqual(parseCompilerOutputRecords(JSON.stringify({version,diagnostics:[{message:'bad version',line:2}]})),[]);
  }
});

test('CLI imported-file diagnostics do not masquerade as active-file errors', () => {
  const cwd = path.resolve(__dirname, 'fixtures');
  const document = {uri: {fsPath: path.join(cwd, 'current.ores')}};
  const issue = p => ({path:p, message:'wrong source', severity:'error',
    range:{start:{line:3,column:2},end:{line:3,column:4}}});
  assert.equal(context.parseCompilerOutput(document,payload(issue('other.ores')),cwd).length,0);
  assert.equal(context.parseCompilerOutput(document,payload(issue('current.ores')),cwd).length,1);
  assert.equal(context.parseCompilerOutput(document,payload(issue(document.uri.fsPath)),cwd).length,1);
});
