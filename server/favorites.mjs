import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import path from 'node:path';
export function createFavoriteStore(filename){
 mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});
 const db=new DatabaseSync(filename);chmodSync(filename,0o600);
 db.exec(`PRAGMA journal_mode=DELETE; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS favorites(character_id INTEGER NOT NULL,system_id INTEGER NOT NULL,name TEXT NOT NULL,gas_type_ids TEXT NOT NULL,observed_at TEXT NOT NULL,PRIMARY KEY(character_id,system_id));
 CREATE TABLE IF NOT EXISTS favorite_imports(character_id INTEGER NOT NULL,source TEXT NOT NULL,PRIMARY KEY(character_id,source));`);
 const list=id=>db.prepare('SELECT system_id,name,gas_type_ids,observed_at FROM favorites WHERE character_id=? ORDER BY observed_at DESC,system_id').all(id).map(r=>({systemId:r.system_id,name:r.name,gasTypeIds:JSON.parse(r.gas_type_ids),observedAt:r.observed_at}));
 function validate(f){if(!f||!Number.isInteger(f.systemId)||f.systemId<30000000||f.systemId>=33000000||typeof f.name!=='string'||!f.name.trim()||f.name.length>200||!Array.isArray(f.gasTypeIds)||f.gasTypeIds.length>100||!f.gasTypeIds.every(n=>Number.isSafeInteger(n)&&n>0)||typeof f.observedAt!=='string'||!Number.isFinite(Date.parse(f.observedAt)))throw Error('收藏格式无效');return {...f,name:f.name.trim(),gasTypeIds:[...new Set(f.gasTypeIds)],observedAt:new Date(f.observedAt).toISOString()};}
 function write(id,f,ignore=false){db.prepare(`INSERT INTO favorites VALUES(?,?,?,?,?) ON CONFLICT(character_id,system_id) DO ${ignore?'NOTHING':'UPDATE SET name=excluded.name,gas_type_ids=excluded.gas_type_ids,observed_at=excluded.observed_at'}`).run(id,f.systemId,f.name,JSON.stringify(f.gasTypeIds),f.observedAt);}
 return {list,upsert(id,f){write(id,validate(f));return list(id);},remove(id,systemId){if(!Number.isInteger(systemId)||systemId<30000000||systemId>=33000000)throw Error('星系 ID 无效');db.prepare('DELETE FROM favorites WHERE character_id=? AND system_id=?').run(id,systemId);return list(id);},import(id,source,items){
 if(typeof source!=='string'||source.length<1||source.length>100||!Array.isArray(items)||items.length>5000)throw Error('收藏迁移格式无效');
 const clean=items.map(validate);db.exec('BEGIN IMMEDIATE');try{if(!db.prepare('SELECT 1 FROM favorite_imports WHERE character_id=? AND source=?').get(id,source)){for(const f of clean)write(id,f,true);db.prepare('INSERT INTO favorite_imports VALUES(?,?)').run(id,source);}db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return list(id);
 },close(){db.close();}};
}
