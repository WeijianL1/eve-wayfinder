import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planHauling, getPilot, budgetRates, route, systemById, gasRoutes, payback, type Security } from '../src/engine.ts';

test('all region combinations enforce every route segment and all-off yields a reason', () => {
  for(let mask=0;mask<8;mask++) {
    const allowed=(['high','low','null'] as Security[]).filter((_,i)=>mask&(1<<i));
    const result=planHauling({pilot:getPilot('pilot'),allowed,risk:'conservative',scenario:'pilot',from:'jita',returnHome:true});
    for(const p of result.plans)assert.ok(p.path.every(id=>allowed.includes(systemById(id).security)));
    if(!mask || !allowed.includes('high'))assert.ok(result.reason.length>0);
  }
});
test('budget, cargo, depth and min volume are shared across all items in a manifest', () => {
  for(const scenario of ['pilot','rookie'] as const)for(const risk of ['conservative','balanced','aggressive'] as const) {
    const pilot=getPilot(scenario);
    const result=planHauling({pilot,allowed:['high','low'],risk,scenario,from:'jita',returnHome:true});
    assert.ok(result.plans.length>0, `${scenario}/${risk} can get started`);
    for(const p of result.plans) {
      assert.ok(p.volume<=p.fit.capacity+1e-8);
      assert.ok(p.cost+p.shipCost<=pilot.wallet*budgetRates[risk].cash+1e-8);
      assert.ok(p.exposure<=pilot.wallet*budgetRates[risk].exposure+1e-8);
      assert.ok(p.profit>0);
      for(const c of p.cargo){assert.ok(c.quantity>=c.min);assert.ok(c.quantity<=Math.min(c.sourceQty,c.destQty));}
    }
  }
});
test('without a ship, beginner gets an affordable purchase plan instead of an empty screen',()=>{
 const result=planHauling({pilot:getPilot('rookie'),allowed:['high'],risk:'conservative',scenario:'rookie',from:'jita',returnHome:true});
 assert.ok(result.plans.length);assert.ok(result.plans.every(p=>p.shipCost>0));
});
test('stale or withdrawn orders block execution, and unknown nullsec fitting is not declared valid',()=>{
 for(const scenario of ['stale','withdrawn'] as const)assert.equal(planHauling({pilot:getPilot(scenario),allowed:['high','low','null'],risk:'conservative',scenario,from:'jita',returnHome:true}).plans.length,0);
 assert.ok(planHauling({pilot:getPilot('pilot'),allowed:['high','low','null'],risk:'conservative',scenario:'pilot',from:'jita',returnHome:true}).plans.every(p=>p.path.every(id=>systemById(id).security!=='null')));
});
test('advanced synthetic pilot can plan nullsec when the whole connecting region set is allowed',()=>{
 const result=planHauling({pilot:getPilot('hauler'),allowed:['high','low','null'],risk:'conservative',scenario:'hauler',from:'jita',returnHome:true});
 const nullPlan=result.plans.find(p=>p.dest==='pc9');
 assert.ok(nullPlan);assert.equal(nullPlan.fit.id,'prowler');
});
test('gas favorite changes priority without fabricating a live site or using nullsec',()=>{
 const result=gasRoutes('jita','standard','conservative',[{systemId:'maurasi',gas:['Golden Mykoserocin'],createdAt:'2026-10-18'}],true);
 assert.equal(result[0].system.id,'maurasi');
 assert.ok(result.every(r=>r.path[0]==='jita'&&r.path.at(-1)==='jita'&&r.path.every(id=>systemById(id).security!=='null')));
});
test('unavailable route stays blocked and no payback is fabricated for zero or negative uplift',()=>{
 assert.equal(route('jita','pc9',['high']),null);
 assert.equal(payback(9e6,0),null);assert.equal(payback(9e6,-1),null);assert.equal(payback(9e6,24e6),0.375);
});
