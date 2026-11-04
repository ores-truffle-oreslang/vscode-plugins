'use strict';
const fs=require('node:fs');
fs.writeFileSync(process.argv[2],'exec-ok');
process.stdout.write(JSON.stringify({version:1,diagnostics:[]}));
