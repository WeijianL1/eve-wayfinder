# 跑商工具源码调查

核查日期：2026-10-18（America/Los_Angeles）。通过 GitHub 仓库元数据、固定 commit 的 README 和相关实现静态阅读；没有安装、构建或运行第三方代码，也没有验证其成交收益。以下时间为上游最新 commit 的 UTC 时间，并不证明发布版本、稳定性或持续维护。

## 1. EVE Flipper：最接近完整运输套利助手

- [仓库与说明（固定版本）](https://github.com/ilyaux/Eve-flipper/tree/f2c33f42af419f4d5ed006f702e22579fb5fc713)：最新 commit `f2c33f42af419f4d5ed006f702e22579fb5fc713`，2026-10-18T04:41:07Z；[MIT](https://github.com/ilyaux/Eve-flipper/blob/f2c33f42af419f4d5ed006f702e22579fb5fc713/LICENSE)。Go 后端、React 前端，桌面采用 Wails，非 Electron。
- [路线引擎](https://github.com/ilyaux/Eve-flipper/blob/f2c33f42af419f4d5ed006f702e22579fb5fc713/internal/engine/route.go)可见多跳 beam search、订单最小数量、货舱上限、深度执行与税费参数；不是仅比较两端最高买价／最低卖价。
- [执行时间模型](https://github.com/ilyaux/Eve-flipper/blob/f2c33f42af419f4d5ed006f702e22579fb5fc713/internal/engine/route_execution.go)计入到采购地的空驶、多趟运输的返回航段、停靠及安全延迟，并计算方案 ISK/h。安全倍率和运输报酬下限属于其启发式规则，不能作为实测损失概率或市场报价。
- [README](https://github.com/ilyaux/Eve-flipper/blob/f2c33f42af419f4d5ed006f702e22579fb5fc713/README.md)声明角色技能／钱包／资产、风险和纸面／真实交易功能，同时明确历史深度需要自行积累快照。此轮未验证它会按角色技能自动生成运输拟合或技能成长路线。

**对本产品的具体启发**：建立独立的“报价→可执行数量→完整航程”计算层；同时给出空驶＋装卸＋运输后的净收益，保留订单级证据。beam search 是候选策略，不承诺全局最优。多商品方案还必须维护逐航段资金、货舱和订单余量，不能简单相加单品利润。

## 2. EveMarketProphet：早期拼货与执行工作流

- [固定源码](https://github.com/georgwacker/EveMarketProphet/tree/abd4fbeab72742ea1c22e9e6b7258c931d5aa3ec)：最新 commit `abd4fbeab72742ea1c22e9e6b7258c931d5aa3ec`，2018-11-09T14:31:38Z。公开 C# 桌面源码；仓库只有 [LICENSE-3RD-PARTY.txt](https://github.com/georgwacker/EveMarketProphet/blob/abd4fbeab72742ea1c22e9e6b7258c931d5aa3ec/LICENSE-3RD-PARTY.txt)，本轮没有确认主项目明确的开源授权，不能把可读源码直接视为可复用代码。
- [Prophet.cs](https://github.com/georgwacker/EveMarketProphet/blob/abd4fbeab72742ea1c22e9e6b7258c931d5aa3ec/EveMarketProphet/Services/Prophet.cs)按剩余资金／货舱筛选与拼装交易，记录订单剩余量，并涉及买单最小成交量；不等同于已经证明正确的优化器。
- [README](https://github.com/georgwacker/EveMarketProphet/blob/abd4fbeab72742ea1c22e9e6b7258c931d5aa3ec/README.md)有“到采购地→采购清单→目的地出售→重新找路线”工作流，资金、容量和 Accounting 等需要配置；其历史税率与旧接口不能照搬。README 自述没有异常高利润过滤，并提醒抵达前买单可能失效。

**具体启发**：一趟方案应是可逐站执行的采购／出售清单，允许同站拼货；资产可读不等于容量可靠，仍应携带船装快照年龄。异常价差需要解释和降级，不应自动把异常当成最佳机会。

## 3. eve-arbitrage-finder：研究“抵达时是否还来得及”

- [固定源码](https://github.com/kaashif/eve-arbitrage-finder/tree/f8ff335a43b191fdb4bb17b63837707f8ad65ab8)：最新 commit `f8ff335a43b191fdb4bb17b63837707f8ad65ab8`，2026-04-28T21:16:25Z；[GPL-3.0](https://github.com/kaashif/eve-arbitrage-finder/blob/f8ff335a43b191fdb4bb17b63837707f8ad65ab8/LICENSE)。包含历史订单分析、Python/Rust 实现和 Web 入口，不应仅按其最早的 notebook 项目描述判断现状。
- [arbitrage_time_analysis.py](https://github.com/kaashif/eve-arbitrage-finder/blob/f8ff335a43b191fdb4bb17b63837707f8ad65ab8/arbitrage_time_analysis.py)按默认 45 秒／跳估算抵达时间，在其后的第一个订单快照检查目标买单是否仍存在、价格和数量是否足够；同时输出利润、资金回报与报价偏离指标。
- 该文件的利润是价差×数量，未扣税、未完整计算货舱／停靠／空驶；快照间可能发生未知变化。初选最小成交量判断也不能替代成交语义的完整校验。因此“抵达后快照仍存在”只能是机会存续代理指标，不能证明曾实际成交。

**具体启发**：本地持续积累订单快照，按估计行程检查机会存续，逐渐生成“报价年龄＋抵达时间＋存续证据”；首版没有证据时显示未知。用当前报价和滞后报价压力测试方案，不能用同一瞬间两端价格宣称锁定利润。

## 4. EVE Night Trade Tools：交易执行与对账的桌面参考

- [slysmoke/eventt](https://github.com/slysmoke/eventt/tree/dfc78f7e601f25ed1252af18579c7157361a4f4b)：最新 commit `dfc78f7e601f25ed1252af18579c7157361a4f4b`，2026-09-28T11:41:28Z；[MIT](https://github.com/slysmoke/eventt/blob/dfc78f7e601f25ed1252af18579c7157361a4f4b/LICENSE)。Kotlin/JVM＋Compose Desktop，非 Electron。
- [README](https://github.com/slysmoke/eventt/blob/dfc78f7e601f25ed1252af18579c7157361a4f4b/README.md)声明站内／跨区扫描、SSO 钱包／资产／订单、FIFO 成本和盈亏、置顶 Trade Calc、真实订单簿深度计算、cargo splitter；部分交互依赖剪贴板和快捷键，税率在设置中。

**具体启发**：采用轻量置顶执行面板和事后成本对账；明确“方案估值／实际成交／仍持有库存”。其复制粘贴及人工税率路径不符合我们免填数字目标，不应原样复制。README 所述第三方成交数据精度未经本轮验证。

## 5. EVE Online Tooling：船装计算的独立参考

- [th-lange/eve-online-tooling](https://github.com/th-lange/eve-online-tooling/tree/1bab581f3ecc5839ed700a07f97279a47bd6a38b)：最新 commit `1bab581f3ecc5839ed700a07f97279a47bd6a38b`，2026-10-17T07:24:18Z；[MIT](https://github.com/th-lange/eve-online-tooling/blob/1bab581f3ecc5839ed700a07f97279a47bd6a38b/LICENSE)。Tauri 桌面应用。
- [README](https://github.com/th-lange/eve-online-tooling/blob/1bab581f3ecc5839ed700a07f97279a47bd6a38b/README.md)声明角色技能、资产、账本、拟合 Dogma 引擎、实际技能／全 V 对比及 EFT／ESI 导入导出；[trading/engine.rs](https://github.com/th-lange/eve-online-tooling/blob/1bab581f3ecc5839ed700a07f97279a47bd6a38b/src-tauri/src/modules/trading/engine.rs)核查的是站内挂单交易净利润和流动性指标，不能拿它的双边 broker fee 公式直接用于我们即时买卖的跑商场景。本轮未在该版本确认完整运输套利模块。

**具体启发**：拟合计算与机会搜索分离，通过相同货单、不同合法拟合做反事实比较。将模板版本、SDE 版本、角色技能快照与计算结果一起存储；“新船增加容量”不自动意味着“每小时收益按容量倍增”。

## 纳入最终设计的建议

1. **可执行性先于排行榜**：按交付站校验买单范围、最小成交量、剩余量；多档价格逐层吃单，货物本金／税／船装投入分别展示。本轮没有完成任何上游对买单 range 处理的全面正确性审计，应由本产品测试保障。
2. **全程核算**：当前位置到采购站的空驶、停靠、载货段、必要返回、多趟运输和保守时间估算都进入方案；总利润、资金回报和预计 ISK/h 并列。
3. **刷新与降级**：采购前与抵达前重新报价；订单消失或深度不足时重新计算出售／返程选项，保持“已买入库存”与“尚未执行计划”分开。
4. **对账闭环**：保存原始方案快照，再关联实际交易；无法可靠归属的交易显示未匹配，FIFO 属于成本核算约定而非物理批次识别。
5. **我们的重点补位**：单角色零基础入门、按技能校验模板、船装购置＋货物周转双预算、技能／装备增量回本，而非再堆叠市场图表。上述项目的本轮证据尚未证明已完整解决这些需求。

EVE Courier／EVE Workbench 可作为后续产品体验与拟合来源调查对象；本轮没有确认其完整跑商产品源码和主项目许可，未将其列为可复用开源实现。此清单是设计比较，不是安全审计或安装建议。
