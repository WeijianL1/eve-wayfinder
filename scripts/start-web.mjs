import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const args of [['node_modules/typescript/bin/tsc','--noEmit'],['node_modules/vite/bin/vite.js','build']]){const build=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});if(build.status!==0)process.exit(build.status??1);}
const {startWebServer}=await import('../server/app.mjs');await startWebServer();
