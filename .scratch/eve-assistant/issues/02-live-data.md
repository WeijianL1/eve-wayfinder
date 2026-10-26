# 真实公开数据与单角色授权切片

Status: ready-for-agent
State: awaiting-user-authorization

## Request

用户要求原型接入真实数据，并明确要求检查 eve-trader 是否保留公开 Client ID。

## Decisions

- 只读取旧项目公开 Client ID，写入本项目忽略的本地配置；不复用或输出旧 access/refresh token。
- 默认真实模式；演示模式通过独立入口保留，数据/收藏互相隔离。
- ESI 公开市场、真实星图/星门、角色同步，zKillboard 所选星系战损；失败不回退演示值。
- SSO PKCE 使用已知 localhost:8765/callback；兼容原应用的基础权限，可选扩展活动 scopes。JWT 严格验证。
- Electron safeStorage 加密保存本项目凭据；浏览器可桥接本机桌面服务，共享已授权角色，token 不进入前端。
- 真实 Dogma 拟合尚未实现：报价和直接技能要求可以真实展示，但不宣称完整拟合可用、精确运力或回本。

## Acceptance

公开数据真实 smoke、深度与最小数量/时效测试、HTTP 来源与会话保护、JWT 拒绝无效签名/角色/受众、真实 UI 无演示余额回填、浏览器和原生启动验证。角色私有数据最终须用户在官方页面授权后实测。

## Verification outcome (2026-10-18)

- Build、14 个单元/服务测试、5 个浏览器测试及 Electron smoke 通过。
- 桌面桥接公开源实测通过：1,319 条订单、165 个 NPC 站、38 个类型，48 个完整来源；Jita→Tama 真实路线及 zKillboard 查询通过。详见忽略的 artifacts/live-smoke.json。
- 已从 eve-trader 提取公开 Client ID 到忽略的本地配置，没有复制旧 token。
- 官方基础授权页已打开，回调服务运行中；尚未收到用户授权，因此真实私有角色同步仍未验证。
