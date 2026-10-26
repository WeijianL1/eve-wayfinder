import { defineConfig } from 'vite';
import devFileGuard from './server/dev-file-guard.mjs';
import liveApiPlugin from './server/dev-plugin.mjs';
export default defineConfig({ base: './', plugins:[devFileGuard(),liveApiPlugin()], server: {
  host: '127.0.0.1',
  cors: false,
  fs: {strict: true, deny: [
    '.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**',
    '**/.local-data/**', '**/artifacts/**', '**/*.{sqlite,sqlite-*,db,db-*,enc}',
  ]},
} });
