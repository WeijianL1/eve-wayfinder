import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAlarmTracker,type AlarmPlayer} from '../src/live/risk-alarm.ts';
const p=(id:number,tone:AlarmPlayer['tone']):AlarmPlayer=>({id,name:`Pilot ${id}`,tone});
test('alarm fires for high/critical, suppresses repeated frames and placeholders, rearms after confirmed lower risk',()=>{
 const t=createAlarmTracker();assert.equal(t.next([p(1,'unknown'),p(2,'moderate')]).length,0);assert.equal(t.next([p(1,'high')]).length,1);assert.equal(t.next([p(1,'high')]).length,0);t.next([]);t.next([p(1,'unknown')]);assert.equal(t.next([p(1,'high')]).length,0);assert.equal(t.next([p(1,'critical')]).length,1);assert.equal(t.next([p(1,'critical')]).length,0);t.next([p(1,'low')]);assert.equal(t.next([p(1,'high')]).length,1);assert.equal(t.next([p(3,'critical'),p(4,'high')]).length,2);t.clear();assert.equal(t.next([p(1,'high')]).length,1);
});
