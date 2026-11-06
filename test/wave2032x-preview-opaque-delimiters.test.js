'use strict';
// Tests the lightweight source preview, not the authoritative AttoLang compiler.
const test = require('node:test');
const assert = require('node:assert/strict');
const { scanOreslang } = require('../lib/scan-target-preview');

test('nested comments and escaped templates mask keywords and delimiters', () => {
  const tick = String.fromCharCode(96);
  const source = [
    'fnc main() {',
    ' /* return ( [ /* recover { */ class } ] */',
    ' const message = ' + tick + 'if ( } /* opaque */ \\'+tick+' escaped return'+tick+';',
    ' return;',
    '}'
  ].join('\r\n');
  const actual = scanOreslang(source);
  assert.deepEqual(actual.diagnostics, []);
  assert.deepEqual(actual.tokens.map(token => [token.kind, token.value]), [
    ['keyword', 'fnc'], ['keyword', 'const'], ['keyword', 'return'],
  ]);
  for (const token of actual.tokens) {
    assert.equal(source.slice(token.start, token.end), token.value);
    assert.ok(token.end > token.start);
  }
});

test('mismatched and unclosed delimiters point to exact source spans', () => {
  const mismatched = 'fnc f() { return [) }';
  const result = scanOreslang(mismatched);
  const invalid = mismatched.lastIndexOf(')');
  assert.ok(result.diagnostics.some(d =>
    d.start === invalid && d.end === invalid + 1 &&
    /Mismatched delimiter/.test(d.message)
  ), JSON.stringify(result.diagnostics));
  assert.ok(result.diagnostics.some(d =>
    /Unclosed delimiter/.test(d.message)
  ), JSON.stringify(result.diagnostics));

  const open = 'return;\r\n/* nested /* still open */';
  const unterminated = scanOreslang(open);
  assert.deepEqual(unterminated.tokens.map(token => token.value), ['return']);
  assert.equal(unterminated.diagnostics.length, 1);
  assert.equal(unterminated.diagnostics[0].start, open.indexOf('/*'));
  assert.equal(unterminated.diagnostics[0].end, open.length);
  assert.match(unterminated.diagnostics[0].message, /Unterminated block comment/);
});

test('contextual operators remain identifiers while runtime globals stay distinct', () => {
  const source = 'is eq neq recover defer critical-read nb-select pub';
  const actual = scanOreslang(source);
  assert.deepEqual(actual.tokens.map(token => [token.kind, token.value]), [
    ['runtimeGlobal', 'recover'],
    ['runtimeGlobal', 'defer'],
    ['keyword', 'critical-read'],
    ['keyword', 'nb-select'],
    ['keyword', 'pub'],
  ]);
  assert.deepEqual(actual.diagnostics, []);
});
