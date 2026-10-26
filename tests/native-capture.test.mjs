import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createService} from '../server/service.mjs';
test('EVE windows can be discovered and captured without browser screen-sharing support',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'eve-native-'));const nativeCapture={list:async()=>({permission:true,windows:[{id:77,pid:8,title:'EVE - Pilot',width:1600,height:1000}]}),frame:async input=>{assert.equal(input.windowId,77);assert.equal(input.pid,8);return {image:'data:image/png;base64,fixture',width:1600,height:1000};}};
 const service=createService({dataDir:dir,nativeCapture,fetchImpl:async()=>{throw Error('No network');}});const server=createServer(service.handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{const boot=await(await fetch(base+'/api/bootstrap')).json();const res=await fetch(base+'/api/local/windows',{method:'POST',headers:{'Content-Type':'application/json','X-Eve-Session':boot.session},body:'{}'});assert.equal(res.status,200,'native EVE discovery must not require getDisplayMedia');assert.equal((await res.json()).windows[0].id,77);
 assert.equal((await fetch(base+'/api/local/frame',{method:'POST',body:'{}'})).status,403);
 const frame=await fetch(base+'/api/local/frame',{method:'POST',headers:{'Content-Type':'application/json','X-Eve-Session':boot.session},body:JSON.stringify({windowId:77,pid:8})});assert.equal(frame.status,200);assert.equal((await frame.json()).width,1600);
 }finally{await new Promise(r=>server.close(r));service.close();await rm(dir,{recursive:true,force:true});}
});

test('native helper only accepts positive window/PID identifiers',async()=>{
 const {createNativeCapture}=await import('../server/native-capture.mjs');const capture=createNativeCapture();assert.throws(()=>capture.frame({windowId:'77',pid:8}),/标识/);assert.throws(()=>capture.frame({windowId:77,pid:-1}),/标识/);
});
