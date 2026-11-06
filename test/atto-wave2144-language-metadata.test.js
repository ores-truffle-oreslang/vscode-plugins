'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../package.json'),'utf8'));

test('AttoLang and legacy .ores files share one compatible language ID and TextMate scope',()=>{
  const langs=manifest.contributes.languages;
  assert.equal(langs.length,1,'do not introduce competing language IDs');
  const language=langs[0];
  assert.equal(language.id,'oreslang');
  assert.ok(language.extensions.includes('.ores'));
  assert.ok(language.extensions.includes('.atto'));
  for(const alias of ['Oreslang','oreslang','AttoLang','attolang'])
    assert.ok(language.aliases.includes(alias),alias);
  assert.equal(manifest.contributes.grammars.filter(x=>x.language===language.id).length,1);
  assert.ok(manifest.activationEvents.includes('onLanguage:oreslang'));
});

test('AttoLang support does not weaken compiler launch or workspace trust gates',()=>{
  assert.equal(manifest.contributes.configuration.properties['oreslang.cli.command'].default,'oreslang');
  assert.deepEqual(manifest.contributes.configuration.properties['oreslang.cli.args'].default,
    ['check','--format=json','{file}']);
  assert.equal(manifest.capabilities.untrustedWorkspaces.supported,'limited');
  assert.ok(manifest.capabilities.untrustedWorkspaces.restrictedConfigurations.includes('oreslang.cli.command'));
});
