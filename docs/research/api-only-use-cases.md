# 三个 API 优先场景：免填数字的能力边界

更新：2026-10-18。此文收敛前一版八个细分场景：产品只有 Gas Huffing、Ore Anomaly、Arbitrage Hauling 三个入口。路线、情报、估值与复盘成为共享能力。目标是一次 SSO 后自动读取与计算，用户无需填写价格、数量、技能、产量等数字。信息自动化与游戏操作分开。

## 本轮核验

直接下载官方 [compatibility-dates](https://esi.evetech.net/meta/compatibility-dates)，最新列出的兼容日期为 2026-08-18；携带 `X-Compatibility-Date: 2026-08-18` 下载 [OpenAPI](https://esi.evetech.net/meta/openapi.json)。未调用角色私有端点或接入账号。结论是规格级核验，不是角色数据端到端测试。

- `/characters/{character_id}/location`：solar_system_id、可选 station_id/structure_id；客户端缓存 TTL 5 秒。
- `/characters/{character_id}/ship`：ship_item_id、ship_type_id、ship_name；TTL 5 秒。没有实时已拟合属性、货舱容量、模块激活等字段。
- `/characters/{character_id}/assets`：item_id、type_id、quantity、location_id、location_flag 等，可建立船/模块/货物树；TTL 3600 秒。可辅助重建装备和库存，但不能作为实时装载状态。
- `/characters/{character_id}/fittings`：保存的拟合，不等于当前实际拟合。
- `/characters/{character_id}/skills` 与 `/skillqueue`：技能与已完成队列结合；旧 skills 可能在角色未登录时落后。植入体也有 API，但不是所有临时效果均可读。
- `/characters/{character_id}/mining`：最近 30 天，date、solar_system_id、type_id、quantity；TTL 600 秒。没有站点 ID、开始/结束、具体时刻、采集周期。Gas 类型覆盖在真实账号接入时验证，不能仅由通用 schema 断言所有 Gas 记录均完整。
- `/markets/{region_id}/orders`：价格、地点、方向、剩余量、min_volume、range 等；用于按数量执行估值；区域 history 不是站点实际成交记录。
- `/characters/{character_id}/wallet/transactions` 与 journal：成交与费用依据；transactions TTL 3600 秒。账单匹配与库存成本仍可能有未知。
- `/universe/system_jumps` 与 system_kills：截至 Last-Modified 的过去一小时汇总，不含虫洞空间；不是实时 local。
- 当前 OpenAPI 无 cosmic signature、ore anomaly 现场列表、气云/小行星余量专用端点，也无实时货舱状态端点。

[官方采集账本说明](https://developers.eveonline.com/blog/mining-ledgers-in-esi)确认按日期、星系、类型聚合。该 2017 文章写个人 90 天，而当前规格写 30 天，本设计采用当前规格。旧文的缓存值不代替当前规格。[旧官方资产文档](https://docs.esi.evetech.net/docs/asset_location_id.html)说明活动船在太空时需要结合 ship/location 重建；该文已停止维护，具体货舱 flag/覆盖接入时实测。

## 1. Gas Huffing

自动：当前位置/船型、技能、可见资产的拟合近似、气体报价与深度、可采类型的价值排序、候选区域与风险路线、历史已记录采集量/星系/日期、税后出售估值、成交后的收入汇总。

推算：SDE 船体/模块属性 + 技能 + 资产拟合快照形成“无临时加成的理论速度”，同时显示拟合快照年龄与假设。若无法确认拟合，采用船型基准区间，不要求用户补数。区域气矿知识是另行维护的知识规则；不能假装 ESI 提供气矿刷点概率。

无法纯 API：实时气矿签名、扫描是否找到/没找到、准确站点类型与余量、现场猎人、实时采集速度与货舱、每一趟的准确采集时长。

免输入流程：点击 Gas → 自动给推荐搜索区域和巡回路线 → 玩家游戏内扫描/采集 → 后台跟随位置并同步账本/市场。成功采集可形成“曾在此采到”的记忆；没有采集记录不能自动标记为空扫。产量账本不能证明站点仍存在。

产品承诺：自动找值得搜索的方向、比较价值和风险、统计事后产出；无法自动定位当前气矿。纯 API 的复盘以日/星系为确定粒度，出行划分与时间只能推断。

## 2. Ore Anomaly

自动：当前位置、船型与技能、矿种报价/体积/估值、原矿/压缩矿的市场比较、风险与旅行路线、个人历史产量；站点规则知识可解释“哪些系统符合出现条件”。具备公司权限时，月矿 extraction timers 可提供另一类计划采矿场景，但不是普通 ore anomaly 列表。

推算：理论产量、规则允许的矿种与候选地点；精炼收益须显示设施、税、技能等假设，不把缺失设施参数当作已知。

无法纯 API：某系统当前是否刷 anomaly、别人是否采空、每块矿余量、当前竞争与 NPC 状态、实时激活周期/压缩可用性/舰队加成。没有找到公开完整 API；私人情报 API 若存在也只覆盖其上报范围。

免输入流程：点击 Ore → 自动排名可探索区域和矿种 → 玩家在游戏内查看 anomaly 并采集 → 后台核算记录。不是“实时导航到已确认未采空的矿点”。

## 3. Arbitrage Hauling

自动：公共与获授权结构市场订单、多地点买卖价与深度、物品体积、钱包和已知库存、船型、位置、路线、战损背景、数量优化、保守税后毛利、交易发生后的对账。

首版优先立即买入卖单 → 运输 → 卖给已有买单；避免把挂单价差当作可立即实现利润。买单 range、min_volume、剩余量、station/structure 权限和有效价格时间都进入可行性过滤；目的地有报价不等于角色能停靠。

数量由可用预算上限、保守可用容积、两端可成交深度约束，并对组合货物整体优化，不能给每个物品重复使用同一笔资金/同一段容积。未确定成本不填 0。钱包余额不是玩家愿承担的风险，自动预算采用公开的保守默认上限并允许模式切换；不能声称从 API 读到风险偏好。

资产与拟合可能一小时陈旧；实时空余容积、已占用资金与途中订单变化不可完全锁定。可先按已验证的船型基准及缓存货物保守规划，显示装载假设，不能要求玩家手填容量来掩盖数据缺口。

免输入流程：点击 Hauling → 自动列出从当前位置可执行的候选货单、来源/目的地、数量、买入成本、税后报价差和路线 → 选一单 → 玩家在游戏内买入/装载/运输/出售 → API 后台追踪位置、成交与费用。waypoint 可作为用户点击触发的独立写授权；没有公开市场交易下单/实际运输 API。

产品承诺：三个模式中最接近免填写端到端信息流；“预计净利”依然取决于抵达时订单是否存在，以及实际交易费用。精确飞行时间和损失概率保持估计。

## 统一交互

登录并授权一次；首页只显示三个入口。角色多于一个时选角色，其余上下文自动读取。每种模式自动给建议，不要求表单；用户可以切换“保守/均衡”等偏好或选择候选。风险容忍、可用时间等主观目标用明确默认值，不包装成 API 事实。

任何缺失数据都降级为“推算/未知/等待同步”，而不是要求填写具体数值。三类字段统一显示：API 读取、按规则推算、无可用 API。没有现场数据就缩小推荐承诺，不把 OCR/日志/剪贴板混入“纯 API”能力。

架构保持 Electron UI + API 数据服务 + SQLite。纯 API 首版主要复用 eve-trader；eve-miner 的 OCR 不属于本轮前提，只保留未来可选观察适配器。新的定位是：Gas/Ore 侧重自动研究和事后核算，Hauling 侧重自动生成具体可执行方案。
