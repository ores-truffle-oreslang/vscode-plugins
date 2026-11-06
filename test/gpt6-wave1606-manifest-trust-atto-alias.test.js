'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('AttoLang and legacy Oreslang file aliases share one syntax scope without trusting CLI', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const languages = pkg.contributes.languages.filter(lang => lang.id === 'oreslang');
  assert.equal(languages.length, 1, 'single canonical language identity');
  assert.ok(languages[0].extensions.includes('.ores'), 'legacy extension preserved');
  assert.ok(languages[0].extensions.includes('.atto'), 'AttoLang extension supported');
  assert.ok(languages[0].aliases.includes('AttoLang'));
  assert.ok(languages[0].aliases.includes('Oreslang'));
  assert.ok(pkg.contributes.grammars.some(g =>
    g.language === 'oreslang' && g.scopeName === 'source.oreslang'));
  assert.equal(pkg.capabilities.untrustedWorkspaces.supported, 'limited');
  const restricted = new Set(pkg.capabilities.untrustedWorkspaces.restrictedConfigurations);
  for (const key of ['oreslang.cli.command', 'oreslang.cli.args',
    'oreslang.cli.runOnSave', 'oreslang.cli.timeoutMs']) {
    assert.ok(restricted.has(key), 'workspace trust fence must contain ' + key);
  }
  assert.ok(!pkg.activationEvents.includes('*'), 'never activate arbitrary workspaces');
  assert.equal(pkg.contributes.configuration.properties['oreslang.cli.runOnSave'].default, true);
});
