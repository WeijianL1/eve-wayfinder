// Reads private data in memory to validate the model; never persists assets, wallet, skills or tokens.
import {opportunities,bestPerItem} from '../src/live/model.ts';
const base='http://127.0.0.1:5173';const boot=await(await fetch(base+'/api/bootstrap')).json();
if(!boot.character)throw Error('Requires the user-authorized local character.');
const profileResponse=await fetch(base+'/api/transport');const profile=await profileResponse.json();if(!profileResponse.ok)throw Error(profile.error);
const {snapshot:c}=await(await fetch(base+'/api/character')).json();const {snapshot:s}=await(await fetch(base+'/api/public')).json();
if(!profile.available||!profile.cargo.planningCapacity||!profile.skills.known)throw Error('No supported personal loading model.');
const skill=s.types.find(t=>t.name==='Accounting');if(!skill||!c.skills)throw Error('Accounting unknown.');
const level=c.skills.skills.find(x=>x.skill_id===skill.id)?.active_skill_level||0,tax=.075*(1-.11*level);
const quotes=bestPerItem(opportunities(s,['high','low','null'],c.wallet,.1,tax,Date.now(),profile.cargo.planningCapacity));
const q=quotes.find(x=>x.source.system_id===c.location?.solar_system_id||x.destination.system_id===c.location?.solar_system_id)||quotes[0];if(!q)throw Error('No fresh quote to test. Refresh public sources.');
const response=await fetch(base+'/api/hauling/estimate',{method:'POST',headers:{'Content-Type':'application/json','X-Eve-Session':boot.session},body:JSON.stringify({sourceStationId:q.source.id,destinationStationId:q.destination.id,allowed:['high','low','null'],returnHome:true})});const e=await response.json();if(!response.ok)throw Error(e.error);
if(!e.time||e.time.highSeconds<e.time.lowSeconds||q.volume>profile.cargo.planningCapacity+.001)throw Error('Capacity/time invariant failed.');
console.log(JSON.stringify({ship:profile.shipName,capacityModel:profile.cargo.capacityEstimate,actualFreeHoldKnown:profile.cargo.free!==null,mode:e.mode,loadWithinModel:true,item:q.name,quantity:q.quantity,volume:q.volume,profit:Math.round(q.profit),minutes:[Math.ceil(e.time.lowSeconds/60),Math.ceil(e.time.highSeconds/60)],iskPerHour:[Math.round(q.profit*3600/e.time.highSeconds),Math.round(q.profit*3600/e.time.lowSeconds)],jumps:e.time.jumps,warps:e.time.warps,measuredDistances:e.time.measuredDistances}));
