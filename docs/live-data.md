# 真实数据切片：接入与验证

更新：2026-10-18。真实模式现在为默认入口，`?mode=demo` 继续提供独立演示。真实数据失败或缺失时不回退演示钱包、星图、气矿或拟合参数。

## 已连接

- ESI：按名称解析 ID；定向商品的区域订单，完整分页检查，ETag/Expires 缓存、限流退避；NPC 站与真实星系坐标、星门邻域、shortest/secure 航线；系统活动汇总。
- zKillboard：按所选星系读取最近至多 200 条已知 killmail，按 ID 去重，展开部分记录；显示事件时间与抓取时间，不宣传为完整过去一小时或实时堵门情报。[当前 API 文档](https://zkillboard.com/api/docs/)
- 类型信息：官方类型属性、部分直接技能要求、船体/模块的 Jita 报价；不等于完整 SDE/Dogma 模拟。
- 覆盖 The Forge、Black Rise、Syndicate、Domain、Sinq Laison、Heimatar、Metropolis 的关注商品及部分船装，不是全宇宙全物品搜索。未覆盖区域没有报价不意味着没有机会。

## 角色授权

经用户要求，仅从 eve-trader 的本地授权记录提取了**公开 Client ID**，存于本项目忽略的 `.local-data/client.json`；没有复制旧 token。源授权文件未修改。

1. 启动 `npm start`。Connection / 数据与授权中公开 ID 已预填，回调沿用 `http://localhost:8765/callback`。
2. 点击“基础授权”：兼容旧应用的钱包、技能、个人订单 scopes。EVE 官方浏览器登录页由玩家登录并确认；不在本应用收集密码或 Client Secret。
3. 需要位置、当前船、资产、采集、训练队列等时，启用“完整活动授权”。若现有 CCP 应用没有启用这些 scopes，先在官方应用管理编辑，再重试。UI 提供确切权限清单。
4. PKCE + 一次性 state；JWT 验证 RS256、官方 issuer、两个 audience、过期和角色 sub；刷新与断开隔离，不把旧角色同步重新写回已断开的状态。
5. Node 网页服务以 AES-256-GCM 加密保存本项目凭据，密钥和文件在忽略的 .local-data/ 内并限制本地读写权限；token 不发给浏览器、不写公共缓存。开发与正式服务共用此存储，重启后可以恢复授权。

[SSO 官方文档](https://developers.eveonline.com/docs/services/sso/)要求注册回调并按 scope 授权；这里没有绕过授权。该切片的私有数据最终连通性必须在玩家完成官方登录后验证，公开源 smoke 或模拟 JWT 不能替代。

## 当前数据如何影响产品

- Gas：真实位置授权后才可“收藏本星系”；快照过期先刷新。收藏按角色隔离，不导入演示收藏。区域只有高安/低安；公开查看起点默认 Jita，并明确不是角色所在地。
- 未授权时可查看真实一跳星门邻域、关注气体报价及公共战损；不伪造现场气矿、出现概率或实际 ISK/h。
- Hauling：逐档真实卖/买单计算数量、最小成交量和税费后差额；买单只使用其实际 NPC 挂单站作为交付地，因此不会误把其他范围买单当本地可卖。部分跨范围机会会被保守漏掉。
- 每行报价为独立候选，不作为联合装载货单相加。未连接钱包时显示深度上限；未读到技能时只显示未扣税价差，不称净利润。过期来源不进入新报价。
- 销售税以当前 Accounting 生效等级计算，7.5% × (1 − 11% × 等级)，与当前官方技能说明/税费说明核对；不对立即成交凭空收双边 broker fee。[官方费用说明](https://support.eveonline.com/hc/en-us/articles/203218962-Broker-Fee-and-Sales-Tax)
- 真正可执行仍需验证船装购置、空余舱位、全路径和风险。UI 保持条件状态，绝不把满足钱包预算等同完整可执行。
- 角色同步按已授权范围读取；位置/当前船按短缓存更新，其他数据按各端点缓存同步。资产和成交可能滞后，个人记录不自动变成单趟利润。

## 网页服务与开发模式

`npm start` 构建并在 http://127.0.0.1:5173/ 提供前端和同源 API；`npm run dev` 使用 Vite 热更新并直接挂载相同 API。已移除 Electron 依赖、桌面桥接和 8767 服务。SSO callback 独立保留 localhost:8765，与已有 CCP 应用兼容。

当前是本机单用户网页服务，不是公开多用户站点。授权和公开缓存已从本项目旧桌面数据迁移；旧加密文件未删除。服务端文件加密及 0600 权限不等于同一 OS 账户被攻破后的保护，不将本地密钥提交 Git。.local-data/client.json 仅含公开 ID，也支持环境变量 EVE_CLIENT_ID。

## 验证方式与当前限制

- `npm test`：包含真实订单深度/最小数量/未知税费/陈旧数据、HTTP Host/Origin/会话、JWT 与缓存验证。
- `npm run test:ui`：真实模式缺私有数据时保持未知；模拟授权字段正确替换；演示模式原流程仍通过。带授权的 UI fixture 不代表真实角色已授权。
- `tests/web-runtime.test.mjs`：网页静态文件、SPA 路径、同源 API、凭据重启恢复和服务端文件隔离；浏览器测试另验证 SSO 标签页。
- `node scripts/smoke-live.mjs`：向运行中的本地应用发起公开源实测，检查真实订单、Jita→Tama 航线、zKillboard，保存忽略的 `artifacts/live-smoke.json`。不输出用户钱包、token 或授权 URL。

尚未实现完整 Dogma、递归技能 DAG、可靠的实时空余舱位、跨候选组合装载、完整交易费用归因或实测回本。没有恢复演示采速/ETA 来填这些缺口。真实 UI 与生产规格的完整度仍需继续推进。

### 本次实测记录（2026-10-18）

早期桌面切片曾通过构建、14 个单元/服务测试、5 个浏览器测试和原生 Electron smoke（历史记录；当前已迁为网页）。桌面桥接公开源 smoke 取得 1,319 条订单、165 个 NPC 站、38 个类型，48 个完整来源（当时 47 个仍新鲜），并通过真实 Jita→Tama 路线与 zKillboard 查询。数量会随市场和缓存刷新变化。

公开 Client ID 已从 eve-trader 本地配置找到并复用；未复制旧 token。官方基础授权已发起，等待用户登录确认，真实私有角色字段尚未实测。

### 扩展常用商品目录（2026-10-18）

商品目录见 `server/market-catalog.mjs`：629 个候选名称、19 类，覆盖弹药/导弹、势力弹药、T1/T2 无人机、紧凑型及常用船装、武器、船插、PI P0–P4、矿物、冰产物/燃料、探针、维修膏、船体与打捞材料。名称以官方 ESI 解析为准；页面展示实际解析数、分品类覆盖及未解析名称，不把请求数量当实际覆盖数量。此目录是可审查的常用商品集合，不代表统计意义上覆盖了大部分成交额或全市场。

[Reddit 原帖选品依据与边界](research/hauling-commodity-selection.md)已保存。玩家补货挂单经验只影响候选商品，不替代即时 ask→bid 订单验证。

区域已扩展至 The Forge / Black Rise / Syndicate / Domain / Sinq Laison / Heimatar / Metropolis。使用区域完整订单分页，每页读完即筛选目录商品，避免每个商品分别请求；并发上限 4。任何一页失败、页数变化或重复订单版本冲突均使该区域本轮失效，不发布部分深度。相同订单 ID 去重；来源截止取最早一页的缓存截止。完整扫描仍无法让 ESI 独立缓存的分页变成交易所原子快照，出发前需复核。

首次加载几百个物品信息及区域分页较慢；后续使用公开缓存与 ETag。UI 展示扫描进度，保留上一份快照，过期来源不进入新报价。覆盖更多商品不保证出现更多有效机会。

目录校验：`node scripts/validate-market-catalog.mjs` 使用官方名称解析并保存忽略的 `artifacts/market-catalog-validation.json`；未解析名称使检查失败。

扩展后的实测：629/629 个商品名称有效，3 个区域共 1,887 个商品来源均完整且当时新鲜，44,329 条订单、377 个 NPC 站，失败来源 0。真实路线与 zKillboard smoke 通过。数量是当次快照，不是固定库存或收益承诺。

### 个人装载与 ISK/h（2026-10-18）

`GET /api/transport` 使用角色当前船、实际生效技能和资产快照，推导普通货舱；不读取或保存其他项目凭据。当前经过验证的船体技能模型为 Iteron Mark V（Gallente Hauler），其他船型不自动给出个人容量计划。已识别的容量乘数（Dogma effect59）和货舱优化船插（effect836）可叠乘；不是完整 Dogma 引擎。只纳入普通 Cargo，专用舱、集装箱增容和植入体增益不纳入。市场买来的船使用 packaged_volume，资产中的已组装 singleton 使用 volume。

资产必须仍在官方缓存有效期内，并能关联到当前船，才提供占用/空余的快照估算；没有当前船及其子资产不会被解释为空舱。缺失时单独提供“空舱/裸船场景”。现有角色当前是 Iteron Mark V，Gallente Hauler III：5,800 × 1.15 = 6,670 m³；真实空余未知。

订单逐档匹配同时遵守单船数量、预算、深度与最小成交量，不在成交后再强行截断数量。候选仍是相互独立的替代方案。先选装载后整批价差前 20 条，自动评估，再可按保守端 ISK/h 排序，不声称找到了全市场最优 ISK/h。

`POST /api/hauling/estimate` 从实际角色所在地计算“当前位置→采购站→出售站→可选返程”，逐段核验允许区域。星门和站点使用各自星系内位置，不能用星系间坐标当跃迁距离。起跳使用船体质量/惯性及 Spaceship Command、Evasive Maneuvering；尚未完整模拟装配后的航行性能。每次跃迁加减速、跳门切换及停站采用显式的场景时间区间，未知起点按 10–50 AU；不适用自动导航，不含堵门、断线、电容不足等待及损失概率。这是场景区间，不是统计置信区间或实测 ETA。

仅在读取 Accounting 后才显示税后 ISK/h：`税后单船价差 × 3600 / 行程秒数`，用慢端时间算低端小时率、快端算高端。不把订单价差当持续可重复收益；单个目的买单也可能消失。

依据见 [容量与航行模型调研](research/hauling-capacity-time-model.md)。验证命令 `node --experimental-strip-types scripts/smoke-transport.mjs` 仅在内存读取当前授权角色，不落盘钱包/技能/资产/token。一次真实往返测试核验 48 次跳门、50 次星系内跃迁距离，得到 42–67 分钟场景区间；缺失实际装配时仍标为条件估算。

### 取货途中顺路单（2026-10-18）

Hauling 默认开启“取货途中顺路带货”，可一键关闭恢复原主单。以真实角色所在地到主单采购站的已核验路径为基础，搜索沿途采购、沿途或采购星系一跳邻域交付的一笔额外货物。只考虑在主单采购之前完整卖掉的顺路单；它不是混合装载、多单全局最优或返程接单算法。

- 使用与主单相同的新鲜真实订单、税率、预算和普通货舱上限。缺少新鲜钱包预算或税率时，不添加顺路收益。
- 顺路单买入卖出订单不能与主单使用任何相同订单 ID，保守避免重复计算深度。继续遵守逐档深度和最小成交量。
- 顺路货卖出后再采购主单，故阶段峰值资金是两次采购金额的最大值、阶段峰值货量是两次货量的最大值；每次均不得超过原预算/舱位。不把尚未兑现的顺路利润加进主单预算。
- 每个主单最多核验按税后收益筛选的 4 个顺路候选；候选来源站沿基准路径前进，不反向取货。最终完整路线最多多绕 2 跳，所有路线段都遵守区域开关。
- 按实际额外站点、星门和星系内跃迁重估整趟时间。连续在同一个站交付顺路货并采购主单合并为一次停站，不重复计算整次停站开销。
- 仅当组合的保守端 ISK/h 高于原主单才自动采用；没有改善或航程验证失败时保留主单，并显示原因。此选择是有界启发式，不声称全市场最优。

列表显示主单/顺路拆分及组合 ISK/h；点击查看顺路物品、数量、采购/出售站、订单 ID、追加时间与跳数、峰值资金和货量、原单与组合小时率。航图包含顺路停靠点。资产缺失时仍是空舱条件场景，不会因增加顺路单而变成已验证的实际空余运力。

### 网页请求缓存与速度（2026-10-18）

- 保留上游 ESI 的 Expires/ETag 磁盘缓存及限流退避。行情有效期不因浏览器缓存或派生结果缓存而延长，过期来源仍不参与新报价。
- 浏览器行情/角色接口使用弱 ETag；未变化返回 304，无响应体。前端将上一份响应仅保留在当前页面内存中，不将个人 API 明细写入 localStorage。服务重启、授权变动时清理条件请求缓存。
- `/api/public` 返回 snapshotVersion；后续携带 `?since=版本` 时，仅传刷新进度和错误等元数据，直到快照本身改变。避免刷新进度每变化一次就重传整个订单簿。旧调用方仍可直接获取完整快照。
- 大 JSON 使用 gzip；同一版本的 JSON 序列化结果和压缩结果在服务内存复用，并发首次读取共用磁盘加载。前端维持同一快照对象，避免仅有进度更新就重新计算全市场候选；时钟跨过来源截止仍会触发失效重算。
- 航程计算使用最多 256 项、30 秒的有界内存缓存，同键并发请求共享计算。键包含角色/授权代次、当前船、位置、技能与容量模型、区域、返程和顺路停靠点。位置/模型变化时不会沿用不相符结果，断开授权清空私人派生缓存，失败不进入缓存。
- 同一页面的相同并发请求合并；轮询不重叠，正常前台 10 秒、加载/授权阶段 3 秒、后台 60 秒，回前台立即同步。页面状态及角色状态独立读取并行，位置与运力读取并行。

本机对同一市场快照的诊断：优化前完整响应约 13,170,399 字节，重复请求仍约 55ms；优化后首次压缩传输约 1,354,694 字节，未变重复响应 304 / 0 字节，本次约 3ms；增量进度响应约 167 字节。时间是单次本机诊断，不能当作其他网络下的延迟保证。忽略的 artifacts/cache-before.json 与 cache-after.json 保存测量；29 个单元/服务测试和 7 个浏览器测试通过。

### Mixed hauling manifests (2026-10-18)

Public regional sweeps now request The Forge, Black Rise, Syndicate, Domain (Amarr), Sinq Laison (Dodixie), Heimatar (Rens), and Metropolis (Hek). Coverage reflects successful complete, fresh region books; a configured region does not imply a usable current quote.

The default hauling list groups trades by exact source and destination NPC station. It compares profit-per-volume, profit-per-capital and total-profit packing orders, requoting each distinct type against remaining capital and ordinary cargo capacity with minimum buy volumes enforced. This deterministic heuristic is not a globally optimal knapsack solver. Item quantities, cost and tax-adjusted margin are available in the packing list. Mixed totals have no per-unit margin. Single-item alternatives remain available via the checkbox. The top 20 gross-margin routes receive travel estimates; closer lower-margin routes may still be missed. Pickup cargo remains sequential and excludes any order already reserved by the main manifest.

Travel times remain bounded model estimates, not measured flight times; fitting effects and investment uplift are not fully modeled.

### Character favorites in local SQLite

Gas favorites are stored server-side in `.local-data/eve-master.sqlite` (SQLite via Node 24's built-in `node:sqlite`, file permissions 0600). The `favorites` table has `(character_id, system_id)` as its primary key; the authenticated server character determines ownership. POST requests also carry the expected character ID, rejecting a stale role binding. Token storage remains in the separate encrypted credential store. Disconnecting authorization does not delete favorites.

The browser loads favorites from `/api/favorites`. On first use in a browser, existing `eve-master:live:favorites:<characterId>` records are imported with a persistent browser migration ID. Import is transactional, keeps existing database records, and records successful imports in `favorite_imports`; repeating the same import cannot resurrect a subsequently deleted record. Legacy browser records remain as a backup. Migration only sees localStorage in the current browser/origin; it cannot recover another browser's or Electron's inaccessible storage. Unbound/demo favorites are not assigned to a real character.

Back up `eve-master.sqlite` while the server is stopped. New saves/deletions are acknowledged only after the database write succeeds, and errors are shown in the UI.

### Local Intel screenshot OCR and batch lookup (2026-10-25)

`Local Intel / 玩家风险` supports browser `getDisplayMedia` window capture, normalized crop defaulting to the lower-left Local member column, one-shot recognition, and a serialized loop with a ten-second delay after each completed scan. The user selects and authorizes the source window; no game controls, automatic scrolling or background clipboard reads are involved. The crop is invalid if the Local panel is moved or scaled; only visible rows are recognized. Unsupported browsers can import PNG/JPEG screenshots or use the ID/name input. Browser background throttling and minimized/frozen windows prevent any claim of real-time coverage.

Cropped PNGs go only to the loopback Node service. `scripts/ocr-local.py` uses Apple Vision through PyObjC, disables language correction, and processes the image in memory. Images are not persisted or sent to ESI/zKillboard. Run `npm run setup:ocr` once on macOS (requires uv); dependencies are pinned in `requirements/ocr.txt`, isolated under `.local-data/ocr-venv`. `EVE_OCR_PYTHON` can point at another compatible Python environment. Worker timeout is 20 seconds and only one OCR job runs at a time. Names are candidates, not verified identities: exact ESI matching is required, low-confidence lines are excluded, and ambiguous Roman-numeral-like tokens stay flagged instead of silently substituted.

Manual input accepts up to 50 newline/comma-separated character IDs, zKillboard character links, EVE showinfo links, or exact names. `/api/local/resolve` batches names via ESI `/universe/ids/`. `/api/local/batch` deduplicates IDs and batches `/universe/names/` and `/characters/affiliation/`. Request bodies are sorted for cache reuse. zKillboard kills remain individual character requests: the server limits derived pilot work to two concurrent jobs and starts kill queries at least one second apart. Public upstream results use the existing persisted HTTP cache, with in-flight deduplication and Retry-After cooldowns. Derived pilot results are bounded to 256 RAM entries and refreshed when their source expires. Failed upstream requests are not turned into safe/empty history. Identical crop frames skip OCR and queries until cached results expire; errors permit retry. Stop/unmount ends media tracks and invalidates pending results.

Evidence is explicitly limited to the latest returned up to 200 kills, filtered to thirty days; up to fifty victim ship types are inspected. The displayed mining/hauling target counts come from those known victim hulls/groups, not inferred hostility probabilities. Unknown ship metadata is counted as unknown. No record proves present location, intent, or safety. Public kill details use the same upstream cache; images and entered candidate lists are not saved as character favorites.

Verification: 34 backend/model tests and 11 browser tests passed, including ID/link deduplication, unresolved OCR names, screenshot import, simulated capture start/stop and ignoring a late frame. The supplied screenshot also passed a live local OCR → real ESI → zKillboard smoke: plus1sec and Prexa resolved; the `Roggo Il Seuchenvogel` OCR candidate did not resolve and remained flagged. Both returned profiles had no inspected targets in the returned thirty-day sample; that is not a safety conclusion. Native OS screen-sharing consent itself was not automated or verified. Replay the explicit input-image smoke with `node scripts/smoke-local-intel.mjs <screenshot.png>`; its normalized crop matches the supplied image layout, not arbitrary layouts.

Sources: [Screen Capture API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia), [Apple Vision OCR](https://developer.apple.com/documentation/vision/recognizing-text-in-images), [zKillboard filters, cache and publication delay](https://zkillboard.com/api/docs/).

### Historical pilot risk score

Local Intel displays an explainable 0–100 heuristic index, never an attack probability. Score components: participation count ×2 capped at 25; inspected hauling/mining victim count ×9 capped at 45; their share of classified victims ×20 rounded; latest returned kill evidence adds 10 if within seven days, otherwise 4 within thirty days. Total capped at 100. Bands: blue 0–24 (fewer signals), yellow 25–49, orange 50–74, red 75–100. Text labels and numeric values accompany colors; each card expands its component arithmetic.

Gray/unscored applies to failed or incomplete queries, ambiguous OCR, OCR confidence below .8, expired/malformed statistics, no classified victims, or fewer than five classified victims with no mining/hauling evidence. Positive target evidence can receive a score with fewer than five samples, explicitly labeled as a small sample. The card refreshes expiry state every thirty seconds. Lower scores indicate fewer observed historical signals, not safety; source coverage limits remain visible. Thresholds are product heuristics and have not been calibrated against attacks or losses.

### Native EVE window discovery

The default **检测 EVE 窗口** action now uses a local macOS helper instead of requiring the browser's shared-window picker. This follows eve-miner's `Bot/window_control.py` approach: identify the `com.ccpgames.eveonline` application PID, inspect Quartz window metadata, and match substantial layer-zero EVE client windows by title. It does not import or call eve-miner's activation, fullscreen, mouse or input routines. Browser sharing remains the fallback.

The helper uses ScreenCaptureKit's desktop-independent-window screenshot filter for the selected window. Both PID and window ID are revalidated against EVE processes before/after capture; it never falls back to another window or a whole-desktop screenshot. One client previews automatically; multiple clients require an explicit role/window choice. Other-Space/minimized windows remain in the list. If capture succeeds for an invisible window, the UI warns that it may be frozen; empty/black frames are rejected. Window loss and resolution changes stop the automatic loop and require rediscovery/reselection. Capture does not request Accessibility permission, activate EVE, change Spaces, move the mouse or scroll. Existing Screen Recording access is checked without automatically invoking a permission dialog. Users must grant the launching application permission themselves if needed.

`POST /api/local/windows` and `/api/local/frame` require the local session capability. The Python dependency environment adds pinned ScreenCaptureKit/CoreMedia bridges; rerun `npm run setup:ocr` on a fresh checkout. Images remain in memory and loopback responses. Only one native helper task runs at once. Error messages distinguish missing setup, permission, unavailable windows, empty frames and timeout. Mining/hauling profit searches are now only computed on the Hauling page so they do not delay Local Intel interactions.

Regression loop: `node --test tests/native-capture.test.mjs` initially failed with HTTP 404, then passed after adding the native seam. Python fixture tests exercise bundle/PID/title/layer/size filtering and stale/reused IDs. Browser tests disable getDisplayMedia and verify native detection, capture, window loss and invisible-window warnings. The in-app-browser live check discovered the actual EVE window, but the window was invisible and returned an empty frame; this condition was rejected with an actionable message. Actual live OCR of a visible native EVE frame remains unverified; no game focus or window state was altered for testing.


### OCR crop default

Native capture, browser sharing and image import now default to the supplied layout's lower-left Local **member column**, excluding chat message text (normalized x=.128, y=.715, width=.122, height=.28). The primary preview shows only the cropped OCR input; the full image is collapsed under the selection-adjustment control. Only the cropped PNG is sent to the OCR worker. This is a layout preset, not automatic recognition of arbitrary chat-panel positions; moved/resized UI needs crop adjustment. Window-resolution changes still invalidate calibration. Browser regression checks assert the PNG IHDR is 195×280 for a 1600×1000 source and the full-image calibration view is initially collapsed.

The taller member-column crop uses a lower Vision minimum text height. OCR candidates with confidence .2–.8 remain visible as uncertain (risk unscored), rather than silently disappearing. Pipe/I/l/1 ambiguities are flagged, never silently corrected, and deferred from automatic identity lookup. Very low-confidence text below .2 is filtered.

### Audible risk alarms

Local Intel enables sound alerts by default, with a browser-local mute preference, preview button and audio readiness indicator. A user gesture on preview, manual query, one-shot OCR or automatic recognition resumes Web Audio before asynchronous lookups. No audio files or external services are used. High historical risk (50–74) plays three short 660 Hz notes; very high (75–100) plays four alternating 740/980 Hz notes, with a gain envelope. A batch produces one combined alert at its highest severity, accompanied by a text notification naming the players.

The session tracker suppresses repeated alerts for the same character/level, ignores temporary unknown/loading rows and absence, and alerts again on high→very-high escalation or after a confirmed lower-risk observation followed by high risk. The tracker is capped at 500 IDs. Uncertain OCR, failed queries and expired/insufficient evidence remain unscored and never trigger sound. Muting stops scheduled notes immediately; capture stop and component unmount also stop sound. Re-enabling sound rearms current high-risk results. Browser/OS mute, playback policies and hardware volume still apply; preview is the user-facing check. Tests verify Web Audio oscillator scheduling and deduplication/mute, not physical speaker audibility.
