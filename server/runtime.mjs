import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createFavoriteStore} from './favorites.mjs';
import {createService} from './service.mjs';
import {createCredentialStore} from './credentials.mjs';
export async function createLocalService({dataDir=path.resolve('.local-data'),...options}={}){
 // Legacy SQLite filename is a persistence contract; rebranding must preserve favorites.
 let clientId=process.env.EVE_CLIENT_ID||'';if(!clientId){try{clientId=JSON.parse(await readFile(path.join(dataDir,'client.json'),'utf8')).clientId||'';}catch{}}
 return createService({dataDir:path.join(dataDir,'public-cache'),clientId,favoriteStore:createFavoriteStore(path.join(dataDir,'eve-master.sqlite')),credentialStore:createCredentialStore(dataDir),...options});
}
