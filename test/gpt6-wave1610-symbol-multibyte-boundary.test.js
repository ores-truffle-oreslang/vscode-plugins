'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('quoted Symbol budget counts canonical UTF-8 bytes, not JavaScript code units', () => {
  for (const [count, valid] of [[128,true],[129,false]]) {
    for (const text of ['é'.repeat(count), 'e\u0301'.repeat(count)]) {
      const source = "#'" + text + "'\nreturn";
      const result = scanOreslang(source);
      const symbols = result.tokens.filter(t => t.kind === 'symbol');
      assert.equal(symbols.length, valid ? 1 : 0, 'symbols for '+count);
      assert.equal(result.diagnostics.length, valid ? 0 : 1, 'errors for '+count);
      if (!valid) assert.match(result.diagnostics[0].message, /Symbol literal/);
      assert.deepEqual(result.tokens.filter(t => t.kind === 'keyword').map(t => t.value),
        ['return']);
    }
  }
});

test('invisible and control Symbol names fail without exposing hidden runtime globals', () => {
  for (const invalid of ['\u200b','\u2060','\u0001','\u0085','\u2028','\u2029']) {
    const source = "#'" + invalid + "' panic\n#ready";
    const result = scanOreslang(source);
    assert.equal(result.diagnostics.length, 1, 'invalid U+'+invalid.codePointAt(0).toString(16));
    assert.match(result.diagnostics[0].message, /Invalid or unterminated quoted Symbol/);
    assert.deepEqual(result.tokens.map(t => [t.kind,t.value]), [['symbol','#ready']]);
  }
});