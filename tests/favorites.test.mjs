import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createFavoriteStore} from '../server/favorites.mjs';
test('SQLite favorites survive reopening, isolate characters and import without overwriting or resurrecting deletions',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'eve-favorites-')),file=path.join(dir,'eve-master.sqlite');let store=createFavoriteStore(file);
 const a={systemId:30000142,name:'Jita',gasTypeIds:[28694],observedAt:'2026-10-18T12:00:00Z'},b={...a,name:'Other character'};
 try{store.upsert(42,a);store.upsert(43,b);assert.equal(store.list(42)[0].name,'Jita');assert.equal(store.list(43)[0].name,b.name);store.close();store=createFavoriteStore(file);assert.equal(store.list(42).length,1);assert.equal((await stat(file)).mode&0o777,0o600);
 store.import(42,'browser-A',[{...a,name:'Older browser version'}]);assert.equal(store.list(42)[0].name,'Jita');store.remove(42,a.systemId);store.import(42,'browser-A',[a]);assert.equal(store.list(42).length,0);assert.equal(store.list(43).length,1);
 assert.throws(()=>store.import(42,'browser-B',[a,{...a,systemId:1}]));assert.equal(store.list(42).length,0);store.import(42,'browser-B',[a]);assert.equal(store.list(42).length,1);
 }finally{store.close();await rm(dir,{recursive:true,force:true});}
});
