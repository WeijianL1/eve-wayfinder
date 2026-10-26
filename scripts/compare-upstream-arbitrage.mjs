// Run statically audited pure upstream functions only. No upstream app, dependencies or SSO.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {opportunities,quoteItem} from '../src/live/model.ts';
const root=path.resolve('artifacts/upstream/eve-flipper'),out=path.resolve('artifacts/arbitrage-comparison');await fs.mkdir(out,{recursive:true});
const revision=spawnSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();
if(revision!=='3265793cb04525553e5b4da1240f5409e6aa68ed')throw Error('Upstream revision differs from audited revision');
const execution=await fs.readFile(root+'/internal/engine/execution.go','utf8'),scanner=await fs.readFile(root+'/internal/engine/scanner.go','utf8');
function block(source,prefix){const start=source.indexOf(prefix);if(start<0)throw Error('Missing source block');const end=source.indexOf('\n}',start);return source.slice(start,end+2);}
const extracted=[block(execution,'func clampInt64ToInt32('),block(execution,'type DepthLevel struct'),block(execution,'type ExecutionPlanResult struct'),block(execution,'func ComputeExecutionPlan('),block(scanner,'func findSafeExecutionQuantity('),block(scanner,'func expectedProfitForPlans(')].join('\n\n').replaceAll('esi.MarketOrder','MarketOrder');
// Only package qualification changes. Original function bodies are retained verbatim.
const source=`package main
import("math";"sort";"encoding/json";"os")
type ImpactEstimate struct{}
type ExecutionQuote struct{}
type MarketOrder struct { Price float64; VolumeRemain int32; IsBuyOrder bool }
${extracted}
type Case struct { Asks []MarketOrder; Bids []MarketOrder; Quantity int32; CapacityQuantity int32; Tax float64 }
type Result struct { Quantity int32; Cost float64; Profit float64; CapacityQuantity int32; CapacityCost float64; CapacityProfit float64 }
func main(){var cases []Case;if err:=json.NewDecoder(os.Stdin).Decode(&cases);err!=nil{panic(err)};results:=make([]Result,0,len(cases));for _,c:=range cases{q,b,_,p:=findSafeExecutionQuantity(c.Asks,c.Bids,c.Quantity,1,1-c.Tax);cq,cb,_,cp:=findSafeExecutionQuantity(c.Asks,c.Bids,c.CapacityQuantity,1,1-c.Tax);results=append(results,Result{q,b.TotalCost,p,cq,cb.TotalCost,cp})};if err:=json.NewEncoder(os.Stdout).Encode(results);err!=nil{panic(err)}}`;
await fs.writeFile(out+'/main.go',source);await fs.copyFile(root+'/LICENSE',out+'/UPSTREAM-LICENSE');
const replay=process.argv.includes('--replay');
const snapshot=replay?JSON.parse(await fs.readFile(out+'/snapshot.json','utf8')):(await(await fetch('http://127.0.0.1:5173/api/public')).json()).snapshot;
if(!replay)await fs.writeFile(out+'/snapshot.json',JSON.stringify(snapshot));
const evaluatedAt=replay?JSON.parse(await fs.readFile(out+'/report.json','utf8')).evaluatedAt:Date.now();
const constraints={budget:80000000,capacity:6670,tax:.05025,zones:['high','low','null']};
const quotes=opportunities(snapshot,constraints.zones,constraints.budget,1,constraints.tax,evaluatedAt,constraints.capacity).slice(0,200);
if(!quotes.length)throw Error('No fresh public cases; refresh first');
const books=new Map();for(const o of snapshot.orders){const k=o.type_id+':'+o.location_id;const a=books.get(k)||[];a.push(o);books.set(k,a);}
const cases=quotes.map(q=>{const asks=(books.get(q.typeId+':'+q.source.id)||[]).filter(o=>!o.is_buy_order),bids=(books.get(q.typeId+':'+q.destination.id)||[]).filter(o=>o.is_buy_order);const map=o=>({Price:o.price,VolumeRemain:o.volume_remain,IsBuyOrder:o.is_buy_order});return {Asks:asks.map(map),Bids:bids.map(map),Quantity:q.quantity,CapacityQuantity:Math.min(2147483647,Math.floor(constraints.capacity/(q.volume/q.quantity))),Tax:constraints.tax};});
const go=process.env.ARBITRAGE_GO||path.resolve('artifacts/upstream/go-runtime/go/bin/go');
const run=spawnSync(go,['run',out+'/main.go'],{input:JSON.stringify(cases),encoding:'utf8',env:{...process.env,GOTOOLCHAIN:'local',GOPROXY:'off',GOSUMDB:'off',GO111MODULE:'off'},maxBuffer:2000000});
if(run.status!==0)throw Error(run.stderr||'Go harness failed');const results=JSON.parse(run.stdout);
const rows=quotes.map((q,i)=>({name:q.name,typeId:q.typeId,source:q.source.id,destination:q.destination.id,ours:{quantity:q.quantity,cost:q.cost,profit:q.profit},upstreamSameQuantity:results[i],hasMinimums:(books.get(q.typeId+':'+q.destination.id)||[]).some(o=>o.is_buy_order&&Math.min(o.min_volume,o.volume_remain)>1)}));
const report={checkedAt:new Date().toISOString(),snapshotAt:snapshot.fetchedAt,evaluatedAt,upstreamRevision:revision,extractedSHA256:createHash('sha256').update(extracted).digest('hex'),constraints,cases:rows.length,sameQuantityProfitMatches:rows.filter(r=>Math.abs(r.ours.profit-r.upstreamSameQuantity.Profit)<.01).length,capacityCostOverBudget:rows.filter(r=>r.upstreamSameQuantity.CapacityCost>constraints.budget).length,capacityProfitLowerThanOurs:rows.filter(r=>r.upstreamSameQuantity.CapacityProfit+.01<r.ours.profit).length,rows};
await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,rows:rows.slice(0,5)}));
const haulCases=quotes.map(q=>({orders:[...(books.get(q.typeId+':'+q.source.id)||[]).filter(o=>!o.is_buy_order),...(books.get(q.typeId+':'+q.destination.id)||[]).filter(o=>o.is_buy_order)].map(o=>({order_id:o.order_id,region_id:o.region_id,location_id:o.location_id,type_id:o.type_id,is_buy_order:o.is_buy_order,price:o.price,issued:'',volume_remain:o.volume_remain,item_name:q.name,item_cargo_volume:q.volume/q.quantity}))}));
const haulRun=spawnSync('python3',['-I','-B','scripts/run-haul-comparison.py'],{input:JSON.stringify({...constraints,cases:haulCases}),encoding:'utf8',maxBuffer:2000000});if(haulRun.status!==0)throw Error(haulRun.stderr);const haulRows=JSON.parse(haulRun.stdout).map((x,i)=>({name:quotes[i].name,ours:quotes[i].profit,...x}));
const haulReport={sourceRevision:'2c5b7da8165e3f8b90748e8ced1de0e3e8d52309',snapshotAt:snapshot.fetchedAt,constraints,cases:haulRows.length,normalizedHigher:haulRows.filter(x=>x.normalizedBestPairProfit>x.ours+.01).length,normalizedEqual:haulRows.filter(x=>Math.abs(x.normalizedBestPairProfit-x.ours)<.01).length,normalizedLower:haulRows.filter(x=>x.normalizedBestPairProfit+.01<x.ours).length,rows:haulRows};await fs.writeFile(out+'/haul-report.json',JSON.stringify(haulReport,null,2));console.log(JSON.stringify({...haulReport,rows:haulRows.slice(0,3)}));
