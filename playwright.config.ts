import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const chrome=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export default defineConfig({ testDir:'./tests/ui', timeout:30000, workers:1,
  use:{baseURL:'http://127.0.0.1:5173',headless:true,viewport:{width:1480,height:1000},launchOptions:{executablePath:existsSync(chrome)?chrome:undefined}},
  webServer:{command:'npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:true},
});
