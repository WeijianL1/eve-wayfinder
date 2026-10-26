// Cached response bodies stay in this page's RAM. Never persist private API data.
export function createApiClient(fetchImpl:typeof fetch=fetch){
 let epoch=0;const values=new Map<string,{etag:string;value:unknown}>(),pending=new Map<string,Promise<unknown>>();
 function clear(){epoch++;values.clear();pending.clear();}
 async function request<T>(url:string,body?:unknown,session=''):Promise<T>{
  const method=body===undefined?'GET':'POST',key=method+':'+url+':'+(body===undefined?'':JSON.stringify(body));
  if(pending.has(key))return pending.get(key) as Promise<T>;
  const generation=epoch,cached=method==='GET'?values.get(url):undefined;
  const work=(async()=>{const response=await fetchImpl(`/api/${url}`,{method,cache:'no-store',headers:{...(body===undefined?{}:{'Content-Type':'application/json','X-Eve-Session':session}),...(cached?.etag?{'If-None-Match':cached.etag}:{})},body:body===undefined?undefined:JSON.stringify(body)});
   if(response.status===304&&cached)return cached.value as T;
   const value=await response.json();if(!response.ok)throw Error(value.error||`本地服务 HTTP ${response.status}`);
   if(generation===epoch&&method==='GET'){const etag=response.headers.get('etag');if(etag){if(url==='public'||url.startsWith('public?'))for(const key of values.keys())if(key!==url&&(key==='public'||key.startsWith('public?')))values.delete(key);if(values.size>=64&&!values.has(url))values.delete(values.keys().next().value!);values.set(url,{etag,value});}}
   if(method==='POST'&&url.startsWith('auth/'))clear();return value as T;
  })();pending.set(key,work);try{return await work;}finally{if(pending.get(key)===work)pending.delete(key);}
 }
 return {request,clear};
}
