'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {scanOreslang}=require('../lib/scan');

test('nested comment/template delimiters cannot forge diagnostics or later keyword tokens',()=>{
  const tick=String.fromCharCode(96);
  const source=[
    '/* outer { if ( /* inner ] return } */ still ( } */',
    tick+'template { ] ) if return '+String.fromCharCode(92)+tick+' opaque'+tick,
    '#"quoted \\\" ) if ]"',
    'critical { return; }',
  ].join('\n');
  for(let pass=0;pass<10;pass++){
    const scan=scanOreslang(source);
    assert.deepEqual(scan.diagnostics,[]);
    assert.deepEqual(scan.tokens.map(t=>t.value),['#"quoted \\\" ) if ]"','critical','return']);
    assert.equal(scan.tokens[1].start,source.indexOf('critical { return'));
    for(const token of scan.tokens)assert.equal(source.slice(token.start,token.end),token.value);
    const malformed=scanOreslang('({]');
    assert.ok(malformed.diagnostics.length>0);
  }
});

test('inclusive comment nesting cap is valid, cap-plus-one fails closed then recovers',()=>{
  const valid='/*'.repeat(4096)+'*/'.repeat(4096)+'return;';
  const ok=scanOreslang(valid);
  assert.deepEqual(ok.diagnostics,[]);
  assert.deepEqual(ok.tokens.map(t=>t.value),['return']);
  const invalid='/*'.repeat(4097)+'*/'.repeat(4097)+'return;';
  const bad=scanOreslang(invalid);
  assert.deepEqual(bad.tokens,[]);
  assert.equal(bad.diagnostics.length,1);
  assert.match(bad.diagnostics[0].message,/nesting limit exceeded/i);
  assert.deepEqual(scanOreslang('return;').tokens.map(t=>t.value),['return']);
});
