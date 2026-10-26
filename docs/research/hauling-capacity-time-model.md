# Hauling capacity and time model

Research checked 2026-10-18. Primary sources below; distinguish a computed scenario from observed current free cargo.

## Available inputs and confidence

ESI current ship supplies identity/type; assets supplies the containment tree (`location_id` is parent `item_id`) and fitted slot flags; skills supplies active skill levels. These snapshots are independently cached. The official legacy asset guide explicitly says an active ship in space can be absent while its fitting is returned. Missing hull/children must therefore not become proof of an empty/unfitted ship. Preserve source dates, complete pagination, and mark cargo unknown if the current ship cannot be matched. [Official asset semantics](https://docs.esi.evetech.net/docs/asset_location_id.html), [official ESI explorer](https://developers.eveonline.com/api-explorer).

Use only assets whose parent is the selected ship and whose flags identify actual fit slots; inventory elsewhere is not fitted. Asset data does not convey reliable live online/active module state, booster state, fleet boosts, exact in-space position or current velocity. Saved fitting endpoints describe saved fits, not authoritative current fitting. Private results belong in the private character snapshot, not shared public cache. Scope and endpoint availability: [official ESI overview](https://developers.eveonline.com/docs/services/esi/overview/).

Ordinary cargo free space is calculated hold capacity minus occupied cargo volume, not total assets volume. Nested containers require containment-aware volume; special mining/PI/fleet holds are separate and accept restricted categories. Packaged versus assembled ships have different volume. If any occupied item volume/state cannot be resolved, show unknown actual free space; an explicitly labeled empty ordinary hold scenario may still size an illustrative trip.

## Verified public Dogma IDs

Read live from official `/latest/dogma/attributes/{id}/` and `/latest/universe/types/{id}/` on the research date:

| ID | Official name | Meaning |
|---|---|---|
| 4 | mass | kg |
| 38 | capacity | ordinary cargo m³ |
| 70 | agility | inertia modifier |
| 37 | maxVelocity | m/s |
| 1281 | baseWarpSpeed | AU/s base |
| 600 | warpSpeedMultiplier | multiplier |
| 149 | cargoCapacityMultiplier | e.g. Expanded Cargohold II = 1.275 |
| 151 | agilityBonus | skill percentage |
| 496 | shipBonusGI | Gallente hauler hull bonus percentage |
| 280 | skillLevel | active skill level supplied during calculation |

Example primary responses: [Iteron Mark V](https://esi.evetech.net/latest/universe/types/657/), [capacity](https://esi.evetech.net/latest/dogma/attributes/38/), [agility](https://esi.evetech.net/latest/dogma/attributes/70/), [Expanded Cargohold II](https://esi.evetech.net/latest/universe/types/1319/).

Iteron Mark V (657): base cargo 5,800 m³, mass 13,500,000 kg, agility 0.87, maxVelocity 105 m/s, warp 1 × 3.5 = 3.5 AU/s. Gallente Hauler (3340) effect 532 pre-multiplies hull attribute 496 by skill level; hull effect 726 applies that percentage to capacity 38, effect 729 to velocity 37. Thus active level III gives **6,670 m³ ordinary cargo for the bare-hull scenario**. This is not current fitted capacity or actual free space. [Skill effect 532](https://esi.evetech.net/latest/dogma/effects/532/), [hull effect 726](https://esi.evetech.net/latest/dogma/effects/726/), [729](https://esi.evetech.net/latest/dogma/effects/729/).

Spaceship Command (3327) supplies -2% agility per active level; Evasive Maneuvering (3453) -5% per level. Multiply the two skill factors, do not sum them. Advanced Spaceship Command (20342) applies only to ships requiring that skill, so exclude it for Iteron. Navigation (3449) affects max velocity; it does not directly multiply from-rest align time. [3327](https://esi.evetech.net/latest/universe/types/3327/), [3453](https://esi.evetech.net/latest/universe/types/3453/), [20342](https://esi.evetech.net/latest/universe/types/20342/), [3449](https://esi.evetech.net/latest/universe/types/3449/).

Do not generalize a hull-specific skill mapping to all haulers. Apply fitted expanders/rigs, penalties and skill bonuses only when their Dogma effects/targets are supported. A partial modifier engine must expose unsupported relevant effects; otherwise present the bare-hull scenario instead of claiming a verified fit.

## Travel time and ISK/hr

Pyfa's actual source calculates from-rest align as `-ln(0.25) × modifiedAgility × modifiedMass / 1,000,000` seconds and warp speed as `baseWarpSpeed × warpSpeedMultiplier`. CCP confirms entering warp requires alignment and 75% maximum speed. Nominal align is not measured flight time, especially after gate movement, undock, active propulsion, boosts or player delay. [Pyfa fit calculations](https://github.com/pyfa-org/Pyfa/blob/master/eos/saveddata/fit.py), [CCP warping help](https://support.eveonline.com/hc/en-us/articles/115004925685-System-Travel-Warping).

Use route gate coordinates and station coordinates where available, not interstellar map distance. CCP's warp model has acceleration, cruise, deceleration; acceleration coefficient is maximum warp AU/s, deceleration coefficient is `min(warpAUps / 3, 2)`. Short warps do not reach cruise. `distance / topWarpSpeed` alone significantly understates time. [CCP warp model](https://www.eveonline.com/news/view/warp-drive-active). This source is old; use contemporary type warp speed and label derived timing an estimate.

Practical trip model: `current position → pickup station → sale station`, optionally return; sum each from-rest align + modeled intra-system warp + explicit jump/session/undock/dock/trade handling assumptions. Starting grid position, congestion, latency and manual handling are not ESI facts. If precise coordinates are missing, an explicit distance/handling range is preferable to fake precision. Show low/high ETA and its assumptions. Do not invent one fixed seconds-per-jump as measured.

Clip quantity by **one-trip** free ordinary cargo, wallet budget and executable order depth before calculating net profit. `ISK/hr = modeled net profit × 3600 / modeled trip seconds`; display a range by reversing ETA bounds. Include repositioning time; include return only when labeled. Unknown Accounting skill/tax or unknown real free cargo prevents a verified personal net hourly result, but permits a separately labeled scenario estimate. Do not include destruction loss probability without a defensible calibrated model, or pretend projected spread is realized earnings.

## Engine options

Pyfa's Python `eos` is an established implementation and a useful calculation oracle, but embedding brings data/database/runtime integration and licensing obligations; it is not a small ESI library. [Pyfa source](https://github.com/pyfa-org/Pyfa).

EVEShipFit `dogma-engine` provides a Rust core with JavaScript WebAssembly and Python variants, uses versioned `sde.dat`, accepts actual skills/module states and can report source modifiers and fitting-rule violations. It is MIT licensed. This looks better aligned with Electron than hand-writing a full Dogma engine, but was only source/documentation inspected here: **not installed, audited comprehensively or validated against the player's ship**. Pin and audit a chosen revision plus SDE before adoption. [Engine source/API/license](https://github.com/EVEShipFit/dogma-engine).

### Verified ordinary cargo fitting subset

Expanded Cargohold I/II use effect 59 (`cargoCapacityMultiply`): target 38 multiplied by source149 (1.175 / 1.275). Medium Cargohold Optimization I (31119) uses effect836 targeting38 with post-percent source614=15, so factor1.15. Capacity38 itself has `stackable:true`; these capacity effects multiply without diminishing stacking penalties: `C = C_hull_with_skills × ∏expanderMultiplier × ∏(1+rigBonus/100)`. This applies to identified fitted cargo expanders/optimization rigs, not similarly named unrelated items. Module drawbacks still affect other attributes and must be accounted for in a full performance model. [Effect59](https://esi.evetech.net/latest/dogma/effects/59/), [rig31119](https://esi.evetech.net/latest/universe/types/31119/), [effect836](https://esi.evetech.net/latest/dogma/effects/836/), [capacity stackability](https://esi.evetech.net/latest/dogma/attributes/38/).

Newly purchased market ship hull quantities need type `packaged_volume` when present, whereas an assembled singleton in owned cargo uses assembled `volume`; ESI type metadata distinguishes these fields. Do not use assembled volume to size a packaged market hull, or packaged volume for an assembled owned hull. Missing state/volume requires conservative unknown capacity treatment. [Official type example](https://esi.evetech.net/latest/universe/types/657/).

Timing scope is manually piloted warp-to-zero travel. Autopilot approach burns, cloak/MWD tricks, webs and movement from an unknown grid location are excluded, not automatically assumed.
