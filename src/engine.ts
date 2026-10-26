// PROTOTYPE: deterministic, synthetic snapshots. Never use these quotes in game.
export type Security = 'high' | 'low' | 'null';
export type Risk = 'conservative' | 'balanced' | 'aggressive';
export type Scenario = 'pilot' | 'rookie' | 'hauler' | 'stale' | 'withdrawn';
export type System = { id: string; name: string; security: Security; sec: string; x: number; y: number; kills: number; gas?: string; };
export const systems: System[] = [
  { id: 'jita', name: 'Jita', security: 'high', sec: '0.9', x: 220, y: 225, kills: 1 },
  { id: 'perimeter', name: 'Perimeter', security: 'high', sec: '1.0', x: 330, y: 190, kills: 0 },
  { id: 'sobaseki', name: 'Sobaseki', security: 'high', sec: '0.8', x: 140, y: 140, kills: 0, gas: 'Amber Mykoserocin' },
  { id: 'newcal', name: 'New Caldari', security: 'high', sec: '1.0', x: 340, y: 320, kills: 0 },
  { id: 'maurasi', name: 'Maurasi', security: 'high', sec: '0.6', x: 100, y: 335, kills: 0, gas: 'Golden Mykoserocin' },
  { id: 'inaya', name: 'Inaya', security: 'high', sec: '0.5', x: 245, y: 440, kills: 0, gas: 'Amber Mykoserocin' },
  { id: 'nourv', name: 'Nourvukaiken', security: 'high', sec: '0.8', x: 465, y: 240, kills: 2 },
  { id: 'tama', name: 'Tama', security: 'low', sec: '0.3', x: 570, y: 170, kills: 8, gas: 'Golden Mykoserocin' },
  { id: 'suja', name: 'Sujarento', security: 'low', sec: '0.3', x: 690, y: 270, kills: 2, gas: 'Amber Mykoserocin' },
  { id: 'kedama', name: 'Kedama', security: 'low', sec: '0.3', x: 565, y: 390, kills: 1, gas: 'Golden Mykoserocin' },
  { id: 'nenn', name: 'Nennamaila', security: 'low', sec: '0.2', x: 730, y: 425, kills: 3 },
  { id: 'synd', name: '6-CZ49', security: 'null', sec: '−0.1', x: 830, y: 140, kills: 6 },
  { id: 'pc9', name: 'PC9-AY', security: 'null', sec: '−0.2', x: 920, y: 345, kills: 4 },
];
export const edges: [string, string][] = [['jita','perimeter'],['jita','sobaseki'],['jita','maurasi'],['jita','newcal'],['sobaseki','perimeter'],['maurasi','inaya'],['inaya','newcal'],['newcal','nourv'],['perimeter','nourv'],['nourv','tama'],['tama','suja'],['suja','kedama'],['kedama','inaya'],['suja','nenn'],['kedama','nenn'],['suja','synd'],['synd','pc9'],['nenn','pc9']];
export const securityLabel: Record<Security, string> = { high: '高安', low: '低安', null: '00' };
export const riskLabel: Record<Risk, string> = { conservative: '保守', balanced: '均衡', aggressive: '激进' };
export const systemById = (id: string) => systems.find(s => s.id === id)!;
export const money = (n: number) => Math.abs(n)>=1e9 ? `${(n/1e9).toFixed(2)}B` : Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${Math.round(n).toLocaleString('en-US')}`;
export type Fit = { id: string; name: string; role: string; cost: number; capacity: number; align: number; level: number; modules: string[]; };
export const fits: Fit[] = [
  { id:'heron', name:'Heron', role:'入门 · 小件运输', cost:1_200_000, capacity:600, align:4.8, level:1, modules:['Expanded Cargohold I ×2','1MN Afterburner I','Medium Shield Extender I','Small Cargohold Optimization I ×2'] },
  { id:'wreathe', name:'Wreathe', role:'基础 · 快速运输', cost:2_100_000, capacity:1800, align:5.2, level:2, modules:['Inertial Stabilizers II ×2','Damage Control II','Medium Shield Extender II','5MN Microwarpdrive I'] },
  { id:'mammoth', name:'Mammoth', role:'进阶 · 大宗货物', cost:6_200_000, capacity:5000, align:9.4, level:3, modules:['Expanded Cargohold II ×3','Damage Control II','Medium Shield Extender II ×2','Medium Cargohold Optimization I ×2'] },
  { id:'prowler', name:'Prowler', role:'解锁 · 隐跳运输', cost:98_000_000, capacity:4200, align:4.1, level:5, modules:['Covert Ops Cloaking Device II','Inertial Stabilizers II ×2','Medium Shield Extender II','50MN Microwarpdrive I'] },
];
export const GAS_FIT: Fit = { id:'venture', name:'Venture', role:'入门 · 气云采集', cost:2_800_000, capacity:5000, align:4.5, level:1, modules:['Gas Cloud Scoop I ×2','1MN Afterburner I','Medium Shield Extender I','Damage Control I'] };
export type Pilot = { name: string; wallet: number; level: number; owned: string[]; skills: { name:string; current:number; target:number; duration:string }[]; };
export function getPilot(scenario: Scenario): Pilot {
  return { name: scenario === 'rookie' ? 'New Capsuleer' : scenario==='hauler'?'Veteran · Demo Pilot':'Explorer · Demo Pilot', wallet: scenario === 'rookie' ? 28e6 : scenario==='hauler'?1.2e9:240e6, level: scenario === 'rookie' ? 1 : scenario==='hauler'?5:3, owned: scenario === 'rookie' ? [] : scenario==='hauler'?['wreathe','venture','prowler']:['wreathe','venture'], skills:[
    { name:'Mining Frigate',current:scenario === 'rookie'?1:4,target:5,duration:'4d 08h' },
    { name:'Gas Cloud Harvesting',current:scenario === 'rookie'?0:4,target:5,duration:'7d 14h' },
    { name:'Minmatar Hauler',current:scenario === 'rookie'?0:scenario==='hauler'?5:3,target:5,duration:'9d 02h' },
    { name:'Transport Ships',current:scenario==='hauler'?4:0,target:4,duration:'1d 06h' },
    { name:'Cloaking',current:scenario==='hauler'?4:1,target:4,duration:'3d 18h' },
  ] };
}
export function route(from: string, to: string, allowed: Security[], risk: Risk = 'conservative'): string[] | null {
  if (!allowed.includes(systemById(from).security) || !allowed.includes(systemById(to).security)) return null;
  const distances = new Map<string,number>([[from,0]]), previous = new Map<string,string>(), remaining = new Set(systems.filter(s => allowed.includes(s.security)).map(s => s.id));
  const weight = { conservative:0.55, balanced:0.22, aggressive:0.05 }[risk];
  while (remaining.size) {
    const u = [...remaining].sort((a,b) => (distances.get(a)??Infinity)-(distances.get(b)??Infinity))[0];
    if (!Number.isFinite(distances.get(u)??Infinity)) break;
    remaining.delete(u);
    if (u === to) { const result=[u]; while(previous.has(result[0]))result.unshift(previous.get(result[0])!); return result; }
    for (const [a,b] of edges) {
      const v = a === u ? b : b === u ? a : null;
      if (!v || !remaining.has(v)) continue;
      const next = distances.get(u)! + 1 + systemById(v).kills * weight;
      if (next < (distances.get(v)??Infinity)) { distances.set(v,next); previous.set(v,u); }
    }
  }
  return null;
}
type Order = { id:string; type:string; volume:number; buy:number; sell:number; sourceQty:number; destQty:number; min:number; };
const products: Order[] = [
  { id:'micro',type:'Microprocessors',volume:6,buy:4200,sell:5800,sourceQty:1800,destQty:1000,min:1 },
  { id:'ammo',type:'Caldari Navy Antimatter Charge S',volume:0.0025,buy:610,sell:770,sourceQty:14000,destQty:12000,min:100 },
  { id:'shield',type:'Medium Shield Extender II',volume:10,buy:760000,sell:930000,sourceQty:48,destQty:18,min:1 },
  { id:'antibiotics',type:'Antibiotics',volume:0.2,buy:320,sell:430,sourceQty:6000,destQty:5000,min:50 },
];
export type Cargo = Order & { quantity:number; cost:number; revenue:number; profit:number; usedVolume:number; };
export type Plan = { id:string; dest:string; source:string; fit:Fit; path:string[]; cargo:Cargo[]; cost:number; revenue:number; profit:number; volume:number; shipCost:number; exposure:number; minutes:number; }; 
export const budgetRates: Record<Risk,{cash:number;exposure:number}> = { conservative:{cash:0.1,exposure:0.2}, balanced:{cash:0.2,exposure:0.35}, aggressive:{cash:0.3,exposure:0.5} };
export function planHauling(options: { pilot:Pilot; allowed:Security[]; risk:Risk; scenario:Scenario; from:string; returnHome:boolean; fitId?:string }): { plans:Plan[]; reason:string } {
  const { pilot, allowed, risk, scenario, from, returnHome, fitId } = options;
  if (!allowed.length) return { plans:[],reason:'请至少开启一个区域：高安、低安或 00。' };
  if (!allowed.includes(systemById(from).security))return { plans:[],reason:'当前位置不在允许区域内。请启用起点所在区域，再规划完整航程。' };
  if (scenario === 'stale') return { plans:[],reason:'市场快照已过期。请恢复标准场景并刷新，过期报价不能标记为可执行。' };
  if (scenario === 'withdrawn')return { plans:[],reason:'目标买单已撤销。原方案失效；请复核现有持仓，不会自动挂单或改航。' };
  const cap=pilot.wallet * budgetRates[risk].cash, exposureCap=pilot.wallet * budgetRates[risk].exposure;
  const availableFits=fits.filter(f => f.level<=pilot.level && (!fitId || f.id===fitId));
  const plans:Plan[]=[];
  for(const dest of ['nourv','inaya','suja','nenn','pc9']) {
    const start=route(from,'jita',allowed,risk),delivery=route('jita',dest,allowed,risk),back=returnHome?route(dest,from,allowed,risk):[];
    if(!start || !delivery || !back)continue;
    const path=[...start,...delivery.slice(1),...back.slice(1)];
    for(const fit of availableFits) {
      // Synthetic scenario rule, not a real nullsec safety/fit validation.
      if (path.some(s=>systemById(s).security==='null') && fit.id!=='prowler')continue;
      const shipCost=pilot.owned.includes(fit.id)?0:fit.cost;
      let cash=cap-shipCost,space=fit.capacity,exposure=exposureCap-fit.cost;
      const multiplier=systemById(dest).security==='low'?1.16:dest==='inaya'?1.04:1;
      const cargo:Cargo[]=[];
      const ordered=products.map(o=>({...o,sell:Math.round(o.sell*multiplier)})).sort((a,b)=>(b.sell*0.95-b.buy)/b.volume-(a.sell*0.95-a.buy)/a.volume);
      for(const o of ordered) {
        const quantity=Math.floor(Math.min(o.sourceQty,o.destQty,cash/o.buy,space/o.volume,exposure/o.buy));
        if(quantity<o.min || o.sell*0.95<=o.buy)continue;
        const cost=quantity*o.buy,revenue=quantity*o.sell*0.95,usedVolume=quantity*o.volume;
        cargo.push({...o,quantity,cost,revenue,profit:revenue-cost,usedVolume}); cash-=cost; space-=usedVolume; exposure-=cost;
      }
      const cost=cargo.reduce((s,c)=>s+c.cost,0),revenue=cargo.reduce((s,c)=>s+c.revenue,0);
      if(!cargo.length)continue;
      const minutes=(path.length-1)*0.9+4;
      plans.push({ id:`${dest}-${fit.id}`,dest,source:'jita',fit,path,cargo,cost,revenue,profit:revenue-cost,volume:fit.capacity-space,shipCost,exposure:fit.cost+cost,minutes });
    }
  }
  plans.sort((a,b)=>(b.profit/b.minutes)-(a.profit/a.minutes));
  const seen=new Set<string>();
  const unique=plans.filter(p=>{if(seen.has(p.dest))return false;seen.add(p.dest);return true;});
  return { plans:unique, reason:unique.length?'':allowed.includes('null')?'00 已启用，但演示快照没有经过验证的 00 船装/订单组合；其他允许区域仍独立参与规划。':'当前技能、预算或所选船装无法形成货单。请查看入门与升级路线。' };
}
export type Favorite = { systemId:string; gas:string[]; createdAt:string; };
export function gasRoutes(from:string,range:'short'|'standard'|'long',risk:Risk,favorites:Favorite[],returnHome:boolean) {
  const caps={short:5,standard:10,long:20};
  return systems.filter(s=>s.gas && s.security!=='null' && s.id!==from).map(s=>{
    const path=route(from,s.id,['high','low'],risk); if(!path)return null;
    const back=returnHome?route(s.id,from,['high','low'],risk):[]; if(!back)return null;
    const full=[...path,...back.slice(1)],favorite=favorites.some(f=>f.systemId===s.id);
    if(path.length-1>caps[range] || full.length-1>({short:12,standard:24,long:40}[range]))return null;
    const danger=full.reduce((n,id)=>n+systemById(id).kills,0);
    return { system:s,path:full,favorite,minutes:(full.length-1)*0.9+2, score:(favorite?14:0)+(s.gas?.startsWith('Golden')?6:3)-(full.length-1)-danger*({conservative:1,balanced:0.4,aggressive:0.1}[risk]) };
  }).filter((x):x is NonNullable<typeof x>=>x!==null).sort((a,b)=>b.score-a.score);
}
export function payback(investment:number,increment:number):number|null { return investment>=0 && increment>0 ? investment/increment : null; }
