# 扩展常用商品覆盖

Status: ready-for-agent
State: implemented

## Request

增加覆盖商品种类，结合 Reddit 经验。

## Change

- 从 16 种定向商品扩至 629 种经官方 ESI 名称校验的商品、19 类，目录可审查。
- Reddit 第一手经验只用于商品池，不把补货挂卖单收益当成现有买单套利。引用保存到 docs/research/hauling-commodity-selection.md。
- 以区域完整分页替代逐物品请求；页数变化、失败或重复订单版本冲突使区域失效；来源有效期取全部分页最早截止。
- 页面显示品类覆盖、未解析名称和失败来源，默认按商品去重。
- 不声称覆盖大部分成交额；区域范围仍为 The Forge、Black Rise、Syndicate，仍只计算 NPC 站即时 ask→bid。

## Validation

- 629/629 名称通过官方 ESI 校验；报告 artifacts/market-catalog-validation.json（忽略文件）。
- 16 个单元/服务测试、2 个浏览器测试及构建通过。
- 增加完整扫描/最早分页截止/任一页失败拒绝发布区域深度的服务测试。

最终公开源实测：629/629 商品，1,887 个完整且当时新鲜的商品/区域来源，44,329 条订单，377 个 NPC 站，失败来源 0；Jita→Tama 路线与 zKillboard smoke 通过。
