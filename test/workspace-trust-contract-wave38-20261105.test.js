'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('Restricted Mode gates every CLI execution setting without disabling local language services', () => {
  const trust = manifest.capabilities.untrustedWorkspaces;
  assert.equal(trust.supported, 'limited');
  const expected = [
    'oreslang.cli.command',
    'oreslang.cli.args',
    'oreslang.cli.runOnSave',
    'oreslang.cli.timeoutMs',
  ];
  const actual = trust.restrictedConfigurations;
  assert.ok(Array.isArray(actual));
  assert.equal(actual.length, expected.length, 'no duplicate or missing restrictions');
  assert.deepEqual([...actual].sort(), [...expected].sort());
  for (const key of expected) {
    assert.ok(Object.hasOwn(manifest.contributes.configuration.properties, key), key);
  }
  assert.equal(manifest.contributes.configuration.properties['oreslang.diagnostics.enabled'].default, true);
});

test('language activation, grammar, and command contribution share canonical extension identity', () => {
  const languages = manifest.contributes.languages.filter(item => item.id === 'oreslang');
  assert.equal(languages.length, 1);
  assert.ok(languages[0].extensions.includes('.ores'));
  assert.ok(manifest.activationEvents.includes('onLanguage:oreslang'));
  const grammars = manifest.contributes.grammars.filter(item => item.language === 'oreslang');
  assert.equal(grammars.length, 1);
  assert.equal(grammars[0].scopeName, 'source.oreslang');
  const grammarPath = path.resolve(root, grammars[0].path);
  assert.ok(grammarPath.startsWith(root + path.sep));
  assert.ok(fs.statSync(grammarPath).isFile());
  const command = 'oreslang.checkCurrentFile';
  assert.ok(manifest.activationEvents.includes('onCommand:' + command));
  assert.equal(manifest.contributes.commands.filter(item => item.command === command).length, 1);
});
