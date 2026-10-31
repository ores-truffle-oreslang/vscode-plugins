'use strict';
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const {runTests} = require('@vscode/test-electron');

async function main() {
  const root = path.resolve(__dirname, '../..');
  const mode=process.env.ORESLANG_TEST_MODE==='untrusted'?'untrusted':'trusted';
  const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'oreslang-vscode-trust-'));
  const args=['--disable-gpu','--skip-welcome','--skip-release-notes',
    '--no-sandbox','--disable-dev-shm-usage'];
  if(mode==='untrusted'){
    const folder=path.join(sandbox,'untrusted-workspace');
    fs.mkdirSync(folder);
    args.push('--user-data-dir',path.join(sandbox,'user-data'),folder);
  } else args.push('--disable-workspace-trust');
  try {
    await runTests({
      version:'1.96.4',
      extensionDevelopmentPath:root,
      extensionTestsPath:path.join(__dirname,'suite.cjs'),
      launchArgs:args
    });
  } finally {
    fs.rmSync(sandbox,{recursive:true,force:true});
  }
}
main().catch(error=>{
  console.error('Real VS Code Extension Host trust smoke failed:',error);
  process.exitCode=1;
});
