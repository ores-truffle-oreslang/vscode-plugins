'use strict';
// Production editor scanner Unicode identity boundary; host-only proof.
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('BMP Unicode identifier prefixes and suffixes never leak reserved keywords', () => {
  const letters = ['é', 'Ω', 'Ж', 'क', '漢', 'ø', 'ç', 'Α', 'ñ'];
  for (const letter of letters) {
    const source = [
      'const ' + letter + 'return = 1;',
      'const return' + letter + ' = 2;',
      'const ' + letter + 'return' + letter + ' = 3;',
      '// return ' + letter + 'return',
      '/* return ' + letter + 'return */',
      '"return ' + letter + 'return"',
      'return',
    ].join('\r\n');
    const scan = scanOreslang(source);
    assert.deepEqual(scan.diagnostics, [], letter);
    const returns = scan.tokens.filter(t => t.value === 'return' && t.kind === 'keyword');
    const expected = source.lastIndexOf('\r\nreturn') + 2;
    assert.deepEqual(returns, [
      {kind: 'keyword', start: expected, end: expected + 6, value: 'return'}
    ], letter);
    assert.ok(scan.tokens.every(t => source.slice(t.start, t.end) === t.value));
    assert.deepEqual(scanOreslang(source), scan);
  }
});

test('surrogates and NUL report exact UTF-16 offsets without leaked valid tokens', () => {
  for (const invalid of ['\0', '\ud800', '\udc00']) {
    for (const prefix of ['return ', '💠 // safe\r\n', '/* opaque */']) {
      const scan = scanOreslang(prefix + invalid + ' return');
      assert.deepEqual(scan.tokens, []);
      assert.equal(scan.diagnostics.length, 1);
      assert.equal(scan.diagnostics[0].start, prefix.length);
      assert.equal(scan.diagnostics[0].end, prefix.length + 1);
      assert.match(scan.diagnostics[0].message, /NUL|unpaired UTF-16/);
    }
  }
  const valid = scanOreslang('💠return\r\nreturn');
  assert.deepEqual(valid.diagnostics, []);
  assert.deepEqual(valid.tokens.filter(t => t.value === 'return').map(t => t.start),
    [2, 10]);
});
