# 角色 API 的关键边界

核验日期：2026-10-18。公共规格已用 `X-Compatibility-Date: 2026-08-18` 获取；日期来自[官方兼容日期](https://esi.evetech.net/meta/compatibility-dates)。以下只检查公开规格与官方文档，未读取私人 token 或角色数据。逐端点与缓存清单见 [character-api-inventory.md](character-api-inventory.md)。

## 可自动读取的程度

- 当前位置（星系、可选站／结构）、当前船实例 ID／类型／名称、在线状态可分别授权读取。`/ship` 本身没有实时属性、模块开关或剩余船舱字段。[当前 OpenAPI](https://esi.evetech.net/meta/openapi.json)
- `/assets` 给物品实例、数量、父位置、舱位／装备槽标记；结合 `/ship.ship_item_id` 可以重建当前船的**装备和货物快照**，也能盘点其他船与库存。官方旧资产说明明确：太空中当前船的船壳可能不在资产结果内，但其装配会返回，应结合位置与船接口。该说明已停止更新，必须对实际返回做完整性检查。[官方资产说明](https://docs.esi.evetech.net/docs/asset_location_id.html)；[当前资产 schema](https://esi.evetech.net/meta/openapi.json)
- `/fittings` 是角色保存的装配记录，不等于当前实际装配。拟合性能（采速、容量、对齐时间、CPU／PG 等）需要用技能、装备和 SDE／Dogma 模型计算；不能将推荐装配或保存模板当作实际已装备状态。[当前规格](https://esi.evetech.net/meta/openapi.json)
- 技能 API 同时给 `active_skill_level` 和 `trained_skill_level`：前者可能受 Alpha 或 Expert Systems 影响。判断“现在能用”应看 active，长期训练计划另用 trained。`/skills` 还明确警告：角色未上线时，刚训练完成的技能可能未刷新，要合并 `/skillqueue` 中已结束条目。[当前技能 schema 与接口说明](https://esi.evetech.net/meta/openapi.json)
- 属性 API 给五项属性及部分 remap 信息；implants API 给当前植入体；skillqueue 提供已排队条目的可选 start／finish 时间。因此现有队列 ETA 可尽量直接采用服务端时间，未入队的路线 ETA 需要计算。[当前规格](https://esi.evetech.net/meta/openapi.json)
- 当前规格没有完整账户订阅、Omega 到期、已生效 booster 名单与剩余时长接口。active／trained 差异不能唯一归因为 Alpha（还可能涉及 Expert Systems）；不能声称自动确定账户类型或未来训练速度。建议给条件 ETA；有真实队列时校准，不要求用户填写一堆数值。[当前 schema](https://esi.evetech.net/meta/openapi.json)；[官方 issue：Alpha 推断](https://github.com/esi/esi-issues/issues/1131)

## Gas：自动记录可以到哪里

Gas 在个人采集账本的记录范围内；官方介绍明确包括 ore、gas、ice。[CCP 账本介绍](https://www.eveonline.com/fr/news/view/introducing-the-mining-ledger-new-tools-for-miners-in-eve-online)

当前 ESI `/mining` 记录只有日期、星系、type_id、数量，说明为过去 **30 天**；游戏内账本支持页写的是 **90 天**，两者不能混用。账本也不是实时更新。[当前 ESI 规格](https://esi.evetech.net/meta/openapi.json)；[游戏内账本说明](https://support.eveonline.com/hc/en-us/articles/115005402265-Mining-Ledger)

因此可自动把“在哪天、哪个星系、实际采到多少某气体”转为个人证据；不能反推出扫描到但未采的签名、当前气云余量、开采分钟数或每趟精确 ISK/h。收藏按钮应存本应用数据库：位置自动填，Gas 类型可点选，也可从后续账本形成独立证据。ESI bookmarks 已移除，不能承诺自动同步游戏内书签。[官方移除公告](https://developers.eveonline.com/blog/deprecation-and-impending-removal-of-esi-opportunities-and-esi-bookmarks)

## Hauling 与投资回报

钱包余额、逐笔市场交易、钱包流水、当前／历史市场订单可以授权读取；交易含时间、地点、type、数量、单价和关联 journal ID，流水包含 broker fee／transaction tax 等类型，可用于已实现收入与成本核算。[当前 wallet／orders schema](https://esi.evetech.net/meta/openapi.json)

声望接口给 NPC 阵营／公司／代理人声望，可结合交易技能支持费用模型；但不能假定存在一个“这个角色在任何目标结构的最终所有费用”字段。部分流水上下文可缺失，官方说明不同 ref_type 的上下文含义不一，归属不明的费用应单列，不强行分配给某趟货单。[当前 standings 与 wallet journal 说明](https://esi.evetech.net/meta/openapi.json)

近期个人击杀／损失可读 ID 与 hash，再取详情；当前 recent 描述为过去 90 天，可补充自己的损失历史。它不提供未爆船的遇险、逃脱或运输失败信息，更不能从未发生损失直接推导安全概率。[当前 killmail 规格](https://esi.evetech.net/meta/openapi.json)

**设计结论**：可以自动推荐“现有技能可用装配／缺件成本／升级后的属性变化／按相同市场快照的机会差异”。无法仅凭 API 精确知道个人驾驶技巧、实时敌情、模块操作、真实每趟耗时和未来损失概率。投资报告应把属性增益、情景收益、已实现收益分栏。

## 授权与最少输入

SSO 是按角色与 scope 的授权，不是一次登录即可读取账户下所有角色、公司或所有秘密。公司数据还受角色权限与端点条件约束。位置、资产、钱包、技能、采集各有独立 scope；更敏感的邮件、联系人等虽然可选读取，不是 Gas／Hauling 必需权限。[官方 SSO](https://developers.eveonline.com/docs/services/sso/)；[各端点 security 定义](https://esi.evetech.net/meta/openapi.json)

默认请求两个场景必要的只读权限；玩家可继续添加角色。每份快照保留采集时间与服务端缓存信息，刷新并不表示游戏状态实时可见。首次打开即可自动盘点，收藏只需点按钮和可选 Gas 类型；不存在的数据保留未知或条件估算。
