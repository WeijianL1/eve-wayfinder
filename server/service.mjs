import {createNativeCapture} from './native-capture.mjs';
import {recognizeLocal,localNameCandidates} from './local-ocr.mjs';
import {createLocalIntel} from './local-intel.mjs';
import {gzip} from 'node:zlib';
import {promisify} from 'node:util';
import {createMemoCache} from './memo-cache.mjs';
const zip=promisify(gzip);
import {buildTransportProfile,estimateTravel} from './transport-model.mjs';
import {MARKET_NAMES,catalogCoverage} from './market-catalog.mjs';
import { createHash, randomBytes, createPublicKey, verify as verifySignature } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

export const BASIC_SCOPES=['esi-markets.read_character_orders.v1','esi-wallet.read_character_wallet.v1','esi-skills.read_skills.v1'];
export const FULL_SCOPES=[...BASIC_SCOPES,'esi-skills.read_skillqueue.v1','esi-location.read_location.v1','esi-location.read_ship_type.v1','esi-assets.read_assets.v1','esi-industry.read_character_mining.v1','esi-clones.read_implants.v1','esi-characters.read_standings.v1','esi-killmails.read_killmails.v1'];
export const REDIRECT_URI='http://localhost:8765/callback';
const ESI='https://esi.evetech.net/latest',UA='eve-master/0.2 (local read-only activity assistant)';
export const DEFAULT_CLIENT_ID=process.env.EVE_CLIENT_ID||'';
const REGION_NAMES=['The Forge','Black Rise','Syndicate','Domain','Sinq Laison','Heimatar','Metropolis'];

const TYPE_NAMES=[...MARKET_NAMES,'Azure Mykoserocin','Celadon Mykoserocin','Lime Mykoserocin','Malachite Mykoserocin','Vermillion Mykoserocin','Viridian Mykoserocin','Accounting','Mining Frigate','Gas Cloud Harvesting','Minmatar Hauler','Transport Ships','Cloaking'];
const clone=x=>JSON.parse(JSON.stringify(x));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export class ApiError extends Error { constructor(message,status=502){super(message);this.status=status;} }

export function verifyEveJWT(token,clientId,keys,now=Date.now()) {
 const parts=token.split('.');if(parts.length!==3)throw new ApiError('SSO 返回的 JWT 格式不正确',401);
 const header=JSON.parse(Buffer.from(parts[0],'base64url')),claims=JSON.parse(Buffer.from(parts[1],'base64url'));
 if(header.alg!=='RS256')throw new ApiError('拒绝非 RS256 的 SSO 签名',401);
 const jwk=keys.find(k=>k.kid===header.kid&&k.kty==='RSA');
 if(!jwk||!verifySignature('RSA-SHA256',Buffer.from(parts.slice(0,2).join('.')),createPublicKey({key:jwk,format:'jwk'}),Buffer.from(parts[2],'base64url')))throw new ApiError('SSO 签名验证失败',401);
 const aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];
 if(!aud.includes(clientId)||!aud.includes('EVE Online')||!['https://login.eveonline.com','https://login.eveonline.com/','login.eveonline.com'].includes(claims.iss))throw new ApiError('SSO issuer 或 audience 不匹配',401);
 if(!Number.isFinite(claims.exp)||claims.exp*1000<=now||(claims.nbf&&claims.nbf*1000>now+30000)||!/^CHARACTER:EVE:\d+$/.test(claims.sub||''))throw new ApiError('SSO 已过期或角色标识无效',401);
 return {id:Number(claims.sub.split(':').at(-1)),name:claims.name||'EVE Pilot',scopes:Array.isArray(claims.scp)?claims.scp:typeof claims.scp==='string'?claims.scp.split(' '):[]};
}

