'use strict';
const path=require('node:path');
const os=require('node:os');
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const {runTests,downloadAndUnzipVSCode}=require('@vscode/test-electron');

async function runRestricted(executable,root,suite,sandbox) {
  const folder=path.join(sandbox,'untrusted-workspace');
  fs.mkdirSync(folder);
  const userData=path.join(sandbox,'user-data');
  const args=[
    folder,
    '--no-sandbox','--disable-gpu-sandbox','--disable-updates',
    '--skip-welcome','--skip-release-notes','--disable-gpu',
    '--disable-dev-shm-usage',
    '--user-data-dir='+userData,
    '--extensions-dir='+path.join(sandbox,'extensions'),
    '--extensionDevelopmentPath='+root,
    '--extensionTestsPath='+suite
  ];
  // The stock @vscode/test-electron runTests() appends
  // --disable-workspace-trust unconditionally. Launch its downloaded binary
  // directly for this *only* job so the Restricted Mode assertion is real.
  if(args.some(x=>x.includes('disable-workspace-trust')))
    throw new Error('Restricted Mode must not disable Workspace Trust');
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(executable,args,{stdio:'inherit',env:process.env,windowsHide:true});
    child.once('error',reject);
    child.once('close',code=>resolve(code));
  });
  if(code!==0)throw new Error('Real untrusted VS Code host exited with '+code);
}
async function main() {
  const root=path.resolve(__dirname,'../..');
  const suite=path.join(__dirname,'suite.cjs');
  const mode=process.env.ORESLANG_TEST_MODE==='untrusted'?'untrusted':'trusted';
  const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'oreslang-vscode-trust-'));
  try {
    if(mode==='untrusted'){
      const executable=await downloadAndUnzipVSCode({
        version:'1.96.4',
        extensionDevelopmentPath:root
      });
      await runRestricted(executable,root,suite,sandbox);
    }else{
      await runTests({
        version:'1.96.4',
        extensionDevelopmentPath:root,
        extensionTestsPath:suite,
        launchArgs:['--disable-gpu','--skip-welcome','--skip-release-notes',
          '--no-sandbox','--disable-dev-shm-usage']
      });
    }
  }finally{
    fs.rmSync(sandbox,{recursive:true,force:true});
  }
}
main().catch(error=>{
  console.error('VS Code Extension Host test failed:',error);
  process.exitCode=1;
});
