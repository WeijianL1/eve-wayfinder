import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,rm,chmod} from 'node:fs/promises';
import path from 'node:path';

// Local single-user storage: encryption key stays on this server, never in the browser.
// File encryption plus permissions prevents accidental plaintext disclosure, not a
// compromise of the OS account holding both files. Production secret custody is separate.
export function createCredentialStore(dataDir){
 // Keep the v1 encryption AAD stable across rebrands so existing authorization decrypts.
 const file=path.join(dataDir,'authorization.enc'),keyFile=path.join(dataDir,'authorization.key');
 async function key(create=false){
  try{const bytes=await readFile(keyFile);if(bytes.length!==32)throw Error('Invalid credential key');return bytes;}
  catch(e){if(e.code!=='ENOENT'||!create)throw e;await mkdir(dataDir,{recursive:true,mode:0o700});await chmod(dataDir,0o700);try{await writeFile(keyFile,randomBytes(32),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}return key();}
 }
 return {mode:'server-encrypted-file',async load(){let payload;try{payload=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}if(payload.version!==1)throw Error('Unsupported credential format');const decrypt=createDecipheriv('aes-256-gcm',await key(),Buffer.from(payload.iv,'base64'));decrypt.setAAD(Buffer.from('eve-master-web-v1'));decrypt.setAuthTag(Buffer.from(payload.tag,'base64'));return JSON.parse(Buffer.concat([decrypt.update(Buffer.from(payload.data,'base64')),decrypt.final()]).toString('utf8'));},
 async save(value){const bytes=await key(true),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',bytes,iv);cipher.setAAD(Buffer.from('eve-master-web-v1'));const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);const payload={version:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:encrypted.toString('base64')};const temp=file+'.'+randomBytes(6).toString('hex')+'.tmp';try{await writeFile(temp,JSON.stringify(payload),{mode:0o600});await rename(temp,file);}finally{await rm(temp,{force:true});}},
 async clear(){await rm(file,{force:true});}};
}
