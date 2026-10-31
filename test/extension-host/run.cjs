'use strict';
const path = require('node:path');
const {runTests} = require('@vscode/test-electron');

async function main() {
  const root = path.resolve(__dirname, '../..');
  await runTests({
    version: '1.96.4',
    extensionDevelopmentPath: root,
    extensionTestsPath: path.join(__dirname, 'suite.cjs'),
    launchArgs: ['--disable-gpu', '--skip-welcome', '--skip-release-notes',
      '--no-sandbox', '--disable-dev-shm-usage']
  });
}
main().catch(error => {
  console.error('Real VS Code Extension Host smoke failed:', error);
  process.exitCode = 1;
});