export function createService({dataDir=path.resolve('.local-data'),clientId=DEFAULT_CLIENT_ID,fetchImpl=fetch,credentialStore=null,favoriteStore=null,nativeCapture=createNativeCapture(),openExternal=null,now=()=>Date.now()}={}) {
 const memory=new Map(),inflight=new Map(),cooldowns=new Map(),session=randomBytes(32).toString('hex');
 let authEpoch=0;
 let auth=null,pending=null,callbackServer=null,publicState=null,publicJob=null,characterState=null,characterJob=null,lastError=null;
 const tripCache=createMemoCache({now,ttl:30000,max:256});
 let publicLoad=null;
 const responseCache=new Map(),objectIds=new WeakMap();let nextObjectId=0;
 const objectId=value=>value?(objectIds.has(value)?objectIds.get(value):(objectIds.set(value,++nextObjectId),nextObjectId)):0;
 const progress={state:'idle',message:'尚未获取公开数据',completed:0,total:0};
 const storage=credentialStore||{load:async()=>null,save:async()=>{},clear:async()=>{},mode:'memory-only'};
 const ready=storage.load().then(v=>{if(v&&v.refreshToken&&v.character)auth=v;}).catch(()=>{lastError='已有本地凭据无法解密，请重新授权。';});
 async function atomic(file,value){await mkdir(dataDir,{recursive:true});const tmp=path.join(dataDir,`${file}.${randomBytes(5).toString('hex')}.tmp`);await writeFile(tmp,JSON.stringify(value),{mode:0o600});await rename(tmp,path.join(dataDir,file));}
 async function request(url,{method='GET',body,token,ttl=300000}={}) {
  const key=`${token?'private:'+auth?.character?.id:'public'}:${method}:${url}:${body?JSON.stringify(body):''}`;
  let cached=memory.get(key);
  const diskFile=`cache-${createHash('sha256').update(key).digest('hex')}.json`;
  if(!cached&&!token){try{cached=JSON.parse(await readFile(path.join(dataDir,diskFile),'utf8'));memory.set(key,cached);}catch{}}
  if(cached&&cached.expiresAt>now())return clone(cached);
  if(inflight.has(key))return inflight.get(key);
  const promise=(async()=>{
   if((cooldowns.get(new URL(url).host)||0)>now())throw new ApiError('此数据源仍在 Retry-After 冷却期，稍后重试。',429);
   for(let attempt=0;attempt<3;attempt++){
    let response;
    try{response=await fetchImpl(url,{method,headers:{'User-Agent':UA,'Accept':'application/json','X-Compatibility-Date':'2026-08-18',...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:(cached?.headers?.etag&&method==='GET'?{'If-None-Match':cached.headers.etag}:{}))},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});}catch{if(attempt<2){await sleep(500*(attempt+1));continue;}throw new ApiError('数据源网络连接失败；最后成功快照保留，未替换为演示数据。');}
    if(response.status===304&&cached){const headers={...cached.headers,...Object.fromEntries(response.headers.entries())};const expiry=Date.parse(headers.expires||'');const result={...cached,headers,expiresAt:Number.isFinite(expiry)&&expiry>now()?expiry:now()+ttl};memory.set(key,result);if(!token)await atomic(diskFile,result);return clone(result);}
    if(!response.ok){if([420,429,500,502,503,504].includes(response.status)&&attempt<2){const raw=response.headers.get('retry-after'),seconds=raw===null?attempt+1:Number(raw);const wait=Math.max(1000,Number.isFinite(seconds)?seconds*1000:(Date.parse(raw)-now())||1000);cooldowns.set(new URL(url).host,now()+wait);if(wait>60000)throw new ApiError('数据源要求较长冷却，已停止请求；请稍后刷新。',429);await sleep(wait);continue;}throw new ApiError(`数据源 HTTP ${response.status}：${new URL(url).pathname}`,response.status===403?403:response.status===401?401:502);}
    const data=await response.json();if(data&&typeof data==='object'&&!Array.isArray(data)&&data.error)throw new ApiError('数据源返回了错误对象，未作为成功快照使用。');const headers=Object.fromEntries(response.headers.entries());
    const expires=Date.parse(headers.expires||''),maxAge=headers['cache-control']?.match(/max-age=(\d+)/)?.[1];
    const result={data,headers,fetchedAt:new Date(now()).toISOString(),expiresAt:Number.isFinite(expires)?expires:now()+(maxAge?Number(maxAge)*1000:ttl)};
    memory.set(key,result);if(!token)await atomic(diskFile,result);return clone(result);
   }
   throw new ApiError('数据源重试耗尽');
  })();inflight.set(key,promise);try{return await promise;}finally{inflight.delete(key);}
 }
 const esi=(endpoint,options={})=>request(`${ESI}${endpoint}`,options);
 const typeCache=new Map(),systemCache=new Map(),stationCache=new Map();
 async function type(id){if(!typeCache.has(id))typeCache.set(id,esi(`/universe/types/${id}/`,{ttl:86400000}).then(r=>({id,...r.data})).catch(e=>{typeCache.delete(id);throw e;}));return typeCache.get(id);}
 async function system(id){if(!systemCache.has(id))systemCache.set(id,esi(`/universe/systems/${id}/`,{ttl:86400000}).then(r=>({id,...r.data})).catch(e=>{systemCache.delete(id);throw e;}));return systemCache.get(id);}
 async function station(id){if(!stationCache.has(id))stationCache.set(id,esi(`/universe/stations/${id}/`,{ttl:86400000}).then(r=>({id,...r.data})).catch(e=>{stationCache.delete(id);throw e;}));return stationCache.get(id);}
 async function pool(items,fn,concurrency=4){const results=new Array(items.length);let cursor=0;await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{while(cursor<items.length){const i=cursor++;results[i]=await fn(items[i],i);}}));return results;}
 async function getRoute(from,to,flag='shortest'){return (await esi(`/route/${from}/${to}/?flag=${flag}`,{ttl:86400000})).data;}
 async function paged(endpoint,token,maxPages=25){const first=await esi(endpoint,{token});const count=Number(first.headers['x-pages']||1);if(!Number.isInteger(count)||count<1)throw new ApiError('分页头无效，拒绝使用不完整结果。');if(count>maxPages)throw new ApiError(`结果有 ${count} 页，超过本轮完整性上限；不会使用截断快照。`);const rows=[...first.data];for(let page=2;page<=count;page++){rows.push(...(await esi(`${endpoint}${endpoint.includes('?')?'&':'?'}page=${page}`,{token})).data);}return {...first,data:rows,pages:count};}
 async function refreshPublic(){
  if(publicJob)return publicJob;
  publicJob=(async()=>{
   progress.state='loading';progress.completed=0;progress.total=0;progress.message='解析官方星系、区域与物品名称…';lastError=null;
   try{
    const names=[...new Set([...TYPE_NAMES,...REGION_NAMES,'Jita','Tama','Nourvukaiken','Sobaseki','Perimeter','Maurasi','Inaya','Sujarento','Kedama'])];
    const ids={};for(let i=0;i<names.length;i+=200){const part=(await esi('/universe/ids/',{method:'POST',body:names.slice(i,i+200),ttl:86400000})).data;for(const [key,values]of Object.entries(part))if(Array.isArray(values))ids[key]=[...(ids[key]||[]),...values];}
    progress.message='读取扩展商品目录与官方物品信息…';
    progress.total=(ids.inventory_types||[]).length;
    const types=await pool(ids.inventory_types||[],async v=>{const t=await type(v.id);progress.completed++;return t;});
    progress.completed=0;progress.total=0;
    const regionIds=(ids.regions||[]).filter(r=>REGION_NAMES.includes(r.name));
    const orders=[],sources=[],failures=[];
    const watched=types.filter(t=>MARKET_NAMES.includes(t.name));
    const watchedIds=new Set(watched.map(t=>t.id));
    progress.message=`扫描 ${watched.length} 种商品 / ${regionIds.length} 个区域的完整订单分页…`;
    // One full regional sweep is cheaper than hundreds of per-type calls. Filter each page
    // immediately; publish only after every page of a region succeeds, never partial books.
    for(const region of regionIds){try{
     progress.message=`扫描 ${watched.length} 种商品 · ${region.name} 区域完整分页…`;
     const endpoint=`/markets/${region.id}/orders/?order_type=all`;
     const first=await esi(endpoint);const pages=Number(first.headers['x-pages']||1);
     if(!Number.isInteger(pages)||pages<1||pages>1000)throw new ApiError('区域分页头无效或超过完整扫描上限。');
     progress.total+=pages;progress.completed++;
     const regionOrders=first.data.filter(o=>watchedIds.has(o.type_id));let expiresAt=first.expiresAt;let fetchedAt=first.fetchedAt;
     let pageError=null;
     await pool(Array.from({length:pages-1},(_,i)=>i+2),async page=>{if(pageError)return;try{const r=await esi(`${endpoint}&page=${page}`);if(Number(r.headers['x-pages']||1)!==pages)throw new ApiError('扫描期间区域页数变化；丢弃本区域，稍后重试。');regionOrders.push(...r.data.filter(o=>watchedIds.has(o.type_id)));expiresAt=Math.min(expiresAt,r.expiresAt);if(r.fetchedAt<fetchedAt)fetchedAt=r.fetchedAt;}catch(e){pageError=e;}finally{progress.completed++;}},4);
     if(pageError)throw pageError;
     // Order movement across independently cached pages can duplicate IDs. Conflicting
     // versions invalidate the region rather than inflating available depth.
     const unique=new Map();for(const order of regionOrders){const previous=unique.get(order.order_id);if(previous&&JSON.stringify(previous)!==JSON.stringify(order))throw new ApiError('分页中的同一订单版本冲突；未使用不一致的深度。');unique.set(order.order_id,order);}
     orders.push(...[...unique.values()].map(o=>({...o,region_id:region.id})));
     sources.push(...watched.map(t=>({region:region.name,type:t.name,fetchedAt,expiresAt,pages,complete:true})));
    }catch(e){failures.push(...watched.map(t=>({region:region.name,type:t.name,error:e.message})));}}
    progress.message='建立真实星系连接与 NPC 站点目录…';
    const npcIds=[...new Set(orders.filter(o=>o.location_id>=60000000&&o.location_id<64000000).map(o=>o.location_id))];
    const stations=[];await pool(npcIds,async id=>{try{stations.push(await station(id));}catch{}},5);
    const knownSystemIds=new Set(stations.map(s=>s.system_id));(ids.systems||[]).forEach(s=>knownSystemIds.add(s.id));
    const origin=30000142; // Public snapshot must never persist a character's private location.
    knownSystemIds.add(origin);
    const jumpsResult=await esi('/universe/system_jumps/',{ttl:3600000}).catch(()=>null),killsResult=await esi('/universe/system_kills/',{ttl:3600000}).catch(()=>null);
    const killMap=new Map((killsResult?.data||[]).map(k=>[k.system_id,k])),jumpMap=new Map((jumpsResult?.data||[]).map(j=>[j.system_id,j.ship_jumps]));
    const knownSystems=[];await pool([...knownSystemIds],async id=>{try{const s=await system(id);knownSystems.push({...s,kills:killMap.get(id)||null,jumps:jumpMap.get(id)??null});}catch{}},5);
    const status=await esi('/status/',{ttl:60000}).catch(()=>null);
    const attributeIds=[182,183,184,277,278,279,73,77],attributeSchema=[];await pool(attributeIds,async id=>{try{attributeSchema.push({id,...(await esi(`/dogma/attributes/${id}/`,{ttl:86400000})).data});}catch{}},4);
    const requirementMap=Object.fromEntries(attributeSchema.map(a=>[a.id,a.name]));
    const requirements={};for(const t of types){const attrs=Object.fromEntries((t.dogma_attributes||[]).map(a=>[requirementMap[a.attribute_id],a.value]));requirements[t.id]=[1,2,3].filter(i=>attrs[`requiredSkill${i}`]).map(i=>({skillId:attrs[`requiredSkill${i}`],level:attrs[`requiredSkill${i}Level`]||1}));}
    const skillTypes=[];await pool([...new Set(Object.values(requirements).flat().map(r=>r.skillId))],async id=>{try{skillTypes.push(await type(id));}catch{}},4);
    for(const t of skillTypes)if(!types.some(v=>v.id===t.id))types.push(t);
    const next={coverage:catalogCoverage(watched.map(t=>t.name)),fetchedAt:new Date(now()).toISOString(),origin,originIsCharacter:false,types,requirements,attributeSchema,regions:regionIds,orders,stations,systems:knownSystems,sources,failures,scope:'common-goods catalog / complete regional sweeps / The Forge + Black Rise + Syndicate + Domain + Sinq Laison + Heimatar + Metropolis / NPC stations only',status:status?.data||null,killSource:killsResult?{fetchedAt:killsResult.fetchedAt,lastModified:killsResult.headers['last-modified']||null}:null};
    if(!orders.length)throw new ApiError('本轮未得到完整订单；未将失败当成市场没有机会。');
    publicState=next;await atomic('public-snapshot.json',next);progress.state='ready';progress.message=`已同步 ${orders.length} 条真实订单 / ${stations.length} 个 NPC 站`;return next;
   }catch(e){progress.state='error';progress.message=e.message;lastError=e.message;throw e;}finally{publicJob=null;}
  })();return publicJob;
 }
 const gateMaps=new Map();
 async function gate(id){return (await esi(`/universe/stargates/${id}/`,{ttl:86400000})).data;}
 async function between(from,to){if(!gateMaps.has(from))gateMaps.set(from,(async()=>{const s=await system(from);const gates=await pool(s.stargates||[],id=>gate(id),4);return new Map(gates.map(g=>[g.destination.system_id,g]));})().catch(e=>{gateMaps.delete(from);throw e;}));const found=(await gateMaps.get(from)).get(to);if(!found)throw new ApiError('ESI 路线中的星门连接未能核验。');return found;}
 async function transportProfile(){if(!characterState||characterState.skillsSource?.expiresAt<=now())await syncCharacter();if(!characterState)throw new ApiError('角色尚未同步',409);return buildTransportProfile(characterState,now());}
 async function haulingEstimate(input){
  const binding=auth;const profile=await transportProfile();
  if(!profile.available||!profile.skills?.known||!profile.cargo?.planningCapacity)throw new ApiError('缺少可用的船型、技能或容量模型。',409);
  if(!binding?.character.scopes.includes('esi-location.read_location.v1'))throw new ApiError('航程需要角色位置授权。',403);
  const token=await accessToken();const location=(await esi(`/characters/${binding.character.id}/location/`,{token})).data;
  const ship=(await esi(`/characters/${binding.character.id}/ship/`,{token})).data;
  if(ship.ship_item_id!==characterState.ship?.ship_item_id)throw new ApiError('当前船已变化，请同步角色后重新估算。',409);
  for(const id of [input.sourceStationId,input.destinationStationId,...(input.pickupCargo?[input.pickupCargo.sourceStationId,input.pickupCargo.destinationStationId]:[])])if(!Number.isInteger(id)||id<60000000||id>=64000000)throw new ApiError('仅支持 NPC 站之间的运输估算。',400);
  const allowed=input.allowed;if(!Array.isArray(allowed)||!allowed.length||allowed.some(z=>!['high','low','null'].includes(z)))throw new ApiError('请选择允许区域。',400);
  const cacheKey=JSON.stringify([authEpoch,binding.character.id,ship.ship_item_id,location,profile,input.sourceStationId,input.destinationStationId,[...new Set(allowed)].sort(),Boolean(input.returnHome),input.pickupCargo||null]);
  const result=await tripCache.get(cacheKey,async()=>{
  const classify=s=>s.security_status<=0?'null':Math.round(s.security_status*10)>=5?'high':'low';
  const source=await station(input.sourceStationId),destination=await station(input.destinationStationId);
  const home=location.station_id?await station(location.station_id):null;
  const points=[{system:location.solar_system_id,position:home?.position||null}];
  if(input.pickupCargo){for(const id of [input.pickupCargo.sourceStationId,input.pickupCargo.destinationStationId]){const stop=await station(id);points.push({system:stop.system_id,position:stop.position||null});}}
  points.push({system:source.system_id,position:source.position||null},{system:destination.system_id,position:destination.position||null});
  if(input.returnHome)points.push(points[0]);
  const segments=[],allIds=[],approachIds=[];let jumps=0,approachJumps=0;
  const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z):null;
  for(let i=1;i<points.length;i++){
   const start=points[i-1],end=points[i];let ids=await getRoute(start.system,end.system);let systems=await pool(ids,id=>system(id));
   if(systems.some(s=>!allowed.includes(classify(s)))){const secure=await getRoute(start.system,end.system,'secure');const ss=await pool(secure,id=>system(id));if(ss.every(s=>allowed.includes(classify(s)))){ids=secure;systems=ss;}}
   if(systems.some(s=>!allowed.includes(classify(s))))throw new ApiError('全程含未允许区域，未给出有效 ISK/h。',409);
   if(i<=(input.pickupCargo?3:1)){approachIds.push(...(approachIds.length?ids.slice(1):ids));approachJumps+=Math.max(0,ids.length-1);}
   allIds.push(...(allIds.length?ids.slice(1):ids));jumps+=Math.max(0,ids.length-1);
   let position=start.position;
   for(let k=1;k<ids.length;k++){const outbound=await between(ids[k-1],ids[k]);segments.push({systemId:ids[k-1],distanceMeters:distance(position,outbound.position)});const inbound=await gate(outbound.destination.stargate_id);position=inbound.position;}
   // Already at a purchase station needs no invented warp; other same-system legs do.
   const finalDistance=distance(position,end.position);if(finalDistance===null||finalDistance>150000)segments.push({systemId:end.system,distanceMeters:finalDistance});
  }
  if(auth!==binding)throw new ApiError('授权角色已改变。',409);
  let extraPickupJumps=0;if(input.pickupCargo){let baseline=await getRoute(location.solar_system_id,source.system_id);if((await pool(baseline,id=>system(id))).some(s=>!allowed.includes(classify(s))))baseline=await getRoute(location.solar_system_id,source.system_id,'secure');extraPickupJumps=approachJumps-Math.max(0,baseline.length-1);if(extraPickupJumps>2)throw new ApiError('顺路单取货段额外绕行超过 2 跳，未纳入组合。',409);}
  const pickupNeighbors=await pool((await system(source.system_id)).stargates||[],id=>gate(id));
  const pickupAreaIds=[source.system_id,...pickupNeighbors.map(g=>g.destination.system_id)];
  const stopIds=[...(input.pickupCargo?[input.pickupCargo.sourceStationId,input.pickupCargo.destinationStationId]:[]),input.sourceStationId,input.destinationStationId,...(input.returnHome&&home?[location.station_id]:[])];
  const stops=stopIds.filter((id,i)=>i===0||id!==stopIds[i-1]).length;
  const time=estimateTravel(profile,segments,jumps,stops);
  return {profile,time,routeIds:allIds,approachIds,pickupAreaIds,extraPickupJumps,returnHome:Boolean(input.returnHome),fetchedAt:new Date(now()).toISOString(),locationSource:'ESI current character location',mode:profile.cargo.mode};
  });if(auth!==binding)throw new ApiError('授权角色已改变。',409);return result;
 }
 async function metadata(){return (await request('https://login.eveonline.com/.well-known/oauth-authorization-server',{ttl:3600000})).data;}
 async function acceptTokens(tokens,clientId,expectedId){const m=await metadata();const keys=(await request(m.jwks_uri,{ttl:3600000})).data.keys;const character=verifyEveJWT(tokens.access_token,clientId,keys,now());if(expectedId&&character.id!==expectedId)throw new ApiError('拒绝与已绑定角色不一致的刷新授权',401);auth={clientId,character,accessToken:tokens.access_token,refreshToken:tokens.refresh_token||auth?.refreshToken,expiresAt:now()+Math.max(1,Number(tokens.expires_in||1200)-60)*1000};await storage.save(auth);lastError=null;return character;}
 async function tokenRequest(values){const m=await metadata();const r=await fetchImpl(m.token_endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':UA},body:new URLSearchParams(values),signal:AbortSignal.timeout(30000)});if(!r.ok)throw new ApiError(`SSO 授权交换失败 HTTP ${r.status}；请检查应用权限、回调地址或重新登录。`,401);return r.json();}
 let refreshing=null;
 async function accessToken(){await ready;if(!auth)throw new ApiError('请先在 EVE 浏览器登录页授权角色。',401);if(auth.expiresAt>now())return auth.accessToken;if(!refreshing)refreshing=(async()=>{try{const binding=auth;const data=await tokenRequest({grant_type:'refresh_token',refresh_token:binding.refreshToken,client_id:binding.clientId});if(auth!==binding)throw new ApiError('授权状态已改变，取消旧刷新。',401);await acceptTokens(data,binding.clientId,binding.character.id);}finally{refreshing=null;}})();await refreshing;return auth.accessToken;}
 async function syncCharacter(){if(characterJob)return characterJob;characterJob=(async()=>{try{const token=await accessToken(),binding=auth,id=binding.character.id,scopes=binding.character.scopes,values={},errors=[];
   const queries=[['wallet','wallet/','esi-wallet.read_character_wallet.v1'],['transactions','wallet/transactions/','esi-wallet.read_character_wallet.v1'],['journal','wallet/journal/','esi-wallet.read_character_wallet.v1'],['orders','orders/','esi-markets.read_character_orders.v1'],['skills','skills/','esi-skills.read_skills.v1'],['attributes','attributes/','esi-skills.read_skills.v1'],['queue','skillqueue/','esi-skills.read_skillqueue.v1'],['location','location/','esi-location.read_location.v1'],['ship','ship/','esi-location.read_ship_type.v1'],['assets','assets/','esi-assets.read_assets.v1'],['mining','mining/','esi-industry.read_character_mining.v1'],['implants','implants/','esi-clones.read_implants.v1'],['standings','standings/','esi-characters.read_standings.v1'],['losses','killmails/recent/','esi-killmails.read_killmails.v1']];
   await pool(queries,async([key,endpoint,scope])=>{if(!scopes.includes(scope)){errors.push({field:key,error:'未授权',scope});return;}try{const r=await esi(`/characters/${id}/${endpoint}`,{token});const n=Number(r.headers['x-pages']||1);if(n>1){const all=await paged(`/characters/${id}/${endpoint}`,token,100);values[key]=all.data;}else values[key]=r.data;values[`${key}Source`]={fetchedAt:r.fetchedAt,expiresAt:r.expiresAt};}catch(e){errors.push({field:key,error:e.message,scope});}},3);
   const names=new Set([3327,3453,3340]);if(values.ship?.ship_type_id)names.add(values.ship.ship_type_id);(values.mining||[]).forEach(x=>names.add(x.type_id));(values.assets||[]).filter(a=>a.location_id===values.ship?.ship_item_id).forEach(a=>names.add(a.type_id));
   const resolvedTypes=[];await pool([...names].slice(0,150),async id=>{try{resolvedTypes.push(await type(id));}catch{}},4);
   const labelIds=[...new Set([...(values.queue||[]).map(q=>q.skill_id),...(values.transactions||[]).slice(0,50).map(t=>t.type_id),...(values.mining||[]).map(m=>m.solar_system_id)])];
   if(labelIds.length){try{const labeled=(await esi('/universe/names/',{method:'POST',body:labelIds.slice(0,1000),ttl:86400000})).data;values.names=Object.fromEntries(labeled.map(x=>[x.id,x.name]));}catch{}}
   if(values.location?.solar_system_id)values.currentSystem=await system(values.location.solar_system_id);
   if(auth!==binding)throw new ApiError('角色授权已改变，丢弃旧同步。',401);characterState={...values,character:binding.character,types:resolvedTypes,errors,fetchedAt:new Date(now()).toISOString()};characterState.transport=buildTransportProfile(characterState,now());lastError=null;return characterState;
  }finally{characterJob=null;}})();return characterJob;}
 async function beginAuth(clientId,full=false){if(!/^[a-fA-F0-9]{32}$/.test(clientId))throw new ApiError('Client ID 应为 32 位公开应用标识；不要输入 Client Secret。',400);if(pending)throw new ApiError('已有授权等待回调；请完成或取消后再试。',409);
  const m=await metadata(),verifier=randomBytes(48).toString('base64url'),state=randomBytes(32).toString('base64url');
  const expiresAt=now()+600000;pending={state,verifier,clientId,expiresAt,epoch:authEpoch,expectedId:auth?.character?.id};
  const url=new URL(m.authorization_endpoint);Object.entries({response_type:'code',client_id:clientId,redirect_uri:REDIRECT_URI,scope:(full?FULL_SCOPES:BASIC_SCOPES).join(' '),state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).forEach(([k,v])=>url.searchParams.set(k,v));
  callbackServer=createServer(async(req,res)=>{const u=new URL(req.url,'http://localhost:8765');if(u.pathname!=='/callback'){res.writeHead(404);res.end();return;}const attempt=pending;
   if(!attempt||attempt.expiresAt<now()||u.searchParams.get('state')!==attempt.state){res.writeHead(400,{'Content-Type':'text/plain; charset=utf-8'});res.end('无效或过期的授权回调。请回到 EVE Master 重试。');return;}
   pending=null;
   try{if(u.searchParams.has('error'))throw new ApiError('已取消授权或应用 scopes 尚未启用。',401);const code=u.searchParams.get('code');if(!code)throw new ApiError('授权没有返回 code',400);const data=await tokenRequest({grant_type:'authorization_code',code,client_id:attempt.clientId,code_verifier:attempt.verifier});if(attempt.epoch!==authEpoch)throw new ApiError('此授权流程已取消。',401);const character=await acceptTokens(data,attempt.clientId,attempt.expectedId);characterState=null;res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'"});res.end('<!doctype html><meta charset="utf-8"><title>EVE Master 已授权</title><body style="background:#101820;color:#d4e5ee;padding:60px;font:18px system-ui"><h1>授权成功</h1><p>请返回 EVE Master，角色将自动同步。可以关闭此页。</p></body>');void syncCharacter().catch(e=>{lastError=e.message;});}catch(e){lastError=e.message;res.writeHead(400,{'Content-Type':'text/plain; charset=utf-8'});res.end('授权失败。请返回 EVE Master 查看原因并重试。');}finally{callbackServer?.close();callbackServer=null;}
  });
  try{await new Promise((resolve,reject)=>{callbackServer.once('error',reject);callbackServer.listen(8765,'127.0.0.1',resolve);});}catch{pending=null;callbackServer?.close();callbackServer=null;throw new ApiError('回调端口 8765 被占用。请先完成或关闭另一个 EVE 登录流程。',409);}
  const timer=setTimeout(()=>{if(pending?.state===state){pending=null;callbackServer?.close();callbackServer=null;lastError='授权等待超时，可重新打开登录。';}},600000);timer.unref();
  if(openExternal)await openExternal(url.href);return {url:url.href,opened:Boolean(openExternal),redirectUri:REDIRECT_URI,scopes:full?FULL_SCOPES:BASIC_SCOPES};
 }
 async function body(req,limit=65536){let bytes=0,parts=[];for await(const part of req){bytes+=part.length;if(bytes>limit)throw new ApiError('请求过大',413);parts.push(part);}try{return JSON.parse(Buffer.concat(parts).toString()||'{}');}catch{throw new ApiError('无效 JSON',400);}}
 const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'});res.end(JSON.stringify(value));};
 async function sendVersioned(req,res,kind,value,version){
  const etag='W/"'+createHash('sha256').update(JSON.stringify([session,kind,version])).digest('base64url')+'"';
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',ETag:etag,Vary:'Accept-Encoding','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'};
  if(req.headers['if-none-match']?.split(',').map(v=>v.trim()).includes(etag)){res.writeHead(304,headers);res.end();return;}
  let entry=responseCache.get(kind);if(!entry||entry.etag!==etag){entry={etag,body:Buffer.from(JSON.stringify(value)),compressed:null};responseCache.set(kind,entry);}
  const compressed=(req.headers['accept-encoding']||'').split(',').some(part=>{const match=part.trim().match(/^gzip(?:\s*;\s*q=([0-9.]+))?$/i);return match&&Number(match[1]??1)>0;})&&entry.body.length>2048;
  if(compressed&&!entry.compressed)entry.compressed=zip(entry.body);
  const body=compressed?await entry.compressed:entry.body;res.writeHead(200,{...headers,...(compressed?{'Content-Encoding':'gzip'}:{}),'Content-Length':body.length});res.end(body);
 }
 async function nativeCall(work){try{return await work();}catch(e){throw new ApiError(e.message,e.status||503);}}
 const localIntel=createLocalIntel({esi,request,type,now});
 async function handler(req,res){
  try{await ready;const host=req.headers.host||'';if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))throw new ApiError('仅允许本机访问',403);
   const origin=req.headers.origin;if(origin){let o;try{o=new URL(origin);}catch{}if(!o||o.protocol!=='http:'||!['localhost','127.0.0.1'].includes(o.hostname)||o.port!==(host.split(':')[1]||'80'))throw new ApiError('跨来源请求被拒绝',403);}
   if(req.headers['sec-fetch-site']==='cross-site')throw new ApiError('拒绝跨站访问本地数据',403);
   const u=new URL(req.url,`http://${host}`);if(!u.pathname.startsWith('/api/'))return false;
   if(req.method==='POST'&&req.headers['x-eve-session']!==session)throw new ApiError('本地会话已改变，请刷新页面',403);
   if(req.method==='POST'&&u.pathname==='/api/local/windows'){await body(req);send(res,200,await nativeCall(()=>nativeCapture.list()));return true;}
   if(req.method==='POST'&&u.pathname==='/api/local/frame'){const input=await body(req);send(res,200,await nativeCall(()=>nativeCapture.frame(input)));return true;}
   if(req.method==='POST'&&u.pathname==='/api/local/ocr'){const v=await body(req,4100000);const result=await recognizeLocal(v.image);send(res,200,{...result,candidates:localNameCandidates(result.lines),capturedAt:new Date(now()).toISOString()});return true;}
   if(req.method==='POST'&&u.pathname==='/api/local/batch'){const v=await body(req);send(res,200,await localIntel.batch(v.ids));return true;}
   if(req.method==='POST'&&u.pathname==='/api/local/resolve'){const v=await body(req);send(res,200,{matches:await localIntel.resolve(v.names)});return true;}
   if(req.method==='GET'&&/^\/api\/local\/pilot\/\d+$/.test(u.pathname)){send(res,200,await localIntel.pilot(Number(u.pathname.split('/').at(-1))));return true;}
   if(u.pathname==='/api/favorites'||u.pathname.startsWith('/api/favorites/')){
    if(!auth?.character)throw new ApiError('请先授权角色以读取收藏',401);
    if(!favoriteStore)throw new ApiError('本地收藏数据库不可用',503);
    const id=auth.character.id;
    if(req.method==='GET'&&u.pathname==='/api/favorites'){send(res,200,{characterId:id,favorites:favoriteStore.list(id)});return true;}
    if(req.method==='POST'){
     const v=await body(req);if(auth?.character?.id!==id||v.characterId!==id)throw new ApiError('角色已改变，请刷新收藏',409);
     let favorites;try{if(u.pathname==='/api/favorites/save')favorites=favoriteStore.upsert(id,v.favorite);else if(u.pathname==='/api/favorites/delete')favorites=favoriteStore.remove(id,v.systemId);else if(u.pathname==='/api/favorites/import')favorites=favoriteStore.import(id,v.source,v.favorites);else throw new ApiError('未知收藏操作',404);}catch(e){throw new ApiError(e.message,e.status||400);}
     send(res,200,{characterId:id,favorites});return true;
    }
    throw new ApiError('不支持的收藏操作',405);
   }
   if(req.method==='GET'&&u.pathname==='/api/bootstrap'){send(res,200,{session,clientId,redirectUri:REDIRECT_URI,basicScopes:BASIC_SCOPES,fullScopes:FULL_SCOPES,credentialStorage:storage.mode||'encrypted',character:auth?.character||null,authorizing:Boolean(pending),error:lastError,publicProgress:progress});return true;}
   if(req.method==='GET'&&u.pathname==='/api/public'){if(!publicState){if(!publicLoad)publicLoad=readFile(path.join(dataDir,'public-snapshot.json'),'utf8').then(text=>{if(!publicState)publicState=JSON.parse(text);}).catch(()=>{});await publicLoad;}const snapshotVersion=publicState?createHash('sha256').update(session+objectId(publicState)).digest('base64url'):null;const unchanged=snapshotVersion&&u.searchParams.get('since')===snapshotVersion;await sendVersioned(req,res,unchanged?'public:delta':'public:full',{...(unchanged?{}:{snapshot:publicState}),snapshotVersion,progress:{...progress},error:lastError},[objectId(publicState),progress,lastError,Boolean(unchanged)]);return true;}
   if(req.method==='POST'&&u.pathname==='/api/public/refresh'){void refreshPublic().catch(()=>{});send(res,202,{started:true});return true;}
   if(req.method==='GET'&&u.pathname==='/api/character'){await sendVersioned(req,res,'character',{snapshot:characterState,character:auth?.character||null,error:lastError,syncing:Boolean(characterJob)},[authEpoch,auth?.character?.id,characterState?.fetchedAt,characterState?.locationSource,characterState?.location,characterState?.ship,lastError,Boolean(characterJob)]);return true;}
   if(req.method==='GET'&&u.pathname==='/api/transport'){send(res,200,await transportProfile());return true;}
   if(req.method==='POST'&&u.pathname==='/api/hauling/estimate'){send(res,200,await haulingEstimate(await body(req)));return true;}
   if(req.method==='GET'&&u.pathname==='/api/position'){const token=await accessToken(),binding=auth,id=binding.character.id;if(!binding.character.scopes.includes('esi-location.read_location.v1'))throw new ApiError('未授权位置',403);const r=await esi(`/characters/${id}/location/`,{token});const value={location:r.data,locationSource:{fetchedAt:r.fetchedAt,expiresAt:r.expiresAt},currentSystem:await system(r.data.solar_system_id)};if(binding.character.scopes.includes('esi-location.read_ship_type.v1')){try{value.ship=(await esi(`/characters/${id}/ship/`,{token})).data;}catch{value.ship=null;}}if(auth!==binding)throw new ApiError('授权已改变，丢弃旧位置',401);if(characterState?.character?.id===id)characterState={...characterState,...value};send(res,200,value);return true;}
   if(req.method==='POST'&&u.pathname==='/api/character/sync'){void syncCharacter().catch(e=>{lastError=e.message;});send(res,202,{started:true});return true;}
   if(req.method==='POST'&&u.pathname==='/api/auth/start'){const v=await body(req);send(res,200,await beginAuth(v.clientId||clientId,v.full===true));return true;}
   if(req.method==='POST'&&u.pathname==='/api/auth/cancel'){authEpoch++;pending=null;callbackServer?.close();callbackServer=null;send(res,200,{cancelled:true});return true;}
   if(req.method==='POST'&&u.pathname==='/api/auth/disconnect'){authEpoch++;pending=null;callbackServer?.close();callbackServer=null;auth=null;characterState=null;tripCache.clear();responseCache.delete('character');memory.forEach((_,key)=>{if(key.startsWith('private:'))memory.delete(key);});await storage.clear();send(res,200,{disconnected:true});return true;}
   if(req.method==='POST'&&u.pathname==='/api/route'){const v=await body(req);if(!Number.isInteger(v.from)||!Number.isInteger(v.to)||![v.from,v.to].every(n=>n>=30000000&&n<33000000)||!['shortest','secure'].includes(v.flag||'shortest'))throw new ApiError('星系 ID 或路线策略无效',400);const ids=await getRoute(v.from,v.to,v.flag||'shortest');const graph=await pool(ids,id=>system(id),4);send(res,200,{ids,systems:graph,fetchedAt:new Date(now()).toISOString(),source:`ESI ${v.flag||'shortest'} route`});return true;}
   if(req.method==='GET'&&/^\/api\/risk\/\d+$/.test(u.pathname)){const id=Number(u.pathname.split('/').at(-1));if(id<30000000||id>=33000000)throw new ApiError('星系 ID 无效',400);const result=await request(`https://zkillboard.com/api/solarSystemID/${id}/`,{ttl:3600000});if(!Array.isArray(result.data))throw new ApiError('zKillboard 返回格式不匹配');const kills=[...new Map(result.data.filter(k=>k.killmail_id&&k.solar_system_id===id).map(k=>[k.killmail_id,k])).values()].slice(0,200);const recent=await pool(kills.slice(0,12),async k=>{let shipName;try{shipName=(await type(k.victim.ship_type_id)).name;}catch{}return {id:k.killmail_id,eventAt:k.killmail_time,shipTypeId:k.victim.ship_type_id,shipName:shipName||null,attackers:k.attackers?.length??null,isk:k.zkb?.totalValue??null};},3);send(res,200,{systemId:id,fetchedAt:result.fetchedAt,expiresAt:result.expiresAt,returned:kills.length,coverage:'latest up to 200 known killmails; incomplete and publication may be delayed',recent});return true;}
   if(req.method==='POST'&&u.pathname==='/api/neighborhood'){const v=await body(req),id=v.systemId;if(!Number.isInteger(id)||id<30000000||id>=33000000)throw new ApiError('星系 ID 无效',400);const origin=await system(id),gates=await pool(origin.stargates||[],gateId=>esi(`/universe/stargates/${gateId}/`,{ttl:86400000}),4);const neighbors=await pool([...new Set(gates.map(g=>g.data.destination.system_id))],system,4);send(res,200,{systems:[origin,...neighbors],edges:neighbors.map(s=>[id,s.id]),fetchedAt:new Date(now()).toISOString(),source:'ESI actual stargates / one-hop neighborhood'});return true;}
   if(req.method==='GET'&&/^\/api\/type\/\d+$/.test(u.pathname)){send(res,200,await type(Number(u.pathname.split('/').at(-1))));return true;}
   send(res,404,{error:'未知 API'});return true;
  }catch(e){send(res,e.status||500,{error:e instanceof ApiError?e.message:'本地数据服务失败，请重试或查看连接状态。'});return true;}
 }
 return {handler,refreshPublic,syncCharacter,request,getRoute,close(){pending=null;callbackServer?.close();favoriteStore?.close();},get cacheStats(){return {...tripCache.stats,size:tripCache.size};},get progress(){return clone(progress);}};
}
