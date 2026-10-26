import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer,loadConfigFromFile} from 'vite';

test('shipped development config denies private files over static and @fs routes',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'eve-dev-security-'));
 let server;
 try{
  const files=['.local-data/authorization.enc','.local-data/authorization.key','.local-data/public-cache/snapshot.json','artifacts/private.json','.env','.git/config','backup.sqlite'];
  for(const file of [...files,'public.txt']){await mkdir(path.dirname(path.join(root,file)),{recursive:true});await writeFile(path.join(root,file),'security-fixture');}
  await symlink(path.join(root,'.local-data/authorization.enc'),path.join(root,'leak.json'));
  const {config}=await loadConfigFromFile({command:'serve',mode:'development'},path.resolve('vite.config.ts'));
  // Exercise the actual shipped static-file policy without opening a user's SQLite store.
  server=await createServer({...config,configFile:false,root,plugins:config.plugins.filter(plugin=>plugin.name==='eve-dev-file-guard'),logLevel:'silent',server:{...config.server,port:0,strictPort:false}});
  await server.listen();const base=server.resolvedUrls.local[0];
  assert.equal((await fetch(new URL('public.txt',base))).status,200);
  for(const file of [...files,'leak.json']){for(const route of [file,file+'?raw',file+'?url','@fs/'+path.join(root,file).replaceAll('\\','/')]){
   const response=await fetch(new URL(route,base));assert.equal(response.status,403,route);assert.ok(!(await response.text()).includes('security-fixture'));
  }}
  const response=await fetch(new URL('public.txt',base),{headers:{Origin:'http://localhost:9999'}});
  assert.equal(response.headers.get('access-control-allow-origin'),null);
 }finally{await server?.close();await rm(root,{recursive:true,force:true});}
});
