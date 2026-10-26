import {createMemoCache} from './memo-cache.mjs';
export function createLocalIntel({esi,request,type,now=Date.now,paceMs=1000}){
 const cache=createMemoCache({ttl:3600000,max:256,now});
 async function resolve(names){
 if(!Array.isArray(names)||!names.length||names.length>50||!names.every(n=>typeof n==='string'&&n.trim().length>=3&&n.trim().length<=37))throw Object.assign(Error('每次最多解析 50 个角色名'),{status:400});
 const unique=[...new Set(names.map(n=>n.trim().replace(/\s+/g,' ')))];const result=await esi('/universe/ids/',{method:'POST',body:[...unique].sort(),ttl:86400000});
 const matches=new Map((result.data.characters||[]).map(c=>[c.name.toLowerCase(),c]));return unique.map(name=>({input:name,character:matches.get(name.toLowerCase())||null,needsReview:/\b[Il1]{2,}\b/.test(name)}));
 }
 let active=0,nextZkill=0;const waiting=[];async function permit(load){if(active>=2){if(waiting.length>=100)throw Object.assign(Error('查询队列已满，请稍后再试'),{status:429});await new Promise(r=>waiting.push(r));}else active++;try{return await load();}finally{const next=waiting.shift();if(next)next();else active--;}}
 async function zkill(url){const at=Math.max(now(),nextZkill);nextZkill=at+paceMs;if(at>now())await new Promise(r=>setTimeout(r,at-now()));return request(url,{ttl:3600000});}
 const cachedPilot=(id,identity=null)=>cache.get(String(id),()=>permit(async()=>{
 if(!Number.isSafeInteger(id)||id<=0)throw Object.assign(Error('角色 ID 无效'),{status:400});
 const [character,result]=await Promise.all([identity?Promise.resolve({data:identity}):esi(`/characters/${id}/`,{ttl:3600000}),zkill(`https://zkillboard.com/api/kills/characterID/${id}/`)]);
 if(!Array.isArray(result.data))throw Error('zKillboard 未返回有效战损，不能当作没有记录');
 const cutoff=now()-30*86400000;
 const kills=result.data.filter(k=>k.killmail_id&&k.victim?.character_id&&Date.parse(k.killmail_time)>=cutoff&&Array.isArray(k.attackers)&&k.attackers.some(a=>a.character_id===id));
 const sample=kills.slice(0,50);let workers=0;const details=[];const run=async()=>{while(workers<sample.length){const k=sample[workers++];let ship=null,group=null;try{ship=await type(k.victim.ship_type_id);group=(await esi(`/universe/groups/${ship.group_id}/`,{ttl:86400000})).data.name;}catch{/* Preserve unknown categories, not a false negative. */}
 const mining=ship&&['Venture','Prospect','Endurance'].includes(ship.name)||/Mining Barge|Exhumer|Mining Frigate|Industrial Command|Capital Industrial/i.test(group||'');
 const hauling=/^(Industrial|Hauler|Blockade Runner|Deep Space Transport|Freighter|Jump Freighter)$/i.test(group||'');
 details.push({id:k.killmail_id,eventAt:k.killmail_time,systemId:k.solar_system_id,shipName:ship?.name||`Type ${k.victim.ship_type_id}`,group,category:mining?'mining':hauling?'hauling':group?'other':'unknown',attackers:k.attackers.length});}};await Promise.all([run(),run()]);details.sort((a,b)=>Date.parse(b.eventAt)-Date.parse(a.eventAt));
 return {characterId:id,name:character.data.name,corporationId:character.data.corporation_id,fetchedAt:result.fetchedAt,expiresAt:result.expiresAt,returned:result.data.length,windowDays:30,matchedKills:kills.length,inspected:details.length,miningTargets:details.filter(k=>k.category==='mining').length,haulingTargets:details.filter(k=>k.category==='hauling').length,unknownTargets:details.filter(k=>k.category==='unknown').length,recent:details.slice(0,8),coverage:'最近返回至多 200 条战损中的近 30 天样本；最多检查其中 50 条目标船型，并非完整历史。'};
 }));
 async function pilot(id,identity=null){const value=await cachedPilot(id,identity);if(value.expiresAt<=now()){cache.clear();return cachedPilot(id,identity);}return value;}
 async function batch(ids){if(!Array.isArray(ids)||!ids.length||ids.length>50||!ids.every(id=>Number.isSafeInteger(id)&&id>0))throw Object.assign(Error('每批最多查询 50 个角色 ID'),{status:400});
 const unique=[...new Set(ids)];const [names,affiliations]=await Promise.all([esi('/universe/names/',{method:'POST',body:[...unique].sort((a,b)=>a-b),ttl:86400000}),esi('/characters/affiliation/',{method:'POST',body:[...unique].sort((a,b)=>a-b),ttl:3600000})]);
 const known=new Map(names.data.filter(n=>n.category==='character').map(n=>[n.id,n.name])),corps=new Map(affiliations.data.map(a=>[a.character_id,a.corporation_id]));
 const results=await Promise.all(unique.map(async id=>{if(!known.has(id))return {characterId:id,error:'ID 不是可解析角色'};try{return {characterId:id,profile:await pilot(id,{name:known.get(id),corporation_id:corps.get(id)})};}catch(e){return {characterId:id,error:e.message};}}));return {results};
 }return {resolve,pilot,batch};
}
