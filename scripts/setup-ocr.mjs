import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(process.platform!=='darwin')throw Error('OCR currently requires macOS Vision');
const tasks=[];if(!existsSync(path.join(root,'.local-data/ocr-venv/bin/python')))tasks.push(['venv','--python','3.12','.local-data/ocr-venv']);tasks.push(['pip','install','--python','.local-data/ocr-venv/bin/python','-r','requirements/ocr.txt']);for(const args of tasks){const r=spawnSync('uv',args,{cwd:root,stdio:'inherit'});if(r.error)throw Error('Install uv from https://docs.astral.sh/uv/ then run npm run setup:ocr');if(r.status!==0)process.exit(r.status||1);}
