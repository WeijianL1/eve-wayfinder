# EVE Master · Web App

EVE 风格的单角色 Gas / Hauling 网页应用。React 前端通过同源 HTTP API 连接 Node 服务，直接在浏览器运行；无需 Electron。默认使用真实 ESI/SSO/zKillboard，独立 `?mode=demo` 保留演示沙盒。

发布源码时不要包含 `.local-data/`、环境变量文件、数据库导出、授权备份或个人截图。Git 历史同样会被公开，删除当前文件不会清除历史副本。开发服务和正式服务均仅用于本机单用户运行，不提供公网部署所需的用户登录与多用户隔离。

## 启动

需要 Node.js 22.18+（本机验证 Node 24.19）：

```sh
npm ci
npm start
```

打开 **http://127.0.0.1:5173/**。`npm start` 检查 TypeScript、构建前端并启动正式网页服务。macOS 可双击 `Start EVE Master.command` 启动，再打开上述地址。

开发模式：`npm run dev`，同样提供页面和 API，支持热更新。正式构建完成后可用 `npm run serve` 直接启动；`PORT=5180 npm run serve` 可更换端口。开发与正式服务共用本项目 `.local-data/`，不要同时启动它们占用同一端口。

当前实现为本机单用户网页服务，默认绑定 `127.0.0.1`。尚未实现公开站点的多用户会话隔离与部署，不应把当前角色 API 直接暴露到公网。

## 数据与授权

- Connection 中使用公开 CCP Client ID；可从 `.local-data/client.json` 或环境变量 `EVE_CLIENT_ID` 读取，不需要 Client Secret。
- SSO 在独立浏览器标签页进行，保留已注册回调 `http://localhost:8765/callback`；需要这个端口可用。
- token 只在 Node 服务中使用，持久化到 `.local-data/authorization.enc`，使用 AES-256-GCM；POSIX 系统使用 0600 文件权限，Windows 依靠账户和目录 ACL 限制访问。不使用 localStorage 保存 token。
- 密钥也在同一台机器，因此文件加密不等于操作系统账户被攻破后的隔离。`.local-data/` 全部被 Git 忽略；个人明细只在服务内存中保留，公开缓存位于 `.local-data/public-cache/`。
- 已将本项目原有授权及公开缓存迁移到网页服务；原先 Electron 的加密文件保留备份，没有修改 eve-trader 的私人授权。
- 收藏/区域/风险偏好继续使用浏览器 localStorage；保留同一浏览器 origin 的原有偏好。演示与真实模式、不同角色收藏相互隔离。

## 当前功能

- 629 种常用商品、19 类，在 The Forge / Black Rise / Syndicate 读取完整分页订单，按真实深度、最小成交量、税率与缓存时效匹配 NPC 站间即时套利。
- 读取当前船、技能、资产，提供运力场景、逐段区域核验、航程与税后 ISK/h；当前已验证 Iteron Mark V 的船体技能容量模型。
- 取货途中顺路单：先卖顺路货，再买主单，最多额外 2 跳；计算资金/舱位峰值、额外停站和整趟 ISK/h。
- Gas 当前星系收藏、气体类型反馈、真实行情、星门邻域和战损证据。
- 保留独立合成演示流程，包括无船入门、区域切换、报价失效与运输模拟。

缺失的实际空余舱位、完整 Dogma 拟合、现场气矿与实测效率会明确显示未知或条件估算；订单价差不是实际收入或保证收益。应用不会控制游戏或自动下单。

## 验证

```sh
npm test
npm run test:ui
npm run build
npm run test:live
node --experimental-strip-types scripts/smoke-transport.mjs
node scripts/validate-market-catalog.mjs
```

UI 测试覆盖真实/演示模式、角色缺口、容量/ISK/h、顺路单和浏览器 SSO；默认使用本机 Google Chrome，可用 `CHROME_PATH` 指定，或安装 Playwright Chromium。服务测试覆盖加密凭据重启恢复、API 来源/会话保护、静态页面与文件隔离。测试产物在忽略的 `artifacts/`。

设计见 [docs/design.md](docs/design.md)，接口与计算边界见 [docs/live-data.md](docs/live-data.md)，生产目标见 [.scratch/eve-assistant/spec.md](.scratch/eve-assistant/spec.md)。当前网页实现保存在 `prototype/eve-master` 分支。
