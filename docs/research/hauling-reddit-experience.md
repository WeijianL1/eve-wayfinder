# Reddit 跑商经验：可借鉴的流程与不可照搬的结论

调研：2026-10-18。直接阅读原帖及评论；玩家叙述是经验与产品需求证据，不是成交、收益或风险统计的独立验证。旧帖的市场、船装、税率和路线数字不能用作当前默认值。当前订单与角色数据尚未接入。

## 选取的讨论

| 原始来源 | 经验信号 | 设计处理 |
| --- | --- | --- |
| [How can i make beginner money hauling?](https://www.reddit.com/r/Eve/comments/x7leat/) | 新手报告税后亏损、抵达前买单被别人吃完；为夹带小单绕路反而错过大单。评论对 T1 船和起步收益有明显分歧 | 以目标数量税后金额估值；一对站点的组合货单优先于无节制加停靠；显示主要机会与补充商品的边际收益/时间。没有可行新手货单时允许等待而非劝购船 |
| [i just tried hauling for profit for the first time](https://www.reddit.com/r/Eve/comments/102020e/) | 帖主的“卖不掉”引出立即出售与挂单混淆、买单深度不足、低流量库存积压；评论里的费用建议混用了不同交易方式 | UI 明确“买来源卖单、卖目的买单”；不以目的卖价估立即利润。按实际动作收税费，不能机械收双边 broker fee；不足部分不能自动改为本规格外的挂单策略 |
| [Hauling as a new player in high/low sec](https://www.reddit.com/r/Eve/comments/1nwjxbo/) | 讨论集中于 courier 低报酬、高抵押、回程空跑和专业船训练负担 | 当前产品是自营运输套利，不是接快递合同。新手现金需求分别列船装与商品本金；路程计入当前位置到采购点及可选返程，不能只计载货段 |
| [Is there actually a chill way to make ISK by space trucking?](https://www.reddit.com/r/Eve/comments/1wyf2cu/) | 近帖提到 hub 间立即套利机会短暂、NPC 商品可供起步；有人建议先职业任务拿资金/船，再进入市场 | NPC 商品只作为可测候选类别，仍检查当时深度和数量，不承诺持续补货或稳定利润。无启动资金时提供外链入门路径，不把未完成任务奖励算成资产 |
| [Hub-Running Arbitrage website](https://www.reddit.com/r/Eve/comments/1wmzopq/) | 作者描述按预算/船舱生成购物单、比较 instant/patient、结合路线上近期 gank | 这是作者自述的同类产品需求验证，未据此确认开源或计算正确。本产品固定 instant；把预算/拟合自动读取、无船起步和升级评估作为差异化 |
| [New Player/Low SP, low sec transporting options?](https://www.reddit.com/r/Eve/comments/12jmiwe/) | 低技能玩家关心小件快速运输；评论常把小型船、隐跳运输与外包运输作为不同选择 | 候选不只看工业运输船或最大容积，比较当前版本下经审核的小件运输模板；不要求额外角色或外包作为首版必要步骤 |
| [Let's be honest. Sunesis align time below 2s was overpowered!](https://www.reddit.com/r/Eve/comments/1rx7ugf/) / [The sunesis was nerfed, what replaces it?](https://www.reddit.com/r/Eve/comments/1vzekot/) | 2026 年讨论已出现旧入门船装失效和寻找替代的需求 | 技能/拟合引擎绑定 SDE 与模板验证版本，更新后旧结论待复核。不能复述“某船天生安全/必定两秒内起跳” |

## 用官方资料纠正的两类建议

### Sunesis 不能照搬旧模板

[CCP Version 23.02 补丁](https://www.eveonline.com/news/view/patch-notes-version-23-02)在 Sunesis 条目列出基础货舱 600→450 m³、质量 1,500,000→1,550,000 kg、惯性系数 2→2.85。这里只确认变更，玩家具体装配后的时间需按当前数据计算；既不宣称所有旧模板仍可用，也不宣称任何配置都绝对达不到某阈值。

### 立即买卖不等于双边挂单

[CCP Broker Fee and Sales Tax](https://support.eveonline.com/hc/en-us/articles/203218962-Broker-Fee-and-Sales-Tax)区分订单费用与销售税。首版以现有订单成交，费用按真实动作计算，不要求新手先练满所有挂单技能/声望才能开始。交易技能价值依据当前模式及税后增益推荐，不照搬评论中的过期百分比。

## 纳入最终设计的新增验收点

1. 主要机会与夹带货物：首版默认同一采购站/出售站，不为凑满船舱任意加停靠；同容量但新增低收益商品不应触发额外采购路线。
2. 完整路程：显示当前位置→采购→出售，及用户选择的回程；时间估计含停靠/装卸操作假设，不把这些当测量值。返程不强制必须有货。
3. 机会时效：显示两端快照时间；购买前复核、行程中按缓存节奏监测。旧建议保留原版本，新建议以变更提示呈现；不能绕缓存承诺实时订单。
4. 买单消失：标记原方案失效，按已知持仓列其他 NPC 站即时出售或结束建议；不自动挂单、不自动改航、不假定旧买单会回来。
5. 深度缩水：允许缩量后仍可行，给出剩余库存与亏损情景；不得把不可成交余量按最好价格出售。
6. 新手候选：保留小件低体积、NPC 商品等研究类别，按实时数据筛选；没有商品名、利润率或安全货值永久白名单。
7. 船装门槛：具备技能与拟合不代表玩家熟练操作；隐跳、手动过门等以简短操作前提提示，不能自动宣称安全。旧帖固定安全货值、固定系统路线或固定秒数均不进入硬编码。
8. 离线机会回放：用不晚于出发时的历史快照选货，以旅行时间情景观察后来买单是否仍有报价深度。订单消失可能是成交、撤单或其他变化；此回放仅测可见机会存续，不证明我们实际能成交。

## 不扩大的范围

评论中常见 station trading、market seeding、courier、distribution missions、00/虫洞捷径、多角色 scout 均不自动纳入首版功能。可在入门/后续路线提供明确外链或说明，但不会改变单角色、高安/低安 NPC 站、立即套利的既定范围。
