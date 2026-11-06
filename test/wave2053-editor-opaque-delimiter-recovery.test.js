'use strict';
// Host editor scanner recovery; not a native compiler guest execution.
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('quoted, comment and template delimiters cannot corrupt outer delimiter stack', () => {
  const source = [
    'return ( /* nested /* ( [ { */ closed */ ',
    '"([)] return", ',
    '`([)] return`, ',
    '#ready )',
  ].join('');
  const result = scanOreslang(source);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.tokens.map(t => t.value), ['return', '#ready']);
  assert.equal(result.tokens[1].start, source.indexOf('#ready'));
});

test('mismatched brackets report diagnostics yet subsequent scans recover completely', () => {
  const bad = scanOreslang('return ([)]');
  assert.ok(bad.diagnostics.some(x => /Mismatched delimiter/.test(x.message)));
  assert.ok(bad.diagnostics.some(x => /Unclosed delimiter/.test(x.message)));
  const recovered = scanOreslang('return (#ready)');
  assert.deepEqual(recovered.diagnostics, []);
  assert.deepEqual(recovered.tokens.map(t => t.value), ['return', '#ready']);
  // Repeated scans must not share a delimiter stack or leak stale bad tokens.
  assert.deepEqual(scanOreslang('return (#ready)'), recovered);
});
