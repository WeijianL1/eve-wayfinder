// Explicit input image only; crops it in memory. Never captures desktop or reads credentials.
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const file=process.argv[2];if(!file)throw Error('Usage: node scripts/smoke-local-intel.mjs screenshot.png');
const crop=spawnSync('.local-data/ocr-venv/bin/python',['-c',`from PIL import Image
import sys,io,json,base64
im=Image.open(sys.argv[1]);w,h=im.size
im=im.crop((int(w*.128),int(h*.715),int(w*.25),int(h*.995)))
b=io.BytesIO();im.save(b,format='PNG');print(json.dumps({'image':'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()}))`,file],{encoding:'utf8',maxBuffer:5000000});if(crop.status!==0)throw Error(crop.stderr);
const base='http://127.0.0.1:5173',boot=await(await fetch(base+'/api/bootstrap')).json();const post=async(endpoint,input)=>{const response=await fetch(base+'/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Eve-Session':boot.session},body:JSON.stringify(input)});const result=await response.json();if(!response.ok)throw Error(result.error);return result;};
const ocr=await post('local/ocr',JSON.parse(crop.stdout));const resolved=await post('local/resolve',{names:ocr.candidates.filter(c=>!c.needsReview).map(c=>c.name)});const ids=[...new Set(resolved.matches.flatMap(m=>m.character?[m.character.id]:[]))];const batch=ids.length?await post('local/batch',{ids}):{results:[]};
const report={checkedAt:new Date().toISOString(),candidates:ocr.candidates,matches:resolved.matches,profiles:batch.results.map(r=>({characterId:r.characterId,name:r.profile?.name,inspected:r.profile?.inspected,haulingTargets:r.profile?.haulingTargets,miningTargets:r.profile?.miningTargets,error:r.error}))};await mkdir('artifacts',{recursive:true});await writeFile('artifacts/local-intel-smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
