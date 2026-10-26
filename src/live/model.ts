export type Zone='high'|'low'|'null';
export type LiveCharacter={id:number;name:string;scopes:string[]};
export type EveType={id:number;name:string;volume:number;packaged_volume?:number;capacity?:number;description?:string;dogma_attributes?:{attribute_id:number;value:number}[]};
export type EveSystem={id:number;name:string;security_status:number;position:{x:number;y:number;z:number};stargates?:number[];kills?:{ship_kills:number;pod_kills:number;npc_kills:number}|null;jumps?:number|null};
export type Station={id:number;name:string;system_id:number};
export type Order={order_id:number;type_id:number;location_id:number;system_id:number;price:number;volume_remain:number;min_volume:number;range:string;is_buy_order:boolean;region_id:number};
export type Snapshot={coverage?:{requested:number;resolved:number;unresolved:string[];categories:{key:string;label:string;requested:number;resolved:number}[]};fetchedAt:string;origin:number;originIsCharacter:boolean;types:EveType[];requirements?:Record<number,{skillId:number;level:number}[]>;attributeSchema?:{id:number;name:string}[];regions:{id:number;name:string}[];orders:Order[];stations:Station[];systems:EveSystem[];sources:{region:string;type:string;fetchedAt:string;expiresAt:number;complete:boolean}[];failures:{error:string;region:string;type:string}[];scope:string;status:{players:number;server_version:string;start_time:string}|null;killSource:{fetchedAt:string;lastModified:string|null}|null};
export type CharacterSnapshot={names?:Record<number,string>;character:LiveCharacter;fetchedAt:string;wallet?:number;walletSource?:{fetchedAt:string;expiresAt:number};locationSource?:{fetchedAt:string;expiresAt:number};location?:{solar_system_id:number;station_id?:number};currentSystem?:EveSystem;ship?:{ship_item_id:number;ship_type_id:number;ship_name:string};skills?:{skills:{skill_id:number;active_skill_level:number;trained_skill_level:number;skillpoints_in_skill:number}[];total_sp:number};queue?:{skill_id:number;finished_level:number;finish_date?:string}[];assets?:{item_id:number;type_id:number;quantity:number;location_id:number;location_flag:string}[];mining?:{date:string;solar_system_id:number;type_id:number;quantity:number}[];transactions?:{date:string;type_id:number;quantity:number;unit_price:number;is_buy:boolean;transaction_id:number;location_id:number}[];types:EveType[];errors:{field:string;error:string;scope:string}[]};
export type Bootstrap={session:string;clientId:string;redirectUri:string;basicScopes:string[];fullScopes:string[];credentialStorage:string;character:LiveCharacter|null;authorizing:boolean;error:string|null};
export const zone=(sec:number):Zone=>sec<=0?'null':Math.round(sec*10)>=5?'high':'low';
export const zoneName:Record<Zone,string>={high:'高安',low:'低安',null:'00'};
export const isk=(n:number)=>Math.abs(n)>=1e9?`${(n/1e9).toFixed(2)}B`:Math.abs(n)>=1e6?`${(n/1e6).toFixed(2)}M`:Math.round(n).toLocaleString();
export function fresh(snapshot:Snapshot,now=Date.now()){return snapshot.sources.some(s=>s.complete&&s.expiresAt>now);}
export type Quote={items?:Quote[];typeId:number;name:string;source:Station;destination:Station;quantity:number;cost:number;revenue:number;volume:number;profit:number|null;spread:number;tax:number|null;sourceOrders:number[];buyerOrders:number[];expiresAt:number;};

// Each quote consumes a copy of a single item/station book. Different quote cards are alternatives, not additive manifests.
export function quoteItem(asks:Order[],bids:Order[],budget:number,tax:number|null,maxQuantity=Infinity):{quantity:number;cost:number;revenue:number;sourceOrders:number[];buyerOrders:number[]} {
 const sellers=asks.filter(o=>!o.is_buy_order&&o.volume_remain>0).map(o=>({...o})).sort((a,b)=>a.price-b.price);
 const buyers=bids.filter(o=>o.is_buy_order&&o.volume_remain>0).map(o=>({...o})).sort((a,b)=>b.price-a.price);
 let quantity=0,cost=0,revenue=0;const sourceOrders:number[]=[],buyerOrders:number[]=[];
 for(const bid of buyers){
  const effectiveMin=Math.min(bid.min_volume,bid.volume_remain);
  const available=sellers.reduce((sum,ask)=>sum+(bid.price*(1-(tax??0))>ask.price?ask.volume_remain:0),0);
  if(available<effectiveMin||maxQuantity-quantity<effectiveMin)continue;
  // Stage the whole bid lot before committing, so a failed minimum never leaves a partial purchase.
  let remaining=Math.min(bid.volume_remain,maxQuantity-quantity),trialCost=0,trialQuantity=0;const staged:{ask:Order;qty:number}[]=[];
  for(const ask of sellers){if(bid.price*(1-(tax??0))<=ask.price)break;const qty=Math.floor(Math.min(ask.volume_remain,remaining,(budget-cost-trialCost)/ask.price));if(qty<=0)continue;staged.push({ask,qty});trialCost+=qty*ask.price;trialQuantity+=qty;remaining-=qty;if(!remaining)break;}
  if(trialQuantity<effectiveMin)continue;
  for(const {ask,qty}of staged){ask.volume_remain-=qty;sourceOrders.push(ask.order_id);}
  quantity+=trialQuantity;cost+=trialCost;revenue+=trialQuantity*bid.price*(1-(tax??0));buyerOrders.push(bid.order_id);
 }
 return {quantity,cost,revenue,sourceOrders:[...new Set(sourceOrders)],buyerOrders};
}

