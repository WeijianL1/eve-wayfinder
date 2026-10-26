import {createService} from '../server/service.mjs';
import {MARKET_NAMES,catalogCoverage} from '../server/market-catalog.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const service=createService({dataDir:'.local-data/catalog-validation'});
try{const resolved=[];for(let i=0;i<MARKET_NAMES.length;i+=200){const r=await service.request('https://esi.evetech.net/latest/universe/ids/',{method:'POST',body:MARKET_NAMES.slice(i,i+200),ttl:86400000});resolved.push(...(r.data.inventory_types||[]).map(x=>x.name));}
 const coverage=catalogCoverage(resolved);await mkdir('artifacts',{recursive:true});await writeFile('artifacts/market-catalog-validation.json',JSON.stringify({checkedAt:new Date().toISOString(),...coverage},null,2)+'\n');console.log(JSON.stringify(coverage));if(coverage.unresolved.length)throw Error('Catalog contains names not resolved by official ESI.');
}finally{service.close();}
