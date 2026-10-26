export type RiskEvidence={expiresAt:number;matchedKills:number;inspected:number;haulingTargets:number;miningTargets:number;unknownTargets:number;recent:{eventAt:string}[]};
export type RiskRating={score:number|null;tone:'unknown'|'low'|'moderate'|'high'|'critical';label:string;reasons:string[]};
// Product heuristic for historical combat signals, not a calibrated attack probability.
export function pilotRisk(row:{profile?:RiskEvidence;error?:string;needsReview?:boolean;confidence?:number},now=Date.now()):RiskRating{
 const unknown=(reason:string):RiskRating=>({score:null,tone:'unknown',label:'风险未知',reasons:[reason]});
 if(row.error)return unknown('查询未完成或失败');
 if(row.needsReview||(row.confidence!==undefined&&row.confidence<.8))return unknown('角色识别需核对；建议粘贴角色 ID 重查');
 const p=row.profile;if(!p)return unknown('等待身份与战损证据');
 if(!Number.isFinite(p.expiresAt)||p.expiresAt<=now)return unknown('战损来源已过期');
 if(![p.matchedKills,p.inspected,p.haulingTargets,p.miningTargets,p.unknownTargets].every(n=>Number.isInteger(n)&&n>=0)||p.unknownTargets>p.inspected||p.inspected>p.matchedKills)return unknown('统计数据不足或不一致');
 const targets=p.haulingTargets+p.miningTargets,known=p.inspected-p.unknownTargets;
 if(targets>known)return unknown('目标分类数据不一致');
 if(!known||(targets===0&&known<5))return unknown('已知目标样本不足，不能推断低风险');
 const activity=Math.min(25,p.matchedKills*2),targetCount=Math.min(45,targets*9),targetShare=Math.round(20*targets/known);
 const dates=p.recent.map(k=>Date.parse(k.eventAt)).filter(t=>Number.isFinite(t)&&t<=now&&t>=now-30*86400000);
 const latest=dates.length?Math.max(...dates):null,recency=latest===null?0:now-latest<=7*86400000?10:4;
 const score=Math.min(100,activity+targetCount+targetShare+recency);
 const tone=score>=75?'critical':score>=50?'high':score>=25?'moderate':'low';
 const label={critical:'很高风险信号',high:'高风险信号',moderate:'中等风险信号',low:'较少风险信号'}[tone];
 return {score,tone,label,reasons:[`近 30 天参与击杀 ${p.matchedKills} 次：+${activity}`,`运输／采矿目标 ${targets} 个：+${targetCount}`,`占已知目标 ${targets}/${known}：+${targetShare}`,`最近返回证据${latest===null?'时间未知':now-latest<=7*86400000?'在 7 天内':'在 30 天内'}：+${recency}`,known<5?'少量样本：有正向证据，但代表性有限':'只基于返回样本；不代表完整历史']};
}
