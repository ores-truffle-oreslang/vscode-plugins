'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('NUL and unpaired surrogate input fail closed in all opaque contexts', () => {
  const shells = [
    body => '// ' + body + '\nreturn',
    body => '/* ' + body + ' */ return',
    body => '"hello' + body + '" return',
    body => "'hello" + body + "' return",
    body => String.fromCharCode(96) + 'hello' + body + String.fromCharCode(96) + ' return',
  ];
  const forbidden = [
    {char: String.fromCharCode(0), message:/NUL character/},
    {char: String.fromCharCode(0xd83e), message:/unpaired UTF-16 surrogate/},
    {char: String.fromCharCode(0xdd51), message:/unpaired UTF-16 surrogate/},
  ];
  for (const shell of shells) {
    for (const item of forbidden) {
      const source = shell(item.char);
      const actual = scanOreslang(source);
      assert.deepEqual(actual.tokens, []);
      assert.equal(actual.diagnostics.length, 1);
      assert.match(actual.diagnostics[0].message, item.message);
      assert.equal(actual.diagnostics[0].start, source.indexOf(item.char));
      assert.equal(actual.diagnostics[0].end, source.indexOf(item.char)+1);
    }
  }
});

test('paired supplementary scalars remain allowed in comments and strings', () => {
  const source = '/* 🥑 */ "🥑" // 🥑\nreturn';
  const actual = scanOreslang(source);
  assert.deepEqual(actual.diagnostics, []);
  assert.deepEqual(actual.tokens.map(t=>t.value), ['return']);
  assert.equal(source.slice(actual.tokens[0].start, actual.tokens[0].end), 'return');
});
