import {test,expect} from '@playwright/test';
const scopes=['esi-skills.read_skills.v1','esi-wallet.read_character_wallet.v1'];
function fixture(){const now=Date.now();return {fetchedAt:new Date(now).toISOString(),origin:30000142,originIsCharacter:false,coverage:{requested:1,resolved:1,unresolved:[],categories:[{key:'gas',label:'气体',requested:1,resolved:1}]},types:[{id:28694,name:'Amber Mykoserocin',volume:10},{id:16622,name:'Accounting',volume:0.01,description:'Each level reduces sales tax by 11%.'}],regions:[{id:10000002,name:'The Forge'}],orders:[{order_id:1,type_id:28694,location_id:60003760,system_id:30000142,price:100,volume_remain:100,min_volume:1,range:'station',is_buy_order:false,region_id:10000002},{order_id:2,type_id:28694,location_id:60000002,system_id:30002813,price:160,volume_remain:70,min_volume:1,range:'station',is_buy_order:true,region_id:10000002}],stations:[{id:60003760,name:'Jita IV - Moon 4',system_id:30000142},{id:60000002,name:'Tama NPC station',system_id:30002813}],systems:[{id:30000142,name:'Jita',security_status:.9,position:{x:0,y:0,z:0}},{id:30002813,name:'Tama',security_status:.3,position:{x:10,y:0,z:10}}],sources:[{region:'The Forge',type:'Amber Mykoserocin',expiresAt:now+3600000,complete:true,fetchedAt:new Date(now).toISOString()}],failures:[],scope:'test fixture',status:{players:12345},killSource:null};}
async function setup(page:any,connected=false,withSide=false,mixed=false){const snapshot=fixture();if(mixed){snapshot.types.push({id:101,name:"Mixed goods",volume:1});snapshot.sources.push({...snapshot.sources[0],type:"Mixed goods"});snapshot.orders.push(...snapshot.orders.map(o=>({...o,order_id:o.order_id+100,type_id:101,price:o.is_buy_order?30:10,volume_remain:100})));}if(withSide){snapshot.types.push({id:100,name:'Side goods',volume:1});snapshot.stations.push({id:60000003,name:'Origin NPC station',system_id:30000003});snapshot.systems.push({id:30000003,name:'Origin',security_status:.9,position:{x:-10,y:0,z:-10}});snapshot.orders.push({order_id:3,type_id:100,location_id:60000003,system_id:30000003,price:10,volume_remain:50,min_volume:1,range:'station',is_buy_order:false,region_id:10000002},{order_id:4,type_id:100,location_id:60003760,system_id:30000142,price:20,volume_remain:50,min_volume:1,range:'station',is_buy_order:true,region_id:10000002});snapshot.sources.push({region:'The Forge',type:'Side goods',expiresAt:Date.now()+3600000,complete:true,fetchedAt:snapshot.fetchedAt});}const character=connected?{id:42,name:'Fixture Pilot',scopes}:null;await page.route('**/api/**',async(route:any)=>{const url=new URL(route.request().url());let body:any;
 if(url.pathname==='/api/bootstrap')body={session:'test-session',clientId:'a'.repeat(32),redirectUri:'http://localhost:8765/callback',basicScopes:scopes,fullScopes:scopes,credentialStorage:'memory-only',character,authorizing:false,error:null};
 else if(url.pathname==='/api/favorites'||url.pathname==='/api/favorites/import')body={characterId:42,favorites:[]};
 else if(url.pathname==='/api/public')body={snapshot,progress:{state:'ready',completed:1,total:1,message:'ok'}};
 else if(url.pathname==='/api/character')body={character,snapshot:connected?{character,wallet:100000000,walletSource:{fetchedAt:snapshot.fetchedAt,expiresAt:Date.now()+3600000},skills:{skills:[{skill_id:16622,active_skill_level:3,trained_skill_level:3}],total_sp:12345},types:[],errors:[],fetchedAt:snapshot.fetchedAt}:null,error:null};
 else if(url.pathname==='/api/transport')body=connected?{available:true,shipName:'Iteron Mark V',cargo:{base:500,capacityEstimate:500,used:null,free:null,planningCapacity:500,mode:'empty-hold-scenario',capacityModifiers:[]},skills:{known:true,gallenteHauler:3,spaceshipCommand:4,evasiveManeuvering:1},alignSeconds:15,warpSpeed:3.5,reasons:['fixture']}:{available:false,reasons:[]};
 else if(url.pathname==='/api/hauling/estimate'){const side=route.request().postDataJSON().pickupCargo;body={time:{lowSeconds:side?650:600,highSeconds:side?1250:1200,jumps:10,warps:12,stops:side?4:3,measuredDistances:12,assumptions:['fixture']},routeIds:[30000142,30002813],approachIds:withSide?[30000003,30000142]:[30000142],pickupAreaIds:[30000142],extraPickupJumps:0,returnHome:true,mode:'empty-hold-scenario'};}
 else if(url.pathname==='/api/neighborhood')body={systems:snapshot.systems,edges:[[30000142,30002813]],fetchedAt:snapshot.fetchedAt};
 else if(url.pathname.startsWith('/api/risk/'))body={systemId:30000142,recent:[],returned:0,fetchedAt:snapshot.fetchedAt};
 else if(url.pathname==='/api/route'){const p=route.request().postDataJSON();body={ids:[p.from,p.to],systems:snapshot.systems,fetchedAt:snapshot.fetchedAt,source:'fixture'};}
 else body={started:true};await route.fulfill({json:body});});}
