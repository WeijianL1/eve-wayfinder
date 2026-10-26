import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quoteItem,opportunities,bestPerItem,pickupCandidates,withPickupCargo,tripProfit,type TripEstimate,zone,type Quote,type Order,type Snapshot} from '../src/live/model.ts';
const order=(id:number,buy:boolean,price:number,volume:number,min=1):Order=>({order_id:id,type_id:34,location_id:buy?60000002:60000001,system_id:buy?30000002:30000001,price,volume_remain:volume,min_volume:min,range:'station',is_buy_order:buy,region_id:10000002});
test('real order quote walks successive price levels with a shared budget',()=>{
 const q=quoteItem([order(1,false,10,5),order(2,false,15,10)],[order(3,true,20,8),order(4,true,16,20)],150,0.05);
 assert.equal(q.quantity,11);assert.equal(q.cost,140);assert.equal(q.revenue,197.6);assert.deepEqual(q.sourceOrders,[1,2]);assert.deepEqual(q.buyerOrders,[3,4]);
});
test('unaffordable minimum is atomic and does not silently purchase stranded volume',()=>{
 const q=quoteItem([order(1,false,10,100)],[order(2,true,20,100,50)],200,0.05);
 assert.equal(q.quantity,0);assert.equal(q.cost,0);
});
test('unknown sales tax is not returned as net profit; expired books do not create opportunities',()=>{
 const now=Date.now();const snapshot={types:[{id:34,name:'Tritanium',volume:0.01}],regions:[{id:10000002,name:'The Forge'}],systems:[{id:30000001,name:'A',security_status:0.9},{id:30000002,name:'B',security_status:0.2}],stations:[{id:60000001,name:'A station',system_id:30000001},{id:60000002,name:'B station',system_id:30000002}],orders:[order(1,false,10,100),order(2,true,15,100)],sources:[{region:'The Forge',type:'Tritanium',expiresAt:now+1000,complete:true}]} as Snapshot;
 const q=opportunities(snapshot,['high','low'],null,.1,null,now);assert.equal(q.length,1);assert.equal(q[0].profit,null);assert.equal(q[0].spread,500);
 assert.equal(opportunities(snapshot,['high'],null,.1,null,now).length,0);
 assert.equal(opportunities(snapshot,['high','low'],null,.1,null,now+2000).length,0);
});
test('security classification uses display rounding at the highsec boundary and negative status is nullsec',()=>{assert.equal(zone(0.46),'high');assert.equal(zone(0.3),'low');assert.equal(zone(-0.2),'null');});

test("item overview retains lower-ranked other goods beyond repeated station pairs",()=>{
 const quotes=[...Array.from({length:70},(_,i)=>({typeId:1,spread:1000-i})),{typeId:2,spread:1}] as Quote[];
 assert.deepEqual(bestPerItem(quotes).map(q=>q.typeId),[1,2]);
 assert.equal(bestPerItem(quotes)[0],quotes[0]);
});

test('one ship quantity limit is applied during depth walking and preserves destination minimum lots',()=>{
 const q=quoteItem([order(1,false,10,100)],[order(2,true,20,100,20)],10000,0,25);assert.equal(q.quantity,25);assert.equal(q.cost,250);
 assert.equal(quoteItem([order(1,false,10,100)],[order(2,true,20,100,30)],10000,0,25).quantity,0);
});

const sideFixture=(id:number,from:number,to:number):Quote=>({typeId:id,name:'goods',source:{id:60000000+id,name:'source',system_id:from},destination:{id:61000000+id,name:'destination',system_id:to},quantity:10,cost:900,revenue:1000,profit:100,spread:100,volume:100,tax:.05,sourceOrders:[id*2],buyerOrders:[id*2+1],expiresAt:Date.now()+60000});
test('pickup candidates run forward along approach or near pickup, reuse budget sequentially and never reuse main depth',()=>{
 const main=sideFixture(1,30,40),side=sideFixture(2,10,20),near=sideFixture(3,20,31),backward=sideFixture(4,20,10),offRoute=sideFixture(5,11,20),shared={...side,sourceOrders:main.buyerOrders};
 const result=pickupCandidates([side,near,backward,offRoute,shared],main,[10,20,30],[30,31],1000,100);assert.equal(result.length,2);assert.ok(result.includes(side));assert.ok(result.includes(near));
 assert.equal(pickupCandidates([side],main,[10,20,30],[30],null,100).length,0);assert.equal(pickupCandidates([{...side,expiresAt:0}],main,[10,20,30],[30],1000,100).length,0);
});
test('a profitable side lot is adopted only when full trip hourly return improves, with one shared hold and peak capital',()=>{
 const main=sideFixture(1,30,40),side=sideFixture(2,10,20);const base={time:{lowSeconds:500,highSeconds:600,jumps:3,warps:5,stops:3,measuredDistances:5,assumptions:[]},routeIds:[],returnHome:true,mode:'empty-hold-scenario'} as TripEstimate;
 const combined={...base,time:{...base.time!,highSeconds:700},extraPickupJumps:2};const result=withPickupCargo(main,base,side,combined)!;assert.equal(tripProfit(main,result),200);assert.equal(result.pickupCargo!.peakCapital,900);assert.equal(result.pickupCargo!.maxCargo,100);
 assert.equal(withPickupCargo(main,base,side,{...combined,time:{...base.time!,highSeconds:1500}}),null);assert.equal(withPickupCargo(main,base,side,{...combined,extraPickupJumps:3}),null);assert.equal(withPickupCargo(main,base,{...side,expiresAt:0},combined),null);
});

test('route manifests share cargo and budget, retain minimum lots and expose item totals',async()=>{
 const {routeManifests}=await import('../src/live/model.ts');
 const a=sideFixture(1,30,40),b={...sideFixture(2,30,40),source:a.source,destination:a.destination};
 const quotes=[a,b].map(q=>({...q,quantity:10,cost:100,revenue:200,spread:100,profit:100,volume:10,tax:0}));
 const orders=quotes.flatMap(q=>[{...order(q.typeId*10,false,10,10),type_id:q.typeId,location_id:q.source.id},{...order(q.typeId*10+1,true,20,10),type_id:q.typeId,location_id:q.destination.id}]);
 const snapshot={orders} as Snapshot;
 const m=routeManifests(snapshot,quotes,150,15)[0];assert.equal(m.items!.length,2);assert.equal(m.cost,150);assert.equal(m.volume,15);assert.equal(m.profit,150);assert.equal(m.items![1].quantity,5);assert.equal(new Set(m.sourceOrders).size,m.sourceOrders.length);
 const minimum={orders:orders.map(o=>o.type_id===2&&o.is_buy_order?{...o,min_volume:6}:o)} as Snapshot;
 assert.equal(routeManifests(minimum,quotes,150,15)[0].items!.length,1);
 assert.equal(routeManifests(snapshot,quotes,150,15)[0].items![0].quantity,10);
});
