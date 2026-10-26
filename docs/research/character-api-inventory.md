# ESI 角色只读端点清单

兼容版本：2026-08-18。公开规格自动生成，未请求角色数据。

刷新：`python3 scripts/research_character_api.py`。JSON 同名清单包含字段、授权替代条件及描述。
缓存列是客户端 TTL，不是端到端实时性保证；null 表示规格未给出。

| GET path | 能力 | 授权 scopes（替代授权见 JSON） | 客户端缓存秒 |
| --- | --- | --- | --- |
| `/characters/{character_id}` | Get character's public information | public | 86400 |
| `/characters/{character_id}/access-lists` | List Access Lists | esi-access.read_lists.v1 | 300 |
| `/characters/{character_id}/access-lists/{access_list_id}` | Get Access List details | esi-access.read_lists.v1 | 300 |
| `/characters/{character_id}/agents_research` | Get agents research | esi-characters.read_agents_research.v1 | 3600 |
| `/characters/{character_id}/assets` | Get character assets | esi-assets.read_assets.v1 | 3600 |
| `/characters/{character_id}/attributes` | Get character attributes | esi-skills.read_skills.v1 | 120 |
| `/characters/{character_id}/blueprints` | Get blueprints | esi-characters.read_blueprints.v1 | 3600 |
| `/characters/{character_id}/calendar` | List calendar event summaries | esi-calendar.read_calendar_events.v1 | 5 |
| `/characters/{character_id}/calendar/{event_id}` | Get an event | esi-calendar.read_calendar_events.v1 | 5 |
| `/characters/{character_id}/calendar/{event_id}/attendees` | Get attendees | esi-calendar.read_calendar_events.v1 | 600 |
| `/characters/{character_id}/clones` | Get clones | esi-clones.read_clones.v1 | 120 |
| `/characters/{character_id}/contacts` | Get contacts | esi-characters.read_contacts.v1 | 300 |
| `/characters/{character_id}/contacts/labels` | Get contact labels | esi-characters.read_contacts.v1 | 300 |
| `/characters/{character_id}/contracts` | Get contracts | esi-contracts.read_character_contracts.v1 | 300 |
| `/characters/{character_id}/contracts/{contract_id}/bids` | Get contract bids | esi-contracts.read_character_contracts.v1 | 300 |
| `/characters/{character_id}/contracts/{contract_id}/items` | Get contract items | esi-contracts.read_character_contracts.v1 | 3600 |
| `/characters/{character_id}/corporationhistory` | Get corporation history | public | 86400 |
| `/characters/{character_id}/cosmetics/skinr` | List a character's owned SKINR licenses | esi.cosmetic.char:read | 3600 |
| `/characters/{character_id}/cosmetics/skinr/components` | List a character's owned SKINR component licenses | esi.cosmetic.char:read | 3600 |
| `/characters/{character_id}/fatigue` | Get jump fatigue | esi-characters.read_fatigue.v1 | 300 |
| `/characters/{character_id}/fittings` | Get fittings | esi-fittings.read_fittings.v1 | 300 |
| `/characters/{character_id}/fleet` | Get character fleet info | esi-fleets.read_fleet.v1 | 60 |
| `/characters/{character_id}/freelance-jobs` | List character freelance jobs | esi-characters.read_freelance_jobs.v1 | 60 |
| `/characters/{character_id}/freelance-jobs/{job_id}/participation` | Get character freelance job participation | esi-characters.read_freelance_jobs.v1 | 60 |
| `/characters/{character_id}/fw/stats` | Overview of a character involved in faction warfare | esi-characters.read_fw_stats.v1 | None |
| `/characters/{character_id}/implants` | Get active implants | esi-clones.read_implants.v1 | 120 |
| `/characters/{character_id}/industry/jobs` | List character industry jobs | esi-industry.read_character_jobs.v1 | 300 |
| `/characters/{character_id}/killmails/recent` | Get a character's recent kills and losses | esi-killmails.read_killmails.v1 | 300 |
| `/characters/{character_id}/location` | Get character location | esi-location.read_location.v1 | 5 |
| `/characters/{character_id}/loyalty/points` | Get loyalty points | esi-characters.read_loyalty.v1 | 3600 |
| `/characters/{character_id}/mail` | Return mail headers | esi-mail.read_mail.v1 | 30 |
| `/characters/{character_id}/mail/labels` | Get mail labels and unread counts | esi-mail.read_mail.v1 | 30 |
| `/characters/{character_id}/mail/lists` | Return mailing list subscriptions | esi-mail.read_mail.v1 | 120 |
| `/characters/{character_id}/mail/{mail_id}` | Return a mail | esi-mail.read_mail.v1 | 30 |
| `/characters/{character_id}/medals` | Get medals | esi-characters.read_medals.v1 | 3600 |
| `/characters/{character_id}/mercenary-tactical-operations` | List Mercenary Tactical Operations | esi-activities.read_character.v1 | 300 |
| `/characters/{character_id}/mercenary-tactical-operations/{operation_id}` | Get Mercenary Tactical Operation details | esi-activities.read_character.v1 | 300 |
| `/characters/{character_id}/military-campaigns/objectives` | List character participation in military campaigns | esi.activity.char:read | 60 |
| `/characters/{character_id}/military-campaigns/objectives/{objective_id}` | Get character military campaign objective participation | esi.activity.char:read | 60 |
| `/characters/{character_id}/mining` | Character mining ledger | esi-industry.read_character_mining.v1 | 600 |
| `/characters/{character_id}/notifications` | Get character notifications | esi-characters.read_notifications.v1 | 600 |
| `/characters/{character_id}/notifications/contacts` | Get new contact notifications | esi-characters.read_notifications.v1 | 600 |
| `/characters/{character_id}/online` | Get character online | esi-location.read_online.v1 | 60 |
| `/characters/{character_id}/orders` | List open orders from a character | esi-markets.read_character_orders.v1 | 1200 |
| `/characters/{character_id}/orders/history` | List historical orders by a character | esi-markets.read_character_orders.v1 | 3600 |
| `/characters/{character_id}/paragon-hub/skinr` | List a character's Paragon Hub SKINR listings | esi.cosmetic.char:read | None |
| `/characters/{character_id}/planets` | Get colonies | esi-planets.manage_planets.v1 | 600 |
| `/characters/{character_id}/planets/{planet_id}` | Get colony layout | esi-planets.manage_planets.v1 | 600 |
| `/characters/{character_id}/portrait` | Get character portraits | public | None |
| `/characters/{character_id}/roles` | Get character corporation roles | esi-characters.read_corporation_roles.v1 | 3600 |
| `/characters/{character_id}/search` | Search on a string | esi-search.search_structures.v1 | 3600 |
| `/characters/{character_id}/ship` | Get current ship | esi-location.read_ship_type.v1 | 5 |
| `/characters/{character_id}/skillqueue` | Get character's skill queue | esi-skills.read_skillqueue.v1 | 60 |
| `/characters/{character_id}/skills` | Get character skills | esi-skills.read_skills.v1 | 60 |
| `/characters/{character_id}/standings` | Get standings | esi-characters.read_standings.v1 | 3600 |
| `/characters/{character_id}/structures/mercenary-dens` | List Mercenary Dens | esi-structures.read_character.v1 | 3600 |
| `/characters/{character_id}/structures/mercenary-dens/{mercenary_den_id}` | Get Mercenary Den details | esi-structures.read_character.v1 | 3600 |
| `/characters/{character_id}/titles` | Get character corporation titles | esi-characters.read_titles.v1 | 3600 |
| `/characters/{character_id}/wallet` | Get a character's wallet balance | esi-wallet.read_character_wallet.v1 | 120 |
| `/characters/{character_id}/wallet/journal` | Get character wallet journal | esi-wallet.read_character_wallet.v1 | 3600 |
| `/characters/{character_id}/wallet/transactions` | Get wallet transactions | esi-wallet.read_character_wallet.v1 | 3600 |
