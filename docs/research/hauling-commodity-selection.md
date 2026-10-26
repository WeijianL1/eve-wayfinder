# 跑商选品：扩展常用商品覆盖

调研日期：2026-10-18。直接阅读 Reddit 原帖与评论。玩家经验用于提出候选类别，不用于证明当前订单可成交、固定利润或安全货值；品种与实际收益仍由 ESI 当前订单决定。

## 经验如何影响候选池

| 类别 | 直接经验来源 | 应用于本产品 |
| --- | --- | --- |
| 弹药、导弹、无人机 | [首次跑商亏损讨论](https://www.reddit.com/r/Eve/comments/102020e/)建议任务区补货；[Trading margins](https://www.reddit.com/r/Eve/comments/1j8span/profit_margins_of_trading/)也提到任务点无人机/弹药；[Space trucking](https://www.reddit.com/r/Eve/comments/1wyf2cu/is_there_actually_a_chill_way_to_make_isk_by/)有玩家报告搬运势力导弹的经历 | 覆盖主流弹药家族与尺寸、常用 T1/T2 战斗无人机、势力弹药。不要只拿单个阵营弹药作为整个类别的代表 |
| 常用装备与小型船装 | [首次跑商讨论](https://www.reddit.com/r/Eve/comments/102020e/)提到新手区 meta T1 装备及 FW 周边 T2 装备、rigs；[Hauling profitability](https://www.reddit.com/r/Eve/comments/1pm1qdc/is_hauling_even_profitable/)评论提到紧凑推进、抓人和实用装备 | 纳入常用推进、护盾/装甲、伤害与无人机增益、抓人、货舱/惯性装备和常用小中型 rigs。高价稀有装备不能仅靠单笔大价差挤占结果 |
| 消耗品 | [Hauling profitability](https://www.reddit.com/r/Eve/comments/1pm1qdc/is_hauling_even_profitable/)提到 Nanite Repair Paste、弹药等便利补给 | 包括维修膏、常用电容注电、探针等。此处的商品例子是选品扩展，并不证明存在即时套利 |
| PI、燃料与工业材料 | [P3/P4 effort](https://www.reddit.com/r/Eve/comments/1edlkro/)讨论运量、单位体积价值和成交量，强调高百分比利润不等于足够周转 | 覆盖 PI P1–P4、矿物、冰产物、燃料块及常见工业材料；按真实 type volume 计算总体积。不要假设高阶 PI 总优于低阶或原料运输天然有利可图 |
| NPC 商品 | [Hauling profitability](https://www.reddit.com/r/Eve/comments/1pm1qdc/is_hauling_even_profitable/)把 NPC 商品列为起步路径之一 | 保留既有 Antibiotics 等，但不以其独占商品池；所有类别使用相同深度、税费及新鲜度约束 |

## 关键区别：补货挂单和立即套利

上述任务区/FW 便利溢价建议，大部分讨论的是运输后挂卖单等待客户，甚至先挂买单采购。当前产品只做“吃来源卖单→运输→吃目的买单”。因此可以借鉴商品类别，不能拿目的地卖价充当立即出售收入，也不能继承帖子报告的收益率。[首次跑商原帖](https://www.reddit.com/r/Eve/comments/102020e/)正好呈现了卖不掉、深度不足和混淆两种模式的问题。

跨 hub 立即价差也会消失；[Space trucking](https://www.reddit.com/r/Eve/comments/1wyf2cu/is_there_actually_a_chill_way_to_make_isk_by/)中的经验支持购买前复核，而不是承诺固定路线持续盈利。无需额外角色即可从公共 ESI 收集订单，不照搬评论里的多个驻站角色做法。

## 实现约束与后续自动化

1. 维护可审查的类别化种子目录，公开商品数、实际扫描成功数和类别覆盖；只有明确统计口径才能声称“大部分常用商品”，不能称为全市场覆盖。
2. 商品目录只决定检查哪些订单。默认仍按商品去重，保留每种商品的最佳站点组合，并显示整批、每单位、体积与成本。
3. 扩大商品数后，对 API 使用有界并发、缓存及退避；不能把未完成分页当完整订单簿。[CCP ESI Overview](https://developers.eveonline.com/docs/services/esi/overview/)和[Rate Limiting](https://developers.eveonline.com/docs/services/esi/rate-limiting/)是接口行为的权威来源。
4. 未来可用官方区域成交历史自动发现活跃商品，再结合市场组拓展目录；历史成交量是区域级信号，不能解释成某个 NPC 站的预测成交量。成交历史也不取代当前可见买单深度。
5. 商品范围、区域范围和机会数量分别展示。更多种类不意味着当时必然有更多可行路线；不能为制造多样性插入不赚钱或过期报价。

本次未把 Reddit 上的船装、税率、安全装载金额或利润数字写入规则；未确认真实成交或未来库存周转。
