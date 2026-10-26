// Public-data smoke only. Never prints authorization URLs, tokens, wallet or other private fields.
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.EVE_MASTER_BASE_URL||'http://127.0.0.1:5173';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Smoke requires the local application API.');
const bootstrap=await(await fetch(base+'/api/bootstrap')).json();
async function post(endpoint,body){const r=await fetch(base+'/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Eve-Session':bootstrap.session},body:JSON.stringify(body)});const value=await r.json();if(!r.ok)throw Error(value.error||`HTTP ${r.status}`);return value;}
await post('public/refresh',{});
let state,lastProgress=0,publicVersion='',lastSnapshot=null;async function publicState(){const next=await(await fetch(base+'/api/public'+(publicVersion?'?since='+encodeURIComponent(publicVersion):''))).json();if('snapshot' in next)lastSnapshot=next.snapshot;if(next.snapshotVersion)publicVersion=next.snapshotVersion;return {...next,snapshot:lastSnapshot};}const deadline=Date.now()+600000;
do{state=await publicState();if(state.progress.state!=='loading')break;if(Date.now()-lastProgress>30000){console.log(JSON.stringify({progress:state.progress.message,completed:state.progress.completed,total:state.progress.total}));lastProgress=Date.now();}await new Promise(r=>setTimeout(r,1000));}while(Date.now()<deadline);
if(state.progress.state==='loading')throw Error('Public refresh exceeded smoke deadline.');
if(state.progress.state==='error')throw Error(state.progress.message||'Public refresh failed.');
const snapshot=state.snapshot;if(!snapshot?.orders?.length)throw Error('No public order snapshot.');
const route=await post('route',{from:30000142,to:30002813});
if(route.ids?.[0]!==30000142||route.ids.at(-1)!==30002813)throw Error('ESI route endpoints do not match.');
const riskResponse=await fetch(base+'/api/risk/30002813'),risk=await riskResponse.json();
if(!riskResponse.ok||!Array.isArray(risk.recent))throw Error('zKillboard response did not validate.');
const report={checkedAt:new Date().toISOString(),snapshotAt:snapshot.fetchedAt,regions:snapshot.regions.map(r=>r.name),coverage:snapshot.coverage,orders:snapshot.orders.length,stations:snapshot.stations.length,types:snapshot.types.length,completeSources:snapshot.sources.filter(s=>s.complete).length,freshSources:snapshot.sources.filter(s=>s.complete&&s.expiresAt>Date.now()).length,failedSources:snapshot.failures.length,routeSystems:route.ids.length,zkillKnown:risk.returned,zkillExpanded:risk.recent.length,clientIdConfigured:Boolean(bootstrap.clientId),characterAuthorized:Boolean(bootstrap.character),privateDataTested:false};
if(!report.freshSources)throw Error('All public books are stale.');
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/live-smoke.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
