'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { scanOreslang } = require('../lib/scan');

test('classifies language keywords and runtime globals separately', () => {
  const source = 'pub fnc run() => void { defer || -> { return; }; recover; }';
  const result = scanOreslang(source);
  const keywords = result.tokens.filter(t => t.kind === 'keyword').map(t => t.value);
  const globals = result.tokens.filter(t => t.kind === 'runtimeGlobal').map(t => t.value);

  assert.deepEqual(keywords, ['pub', 'fnc', 'void', 'return']);
  assert.deepEqual(globals, ['defer', 'recover']);
});

test('does not highlight words inside comments or strings', () => {
  const source = '// pub recover\nconst s = "fnc throw"; /* class defer */ return;';
  const result = scanOreslang(source);
  const values = result.tokens.map(t => t.value);

  assert.deepEqual(values, ['const', 'return']);
});

test('supports nested block comments like the Oreslang lexer', () => {
  const source = '/* outer /* inner */ still outer */ pub fnc ok() {}';
  const result = scanOreslang(source);
  assert.equal(result.diagnostics.length, 0);
  assert.deepEqual(result.tokens.map(t => t.value), ['pub', 'fnc']);
});

test('keeps is, eq, and neq available as identifiers', () => {
  const source = 'let is = foo; let eq = bar; let neq = baz; if (is is foo) { return; }';
  const result = scanOreslang(source);

  assert.deepEqual(result.tokens.map(t => t.value), ['let', 'let', 'let', 'if', 'return']);
});

test('tracks active actor, channel, callable, and structural keywords', () => {
  const source = 'generator pure trap nlex structural actor isoactor nb select readch writech loop block break continue';
  const result = scanOreslang(source);

  assert.deepEqual(result.tokens.map(t => t.value), [
    'generator', 'pure', 'trap', 'nlex', 'structural', 'actor', 'isoactor',
    'nb', 'select', 'readch', 'writech', 'loop', 'block', 'break', 'continue'
  ]);
});

test('reports unmatched delimiters', () => {
  const result = scanOreslang('pub fnc broken() { return;');
  assert.equal(result.diagnostics.length, 1);
  assert.match(result.diagnostics[0].message, /Unclosed delimiter/);
});

test('reports unterminated strings and block comments', () => {
  assert.match(scanOreslang('"oops').diagnostics[0].message, /Unterminated string/);
  assert.match(scanOreslang('/* nope').diagnostics[0].message, /Unterminated block comment/);
});

test('handles an identifier ending exactly at EOF', () => {
  const result = scanOreslang('pub');
  assert.deepEqual(result.tokens.map(t => t.value), ['pub']);
  assert.equal(result.diagnostics.length, 0);
});

test('tracks constructor, spawn, hot-load export, and actor isolation keywords', () => {
  const source = 'define singleton module Loader as export entry run; constructor() {} spawn Worker(); untrusted actor Sandbox as end';
  const result = scanOreslang(source);

  for (const word of ['define', 'singleton', 'module', 'as', 'export', 'entry', 'constructor', 'spawn', 'untrusted', 'actor']) {
    assert.ok(result.tokens.some(t => t.kind === 'keyword' && t.value === word), word);
  }
});
