// Bounded host scanner model only; no compiler guest or AST lowering proof.
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('nested comments, templates, and strings cannot forge delimiter diagnostics', () => {
  const tick = String.fromCharCode(96);
  const source = 'fnc outer() { /* [ ) /* return } */ ] */ ' + tick + '}{' + tick + ' "(]" return; }';
  const result = scanOreslang(source);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.tokens.filter(t => t.kind === 'keyword').map(t => t.value),
    ['fnc', 'return']);
  for (const token of result.tokens) {
    assert.equal(token.value, source.slice(token.start, token.end));
  }
  assert.deepEqual(scanOreslang(source), result);
});

test('malformed quoted Symbol consumes forged brackets through line end only', () => {
  const source = "fnc ok() { #'bad\\q ) }\n return; }";
  const result = scanOreslang(source);
  assert.equal(result.diagnostics.length, 1);
  assert.match(result.diagnostics[0].message, /Invalid or unterminated quoted Symbol/);
  assert.equal(result.tokens.filter(t => t.value === 'return').length, 1);
  assert.deepEqual(scanOreslang(source), result);
});

test('unclosed nested comment produces one targeted error, not forged delimiters', () => {
  const source = 'fnc ok() {} /* nested /* fake ) }';
  const result = scanOreslang(source);
  assert.equal(result.diagnostics.length, 1);
  assert.match(result.diagnostics[0].message, /Unterminated block comment/);
});
