// Real editor lexical host scanner, not guest compiler evidence.
const test = require('node:test');
const assert = require('node:assert/strict');
const {scanOreslang} = require('../lib/scan');

test('NUL and unpaired UTF-16 fail closed even inside opaque text', () => {
  const tick = String.fromCharCode(96);
  const cases = [
    {source: 'pub /* embedded \0 hidden */ fnc main() {}', marker: '\0', message: /NUL character/},
    {source: 'pub ' + tick + 'template \ud800 tail' + tick + ' fnc main() {}', marker: '\ud800', message: /unpaired UTF-16 surrogate/},
    {source: 'pub // stray \udc00 in comment\nfnc main() {}', marker: '\udc00', message: /unpaired UTF-16 surrogate/},
    {source: '\ud800x fnc main() {}', marker: '\ud800', message: /unpaired UTF-16 surrogate/},
  ];
  for (const {source, marker, message} of cases) {
    const result = scanOreslang(source);
    assert.deepEqual(result.tokens, [], source);
    assert.equal(result.diagnostics.length, 1, source);
    const diagnostic = result.diagnostics[0];
    assert.match(diagnostic.message, message);
    assert.equal(diagnostic.start, source.indexOf(marker));
    assert.equal(diagnostic.end, diagnostic.start + 1);
  }
});

test('a valid surrogate pair stays accepted with exact UTF-16 token slices', () => {
  const source = 'pub fnc main() { /* astral 🍃 in comment */ return; }';
  const {tokens, diagnostics} = scanOreslang(source);
  assert.deepEqual(diagnostics, []);
  assert.deepEqual(tokens.filter(token => token.kind === 'keyword').map(t => t.value),
    ['pub', 'fnc', 'return']);
  for (const token of tokens) {
    assert.equal(token.value, source.slice(token.start, token.end));
  }
  assert.deepEqual(scanOreslang(source), {tokens, diagnostics});
});
