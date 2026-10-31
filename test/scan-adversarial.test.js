'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('valid quoted and unquoted hash Symbols remain atomic', () => {
  const source = String.raw`#ready #'with spaces' #"quoted value"`;
  const result = scanOreslang(source);
  assert.deepEqual(result.tokens.map(t => [t.kind,t.value]), [
    ['symbol','#ready'], ['symbol', "#'with spaces'"], ['symbol','#\"quoted value\"']
  ]);
  assert.deepEqual(result.diagnostics, []);
});

test('unclosed or malformed Symbol forms fail rather than emitting valid Symbol tokens', () => {
  for (const source of ['#', '# ready', '#123', '#"unterminated throw', "#'unfinished return"]) {
    const result=scanOreslang(source);
    assert.ok(result.diagnostics.some(d=>/Symbol/.test(d.message)), source);
    assert.ok(result.tokens.every(t=>t.kind!=='symbol'), source);
    assert.ok(result.tokens.every(t=>!['throw','return'].includes(t.value)), source);
  }
});

test('NUL and malformed UTF-16 are rejected even inside opaque comments and strings', () => {
  const bad=['/* comment \0 returns */', '"string \uD800"', 'const value = "\uDC00";'];
  for(const source of bad) {
    const result=scanOreslang(source);
    assert.deepEqual(result.tokens, [],'untrusted malformed source must not be colored');
    assert.equal(result.diagnostics.length,1);
    assert.match(result.diagnostics[0].message,/NUL|UTF-16/);
  }
  const good=scanOreslang('const emoji = "\uD83D\uDE00"; return');
  assert.deepEqual(good.tokens.map(t=>t.value),['const','return']);
  assert.deepEqual(good.diagnostics,[]);
});

test('nested comments and delimiters reject over-budget depth without allocating unbounded stacks', () => {
  const max = 4096;
  const commented = '/*'.repeat(max+1)+'*/'.repeat(max+1)+'return';
  const a=scanOreslang(commented);
  assert.deepEqual(a.tokens,[]);
  assert.equal(a.diagnostics.length,1);
  assert.match(a.diagnostics[0].message,/nesting limit/);
  const brackets='('.repeat(max+1)+')'.repeat(max+1)+'return';
  const b=scanOreslang(brackets);
  assert.deepEqual(b.tokens,[]);
  assert.equal(b.diagnostics.length,1);
  assert.match(b.diagnostics[0].message,/nesting limit/);
});

test('bounded nested comments do not leak keyword-looking strings', () => {
  const depth=384;
  const source='/*'.repeat(depth)+'return panic recover #ready'+ '*/'.repeat(depth)+' return';
  const r=scanOreslang(source);
  assert.deepEqual(r.tokens.map(t=>t.value),['return']);
  assert.deepEqual(r.diagnostics,[]);
});
