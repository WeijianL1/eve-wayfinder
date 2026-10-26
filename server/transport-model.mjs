// A deliberately bounded estimator, not a full Dogma fitting simulator.
const attr=(type,id)=>type?.dogma_attributes?.find(a=>a.attribute_id===id)?.value;
export function buildTransportProfile(character,now=Date.now()){
 const reasons=[];const types=new Map((character.types||[]).map(t=>[t.id,t]));
 const ship=character.ship&&types.get(character.ship.ship_type_id);
 if(!ship)return {available:false,reasons:['未取得当前船体信息。']};
 const levels=new Map((character.skills?.skills||[]).map(s=>[s.skill_id,s.active_skill_level]));
 const contents=(character.assets||[]).filter(a=>a.location_id===character.ship.ship_item_id);
 const fitted=contents.filter(a=>/^(LoSlot|MedSlot|HiSlot|RigSlot|SubSystemSlot)/.test(a.location_flag));
 const freshAssets=character.assetsSource?.expiresAt>now;
 const witnessed=Boolean(character.assets?.some(a=>a.item_id===character.ship.ship_item_id)||contents.length);
 const skillsKnown=Boolean(character.skills)&&character.skillsSource?.expiresAt>now;
 if(!skillsKnown)reasons.push('技能快照缺失或过期；不输出个人 ISK/h。');
 let hullMultiplier=1,hullSupported=false;
 // Verified chain: Gallente Hauler(3340) level -> shipBonusGI(496) -> Iteron capacity(38).
 if(ship.id===657){hullMultiplier=1+(attr(ship,496)??5)*(skillsKnown?(levels.get(3340)||0):0)/100;hullSupported=true;}
 else reasons.push('此船型的船体技能加成尚未完整建模；仅使用基础船体场景。');
 let fittedMultiplier=1;const capacityModifiers=[];
 for(const item of (freshAssets?fitted:[])){const t=types.get(item.type_id);if(!t){reasons.push('部分装配类型未解析。');continue;}
  if(t.dogma_effects?.some(e=>e.effect_id===59)&&attr(t,149)>0){fittedMultiplier*=attr(t,149);capacityModifiers.push(t.name);}
  if(t.dogma_effects?.some(e=>e.effect_id===836)&&Number.isFinite(attr(t,614))){fittedMultiplier*=1+attr(t,614)/100;capacityModifiers.push(t.name);}
 }
 const capacityEstimate=Math.round((ship.capacity??attr(ship,38)??0)*hullMultiplier*fittedMultiplier*1e6)/1e6;
 const cargo=contents.filter(a=>a.location_flag==='Cargo');let used=0,volumesKnown=true;
 for(const item of cargo){const t=types.get(item.type_id);const volume=item.is_singleton?t?.volume:(t?.packaged_volume??t?.volume);if(!Number.isFinite(volume)){volumesKnown=false;continue;}used+=volume*item.quantity;}
 const observed=Boolean(freshAssets&&witnessed&&volumesKnown&&fitted.every(a=>types.has(a.type_id)));
 if(!witnessed)reasons.push('资产快照未包含当前船及其内容；实际装配和已占舱位未知。');
 if(!freshAssets)reasons.push('资产快照缺失或过期。');
 if(!volumesKnown)reasons.push('部分货物体积未知。');
 if(fitted.length)reasons.push('仅建模扩货及货舱优化装配；航行性能使用船体与基础操控技能，不是完整拟合性能。');
 if((character.implants||[]).length)reasons.push('植入体航行加成未计入。');
 // One trip uses the ordinary cargo hold only; special bays and container compression are excluded.
 const free=observed&&hullSupported?Math.max(0,capacityEstimate-used):null;
 const planningCapacity=skillsKnown&&hullSupported?Math.max(0,capacityEstimate-(observed?used:0)):null;
 const mass=ship.mass??attr(ship,4),agility=attr(ship,70),warpSpeed=(attr(ship,1281)??1)*(attr(ship,600)??0);
 const command=levels.get(3327)||0,evasive=levels.get(3453)||0;
 const alignSeconds=skillsKnown&&mass>0&&agility>0?Math.ceil(-Math.log(.25)*mass*agility*(1-.02*command)*(1-.05*evasive)/1e6):null;
 return {available:true,shipTypeId:ship.id,shipName:ship.name,cargo:{base:ship.capacity??attr(ship,38),capacityEstimate,used:observed?used:null,free,planningCapacity,mode:free===null?'empty-hold-scenario':'asset-snapshot',capacityModifiers},skills:{known:skillsKnown,gallenteHauler:levels.get(3340)||0,spaceshipCommand:command,evasiveManeuvering:evasive},alignSeconds,warpSpeed:warpSpeed>0?warpSpeed:null,performanceMode:'hull-and-skills',assetsSource:character.assetsSource,skillsSource:character.skillsSource,reasons};
}
const AU=149597870700;
export function warpSeconds(distanceMeters,warpSpeed){
 if(!(distanceMeters>=0&&warpSpeed>0))return null;
 // Scenario range: constant-speed travel plus 15–30s per warp for acceleration/deceleration.
 // It is intentionally not described as a simulation of the client's warp integrator.
 const cruise=distanceMeters/AU/warpSpeed;return {low:cruise+15,high:cruise+30};
}
export function estimateTravel(profile,segments,jumps,stops=2){
 if(!profile.skills?.known||!profile.alignSeconds||!profile.warpSpeed)return null;
 let low=0,high=0;for(const segment of segments){const d=segment.distanceMeters;
  const w=warpSeconds(d??25*AU,profile.warpSpeed);low+=(d===null?warpSeconds(10*AU,profile.warpSpeed).low:w.low)+profile.alignSeconds;high+=(d===null?warpSeconds(50*AU,profile.warpSpeed).high:w.high)+profile.alignSeconds;
 }
 low+=jumps*8+stops*45;high+=jumps*20+stops*120;
 return {lowSeconds:Math.ceil(low),highSeconds:Math.ceil(high),jumps,warps:segments.length,stops,measuredDistances:segments.filter(s=>s.distanceMeters!==null).length,assumptions:['手动跃迁至零；不使用自动导航、跳桥、虫洞或跳跃引擎。','每次跃迁加减速预留 15–30 秒；每次星门切换 8–20 秒。','每次采购/出售停站预留 45–120 秒（含进出站、装卸与交易操作）。','起点在太空等无法确定坐标时，该次跃迁距离使用 10–50 AU 场景。','不含堵门、排队、断线、等待买家或货损；时间是模型区间，不是实测 ETA。']};
}