export function opportunities(snapshot:Snapshot,zones:Zone[],wallet:number|null,rate:number,tax:number|null,now=Date.now(),cargoCapacity:number|null=null):Quote[]{
 if(!zones.length)return[];
 const stations=new Map(snapshot.stations.map(s=>[s.id,s])),systems=new Map(snapshot.systems.map(s=>[s.id,s])),types=new Map(snapshot.types.map(t=>[t.id,t]));
 const sourceFresh=new Map(snapshot.sources.filter(s=>s.complete&&s.expiresAt>now).map(s=>[`${s.region}:${s.type}`,s.expiresAt]));
 const regionNames=new Map(snapshot.regions.map(r=>[r.id,r.name]));
 const books=new Map<number,Map<number,Order[]>>();
 for(const order of snapshot.orders){const station=stations.get(order.location_id),system=station&&systems.get(station.system_id),type=types.get(order.type_id);if(!station||!system||!type||!zones.includes(zone(system.security_status))||!sourceFresh.has(`${regionNames.get(order.region_id)}:${type.name}`))continue;let grouped=books.get(order.type_id);if(!grouped){grouped=new Map();books.set(order.type_id,grouped);}const list=grouped.get(order.location_id)||[];list.push(order);grouped.set(order.location_id,list);}
 const quotes:Quote[]=[];
 for(const [typeId,grouped]of books){const type=types.get(typeId)!;for(const [sourceId,sourceOrders]of grouped){const asks=sourceOrders.filter(o=>!o.is_buy_order);if(!asks.length)continue;for(const [destId,destinationOrders]of grouped){if(sourceId===destId)continue;const bids=destinationOrders.filter(o=>o.is_buy_order);if(!bids.length)continue;const filled=quoteItem(asks,bids,wallet===null?Infinity:wallet*rate,tax,cargoCapacity===null?Infinity:Math.floor(cargoCapacity/(type.packaged_volume??type.volume)));if(!filled.quantity)continue;quotes.push({typeId,name:type.name,source:stations.get(sourceId)!,destination:stations.get(destId)!,...filled,volume:filled.quantity*(type.packaged_volume??type.volume),profit:tax===null?null:filled.revenue-filled.cost,spread:filled.revenue-filled.cost,tax,expiresAt:Math.min(...[...asks,...bids].map(o=>sourceFresh.get(`${regionNames.get(o.region_id)}:${type.name}`)??0))});}}}
 return quotes.sort((a,b)=>b.spread-a.spread);
}

// Select after ranking the complete candidate set, so repeated station pairs cannot crowd out other items.
export function bestPerItem(quotes:Quote[]):Quote[]{const seen=new Set<number>();return quotes.filter(q=>{if(seen.has(q.typeId))return false;seen.add(q.typeId);return true;});}

export type TransportProfile={available:boolean;shipTypeId?:number;shipName?:string;cargo?:{base:number;capacityEstimate:number;used:number|null;free:number|null;planningCapacity:number|null;mode:string;capacityModifiers:string[]};skills?:{known:boolean;gallenteHauler:number;spaceshipCommand:number;evasiveManeuvering:number};alignSeconds?:number|null;warpSpeed?:number|null;assetsSource?:{fetchedAt:string;expiresAt:number};reasons:string[]};
export type TripEstimate={approachIds?:number[];pickupAreaIds?:number[];extraPickupJumps?:number;pickupCargo?:{quote:Quote;baselineTime:NonNullable<TripEstimate['time']>;extraMinutes:number;peakCapital:number;maxCargo:number};pickupStatus?:string;time:{lowSeconds:number;highSeconds:number;jumps:number;warps:number;stops:number;measuredDistances:number;assumptions:string[]}|null;routeIds:number[];returnHome:boolean;mode:string;error?:string};
export const quoteKey=(q:Quote)=>`${q.typeId}-${q.source.id}-${q.destination.id}`;

