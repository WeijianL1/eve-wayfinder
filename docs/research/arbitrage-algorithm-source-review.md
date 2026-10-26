# 运输套利算法源码复核

2026-10-18。仅静态读取固定版本的 GitHub 源码；本报告没有安装依赖、运行下载的项目、访问角色凭据或验证实际成交。另行算法对比脚本的执行结果以其产物为准。

## 结论

这些项目没有证明同样钱包、舱位、安全范围、订单时点下必然能赚更多。更大的数字主要可能来自：更多区域／商品、未约束资金、把挂单转售当作即时卖出、只算载货段时间，或者忽略最低成交量。值得借鉴的是路线多跳搜索和历史快照存续检查；不能把算法输出当成可保证的成交收益。

## 固定版本与实际逻辑

### EVE Flipper

固定 commit `3265793cb04525553e5b4da1240f5409e6aa68ed`，与早先设计调查的版本不同。

- [route.go](https://github.com/ilyaux/Eve-flipper/blob/3265793cb04525553e5b4da1240f5409e6aa68ed/internal/engine/route.go#L255)：按来源系统的最低卖单所在站选采购簿，遍历目的站买单簿，以 cargo / SDE volume 限制数量，然后调用深度执行函数。该路径没有钱包／本金参数，不能把它的推荐数量直接视为当前角色买得起。它没有遍历来源系统每一个站的完整采购簿，因此也不是全局最优。
- [scanner.go 的 findSafeExecutionQuantity](https://github.com/ilyaux/Eve-flipper/blob/3265793cb04525553e5b4da1240f5409e6aa68ed/internal/engine/scanner.go#L1395)：寻找“总体平均利润仍为正时的最大成交数量”，不是“绝对利润最大的数量”。例如少量高利润后继续吃负边际档位，平均仍为正，也可能扩大数量并降低总利润。单调二分针对平均盈利谓词，不能当最大净利润优化器。
- [execution.go 的 ComputeExecutionPlan](https://github.com/ilyaux/Eve-flipper/blob/3265793cb04525553e5b4da1240f5409e6aa68ed/internal/engine/execution.go#L134)：同价订单聚合为价格档，走簿计算 VWAP，保留深度信息；这一函数不检查每个订单的 MinVolume。route.go 另检查当前候选买单的 MinVolume，但不能替代聚合簿中每一个实际被吃买单的最低数量校验。
- [route.go beam search](https://github.com/ilyaux/Eve-flipper/blob/3265793cb04525553e5b4da1240f5409e6aa68ed/internal/engine/route.go#L585)：宽度 50、分支 10，多段连续买卖；partialRoute 只携带 hops、totalProfit、totalJumps、lastSystem，不维护钱包／累计资金／订单余量。避免重访系统有帮助，但不等于完整资金和订单状态搜索。
- [fees.go](https://github.com/ilyaux/Eve-flipper/blob/3265793cb04525553e5b4da1240f5409e6aa68ed/internal/engine/fees.go)：支持独立买卖 broker/tax 倍率；legacy 模式两边收 broker、卖方收 tax。比较即时买入卖出时必须统一 broker 为适用值，否则不是相同成本口径。
- [route_execution.go](https://github.com/ilyaux/Eve-flipper/blob/3265793cb04525553e5b4da1240f5409e6aa68ed/internal/engine/route_execution.go#L60)：独立增加空驶、分趟、停靠、安全时间。预设如 DST 60,000 m³、货船 850,000 m³，不能直接跟当前 Iteron 的 API 可用舱位比较。其时间是确定性估算而非角色实测。
- [route_liquidity.go](https://github.com/ilyaux/Eve-flipper/blob/3265793cb04525553e5b4da1240f5409e6aa68ed/internal/engine/route_liquidity.go)：区域历史日成交量用于补充 liquidity/fill-time 标签；不能证明目的站当前买单在抵达后仍存续。
- [regional_day_trader.go](https://github.com/ilyaux/Eve-flipper/blob/3265793cb04525553e5b4da1240f5409e6aa68ed/internal/engine/regional_day_trader.go#L415)：SellOrderMode 取目的地最低卖单或历史均价，属于挂单等待出售；此路径还另有 MaxInvestment 限制。不要把它与上面 route 路径的资金遗漏混为一谈，也不要用等待转售收益冒充即时 ask→bid 收益。

可隔离运行候选：ComputeExecutionPlan、findSafeExecutionQuantity、expectedProfitForPlans，仅需复制对应结构和标准库适配；源码存在依赖边界，应只提取审查后的函数，不能启动整个应用。项目 MIT，复制须保留许可。

### lazydancer/haul

固定 commit `2c5b7da8165e3f8b90748e8ced1de0e3e8d52309`。

- [arbitrage.py](https://github.com/lazydancer/haul/blob/2c5b7da8165e3f8b90748e8ced1de0e3e8d52309/backend/src/arbitrage.py)：同类型订单逐对匹配，quantity=min(ask remain,bid remain)，卖方固定税 8%，最低单项利润 100,000，固定资本上限 100M。先分别裁剪每张订单的 cargo 和 capital，甚至对目标买单按其买价裁剪资本；没有按真实角色钱包约束。字段叫 gross_profit，但已扣该固定税。
- [market.py](https://github.com/lazydancer/haul/blob/2c5b7da8165e3f8b90748e8ced1de0e3e8d52309/backend/src/market.py#L34)：Order 结构没有 min_volume/range；pairwise 输出可重复引用同一订单，不能把结果利润相加成货单。市场列表含 15 区，范围比我们的 7 区广，是可公平测试的差异。
- [实验 Rust 版本](https://github.com/lazydancer/haul/blob/2c5b7da8165e3f8b90748e8ced1de0e3e8d52309/rust_backend/src/market/trade.rs)：源码明显不完整，缺少常量分号、构造器参数与字段不一致；不应投入时间安装整个项目来期待直接可运行。

可隔离运行候选：Python arbitrage/create_trades/filter_orders_for_cargo/filter_orders_for_capital_risk，注入本地 Order dataclass 并替换 market 导入；没有必要导入加载 SDE／网络 API 的 market 模块。MIT；库中的 API 航点设置不应包含在只读算法对比。

### kaashif/eve-arbitrage-finder

固定 commit `f8ff335a43b191fdb4bb17b63837707f8ad65ab8`。

[arbitrage_time_analysis.py](https://github.com/kaashif/eve-arbitrage-finder/blob/f8ff335a43b191fdb4bb17b63837707f8ad65ab8/arbitrage_time_analysis.py#L112)逐对比较同类型订单，默认钱包 100M、每类型两边最多 25 个候选；quantity 受钱包和两端单张订单数量限制。利润是未扣税价差，不限制货舱，时间仅 source→destination 最短跳数×45 秒（同系统也至少一段），没有当前位置空驶／停靠／返程。初始最低量判断只比较原卖单余量，钱包裁剪后的实际数量可能又低于最低量。

它的独特价值是对照“预计抵达后的第一个快照”确认同一个目标买单价格、余量、最低数量仍可接受；这是存续代理，不证明真的能买入、运输或成交。可单独移植公式做无税／无舱位消融比较；不要以 GPL-3.0 原码直接混入闭源产品。原函数依赖 pandas/networkx 与本地历史数据，隔离执行成本高于前两者。

### EveMarketProphet

固定 commit `abd4fbeab72742ea1c22e9e6b7258c931d5aa3ec`。

[Prophet.cs](https://github.com/georgwacker/EveMarketProphet/blob/abd4fbeab72742ea1c22e9e6b7258c931d5aa3ec/EveMarketProphet/Services/Prophet.cs#L80)按确切站点对拼货，共享 Capital/MaxCargo，逐卖单记录剩余量，加入当前位置→采购地跳数，以 profit/jump 排序。它非常接近我们的同站混装，但不是证实更高收益的特殊交易策略。

需保留的审计疑点：quantityToFill=Math.Max(MinVolume,VolumeRemaining)；提交时条件为 quantityToFill==0 或 remaining>MinVolume，而非直接检查实际成交数量是否达到最低量；部分购买分支 quantityPart 只受资金／舱位而未再次取 min(本卖单余量,本买单待填量)，可能超出真实深度。不能照搬其执行语义。旧 .NET/WPF、静态 DB 和全局 Settings/Market/Auth 依赖重，且未确认主项目许可；建议独立重写思路，不运行／复制原产品。

## 公平对比要求

使用同一时点订单簿、同一商品及区域集合、同一税率、当前实际 cargo 和预算。分别输出：原始算法数字、资金／舱位／最低量校验后数字、完整航程 ISK/h。再逐项放开范围／预算／货舱／待售模式，标明差异来源。只能把经相同约束仍更优的候选提升为推荐。

## 实际隔离运行与固定快照重放

本节由主任务执行，不再局限于静态阅读。固定公共快照时间 2026-10-19T01:25:15.915Z，评估时间 2026-10-19T01:25:49.633Z。取本项目在当时仍有效来源中的税后价差前 200 个单品站点对；固定预算 80,000,000 ISK、普通舱位 6,670 m³、销售税 5.025%，允许高安／低安／00。此为可比测试参数，不读取角色授权或钱包。每个站点对在两个上游算法和本项目中使用相同的订单簿。来源有独立截止时间，样本不代表整个市场。

| 实验 | 结果 | 含义 |
|---|---|---|
| Flipper 原始深度函数，相同数量和税率 | 200/200 个利润误差小于 0.01 ISK | 这些案例没有发现本项目漏算同一批货的利润 |
| Flipper 原始数量搜索，只限舱位／深度 | 6 个采购成本超过 80M；8 个利润反而低于本项目 | 更大数量可能需要更多本金，也可能消耗负边际利润档位 |
| HAUL 原始 Python，统一 TAX_RATE/MAX_CAPITAL | 0 个更高、168 个相同、32 个更低 | 单张订单对匹配没有在这些案例改善利润；与多档订单簿方法不同 |

Robotics 的一个例子：本项目购买 1,230 件，成本 79.95M，利润 15.55M；Flipper 放开本金的数量搜索得到 2,223 件，利润 28.11M，但成本 144.495M。比较时不能把采购资本差异隐藏。此前同一调查过程的样本数值会随来源截止／刷新变化；上表只对应已保留并成功重放的这次输入。

执行方式：

- [compare-upstream-arbitrage.mjs](../../scripts/compare-upstream-arbitrage.mjs)从固定 commit 提取 Flipper 的 clampInt64ToInt32、ComputeExecutionPlan、findSafeExecutionQuantity、expectedProfitForPlans，以及原始数据结构。只替换包限定名，保留函数体；生成适配 Go main，使用经官方 SHA256 校验的 Go 1.25.4。GOPROXY/GOSUMDB 关闭，无第三方 Go 依赖。保留 MIT 许可。
- [run-haul-comparison.py](../../scripts/run-haul-comparison.py)以固定 SHA256 校验 HAUL 源文件，只替换 market.Order 导入为本地数据对象，不加载 market/ESI 模块；原始算法使用 Python 标准库，分别测试原配置及统一税率／预算。
- 先执行 node --experimental-strip-types scripts/compare-upstream-arbitrage.mjs；随后加 --replay 可离线重放。上游源码与 Go 工具链需预先放在脚本指定的 artifacts/upstream 路径；没有自动安装或启动第三方应用。公开快照、逐案结果、原始许可和生成的隔离 main 保存在被 Git 忽略的 artifacts/arbitrage-comparison/。ARBITRAGE_GO 可以指定已有工具链。
- 原始函数提取 SHA256：3645c32a754bb4761be8408c6d71bdf8aaab719b0ff40e7124f3de7ba5b2954e。离线重放的两个项目结果与首次运行一致（忽略运行时间戳）。

限制：只跑了两个项目的单次交易／深度函数，没有启动完整应用，没有运行 Flipper 全部 beam search，没有运行 finder 的历史存续分析，没有证明实际成交；不能由选中的 200 个站点对推断没有更好的其他路线。下一步有价值的实验是同样完整资金／订单状态下的多段连续带货、回程带货及更广路线候选；目的地挂卖单应作为等待成交的单独策略，不能直接混入即时买单收益。
