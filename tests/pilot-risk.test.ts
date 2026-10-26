import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pilotRisk,type RiskEvidence} from '../src/live/pilot-risk.ts';
const now=Date.now();
const base:RiskEvidence={expiresAt:now+60000,matchedKills:5,inspected:5,haulingTargets:0,miningTargets:0,unknownTargets:0,recent:[]};
test('unknown identity, stale data and insufficient evidence never get low scores',()=>{
 for(const row of [{},{profile:base,error:'failed'},{profile:base,needsReview:true},{profile:base,confidence:.5},{profile:{...base,expiresAt:now-1}},{profile:{...base,matchedKills:0,inspected:0}},{profile:{...base,inspected:4}},{profile:{...base,unknownTargets:5}}])assert.equal(pilotRisk(row,now).score,null);
});
test('historical risk signals have explainable color bands; targeted evidence and recency increase scores',()=>{
 const low=pilotRisk({profile:base},now);assert.equal(low.score,10);assert.equal(low.tone,'low');
 const one=pilotRisk({profile:{...base,matchedKills:1,inspected:1,haulingTargets:1,recent:[{eventAt:new Date(now-1000).toISOString()}]}},now);assert.equal(one.score,41);assert.equal(one.tone,'moderate');
 const high=pilotRisk({profile:{...base,haulingTargets:3}},now);assert.equal(high.score,49);assert.equal(high.tone,'moderate');
 const recent=pilotRisk({profile:{...base,haulingTargets:3,recent:[{eventAt:new Date(now-1000).toISOString()}]}},now);assert.equal(recent.score,59);assert.equal(recent.tone,'high');
 const severe=pilotRisk({profile:{...base,matchedKills:50,haulingTargets:5,recent:[{eventAt:new Date(now-1000).toISOString()}]}},now);assert.equal(severe.score,100);assert.equal(severe.tone,'critical');assert.equal(severe.reasons.length,5);
 assert.equal(pilotRisk({profile:{...base,haulingTargets:6}},now).score,null);
});
