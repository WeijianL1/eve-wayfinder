import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';
import {createApiClient} from '../src/live/api-client.ts';
// @ts-expect-error JavaScript module is executed directly by Node.
import {createMemoCache} from '../server/memo-cache.mjs';
// @ts-expect-error JavaScript service is executed directly by Node.
import {createService} from '../server/service.mjs';

test('browser shares concurrent requests and reuses the same object on 304 without persisting private fields',async()=>{
 let calls=0;const fetchImpl:typeof fetch=async(_url,options)=>{calls++;if(calls===2){assert.equal(new Headers(options?.headers).get('if-none-match'),'"v1"');return new Response(null,{status:304});}return new Response(JSON.stringify({snapshot:{orders:[1,2]}}),{headers:{ETag:'"v1"','Content-Type':'application/json'}});};const client=createApiClient(fetchImpl);
 const [a,b]=await Promise.all([client.request('public'),client.request('public')]);assert.equal(calls,1);assert.equal(a,b);assert.equal(await client.request('public'),a);assert.equal(calls,2);client.clear();await client.request('public');assert.equal(calls,3);
});
test('derived route cache shares work, expires, remains bounded and never caches failures',async()=>{
 let now=0,calls=0;const cache=createMemoCache({ttl:10,max:2,now:()=>now});const load=async()=>{calls++;return calls;};assert.deepEqual(await Promise.all([cache.get('a',load),cache.get('a',load)]),[1,1]);assert.equal(await cache.get('a',load),1);assert.equal(calls,1);now=11;assert.equal(await cache.get('a',load),2);await cache.get('b',load);await cache.get('c',load);assert.equal(cache.size,2);await assert.rejects(cache.get('bad',async()=>{throw Error('temporary');}));assert.equal(await cache.get('bad',async()=>42),42);cache.clear();assert.equal(cache.size,0);
});
test('HTTP snapshots compress once, return bodyless 304, and progress updates do not resend an unchanged market snapshot',async()=>{
 const dataDir=await mkdtemp(path.join(tmpdir(),'eve-http-cache-'));await writeFile(path.join(dataDir,'public-snapshot.json'),JSON.stringify({fetchedAt:'fixture',orders:Array.from({length:2000},(_,i)=>({order_id:i,name:'repeating commodity'}))}));
 const service=createService({dataDir,fetchImpl:async()=>new Response('{}',{status:400})});const server=createServer((req,res)=>void service.handler(req,res));await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();if(!address||typeof address==='string')throw Error('No port');const base=`http://127.0.0.1:${address.port}`;
 try{const first=await fetch(base+'/api/public',{headers:{'Accept-Encoding':'gzip'}});const etag=first.headers.get('etag')!;assert.equal(first.headers.get('content-encoding'),'gzip');const full=await first.json();assert.equal(full.snapshot.orders.length,2000);assert.ok(Number(first.headers.get('content-length'))<JSON.stringify(full).length/2);
 const unchanged=await fetch(base+'/api/public',{headers:{'If-None-Match':etag}});assert.equal(unchanged.status,304);assert.equal((await unchanged.arrayBuffer()).byteLength,0);
 const delta=await fetch(base+'/api/public?since='+full.snapshotVersion);const deltaTag=delta.headers.get('etag')!;const small=await delta.json();assert.equal('snapshot' in small,false);assert.ok(JSON.stringify(small).length<1000);
 await assert.rejects(service.refreshPublic());const changed=await fetch(base+'/api/public?since='+full.snapshotVersion,{headers:{'If-None-Match':deltaTag}});assert.equal(changed.status,200);const progress=await changed.json();assert.equal(progress.progress.state,'error');assert.equal('snapshot' in progress,false);
 }finally{service.close();await new Promise<void>(r=>server.close(()=>r()));await rm(dataDir,{recursive:true,force:true});}
});
