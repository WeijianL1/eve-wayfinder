import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localNameCandidates,recognizeLocal} from '../server/local-ocr.mjs';
import {createLocalIntel} from '../server/local-intel.mjs';
test('OCR names preserve ambiguous characters and exclude header noise; invalid images never spawn OCR',async()=>{
 assert.deepEqual(localNameCandidates([{text:'Local',confidence:1},{text:'3',confidence:1},{text:' Prexa ',confidence:.5},{text:'Prexa',confidence:1},{text:'Roggo Il Seuchenvogel',confidence:1},{text:'wrong',confidence:.1}]).map(r=>r.name),['Prexa','Roggo Il Seuchenvogel']);
 const uncertain=localNameCandidates([{text:'Prexa',confidence:.3},{text:'Roggo |l Seuchenvogel',confidence:.5}]);assert.equal(uncertain.length,2);assert.equal(uncertain[1].needsReview,true);
 await assert.rejects(recognizeLocal('file:///private.png'),/PNG/);
});
test('batch identities deduplicate IDs, cap upstream concurrency, share cached work and label only observed mining/hauling targets',async()=>{
 let active=0,maxActive=0,calls=0,now=Date.now();const esiCalls=[];
 const esi=async(url,options)=>{esiCalls.push(url);if(url==='/universe/names/')return {data:options.body.map(id=>({id,name:`Pilot ${id}`,category:'character'}))};if(url==='/characters/affiliation/')return {data:options.body.map(id=>({character_id:id,corporation_id:99}))};if(url==='/universe/ids/')return {data:{characters:[{id:1,name:'Prexa'}]}};if(url.includes('/groups/'))return {data:{name:'Hauler'}};throw Error('Unexpected individual identity call');};
 const request=async url=>{calls++;active++;maxActive=Math.max(maxActive,active);await new Promise(r=>setTimeout(r,5));active--;const id=Number(url.split('/').at(-2));return {fetchedAt:new Date(now).toISOString(),expiresAt:now+10000,data:[{killmail_id:10+id,killmail_time:new Date(now).toISOString(),solar_system_id:30000142,victim:{character_id:70,ship_type_id:657},attackers:[{character_id:id}]},{killmail_id:100+id,killmail_time:new Date(now-40*86400000).toISOString(),victim:{character_id:71},attackers:[{character_id:id}]}]};};
 const intel=createLocalIntel({esi,request,type:async()=>({name:'Iteron Mark V',group_id:28}),now:()=>now,paceMs:0});
 const r=await intel.batch([1,1,2,3]);assert.equal(r.results.length,3);assert.equal(calls,3);assert.ok(maxActive<=2);assert.equal(r.results[0].profile.haulingTargets,1);assert.equal(r.results[0].profile.matchedKills,1);assert.equal(r.results[0].profile.inspected,1);
 await intel.batch([1,2]);assert.equal(calls,3);now+=11000;await intel.batch([1]);assert.equal(calls,4);
 const match=await intel.resolve(['Prexa','Roggo Il Seuchenvogel']);assert.equal(match[0].character.id,1);assert.equal(match[1].character,null);assert.equal(match[1].needsReview,true);await assert.rejects(intel.batch(Array(51).fill(1)),/50/);
});
test('upstream errors are not interpreted or cached as safe empty history',async()=>{
 let calls=0;const intel=createLocalIntel({esi:async()=>({data:{name:'Pilot'}}),type:async()=>null,paceMs:0,request:async()=>{calls++;if(calls===1)throw Error('429 cooldown');return {data:{error:'invalid body'}};}});
 await assert.rejects(intel.pilot(1),/429/);await assert.rejects(intel.pilot(1),/有效战损/);assert.equal(calls,2);
});
