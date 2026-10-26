# EVE 活动助手：一手资料与接入边界

调研日期：2026-10-17。此文是产品构思的证据清单，不代表数据源已接通。网页和文档可访问，不等于 API 实际调用、授权或再分发许可已验证。

## 核心资料

| 来源 | 已确认的能力 | 适合用途／边界 |
|---|---|---|
| [CCP SDE](https://developers.eveonline.com/docs/services/static-data/) / [下载与变更记录](https://developers.eveonline.com/static-data) | 官方静态数据，现提供 JSON Lines 和 YAML，随游戏更新变化 | 星图、物品、船型、属性和规则基底；按 build 固定版本。静态数据不能表示当前气云、虫洞连接或堵门。各具体字段需在接入时核对。 |
| [ESI 官方 Explorer](https://developers.eveonline.com/api-explorer) / [概览](https://developers.eveonline.com/docs/services/esi/overview/) | 官方 API 的权威入口 | 规划候选包括路线、星系跳跃／击杀汇总、主权、FW、入侵、市场订单／历史，以及授权后的角色位置、船只、资产、技能、采矿账本、钱包和个人订单。**本轮旧 swagger 地址返回非 JSON，未完成逐端点 schema 和 scope 核验**；实施前须从现行 Explorer/OpenAPI 生成清单，不应照旧 SDK 硬编码。 |
| [EVE SSO](https://developers.eveonline.com/docs/services/sso/) | 官方支持 Authorization Code + PKCE，适合不能安全保存 client secret 的桌面应用 | Electron 登录用系统浏览器 + PKCE；按功能逐步请求最少 scope。公开星图／市场模式无需强迫登录。 |
| [ESI 限流](https://developers.eveonline.com/docs/services/esi/rate-limiting/) / [最佳实践](https://developers.eveonline.com/docs/services/esi/best-practices/) | 部分路由已使用滑动窗口 token bucket；429 带 Retry-After；旧 error limit 仍存在 | 各 route 的限流组、窗口、缓存时间以规格和响应头为准；本地缓存、退避、条件请求。不能假设全 ESI 共用一个固定速率。 |
| [市场订单 2026 限流公告](https://developers.eveonline.com/blog/market-orders-rate-limit-rolls-out-on-february-24-2026) | CCP 指出区域订单路由有 5 分钟缓存，重复高频采集造成无效负载 | 订单快照支持估值和流动性分析；不提供实时成交保证。 |

上述 ESI 能力清单是接入候选目录，非逐项连通性承诺。人物地点等角色数据必须在角色授权后读取；写入游戏 waypoint 应作为独立、用户触发的可选能力，重新核对对应写 scope。

## 战损与动态连接

- [zKillboard 当前合并 API 文档](https://zkillboard.com/api/docs/)是当前入口；[项目 Wiki](https://github.com/zKillboard/zKillboard/wiki)已明确旧页面仅供历史参考。API 要求描述性 User-Agent、压缩、本地缓存和间隔请求；R2Z2 提供顺序增量 feed 与每日历史。
- 同一官方文档明确允许延迟发布 killmail，也允许重处理记录以新 sequence 再出现。因此 **killmail_time、上传时间、抓取时间须分开，按 killmail ID 去重**。每日历史说的是 zKillboard “已知”的记录，不能推断覆盖所有实际死亡。公开记录不证明敌人此刻仍在当地；无记录也不证明安全。
- [EVE Scout 官方网站](https://www.eve-scout.com/)提供 Thera / Turnur 人工扫描连接；[官方扫描工具](https://scan.eve-scout.com/)直接要求玩家从 Probe Scanner 复制签名。可用来建议捷径，也可借鉴签名粘贴工作流。
- [Signal Cartel 的官方服务仓库](https://github.com/Signal-Cartel/EveScout)列出 systems / routes / wormholes / signatures 公共接口，但其 README 仍写测试环境和 Production n/a。这是文档与实际站点可能不同步的例子；**不能把测试数据当生产连接**。生产 base URL、缓存／调用规则、许可仍待核对。
- [Pathfinder 官方源码](https://github.com/exodus4d/pathfinder)为 MIT 项目；维护者发布过[地图 JSON 导出例子](https://gist.github.com/exodus4d/ade2dcaaaa0c732b81113cd2a4582ac6)。可构思用户授权导入地图，但旧示例不证明当前每个部署都开放公共 API。地图访问权和情报分享权与代码许可证不同。
- Tripwire／其他 mapper：保留为用户文件导入或实例授权适配候选；本轮未核验当前官方 API／格式，不承诺直连。私有虫洞链、联盟跳桥和 intel 不应假设全球可得。

## 扩展数据源目录

| 来源 | 接入类别 | 用途与限制 |
|---|---|---|
| [EVE Ref 官方文档](https://docs.everef.net/) | 已文档化 API／下载数据集 | Reference Data 合并 SDE、ESI、Hoboleaks；另有市场历史、订单快照、公开合同、killmail、incursion、warzone 数据目录。适合回测、缺失补档。保存上游与派生关系，避免把同一 ESI / zKill 数据当独立交叉证据；数据集版本、覆盖和再分发许可逐项核对。 |
| [Fuzzwork Market API](https://market.fuzzwork.co.uk/api/) / [About](https://market.fuzzwork.co.uk/about/) | 明确公开聚合 API／CSV | 可按区域／站点取价格聚合。作者说明约每 30 分钟采集并推荐需要新鲜完整订单时直接取 CCP；不是私人结构完整目录，不适合代替精确订单深度。 |
| [Adam4EVE API](https://api.adam4eve.eu/) | 已确认公开 API 文档及 CSV 下载入口，未做 API 连通测试 | 有 market_prices、market_price_history、tracker 等端点；文档要求带联系方式的 User-Agent，当前限流 5 秒一次。tracker 用约 10 分钟订单变化推估交易，不是完整实际成交；历史和批量下载可补充本地数据，覆盖、许可和再分发需分别核对。 |
| [DOTLAN](https://evemaps.dotlan.net/) | 官方站点、地图下载和 RSS；数据抓取许可未核验 | 主权／占领和区域地图适合外链；官方首页确认有 PDF/GIF 下载及 ticker RSS。不要把网页可见等同于地图和数据库可自由复制、再发布。 |
| [CCP Dev Blog](https://developers.eveonline.com/blog) / [更新公告](https://www.eveonline.com/news) | 官方公开页面，作为事件背景 | 技能、装备、经济、区域机制变更解释异常；按事件发生与发布时间分别记录。公告不是实时系统风险情报。 |
| 玩家主动提供的扫描、D-scan、货舱／资产列表、fitting、书签和日志文件 | 用户本地导入；逐格式实测 | 这些是产品候选输入；不要假设日志拥有完整 local、扫描和采气状态。以实际样本建立 parser，保留原始文本和时间。主动粘贴优先于后台读取整个剪贴板。 |
| 玩家经验、遇袭／逃脱、空跑、卸货和实际成交记录 | 用户手动记录或合法 API 关联 | 无外部源能替代个人路线耗时、找气命中率、真实成交和损失成本；必须记录“扫描过但没找到”的分母，避免只记成功产生偏差。 |

“所有能用”建议解释为可扩展 source registry：每个来源登记 owner、访问方式、授权、许可、观测时刻、抓取时刻、有效期、覆盖范围与故障状态。公开 API、获授权私有 API、用户导入、仅外链四类分别处理。尚未核验许可写 `unknown`，不伪装成可自由再分发。

## Electron 与既有 Python 技术的结合（设计建议）

[Electron 官方安全文档](https://www.electronjs.org/docs/latest/tutorial/security)建议 renderer 禁用 Node integration、启用 context isolation 与 sandbox、限制导航和新窗口、配置 CSP、验证 IPC sender；[进程模型](https://www.electronjs.org/docs/latest/tutorial/process-model)区分 main、renderer 和 preload。

建议 Electron 只承载地图、活动计划、证据卡和日志 UI；main 管凭据与受控文件访问；通过窄化 IPC 调用本地数据服务。eve-trader 的采集／数据库／确定性分析和 eve-miner 的本地解析／事件日志可用独立 Python worker 逐模块复用，避免把 GUI 操作器作为通用后端带进来。这是架构建议，Electron 官方文档不等于已验证某个 Python 打包方案。

## 产品边界

[CCP Botting 政策](https://support.eveonline.com/hc/en-us/articles/7370802950172-Botting)及[第三方工具说明](https://support.eveonline.com/hc/en-us/articles/5888034246428-Third-party-applications)明确反对带来不公平优势的宏与自动化，并不为第三方工具给出全面许可清单。产品建议聚焦外部数据分析、主动导入、计划和复盘；飞行、采气、逃跑和交易由玩家操作。复用采集／解析技术不等于复用客户端控制链，也不能宣传为 CCP 认可。

## 关键不确定性

1. 2026-10-18 补充：已通过当前兼容日期的 OpenAPI 核对角色只读端点，见 [自动生成清单](character-api-inventory.md) 和 [角色边界研究](character-api-boundaries.md)。真实角色数据覆盖与行为仍需授权后的集成验证。
2. EVE Scout 生产 API、mapper 当前导出格式及各社区服务许可未实测。
3. 没有核验能提供全宇宙实时气矿、local、敌人当前位置或完整堵门列表的数据源；不能把历史战损转换成校准过的死亡概率。
4. 区域气矿分布、虫洞／天象等知识应引用具体规则来源并区分静态机制与玩家当次观测；目前不是完整知识库。
