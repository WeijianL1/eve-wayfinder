import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,stat,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createCredentialStore} from '../server/credentials.mjs';
import {createWebServer} from '../server/app.mjs';

test('web credentials persist encrypted across service restarts and reject tampering',async()=>{
 const data=await mkdtemp(path.join(tmpdir(),'eve-web-auth-'));try{const store=createCredentialStore(data);assert.equal(await store.load(),null);const value={accessToken:'fixture-access-secret',refreshToken:'fixture-refresh-secret',character:{id:42}};await store.save(value);const disk=await readFile(path.join(data,'authorization.enc'),'utf8');assert.ok(!disk.includes(value.accessToken));assert.ok(!disk.includes(value.refreshToken));assert.equal((await stat(path.join(data,'authorization.enc'))).mode&0o777,0o600);assert.equal((await stat(path.join(data,'authorization.key'))).mode&0o777,0o600);assert.deepEqual(await createCredentialStore(data).load(),value);
 const damaged=JSON.parse(disk);damaged.tag=Buffer.alloc(16).toString('base64');await writeFile(path.join(data,'authorization.enc'),JSON.stringify(damaged));await assert.rejects(store.load());await store.clear();assert.equal(await store.load(),null);
 }finally{await rm(data,{recursive:true,force:true});}
});
test('production web server serves UI and same-origin API while keeping credentials and external files private',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'eve-web-http-')),dist=path.join(dir,'dist'),data=path.join(dir,'data');await mkdir(dist);await writeFile(path.join(dist,'index.html'),'<main>EVE web fixture</main>');await writeFile(path.join(dist,'app.js'),'console.log("fixture")');await createCredentialStore(data).save({accessToken:'fixture-private',refreshToken:'fixture-refresh',expiresAt:Date.now()+600000,character:{id:42,name:'fixture',scopes:[]}});await symlink(path.join(data,'authorization.enc'),path.join(dist,'leak.json'));
 const {server}=await createWebServer({distDir:dist,dataDir:data,fetchImpl:async()=>{throw Error('No network expected');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{const html=await fetch(base+'/');assert.equal(html.status,200);assert.equal(html.headers.get('x-frame-options'),'DENY');assert.match(await html.text(),/EVE web fixture/);assert.equal((await fetch(base+'/hauling')).status,200);assert.equal((await fetch(base+'/app.js',{method:'HEAD'})).status,200);assert.equal((await fetch(base+'/missing.js')).status,404);assert.equal((await fetch(base+'/authorization.enc')).status,404);assert.equal((await fetch(base+'/leak.json')).status,403);
 const boot=await(await fetch(base+'/api/bootstrap')).json();
 const favorite={systemId:30000142,name:'Jita',gasTypeIds:[28694],observedAt:new Date().toISOString()};
 const postFavorite=(endpoint,body)=>fetch(base+'/api/favorites/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Eve-Session':boot.session},body:JSON.stringify(body)});
 assert.equal((await postFavorite('save',{characterId:43,favorite})).status,409);assert.equal((await postFavorite('save',{characterId:42,favorite})).status,200);
 assert.equal((await(await fetch(base+'/api/favorites')).json()).favorites[0].name,'Jita');assert.equal((await fetch(base+'/eve-master.sqlite')).status,404);
 assert.equal((await postFavorite('save',{characterId:42,favorite:{...favorite,systemId:1}})).status,400);
 assert.equal((await postFavorite('delete',{characterId:42,systemId:30000142})).status,200);
assert.equal(boot.character.id,42);assert.equal(boot.credentialStorage,'server-encrypted-file');assert.ok(!JSON.stringify(boot).includes('fixture-private'));assert.equal((await fetch(base+'/api/auth/cancel',{method:'POST'})).status,403);assert.equal((await fetch(base+'/api/auth/cancel',{method:'POST',headers:{'X-Eve-Session':boot.session}})).status,200);assert.equal((await fetch(base+'/api/bootstrap',{headers:{Origin:'https://evil.invalid'}})).status,403);
 }finally{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
