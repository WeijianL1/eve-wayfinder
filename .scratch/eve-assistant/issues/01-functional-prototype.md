# 单角色 Gas / Hauling 可运行产品原型

Status: ready-for-agent
State: closed
Type: prototype

## Question

EVE 风格 UI 中，一个没有运输船的新手是否能免填数字走通 Gas 搜索/收藏与 Hauling 选区域、购船准备、货单、模拟运输和成长报告？

## Scope

用户明确要求持续做到原型完整可运行。以产品规格为目标实现可操作演示，不在尚未配置 CCP 应用时伪装真实 SSO 或读取现有私人 token。所有示例价格、船装、星图和训练条件标识为合成数据。

## Acceptance

- 一条命令启动 Electron，构建资产可离线加载，无需启动外部数据服务或设置账号。
- Gas 收藏/取消/气体多选/路线/范围/风险和成长入口可操作。
- Hauling 三种区域开关和风险独立；无船入门和进阶 00 示例、预算与舱位约束可演示。
- 采购、航程、买单失效与替代报价、模拟出售、返程和活动记录可走通。
- 明确区分合成数据、未验证拟合、理论升级回本与真实收入。
- 浏览器全流程及原生 Electron 启动验证，保存截图与运行说明。

## Prototype evidence

Current source branch: `main`（历史清理后统一保留当前源码）。

## Comments

- 最终产品规格仍为后续真实 API / SDE / Dogma 实现的依据；本原型不等于全部生产规格完成。

## Answer

原型机械可运行：两个活动闭环、区域独立、无船入门、模拟采购/失效/出售/返程及成长报告均可操作；7 项计算检查、3 项浏览器检查和原生 Electron smoke 通过。用户视觉/产品验收仍待体验。

运行：`npm start`，或双击根目录的 macOS 启动文件。全部合成数据，真实账号与生产拟合尚未接入。

证据与限制见 [验证记录](../../../docs/prototype-verification.md)，源码保存在本地 `main` 分支。
