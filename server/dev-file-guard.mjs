import {realpath} from 'node:fs/promises';
import path from 'node:path';
import {isFileLoadingAllowed,normalizePath} from 'vite';

// Check physical paths too: a harmless-looking symlink must not expose private data.
export default function devFileGuard(){return {name:'eve-dev-file-guard',configureServer(server){
 server.middlewares.use(async(req,res,next)=>{
  let pathname;try{pathname=decodeURIComponent((req.url||'/').split('?')[0]);}catch{res.writeHead(400).end();return;}
  if(pathname.startsWith('/api/')){next();return;}
  const candidates=pathname.startsWith('/@fs/')?[pathname.slice(5)]:[
   path.resolve(server.config.root,'.'+pathname),
   ...(server.config.publicDir?[path.resolve(server.config.publicDir,'.'+pathname)]:[]),
  ];
  for(const file of candidates){
   try{const physical=await realpath(file);if(!isFileLoadingAllowed(server.config,normalizePath(physical))){res.writeHead(403).end('Private file access denied');return;}}
   catch(e){if(e.code!=='ENOENT'&&e.code!=='ENOTDIR'){res.writeHead(403).end();return;}}
  }
  next();
 });
}};}
