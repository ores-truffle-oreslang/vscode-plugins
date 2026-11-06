'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { scanOreslang } = require('../lib/scan');

test('execution-domain and compound keywords are atomic outside opaque source', () => {
  const words = 'cpu gpu quantum critical-read critical-write nb-select transform-pipe';
  const expected = words.split(' ');
  const visible = scanOreslang(words);
  assert.deepEqual(visible.diagnostics, []);
  assert.deepEqual(visible.tokens.map(token => [token.kind, token.value]),
    expected.map(value => ['keyword', value]));
  const opaque = '/* ' + words + ' */ "' + words + '" `' + words +
    '` // ' + words + '\n' + words;
  const seen = scanOreslang(opaque);
  assert.deepEqual(seen.diagnostics, []);
  assert.deepEqual(seen.tokens.map(token => [token.kind, token.value]),
    expected.map(value => ['keyword', value]));
});

test('longer identifier spellings never become execution keywords', () => {
  const names = 'cpu_count gpu2 quantum_bits critical_read nb_select transform_pipe';
  const result = scanOreslang(names);
  assert.deepEqual(result.tokens, []);
  assert.deepEqual(result.diagnostics, []);
});