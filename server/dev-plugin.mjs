import {createLocalService} from './runtime.mjs';
export default function liveApiPlugin(){return {name:'eve-web-api',async configureServer(server){
 const service=await createLocalService();server.middlewares.use(async(req,res,next)=>{if(req.url?.startsWith('/api/'))await service.handler(req,res);else next();});server.httpServer?.once('close',()=>service.close());
}};}