test('live public mode never fills missing private data from demo and can inspect book evidence',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);await page.goto('/');
 await expect(page.getByRole('heading',{name:'真实星图，你的下一次发现。'})).toBeVisible();
 await expect(page.getByText('余额待同步',{exact:true})).toBeVisible();
 await expect(page.getByText('240.00M')).toHaveCount(0);
 await page.getByRole('button',{name:'Hauling 真实订单'}).click();
 await page.getByRole('button',{name:'真实高安区域'}).click();await page.getByRole('button',{name:'真实低安区域'}).click();
 await expect(page.locator('summary').filter({hasText:'商品覆盖：1 / 1 种'})).toBeVisible();
 await expect(page.getByText('整批未扣税价差',{exact:true})).toBeVisible();
 await expect(page.getByText('主单平均 +60 ISK/单位',{exact:true})).toBeVisible();
 await expect(page.getByText('整批合计 · 未扣销售税 · 非单趟实得',{exact:true})).toBeVisible();
 await page.locator('button.live-trade-row').first().click();
 await expect(page.getByText('来源订单 ID',{exact:true})).toBeVisible();
 await expect(page.getByText('区域核查通过 · 非安全保证')).toBeVisible();
 await page.getByRole('button',{name:'Connection 数据与授权'}).click();
 await expect(page.getByLabel('公开 Client ID')).toHaveValue('a'.repeat(32));
 await expect(page.getByText('http://localhost:8765/callback',{exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});
test('authorized wallet and Accounting skills replace unknown fields without fictional fitting yield',async({page})=>{
 await setup(page,true);await page.goto('/');await expect(page.getByRole('button',{name:/Fixture Pilot/})).toBeVisible();
 await expect(page.getByText('100.00M ISK',{exact:true}).first()).toBeVisible();
 await page.getByRole('button',{name:'Hauling 真实订单'}).click();await page.getByRole('button',{name:'真实高安区域'}).click();await page.getByRole('button',{name:'真实低安区域'}).click();
 await expect(page.getByText(/销售税模型 5.025%/)).toBeVisible();
 await expect(page.getByText('48.00M')).toHaveCount(0);
 await expect(page.getByText('7,794–15,588 ISK/h',{exact:true})).toBeVisible();
 await expect(page.getByText('空舱 / 裸船场景',{exact:true})).toBeVisible();
 await expect(page.getByText(/500 m³ · 已按模型舱位截取/)).toBeVisible();
 await page.setViewportSize({width:900,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('pickup side cargo adds net profit and full time, and switching it off restores the main plan',async({page})=>{
 await setup(page,true,true);await page.goto('/');await page.getByRole('button',{name:'Hauling 真实订单'}).click();await page.getByRole('button',{name:'真实高安区域'}).click();await page.getByRole('button',{name:'真实低安区域'}).click();
 const main=page.locator('button.live-trade-row').filter({has:page.locator('strong',{hasText:'Amber Mykoserocin'})});await expect(main.getByText(/含取货顺路单/)).toBeVisible();await expect(main.getByText('8,778–16,880 ISK/h',{exact:true})).toBeVisible();await main.click();await expect(page.getByRole('heading',{name:'取货途中顺路单 · Side goods'})).toBeVisible();await expect(page.getByText(/分阶段峰值采购资金 5,000 ISK/)).toBeVisible();
 await page.getByLabel('取货途中顺路带货',{exact:true}).uncheck();await expect(main.getByText('7,794–15,588 ISK/h',{exact:true})).toBeVisible();await expect(main.getByText(/含取货顺路单/)).toHaveCount(0);
});

test('web SSO opens a browser tab before async authorization and navigates to the official login',async({page,context})=>{
 await setup(page);await context.route('https://login.eveonline.com/web-fixture',route=>route.fulfill({contentType:'text/html',body:'<h1>Official login fixture</h1>'}));await page.route('**/api/auth/start',route=>route.fulfill({json:{url:'https://login.eveonline.com/web-fixture',opened:false}}));await page.goto('/');await page.getByRole('button',{name:'Connection 数据与授权'}).click();const opened=context.waitForEvent('page');await page.getByRole('button',{name:'基础授权 · 兼容已有应用',exact:true}).click();const popup=await opened;await popup.waitForURL('https://login.eveonline.com/web-fixture');await expect(popup.getByRole('heading',{name:'Official login fixture'})).toBeVisible();expect(await popup.evaluate(()=>opener===null)).toBeTruthy();
});

test('mixed manifest displays its packing list and no aggregate unit margin',async({page})=>{
 await setup(page,true,false,true);await page.goto('/');await page.getByRole('button',{name:'Hauling 真实订单'}).click();await page.getByRole('button',{name:'真实高安区域'}).click();await page.getByRole('button',{name:'真实低安区域'}).click();
 const row=page.locator('button.live-trade-row').first();await expect(row).toContainText('2 种商品');await expect(row).not.toContainText('ISK/单位');await row.click();await expect(page.locator('.live-selected').first()).toContainText('Mixed goods');await expect(page.locator('.live-selected').first()).toContainText('税后价差');
});

test('legacy character favorites migrate once and stay deleted after reload',async({page})=>{
 await setup(page,true);const legacy={systemId:30000142,name:'Legacy Jita',gasTypeIds:[28694],observedAt:'2026-10-18T00:00:00Z'};let stored:any[]=[];const imported=new Set<string>();let imports=0;
 await page.addInitScript(f=>localStorage.setItem('eve-master:live:favorites:42',JSON.stringify([f])),legacy);
 await page.route('**/api/favorites**',async route=>{const req=route.request(),url=new URL(req.url());if(req.method()==='POST'){const input=req.postDataJSON();expect(input.characterId).toBe(42);if(url.pathname.endsWith('/import')){imports++;if(!imported.has(input.source)){stored=input.favorites;imported.add(input.source);}}else if(url.pathname.endsWith('/delete'))stored=stored.filter(f=>f.systemId!==input.systemId);else if(url.pathname.endsWith('/save'))stored=[input.favorite];}await route.fulfill({json:{characterId:42,favorites:stored}});});
 await page.goto('/');await expect(page.getByText('Legacy Jita',{exact:true})).toBeVisible();await page.getByRole('button',{name:'取消真实收藏 Legacy Jita',exact:true}).click();await expect(page.getByText('Legacy Jita',{exact:true})).toHaveCount(0);await page.reload();await expect(page.getByText('本地 SQLite · 按角色保存',{exact:true})).toBeVisible();await expect(page.getByText('Legacy Jita',{exact:true})).toHaveCount(0);expect(stored).toEqual([]);expect(imports).toBeGreaterThanOrEqual(2);
});

test('language switching preserves live filters and Local input, persists and applies to demo mode',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await setup(page);await page.goto('/');
 const expectEnglish=async()=>{const untranslated=await page.evaluate(()=>{const nodes=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),found:string[]=[];let node:Node|null;while((node=nodes.nextNode())){const parent=node.parentElement;if(parent&&!parent.closest('.language-switcher,textarea,script,style')&&parent.getClientRects().length&&/[\u3400-\u9fff]/.test(node.textContent||''))found.push(node.textContent!.trim());}return found;});expect(untranslated).toEqual([]);};
 await page.getByRole('button',{name:'Hauling 真实订单'}).click();
 await page.getByRole('button',{name:'真实低安区域'}).click();
 const zone=page.getByRole('button',{name:'真实高安区域'});await zone.click();const before=await zone.getAttribute('class');
 await page.getByLabel('Language / 语言').selectOption('en');
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await expect(page.getByRole('heading',{name:'Real orders. Know the numbers before you undock.'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Live Highsec Region'})).toHaveAttribute('class',before!);
 await expect(page.getByText('Main load average +60 ISK/unit',{exact:true})).toBeVisible();
 for(const name of ['Development Skills and fittings','Records Personal evidence','Connection Data and authorization']){await page.getByRole('button',{name,exact:true}).click();await expectEnglish();}
 await page.getByRole('button',{name:'Local Intel Pilot risk'}).click();await expectEnglish();
 await page.getByLabel('Character IDs, links or names').fill('12345');
 await page.getByLabel('Language / 语言').selectOption('zh-CN');
 await expect(page.getByLabel('角色 ID、链接或名字列表')).toHaveValue('12345');
 await page.getByLabel('Language / 语言').selectOption('en');
 await page.route('**/api/local/batch',route=>route.fulfill({status:503,json:{error:'本地数据服务失败，请重试或查看连接状态。'}}));
 await page.getByRole('button',{name:'Batch lookup',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'Local data service failed.'})).toBeVisible();
 await page.reload();await expect(page.getByLabel('Language / 语言')).toHaveValue('en');
 await page.getByRole('button',{name:'Switch to demo mode'}).click();
 await expect(page.getByRole('heading',{name:'Make every jump count.'})).toBeVisible();
 for(const name of ['Hauling Arbitrage hauling','Development Skills and progression','Flight records Activity records','Settings · preferences and data']){
  await page.getByRole('button',{name,exact:true}).click();await expectEnglish();
 }
 await page.setViewportSize({width:390,height:844});
 await expect(page.getByLabel('Language / 语言')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 expect(errors).toEqual([]);
});