// Side cargo is completely sold BEFORE the main purchase. Capital and hold are
// reused sequentially; no projected side profit is needed to finance the main lot.
export function pickupCandidates(quotes:Quote[],main:Quote,approach:number[],nearPickup:number[],budget:number|null,capacity:number|null,now=Date.now()):Quote[]{
 if(main.profit===null||budget===null||capacity===null||main.cost>budget||main.volume>capacity||main.expiresAt<=now)return [];
 const path=new Map(approach.map((id,i)=>[id,i]));const reserved=new Set([...main.sourceOrders,...main.buyerOrders]);
 return quotes.filter(q=>{const from=path.get(q.source.system_id),to=path.get(q.destination.system_id);return quoteKey(q)!==quoteKey(main)&&q.profit!==null&&q.profit>0&&q.expiresAt>now&&q.cost<=budget&&q.volume<=capacity&&from!==undefined&&(to!==undefined?to>=from:nearPickup.includes(q.destination.system_id))&&![...q.sourceOrders,...q.buyerOrders].some(id=>reserved.has(id));}).sort((a,b)=>b.profit!-a.profit!).slice(0,4);
}
export function withPickupCargo(main:Quote,baseline:TripEstimate,side:Quote,combined:TripEstimate,now=Date.now()):TripEstimate|null{
 if(main.expiresAt<=now||side.expiresAt<=now||main.profit===null||side.profit===null||!baseline.time||!combined.time||(combined.extraPickupJumps??0)>2)return null;
 const baselineRate=main.profit/baseline.time.highSeconds,combinedRate=(main.profit+side.profit)/combined.time.highSeconds;
 if(combinedRate<=baselineRate)return null;
 return {...combined,pickupCargo:{quote:side,baselineTime:baseline.time,extraMinutes:(combined.time.highSeconds-baseline.time.highSeconds)/60,peakCapital:Math.max(main.cost,side.cost),maxCargo:Math.max(main.volume,side.volume)},pickupStatus:'先卖顺路货，再采购主单；资金与货舱分阶段复用。'};
}
export const tripProfit=(q:Quote,e?:TripEstimate)=>q.profit===null?null:q.profit+(e?.pickupCargo?.quote.profit??0);

// Two-stop manifests reuse the same budget and ordinary hold across distinct types.
// Compare three deterministic packing orders; this is a heuristic, not a global optimum.
export function routeManifests(snapshot:Snapshot,quotes:Quote[],budget:number|null,capacity:number|null):Quote[]{
 if(budget===null||capacity===null)return quotes;
 const books=new Map<string,Order[]>();
 for(const o of snapshot.orders){const key=o.type_id+':'+o.location_id;const list=books.get(key)||[];list.push(o);books.set(key,list);}
 const routes=new Map<string,Quote[]>();
 for(const q of quotes){const key=q.source.id+':'+q.destination.id;const list=routes.get(key)||[];list.push(q);routes.set(key,list);}
 const result:Quote[]=[];
 for(const candidates of routes.values()){
  let best:Quote[]=[];let bestProfit=-Infinity;
  for(const score of [(q:Quote)=>q.spread/Math.max(q.volume,1e-9),(q:Quote)=>q.spread/Math.max(q.cost,1e-9),(q:Quote)=>q.spread]){
   let money=budget,hold=capacity;const items:Quote[]=[];
   for(const q of [...candidates].sort((a,b)=>score(b)-score(a)||a.typeId-b.typeId)){
    const unitVolume=q.volume/q.quantity;
    const fill=quoteItem(books.get(q.typeId+':'+q.source.id)||[],books.get(q.typeId+':'+q.destination.id)||[],money,q.tax,Math.floor(hold/unitVolume));
    if(!fill.quantity)continue;
    const item={...q,...fill,volume:fill.quantity*unitVolume,spread:fill.revenue-fill.cost,profit:q.tax===null?null:fill.revenue-fill.cost};
    items.push(item);money-=fill.cost;hold-=item.volume;
   }
   const profit=items.reduce((sum,q)=>sum+q.spread,0);if(profit>bestProfit){best=items;bestProfit=profit;}
  }
  if(!best.length)continue;
  const sum=(key:'quantity'|'cost'|'revenue'|'volume'|'spread')=>best.reduce((n,q)=>n+q[key],0);
  result.push({...best[0],typeId:0,name:best.length===1?best[0].name:best.length+' 种商品 · '+best.slice(0,2).map(q=>q.name).join(' / '),items:best,quantity:sum('quantity'),cost:sum('cost'),revenue:sum('revenue'),volume:sum('volume'),spread:sum('spread'),profit:best[0].tax===null?null:sum('spread'),sourceOrders:best.flatMap(q=>q.sourceOrders),buyerOrders:best.flatMap(q=>q.buyerOrders),expiresAt:Math.min(...best.map(q=>q.expiresAt))});
 }
 return result.sort((a,b)=>b.spread-a.spread);
}
