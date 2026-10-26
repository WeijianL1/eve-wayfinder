import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request as httpRequest} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createService,verifyEveJWT} from '../server/service.mjs';

test('public HTTP cache persists and respects Expires, then revalidates using ETag',async()=>{
 const dataDir=await mkdtemp(path.join(tmpdir(),'eve-cache-'));let now=100000,calls=0;
 const fetchImpl=async(_,options)=>{calls++;if(calls===2){assert.equal(options.headers['If-None-Match'],'book-v1');return new Response(null,{status:304,headers:{Expires:new Date(now+5000).toUTCString()}});}return new Response(JSON.stringify({price:42}),{headers:{'Content-Type':'application/json',Expires:new Date(now+1000).toUTCString(),ETag:'book-v1'}});};
 try{const a=createService({dataDir,fetchImpl,now:()=>now});assert.equal((await a.request('https://example.test/books')).data.price,42);await a.request('https://example.test/books');assert.equal(calls,1);now+=2000;assert.equal((await a.request('https://example.test/books')).data.price,42);assert.equal(calls,2);a.close();}finally{await rm(dataDir,{recursive:true,force:true});}
});
test('backend rejects untrusted Host/Origin and CSRF, and bootstrap never exposes credentials',async()=>{
 const dataDir=await mkdtemp(path.join(tmpdir(),'eve-http-'));const service=createService({dataDir,fetchImpl:async()=>{throw Error('should not call network');}});const server=createServer((req,res)=>void service.handler(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{const boot=await(await fetch(base+'/api/bootstrap')).json();assert.ok(boot.session);assert.equal(boot.character,null);assert.equal('accessToken' in boot,false);assert.equal('refreshToken' in boot,false);
 assert.equal((await fetch(base+'/api/auth/cancel',{method:'POST'})).status,403);
 assert.equal((await fetch(base+'/api/bootstrap',{headers:{Origin:'https://evil.invalid'}})).status,403);
 const hostile=await new Promise((resolve,reject)=>{const req=httpRequest(base+'/api/bootstrap',{headers:{Host:'evil.invalid'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});assert.equal(hostile,403);
 assert.equal((await fetch(base+'/api/auth/cancel',{method:'POST',headers:{'X-Eve-Session':boot.session}})).status,200);
 }finally{service.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true});}
});
test('SSO JWT requires real signature, correct issuer/audiences, expiry and character identity',()=>{
 const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});const jwk={...publicKey.export({format:'jwk'}),kid:'test-key'},client='public-client';
 const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
 const token=(overrides={})=>{const data=[encode({alg:'RS256',kid:'test-key'}),encode({iss:'https://login.eveonline.com',aud:[client,'EVE Online'],exp:2000,sub:'CHARACTER:EVE:42',name:'Test',scp:['esi-skills.read_skills.v1'],...overrides})].join('.');return data+'.'+sign('RSA-SHA256',Buffer.from(data),privateKey).toString('base64url');};
 assert.equal(verifyEveJWT(token(),client,[jwk],1000000).id,42);
 assert.throws(()=>verifyEveJWT(token({aud:['other','EVE Online']}),client,[jwk],1000000));
 assert.throws(()=>verifyEveJWT(token({iss:'https://evil.invalid'}),client,[jwk],1000000));
 assert.throws(()=>verifyEveJWT(token({exp:1}),client,[jwk],1000000));
 assert.throws(()=>verifyEveJWT(token({sub:'ACCOUNT:42'}),client,[jwk],1000000));
 const broken=token().split('.');broken[1]=encode({sub:'CHARACTER:EVE:123'});assert.throws(()=>verifyEveJWT(broken.join('.'),client,[jwk],1000000));
});

test('regional sweep covers catalog goods with minimum page expiry and rejects incomplete regions',async()=>{
 const dataDir=await mkdtemp(path.join(tmpdir(),'eve-sweep-'));let failPage=false;
 const types={34:'Tritanium',35:'Pyerite'};const now=Date.now();
 const fetchImpl=async(raw,options)=>{const u=new URL(raw),p=u.pathname;let data=[],headers={Expires:new Date(now+600000).toUTCString()};
  if(p.endsWith('/universe/ids/')){const names=JSON.parse(options.body);data={inventory_types:Object.entries(types).filter(([,name])=>names.includes(name)).map(([id,name])=>({id:Number(id),name})),regions:names.includes('The Forge')?[{id:10000002,name:'The Forge'}]:[]};}
  else if(p.includes('/markets/')){headers['X-Pages']='2';if(u.searchParams.get('page')==='2'){if(failPage)return new Response('{}',{status:400});headers.Expires=new Date(now+120000).toUTCString();data=[{order_id:2,type_id:35,location_id:60000001,system_id:30000142,is_buy_order:true,price:20,volume_remain:20}];}else data=[{order_id:1,type_id:34,location_id:60000001,system_id:30000142,is_buy_order:false,price:10,volume_remain:10},{order_id:3,type_id:999999,location_id:60000001}];}
  else if(p.includes('/universe/types/')){const id=Number(p.split('/').at(-2));data={name:types[id],volume:.01,dogma_attributes:[]};}
  else if(p.includes('/universe/stations/'))data={name:'NPC',system_id:30000142};
  else if(p.includes('/universe/systems/'))data={name:'Jita',security_status:.9,position:{x:0,y:0,z:0}};
  else if(p.includes('/dogma/attributes/'))data={name:'unused'};
  else if(p.endsWith('/status/'))data={players:1};
  return new Response(JSON.stringify(data),{headers});
 };
 try{const service=createService({dataDir,fetchImpl,now:()=>now});const snapshot=await service.refreshPublic();assert.equal(snapshot.orders.length,2);assert.equal(snapshot.coverage.resolved,2);assert.equal(snapshot.sources.length,2);assert.equal(snapshot.sources[0].expiresAt,Date.parse(new Date(now+120000).toUTCString()));service.close();
 failPage=true;const failed=createService({dataDir:path.join(dataDir,'failed'),fetchImpl,now:()=>now});await assert.rejects(failed.refreshPublic(),/完整订单/);failed.close();
 }finally{await rm(dataDir,{recursive:true,force:true});}
});

test('private hauling estimate uses real intra-system gate positions and rejects forbidden route legs',async()=>{
 const dataDir=await mkdtemp(path.join(tmpdir(),'eve-trip-'));const now=Date.now(),A=30000001,B=30000002,SA=60000001,SB=60000002,AU=149597870700;
 const auth={character:{id:42,name:'fixture',scopes:['esi-location.read_location.v1','esi-location.read_ship_type.v1','esi-assets.read_assets.v1','esi-skills.read_skills.v1']},refreshToken:'fixture',accessToken:'fixture',expiresAt:now+3600000};
 const fetchImpl=async raw=>{const p=new URL(raw).pathname;let data;
 if(p.includes('/characters/42/ship/'))data={ship_item_id:999,ship_type_id:657};
 else if(p.includes('/characters/42/location/'))data={solar_system_id:A,station_id:SA};
 else if(p.includes('/characters/42/skills/'))data={skills:[{skill_id:3340,active_skill_level:3},{skill_id:3327,active_skill_level:4},{skill_id:3453,active_skill_level:1}]};
 else if(p.includes('/characters/42/assets/'))data=[];
 else if(p.includes('/characters/'))data={};
 else if(p.includes('/universe/types/')){const id=Number(p.split('/').at(-2));data={name:id===657?'Iteron Mark V':'skill',capacity:5800,mass:13500000,dogma_attributes:[{attribute_id:70,value:.87},{attribute_id:600,value:3.5},{attribute_id:496,value:5}]};}
 else if(p.includes('/universe/stations/')){const id=Number(p.split('/').at(-2));data={name:'NPC',system_id:id===SA?A:B,position:{x:0,y:0,z:0}};}
 else if(p.includes('/universe/systems/')){const id=Number(p.split('/').at(-2));data={name:'system',security_status:id===A?.9:.2,stargates:[id===A?1:2],position:{x:0,y:0,z:0}};}
 else if(p.includes('/universe/stargates/')){const id=Number(p.split('/').at(-2));data={position:{x:AU,y:0,z:0},destination:{system_id:id===1?B:A,stargate_id:id===1?2:1}};}
 else if(p.includes('/route/')){const parts=p.split('/');const from=Number(parts[3]),to=Number(parts[4]);data=from===to?[from]:[from,to];}
 else throw Error('Unexpected endpoint '+p);
 return new Response(JSON.stringify(data),{headers:{Expires:new Date(now+600000).toUTCString()}});
 };
 const service=createService({dataDir,fetchImpl,now:()=>now,credentialStore:{load:async()=>auth,save:async()=>{},clear:async()=>{}}});const server=createServer((req,res)=>void service.handler(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{const boot=await(await fetch(base+'/api/bootstrap')).json();const send=(allowed,pickupCargo)=>fetch(base+'/api/hauling/estimate',{method:'POST',headers:{'Content-Type':'application/json','X-Eve-Session':boot.session},body:JSON.stringify({sourceStationId:SA,destinationStationId:SB,allowed,returnHome:true,pickupCargo})});const ok=await send(['high','low']);const e=await ok.json();assert.equal(ok.status,200,JSON.stringify(e));assert.equal(e.time.jumps,2);assert.equal(e.time.warps,4);assert.equal(e.time.measuredDistances,4);assert.equal(e.time.stops,3);assert.equal(e.profile.cargo.free,null);assert.deepEqual(e.approachIds,[A]);const repeated=await send(['high','low']);assert.equal(repeated.status,200);assert.equal(service.cacheStats.hits,1);assert.ok(e.pickupAreaIds.includes(B));const sideResponse=await send(['high','low'],{sourceStationId:SB,destinationStationId:SA});const side=await sideResponse.json();assert.equal(sideResponse.status,200,JSON.stringify(side));assert.equal(side.extraPickupJumps,2);assert.equal(side.time.jumps,4);assert.equal(side.time.stops,4);assert.ok(side.time.highSeconds>e.time.highSeconds);const blocked=await send(['high']);assert.equal(blocked.status,409);assert.match((await blocked.json()).error,/未允许区域/);
 }finally{service.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true});}
});
