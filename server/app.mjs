import {createServer} from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {createLocalService} from './runtime.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
export async function createWebServer({distDir=path.join(root,'dist'),dataDir=path.join(root,'.local-data'),...options}={}){
 const service=await createLocalService({dataDir,...options});const dist=await realpath(distDir);
 const server=createServer(async(req,res)=>{
  const host=req.headers.host||'';if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)){res.writeHead(403).end();return;}
  if(req.url?.startsWith('/api/')){await service.handler(req,res);return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
  try{
   const pathname=decodeURIComponent(new URL(req.url,`http://${host}`).pathname);let target=path.resolve(dist,'.'+(pathname==='/'?'/index.html':pathname));
   if(!target.startsWith(dist+path.sep)){res.writeHead(403).end();return;}
   try{target=await realpath(target);}catch(e){if(e.code!=='ENOENT'||path.extname(pathname))throw e;target=await realpath(path.join(dist,'index.html'));}
   if(!target.startsWith(dist+path.sep)){res.writeHead(403).end();return;}
   const bytes=await readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Content-Length':bytes.length,'Cache-Control':path.extname(target)==='.html'?'no-cache':'public, max-age=3600','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404).end('Not found');}
 });server.on('close',()=>service.close());return {server,service};
}
export async function startWebServer(){
 const port=Number(process.env.PORT||5173);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
 const runtime=await createWebServer();await new Promise((resolve,reject)=>{runtime.server.once('error',reject);runtime.server.listen(port,'127.0.0.1',resolve);});
 console.log(`EVE Master Web: http://127.0.0.1:${port}/`);
 const close=()=>{runtime.service.close();runtime.server.close(()=>process.exit(0));};process.once('SIGTERM',close);process.once('SIGINT',close);return runtime;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)startWebServer().catch(e=>{console.error(e.code==='EADDRINUSE'?'端口已占用，请关闭现有服务或设置 PORT。':e.message);process.exitCode=1;});
