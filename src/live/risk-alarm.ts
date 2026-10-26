export type AlarmPlayer={id:number;name:string;tone:'unknown'|'low'|'moderate'|'high'|'critical'};
export function createAlarmTracker(){
 const levels=new Map<number,number>();
 return {clear(){levels.clear();},next(players:AlarmPlayer[]){const events:AlarmPlayer[]=[];for(const p of players){if(p.tone==='unknown')continue;const rank=p.tone==='critical'?3:p.tone==='high'?2:0,previous=levels.get(p.id)??0;if(rank>=2&&rank>previous)events.push(p);levels.delete(p.id);levels.set(p.id,rank);}while(levels.size>500)levels.delete(levels.keys().next().value!);return events;}};
}
