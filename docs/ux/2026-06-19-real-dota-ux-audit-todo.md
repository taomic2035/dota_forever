# Real Dota UX Audit And Next TODO

Date: 2026-06-19
Owner split: Codex owns UX/readability/control surfaces; Opus owns mainline sim rules and shared gameplay APIs.

## What

This is the UX-specific audit requested for the current `dota_forever` worktree. It compares the current project state with the player-facing control and information loops of real Dota:

- Dota 1 / Warcraft III RTS shell: precise selection, command card, shift queue, control groups, and inspect-vs-command semantics.
- Dota 2 modern UX: richer HUD status, quickbuy, inventory/backpack/stash/courier logistics, minimap communication, team status pings, and high-density fight readability.

The separate untracked file `docs/2026-06-19-dota-fidelity-audit.md` covers broader sim fidelity. This document focuses on UX gaps and next implementation tasks.

## Research Baseline

External references checked on 2026-06-19:

- Dota 2 Controls: https://dota2.fandom.com/wiki/Controls
  - Baseline used: customizable hotkeys, box selection, Shift add/remove, Shift queue, right-click command semantics, minimap delay, pings, shop quickbuy, inventory pings.
- Dota 2 Head-up Display: https://dota2.fandom.com/wiki/Head-up_Display
  - Baseline used: shop categories/quickbuy, inventory/backpack/stash, selected unit display, modifier rows, stun/disable bar, hero list, game clock, scoreboard, combat log.
- Dota 2 Minimap: https://dota2.fandom.com/wiki/Minimap
  - Baseline used: minimap shows buildings/heroes/creeps/couriers/wards under vision, shop/courier/ward/rune/camp icons, ping/drawing role.
- Dota 2 Courier: https://dota2.fandom.com/wiki/Courier
  - Baseline used: courier is a first-class logistics/control object rather than only hidden shop behavior.
- Existing local reference: `docs/ux/2026-06-15-real-dota-ux-gap-audit.md`.
- Existing local roadmap: `docs/ux/2026-06-15-ux-consolidated-roadmap.md`.

## Current UX Coverage

These are no longer top gaps; they should be treated as foundations to preserve while integrating Opus changes.

| Area | Current evidence | Status |
|---|---|---|
| Multi-unit selection | `src/engine/selection.ts`, `tests/selection.test.ts`, `src/ui/uxFeedback.ts` selection snapshot | Mostly implemented |
| Box select / Shift select / F1-F3 | `src/engine/input.ts`, `tests/inputSelectionHotkeys.test.ts`, `src/main.ts` selection callbacks | Mostly implemented |
| Control groups | `numberRowMode`, `Ctrl+1..6`, tests in `tests/inputSelectionHotkeys.test.ts` and `tests/controlSettings.test.ts` | Implemented with item/control-group mode tradeoff |
| Command routing | `src/engine/selectionCommandRouting.ts`, `tests/selectionCommandRouting.test.ts` | Implemented for selected commandable units |
| Command card | `src/ui/commandCard.ts`, HUD click delegation in `src/ui/hud.ts` | Implemented but still lacks subgroup/Tab layer |
| Shift queue visualization | `src/render/commandQueuePath.ts`, `src/render3d/commandQueue3d.ts` | Implemented in 2D/3D |
| Attack command readability | `src/render/attackCommandWorldHint.ts`, `src/render3d/attackCommand3d.ts`, `src/ui/combatCommandHintModel.ts` | Recent UX layer implemented |
| Shop/quickbuy/recipe | `src/ui/shop.ts`, `src/ui/shopReminderModel.ts`, `src/ui/shopRecipeModel.ts`, `src/ui/quickbuyModel.ts` | Strong foundation, not final logistics UX |
| Courier HUD/minimap/death | `src/ui/courierHudModel.ts`, `src/render/minimapCourierMarker.ts`, `src/ui/courierEventFeedback.ts`, `src/ui/announceModel.ts` | Usable, still missing richer courier commands |
| Fountain status | `src/ui/fountainStatusModel.ts`, HUD strip in `src/ui/hud.ts` | Recent read-only prompt implemented |
| Minimap actions/pings/drawing | `src/render/minimap.ts`, `src/ui/mapPingModel.ts`, `src/ui/minimapClickGuard.ts`, `src/ui/minimapDrawingModel.ts` | Strong foundation, drawing pass added |
| Status and combat feedback | `src/render/statusChips.ts`, `src/ui/deathRecapModel.ts`, `src/ui/combatLogPanel.ts`, `src/ui/enemyHeroBarModel.ts` | Good but icon/stun-bar layer is incomplete |
| Availability reason model | `src/ui/availabilityModel.ts`, tooltip/status broadcast tests | First read-only UI contract implemented; sim confirmation still needs migration |

## Gap Summary

The project has moved past "basic Dota-like controls." The remaining UX gap is integration depth:

1. Current selection can command multiple units, but real Dota also needs subgroup cycling, selected-unit-specific command card adaptation, and double-click same-type selection.
2. Shop, quickbuy, stash, backpack, fountain, and courier exist, but real Dota makes the item logistics route visible and manipulable at every step.
3. Communication exists through pings and alt-click status, but real Dota has a broader team-info layer: top bar missing/returned/TP/buyback/ultimate pings, game clock pings, and chat-wheel-like radial calls.
4. Fight readability is good, but real Dota exposes disables and modifiers as a timed icon/bar layer, not only text chips.
5. Cast previews exist, but the next leap is a shared preview model that expresses range, pathing, approach-to-cast, target legality, and shape for both 2D and 3D.
6. Camera/minimap are functional, but still lack Dota-grade drag-scroll/draw-on-minimap/saved camera/viewer tooling.

## User Feedback 2026-06-20: Map Mechanics Are Not Visible Enough

What the user reported:
- Forests feel like unreachable blockers and do not visibly create shadow/fog play.
- Neutral camps are not discoverable; the user has not seen neutral creeps.
- High ground reads as nearly absent.
- Evasion / miss chance exists in rules, but the UX does not make it visible.
- River runes are not apparent.

Current code evidence:
- Trees are blocking cells with carved jungle paths in `src/sim/map.ts`; true tree-cutting / tree-shadow vision rules are not yet a first-class Opus sim API.
- Neutral camps exist and first spawn at 0:30 in `src/sim/neutrals.ts`; this can make early gameplay look empty if the user expects camps at 0:00.
- River/high-ground vision and low-to-high miss are covered in `tests/vision.test.ts`, `tests/combat.test.ts`, and `tests/p2Fixes.test.ts`.
- River runes exist in `src/sim/runes.ts`, spawning at river spots on the rune interval.

Codex UX response:
- Added `src/ui/mapMechanicsModel.ts` to expose compact HUD chips for neutral camp presence/next check, active river runes/next wave, current terrain height, nearby tree-wall/forest shadow zones, and evasion/uphill miss or true-strike state.
- HUD topbar now renders those map-mechanics chips every frame from current world state.
- Added an always-visible HUD map-mechanics radar row from the same model. It points the player toward the nearest neutral camp, nearest rune point/active rune, nearest high-ground/ramp area, and nearest forest-shadow pocket, with first-spawn / next-spawn / miss text in tooltips.
- Minimap camp and rune markers are larger and labeled (`S/M/L/A/R`), and active runes are drawn brighter with rune-type colors.
- Extended `src/render/mapReadability.ts` with explicit `treeShadow`, `forestVisionPocket`, `lowHighVisionBreak`, and `highGroundMiss` tags.
- 2D terrain baking now draws walkable tree-adjacent forest-shadow pockets and stronger high/low-ground vision-break hatching, so forests and cliffs read as gameplay terrain rather than flat decoration.
- 3D terrain now adds named runtime layers for direct in-game preview: `terrain-forest-shadow-pockets`, `terrain-cliff-vision-break-cues`, `terrain-neutral-camp-beacons`, and `terrain-rune-beacons`. These make jungle shadow pockets, high-ground miss/vision breaks, neutral camps, and river rune points visible without opening a separate image or debug view.
- 3D mechanic layers now carry runtime pulse contracts (`forest-breathe`, `highground-miss-pulse`, `camp-pulse`, `rune-pulse`), so these areas remain visually alive during normal gameplay rather than reading as static decoration.
- Follow-up from the same feedback: forest UX now says "树线/林影" rather than promising new passable pockets. The HUD forest chip and MAP radar point players toward existing jungle entrances/tree-line readability, while tree cells remain blockers.
- 3D terrain now also emits `jungle_walkway_entrance` samples and a named `terrain-jungle-walkway-entrances` layer with `terrain-jungle-entrance-floor` and `terrain-jungle-entrance-arches`, so players can see where to enter tree-line paths.
- Neutral camp chips now use `ready` tone when any camp/neutral is alive, so spawned camps read as active objectives instead of passive map decoration.
- Current verification also re-ran existing sim checks proving neutral camps spawn at 0:30, river runes spawn/pick up, and uphill miss/evasion combat rules still pass.
- Added `src/ui/tutorialCoachModel.ts` and a compact HUD `COACH` strip for contextual in-match teaching. It promotes the most relevant current reminder from item logistics, backpack delay, quickbuy readiness, walkable forest entrances, miss/evasion, high-ground/ramp, active neutral camps, and river runes. This directly addresses the "mechanic exists but UX cannot see it" feedback without changing sim truth.
- 2026-06-20 follow-up after direct playtest feedback:
  - `GameMap` now exposes `forestPockets` as visual jungle shadow anchors kept adjacent to tree walls. They no longer carve new walkable clearings; existing jungle paths remain the topology source.
  - `GameMap` now exposes `highgroundPlateaus` as base-external visual high-ground anchors. They no longer write `height=2` or add gameplay miss/vision blockers outside the already-authored base high ground.
  - `mapMechanicsModel` now distinguishes tree-line/forest-shadow readability from actual pathing, shows "首刷" for neutral camps before 0:30, and explains camp/rune/high-ground/forest radar entries with direct action wording.
  - `landmarkVisuals` and the minimap now include forest pocket (`F`) and high-ground plateau (`H`) landmarks in the same map-knowledge layer as camps/runes/shops.
  - 3D terrain now exposes `terrain-forest-walkable-pockets` with `terrain-forest-pocket-floor` and `terrain-forest-pocket-canopy-shadows`, plus `terrain-highground-plateau-banners`, so tree-entry and high-ground gameplay spots are visible in normal 3D preview.
- 2026-06-20 follow-up after Opus batchsim/visual feedback:
  - Active spawned river runes now use `src/render/runeWorldMarker.ts` and render in the 2D world plus 3D overlay, instead of relying only on static rune-spot beacons or minimap markers.
  - After Opus' second QA, authored forest pockets, jungle high-ground plateaus, and extra high-ground ramps were converted to visual/discovery anchors only. They no longer carve passable pockets, carve ramp topology, or write `height=2`.
  - `tests/mapIntegrity.test.ts` now guards those topology-sensitive constraints: forest anchors must remain tree-adjacent without carving a large clearing, authored jungle high-ground anchors must stay sim height 1, and anchors must stay off key lane/building attack axes.
  - Local batchsim decisive-health recovered to 8/8 after removing topology writes. The command still exited nonzero because Vitest emitted an `onTaskUpdate` RPC timeout after all batch tests passed, so Opus should re-run in the integration tree.

Remaining Opus/Codex split:
- Opus: decide whether tree cells should remain hard blockers only, or add tree-shadow / juking / tree-cutting vision rules.
- Opus: keep `map.ts`/`mapLayout.ts` under batchsim gate. Any future topology, tree, ramp, or authored `height=2` change needs 8/8 batchsim proof or an explicit bot-AI retune plan.
- Codex: once Opus exposes tree-shadow or high-ground visibility regions explicitly, replace the current pocket/proximity-based "林影" UX chip with exact fog/shadow state.
- Codex: 3D camp/rune/forest/cliff readability and HUD discoverability are now in place; future polish should tune art quality and exact state binding after Opus exposes authoritative forest/fog/camp/rune timing APIs.
- Opus/Codex integration note: this UX layer does not change spawn timing, pathing, miss RNG, or rune pickup rules. It makes the existing rules visible; authoritative rule changes should still be made in sim and then passed into the same HUD/radar/layer contracts.

Verification:
- `npm test -- tests/mapReadability.test.ts tests/mapIntegrity.test.ts tests/mapMechanicsModel.test.ts tests/render3d/terrainDressing.test.ts` passed on 2026-06-20.
- `npm test -- tests/mapIntegrity.test.ts tests/runeWorldMarker.test.ts` passed on 2026-06-20.
- `npm test -- tests/mapReadability.test.ts tests/mapMechanicsModel.test.ts tests/render3d/terrainDressing.test.ts tests/runes.test.ts tests/minimapCourierMarker.test.ts tests/runeWorldMarker.test.ts tests/mapIntegrity.test.ts` passed on 2026-06-20.
- `npm run batchsim` after visual-only topology constraints produced 8/8 decisive results on 2026-06-20: Dawn 3 / Night 5, average 61min, max 85min, seed 11 at 50min, seed 8088 at 67min. Vitest still emitted an `onTaskUpdate` RPC timeout after all 8 tests passed, so this needs Opus integration-tree confirmation.

## TODO Backlog

### P0-1. Subgroup And Same-Type Selection

Progress 2026-06-19:
- Added `SelectionState.cyclePrimary()` as the core active-subgroup primitive. It rotates the primary command subject inside the existing commandable selection without changing selected ids.
- Added `SelectionState.selectSameType(...)` as the double-click same-type selection primitive. It selects only visible, alive, player-commandable units with the same kind/name signature as the anchor, excluding enemies, neutrals, dead units, and hidden units.
- Wired close repeated left-clicks in `InputManager` as `doubleClick` selection requests.
- Wired `main.ts` double-click selection to `SelectionState.selectSameType(...)`, using current visibility checks for candidates.
- Because `selectedCastSubject(...)` already reads `SelectionSnapshot.primaryId`, subgroup cycling now has a low-level path to affect the active cast/command subject once an input binding is chosen.
- Added a rebindable `cycleSubgroup` action, defaulting to `C`, so players can cycle the primary command subject without stealing current `Tab` scoreboard behavior.
- HUD selection summary now shows the current primary command subject and the cycle hotkey, so multi-unit control groups expose which hero/summon/courier will receive primary ability/item commands.
- Remaining work: decide whether final Dota-like `Tab` behavior should become tap-to-cycle / hold-scoreboard, stay scoreboard-only, or remain user-rebindable through `cycleSubgroup`.

What:
- Add Tab or configured-key subgroup cycling for selected controllable groups.
- Add double-click selection of same controllable unit kind/name on screen.
- Make command card and primary unit panel follow the active subgroup, while keeping full selection order visible.

Why:
- Real Dota/RTS control is not just "selected ids"; players need to cycle illusions/summons/courier-like subgroups quickly.
- This unlocks micro-heavy heroes and summons without overloading the hero HUD.

Tradeoff:
- Do not steal `Tab` from scoreboard without a mode decision. Current `Tab` is scoreboard; options are hold-Tab scoreboard vs tap-Tab subgroup, or remappable subgroup key.

Owner:
- Codex: selection UX model, HUD/command-card state, tests.
- Opus: confirm whether unit kinds/names are stable enough for same-type grouping.

Acceptance:
- Configured subgroup key cycles primary command subject inside a multi-selection; Tab policy remains a separate scoreboard decision.
- Double-click own summon selects matching visible owned summons without selecting enemy/neutral units.
- Tests cover fog-hidden units, dead units, mixed hero/summon groups, and command routing after subgroup change.

### P0-2. Item Logistics Panel V2

Progress 2026-06-19:
- Added `src/ui/itemLogisticsModel.ts` as a pure read-only lane/slot model for Hero inventory, Backpack, Stash, TP slot, and Courier status/cargo shape.
- HUD now consumes that model to show a compact item logistics strip above the inventory block.
- Quickbuy recipe components receive a `Q` slot badge/glow wherever they currently sit across hero/backpack/stash/TP/courier-available lanes.
- If the current quickbuy recipe is fully hero-ready in main inventory, its component slots receive a stronger `C` combine-ready badge/glow.
- `quickbuyModel` now exposes `itemKey` so HUD-side logistics can stay connected to the selected target without reading private shop state.
- Added live backpack ready-delay countdown to `itemLogisticsModel` and HUD inventory slots. After a backpack item enters the main inventory, the logistics strip can prioritize `Backpack delay: item Ns`, and the affected slot gets a countdown badge/border while it remains on `cooldownUntil`.
- Courier HUD and item logistics now receive an estimated ETA when the courier is moving to deliver stash or return to fountain. This is a presentation estimate from current courier/target distance and move speed, not an authoritative courier task API.
- Added `src/ui/shopPurchaseTraceModel.ts` and ShopPanel wiring for a recent purchase route trace. Direct buys, recipe batch buys, and quickbuy completions now show whether each attempted item landed in Hero, Backpack, Stash, or was blocked with the next action.
- Added `ItemLogisticsModel.primaryAction` and HUD logistics-strip surfacing for the next executable item route: `Backpack -> Hero`, `Hero -> Backpack`, `Stash -> Hero`, or `Deliver stash`. This uses existing safe actions (`moveFromBackpack`, `moveToBackpack`, shop stash pickup, courier delivery) and does not add new sim rules.
- Remaining work: true drag-and-drop / arbitrary slot swap UX and authoritative courier cargo/path ETA when Opus exposes courier task state.

What:
- Add a compact logistics lane around inventory: hero inventory, backpack, stash, courier cargo/task, TP slot.
- Support visible swap/move affordances, drag or click-to-swap, backpack move-delay countdown, and "where did my purchase go" trace.
- Add HUD item-slot "can combine now" and "component belongs to current quickbuy" glow.

Why:
- Real Dota's item loop is spatial and continuous: buy, stash, courier, move, combine, use, sell.
- Current project has strong pieces, but the user still has to infer too much from toasts and shop-only reminders.

Tradeoff:
- Keep the first implementation compact and deterministic. Do not implement every Dota 2 inventory edge case at once: disassemble locks, ward partial transfer, ground drops, and teammate transfer can be phased.

Owner:
- Codex: logistics UI model, HUD/shop presentation, tests.
- Opus: expose authoritative item transfer/combine reason codes if current sim paths diverge.

Acceptance:
- Buying an item visibly lands in Hero / Backpack / Stash / TP / Courier route.
- Recent shop purchases keep a visible route trace for Hero / Backpack / Stash / blocked outcomes.
- Backpack countdown is live after moving into inventory.
- Courier delivery/return shows an ETA while moving.
- Inventory slots glow when they can complete a recipe or quickbuy target.
- Tests cover full inventory, stash, backpack, courier unavailable, and secret/side shop restrictions.

### P0-3. Courier Control V2

Progress 2026-06-19:
- Added `src/ui/courierControlModel.ts` as a pure HUD action-strip contract for courier Select, Deliver, Return, Stop, and Burst/Speed.
- HUD now renders a compact courier control strip under the courier status line.
- Existing safe actions are clickable: `F2`/Select routes through the existing command-card select-courier action, and Deliver routes through `requestCourierDelivery(...)`.
- Return, Stop, and Burst are visible but disabled with `pending sim` reasons, so the UI teaches the Dota-like command surface without pretending unsupported sim actions already work.
- Added `src/render/courierRouteModel.ts` as a pure route-readability model for moving couriers. The 2D world renderer and minimap now draw allied courier delivery/return lines from the same model; spectator view can show all teams.
- Remaining work: Opus needs authoritative return-to-fountain, stop/cancel task, courier cargo/task ETA, and burst/speed APIs before those controls can become enabled.

What:
- Add courier command strip: select, deliver, return to fountain, stop, burst/speed if available later.
- Show courier path/ETA in world and minimap.
- Distinguish retrieving, delivering, returning, idle-at-fountain, dead-respawn, and low-health danger.

Why:
- Dota courier is a visible controllable logistics unit, not only an automatic delivery helper.
- Current courier HUD is readable, but command depth and path intent are still thin.

Tradeoff:
- Keep auto-delivery as a usability layer, but expose manual override clearly so the project remains Dota-like.

Owner:
- Codex: HUD/minimap/path/ETA presentation.
- Opus: courier task state, respawn timer, possible speed/upgrade decisions.

Acceptance:
- F2 select still works; courier strip actions are clickable and hotkey-visible.
- Courier path is visible when delivering/returning.
- Manual return cancels delivery only through an explicit sim API.
- Tests cover dead, low HP, delivering with stash, returning empty, and no courier.

### P0-4. Shared Ability/Item Availability API

Progress 2026-06-19:
- Added `src/ui/availabilityModel.ts` as the first shared read-only reason contract for ability/item HUD copy.
- Wired `abilityTooltipModel`, `itemTooltipModel`, and `statusBroadcastModel` to read the same priority/order for unlearned, passive, cooldown, mana, ready, empty, toggle/autocast, and backpack-delay wording.
- Wired `shopDestinationModel` and ShopPanel badges so shop ready/blocked states expose the same reason family for ready, wrong shop, no gold, and no space. Quick-buy and next-component prompts can now carry that reason forward.

Progress 2026-06-20:
- Extended `src/ui/availabilityModel.ts` with command-surface reasons for no selected commandable unit, no available controlled group, and unavailable courier.
- `src/ui/commandCard.ts` now accepts a lightweight command context and uses the shared availability copy for disabled Move / Attack / Stop / Hold, Select Courier, Select All Controlled, and Glyph cooldown states.
- HUD command-card rendering now passes selected-commandable count, controlled-commandable count, courier life state, and Glyph cooldown into the command-card model. Disabled command buttons no longer emit `data-command-card`, so the presentation layer does not accidentally fire unavailable commands.
- Added `buildCastAvailability(...)` so `ready`, `walk`, and `invalid` cast-preview states share availability copy for "ready", "walk into range", and invalid target reasons.
- `TargetPreviewModel` now carries that shared cast availability model alongside its existing `status`, `actionHint`, and `rejectReason`. This keeps cursor/preview copy aligned while preserving the current cast legality state machine.
- Backpack move-delay now has an explicit `ItemInstance.backpackReadyUntil` marker in sim. `itemUseReason(...)` returns `backpack-delay`, HUD tooltip/status broadcast pass that as `backpackDelayRemaining`, and the command rejection label says `背包延迟` instead of generic cooldown.
- Added `src/ui/orbPriorityModel.ts` as a read-only attack-modifier priority preview. HUD now shows a compact `ORB` summary above the ability row and per-slot `MAIN` / `+ORB` / `OFF` badges for learned orb/autocast abilities.
- This is deliberately UX-only: current combat still runs the existing attack-hit hook semantics, while Opus owns final true single-orb priority, manual orb-cast order, and hero-specific default autocast policy.
- Remaining work: route the rest of sim confirmation through the same reason enum; Opus still owns final command rejection reason parity for deeper target legality, immunity, mute/silence, item transfer, and shop/courier edge cases.

What:
- Create one shared availability/reason model for HUD, command card, shop, items, and sim confirmation:
  - cooldown, mana, range, target team, target kind, immunity, silence/mute/stun, inventory/backpack delay, shop access, dead/invulnerable/fog.

Why:
- Dota UX is predictable because the UI and command result agree.
- Current code has several local reason models (`castValidity`, tooltip models, item use checks, shop destination/reminder models). They are good, but can drift.

Tradeoff:
- Do not block current UI on a giant migration. Start with a read-only adapter that wraps existing checks, then replace call sites gradually.

Owner:
- Both.
- Codex owns user-facing copy/tone.
- Opus owns reason-code truth and sim parity.

Acceptance:
- One reason enum can drive tooltip text, disabled button state, cursor reject, HUD flash, and final command rejection.
- Tests prove a reason shown before click matches the rejection after click for at least abilities, active items, shop buy, and backpack delay.

### P0-5. Cast Preview V2

Progress 2026-06-19:
- Added `src/engine/targetPreviewModel.ts` as the first shared Target Preview V2 contract.
- The model combines existing preview shape, cast range, target validity, cast status, range ring, target reticle, line geometry, approach line, action hint, and reject reason into one renderer-ready object.
- `src/main.ts` now builds this model for both ability and active-item targeting, stores it on `UxFeedback.targetPreview`, and keeps projected `UxFeedback.targeting` fields only as a compatibility fallback.
- 2D and 3D renderers now prefer `TargetPreviewModel` directly for range rings, reticles, line previews, cast tone, and 2D walk-approach lines; legacy `targeting` rendering remains as a fallback for older callers.
- Tests cover out-of-range walk previews, invalid unit target rejection, line geometry, area reticles, and no-target hidden previews.
- Remaining work: add richer cone/vector metadata when abilities/items expose it, and wire pathability/range legality from Opus' final path/cast APIs.

What:
- Expand targeting preview into a shared `TargetPreviewModel`:
  - unit, self, point, AoE circle, line, cone, vector, no-target.
  - range ring, cast range, AoE radius, approach-to-cast line, invalid target reason, pathability.
- Ensure 2D/3D consume the same model.

Why:
- Real Dota lets the player predict the next click. Invalid target, out-of-range walk-up, AoE shape, and line direction must be legible before commit.

Tradeoff:
- Do not require final art for every reticle. The model contract and legality are more important than polish in the first pass.

Owner:
- Codex: preview model, renderer parity, UX copy.
- Opus: target metadata completeness on abilities/items and pathing legality.

Acceptance:
- Every ability/item active has preview metadata or an explicit "no preview needed" marker.
- Out-of-range casts show whether the hero will walk forward or fail.
- 2D and 3D previews agree on shape/tone/reject reason.

### P1-1. Dota Communication Layer

Progress 2026-06-20:
- Added `src/ui/tacticalStatusBroadcastModel.ts` as a pure broadcast-label model for game clock, hero resources, Glyph, rune objective state, Boss objective state, and buyback state.
- HUD topbar now accepts Alt-click status broadcast on game time, rune state, Glyph, Boss state, and gold/buyback status using the existing `onStatusBroadcast` toast/audio path.
- HUD health and mana bars now accept Alt-click resource broadcast with exact value and percent.
- Dead-hero buyback rows now accept Alt-click buyback-state broadcast for ready, cooldown, or gold-short states, while normal click still buys back when available.
- Existing ability/item Alt-click status broadcast remains on `statusBroadcastModel`; the new model covers non-slot tactical state without changing sim truth.
- Extended `enemyHeroBarModel` with `statusBroadcast` so top-bar hero chips can broadcast ally resources, enemy visible/returned status, enemy missing/迷雾 status, and public death/respawn state without leaking hidden enemy HP/MP.
- HUD hero chips now preserve normal click-to-center, while Alt-click sends the safe status broadcast through the existing `onStatusBroadcast` path.
- Ally top-bar hero-chip broadcasts now include TP scroll count and ultimate readiness/cooldown when available, without adding that hidden state to enemy broadcasts.
- Added `src/ui/chatWheelModel.ts` and a compact HUD `CHAT` panel with 8 default tactical calls. Each call reuses the existing local `onStatusBroadcast` path rather than creating a separate team-chat bus.
- Rune/Boss objective chips now broadcast active rune names or next rune wave, plus Boss alive/respawn state, so objective timing is visible and shareable from the HUD.
- Added `src/ui/teamCommunicationLogModel.ts` and a local HUD `TEAM` log. Alt-click status broadcasts and chat-wheel calls now remain visible for a short TTL instead of only flashing as a command toast.
- Ally top-bar hero-chip broadcasts now include buyback readiness, gold-shortfall, or cooldown state for every friendly hero, while enemy chips still do not leak economic information.
- Added a rebindable `chatWheel` action, defaulting to `Y`; `InputManager` routes it to the HUD chat wheel through the same persisted control-settings system as other hotkeys.
- Added local chat-wheel content presets: `balanced`, `objective`, and `defensive`. `ControlSettings` persists `chatWheelPreset`, HUD renders the current preset, and the pause menu can cycle it.
- Added local chat-wheel text customization. `ControlSettings.chatWheelCustomLabels` persists eight optional labels, blanks fall back to the selected preset, pause menu buttons edit each slot locally, and HUD uses the custom label when present.
- Remaining work: Opus-owned network/replay event-bus integration for team communication history.

What:
- Add top-bar hero pings: missing, returned, dead/respawn, ally TP status, ultimate readiness if available.
- Add game clock alt-click, buyback status ping, health/mana bar ping, glyph ping.
- Add a small radial chat wheel or command wheel with 8 configurable calls.

Why:
- Real Dota communication is UI-native. Players should not type to express common tactical information.

Tradeoff:
- Keep team-chat/log output simple first; audio/localization can follow.

Owner:
- Codex, with Opus only if extra hero/team state needs to be exposed.

Acceptance:
- Alt/Ctrl/Shift combinations on relevant HUD targets produce distinct messages and pings.
- No accidental information leak for fogged enemy cooldowns or hidden heroes.
- Tests cover topbar enemy missing/returned, ability/item status, game clock, buyback, and glyph messages.

### P1-2. Modifier Icons And Disable Bar

Progress 2026-06-20:
- Added `src/ui/modifierDisplayModel.ts` as the pure Dota-like modifier presentation contract.
- The model builds compact icon tokens with color, tooltip, and remaining-time text from current `Unit.modifiers`.
- The model builds a timed disable bar from the longest active disable, recognizing current sim fields for stun, root, silence, mute, disarm, break, hex-like combinations, cyclone/banish-like untargetable modifiers, sleep/nightmare keys, and taunt/duel keys.
- HUD hero panel now renders a longest-disable bar above compact modifier tokens.
- Inspect panel now renders the same disable bar and token row for selected non-hero-HUD units, covering enemy/ally/neutral selected-unit readability.
- 2D overhead status pips now derive their control/buff/debuff semantics from `modifierDisplayModel`, while preserving the existing red/orange/green world readability.
- 3D hero status FX now derives disable energy and invisibility shell intent from `modifierDisplayModel` through `heroStatusFxInputFromModifiers(...)`, while preserving pose/cast/channel overlays.
- Existing `statusChips` remains available for legacy/shared consumers and its tests still pass; new tests cover the richer icon/bar model.
- Remaining work: add art-quality custom icons if/when resource atlas work lands, and let Opus confirm any future explicit `taunted`, `hexed`, or `cycloned` state fields so key-name detection can be replaced.

What:
- Replace or supplement text chips with compact icon tokens for buffs/debuffs.
- Add a selected-unit disable bar for stun/hex/sleep/cyclone/silence/mute/disarm/break/root/taunt durations.
- Keep inspect panel, HUD, 2D status pips, and 3D status FX aligned.

Why:
- Real Dota has small persistent modifier icons and a timed disable bar; text chips are readable but too bulky and too slow in fights.

Tradeoff:
- Use generated/simple symbolic icons first. Do not wait for final item-quality art.

Owner:
- Codex.

Acceptance:
- Longest relevant disable appears as a timed bar.
- Buff/debuff icons have color, tooltip, and remaining time.
- Existing `statusChips` tests are either preserved or replaced with icon/bar model tests.

### P1-3. Threat Direction And Fight Aftermath

Progress 2026-06-20:
- Added `src/ui/threatDirectionModel.ts` as a pure UX model for incoming damage direction.
- The model maps source-vs-target world vectors to `top/right/bottom/left` edge buckets, aggregates repeated damage by edge/source, preserves source name/color/groupKey and damage-type split for death-recap parity, and applies short decay/expiry.
- HUD now has a full-screen pointer-events-none edge overlay. Recent player-hero damage lights the relevant screen edge with source name and type/source color, while the existing incoming damage feed remains on the side.
- `main.ts` now feeds `ThreatDirectionLog` from existing `unit_damaged` events when the player hero takes damage. This is read-only UX state and does not change sim damage, death recap, or combat logs.
- Extended `DamageLog` / `DeathRecapEntry` with optional visible-source context. Death recap rows now show `定位` for sources that were visible when damage landed and `迷雾` for hidden sources without exposing hidden coordinates.
- Clicking a visible death recap source centers the camera on the last visible source position and emits a local ping pulse. Hidden sources remain non-clickable to avoid fog leakage.
- Remaining work: add richer "current attacker target line" refinement if Opus exposes clearer attack-intent APIs.

What:
- Add directional edge damage indicators instead of only global low-HP vignette.
- Link death recap entries to visible world/teamfight context where possible.
- Add "who is hitting me now" target lines or side feed refinement.

Why:
- Dota fights are noisy; the player must know threat direction and source immediately.

Tradeoff:
- Keep indicators restrained. Overdrawing the whole screen would harm readability.

Owner:
- Codex.

Acceptance:
- Taking damage from off-screen or flank sources lights the relevant screen edge.
- Incoming damage feed and death recap share source categorization.
- Tests cover direction vector to screen-edge bucket and cooldown/decay behavior.

### P1-4. Shop UX V2

Progress 2026-06-20:
- Added `src/ui/shopRelatedItemsModel.ts` as a pure selected-item related graph model.
- The model summarizes `builds from` components and `builds into` parent items, preserving owned/missing/gated state, duplicate component counts, and secret-shop gates.
- `ShopPanel` now keeps a lightweight selected item key from the current hover/recent interaction. The panel renders a compact related-items graph above the item list without changing normal click-to-buy or Shift quickbuy behavior.
- Tests cover hidden state, owned/missing components, secret-shop gated components, parent recipe discovery, and counting backpack/stash/TP as planning ownership.
- Extended `QuickbuyModel` with queue summary fields while keeping the old primary target contract for HUD/logistics.
- `ShopPanel` quickbuy now supports a short queue: Shift-click replaces the queue with the selected target; Ctrl+Shift-click appends/reorders that target at the end. The quickbuy badge shows primary target plus queue count and total queue deficit.
- Added richer local shop search metadata in `src/ui/shopListModel.ts`: visible rows now carry normalized tokens, matched fields (`key/name/description/category`), relevance score, buyable/blocked tone, and a reader-facing label/title.
- `ShopPanel` renders a compact search summary plus per-row `MATCH` / `BUY` / `LOCK` badges that show the matched terms and fields. This improves search/highlight quality without changing buy, quickbuy, recipe, or shop-access rules.
- Remaining work: stock/cooldown-specific metadata only if Opus adds authoritative shop stock/cooldown APIs.

What:
- Add related-items graph around selected shop item: builds from / builds into / already owned / missing / secret-shop gated.
- Add quickbuy queue append, not only replace.
- Add shop search/highlight quality: afford, location, stock/cooldown if Opus adds stock.

Why:
- Dota shop is a planning tool, not just a list. Current reminders are useful, but the recipe graph and quickbuy queue are still shallow.

Tradeoff:
- Do not implement full Dota 2 guide system yet. Keep this to recipe/quickbuy/logistics.

Owner:
- Codex, with Opus for recipe/stock truth if changed.

Acceptance:
- Selecting an item shows parent/child recipe graph.
- Ctrl+Shift add-to-quickbuy can append components/targets.
- Quickbuy supports at least a short queue with first eligible purchase.
- Search result rows explain why they matched and whether the current row is buyable or blocked.
- Search relevance prefers item key/name/category matches over description-only matches.

### P1-5. Minimap Communication And Drawing

Progress 2026-06-20:
- Added `src/ui/minimapDrawingModel.ts` as the pure minimap communication gesture contract.
- Alt short-click remains a normal ping. Alt+left-drag over the minimap upgrades into a short-lived tactical drawing stroke instead of recentering camera or issuing movement.
- The model rate-limits jitter points, carries ping-channel color semantics into strokes, and fades strokes after a short TTL.
- `src/render/minimap.ts` now renders live and completed minimap strokes on the existing minimap canvas while preserving the existing map ping callback/audio/world-pulse path for short clicks.
- Tests cover ping-vs-draw disambiguation, stroke point sampling, and stroke fade/expiry.
- Added persistent minimap display settings to `ControlSettings`: hero display mode (`dots` / `icons` / `names`), background mode (`terrain` / `simple`), and side placement (`right` / `left`).
- Pause menu now exposes the three minimap display toggles, and `main.ts` pushes normalized control settings into `MiniMap`.
- `MiniMap` now renders hero dots, hero glyph icons, or short hero-name labels; can switch between terrain thumbnail and a high-contrast simple background; and can dock left or right.
- Remaining work: objective icon state can become richer if Opus exposes rune/camp/boss timing or contested state beyond the current visible markers.

What:
- Add minimap drawing/persistent ping strokes with short decay.
- Add hero icon/name display mode toggle, simple background toggle, and side placement option if layout permits.
- Add camp/rune/boss objective icons with clearer state.

Why:
- Real Dota minimap is both command surface and communication surface.

Tradeoff:
- Drawing can become noisy; include fade and rate limits.

Owner:
- Codex.

Acceptance:
- Modifier gesture draws or pings without interfering with camera/move guard.
- Settings persist in control/UI settings.
- Tests cover ping/draw input disambiguation.

### P2-1. Spectator / Replay / Debug UX

Progress 2026-06-20:
- Added `src/ui/spectatorTimelineModel.ts` as a pure event timeline model for spectate/debug UX.
- The model turns major world events into newest-first, jumpable entries: hero kills, tower/rax falls, courier deaths, Boss kills, rune spawns/takes, and game-over.
- HUD now renders a compact `EVENTS` timeline only when `?mode=spectate` or `?debug=1` is active. Normal play without debug keeps the panel hidden.
- Clicking a timeline entry recenters the camera on its event focus and emits a local ping pulse; it does not alter sim state, replay state, fog, or command routing.
- Added `src/ui/spectatorControlsModel.ts` as a pure debug/spectate control model for pause/resume, slower/faster speed, follow hero, and fog perspective switching.
- HUD now shows a compact `WATCH` control strip beside the event timeline in `?mode=spectate` or `?debug=1`. Buttons drive existing loop speed/pause, camera follow, and renderer viewer-team state without touching sim rules.
- `WATCH` now exposes richer follow target selection. The model accepts alive follow targets, summary names the current target, `下个目标` cycles heroes first and then Boss/courier targets, and camera follow tracks that target every frame with fallback to the player/first hero if it disappears.
- Added local event jump history. `SpectatorTimelineJumpHistoryLog` records clicked timeline entries newest-first, de-duplicates repeated jumps, caps the list, and HUD shows a `JUMPS` section that can recenter on prior focuses without durable replay state.
- Remaining work: durable replay snapshots / persisted replay history if Opus exposes replay-state APIs.

What:
- Add simple spectator controls: pause/speed, follow hero, fog perspective, jump to events.
- Add event timeline for kills, tower attacks, courier deaths, boss/rune events.

Why:
- Useful for tuning bots and reviewing whether UX feedback appears at the right moment.

Tradeoff:
- Not required for the playable core, so keep behind debug/dev UI.

Owner:
- Codex, with Opus if replay snapshots are needed.

Acceptance:
- Debug view can follow selected hero or event.
- Does not affect normal gameplay bundle unless enabled.

### P2-2. Onboarding And Control Presets

Progress 2026-06-20:
- The main menu now exposes a first-run control preset switch before entering a match. It reads/writes the shared `dotaForever.controlSettings.v1` settings key, so Modern / RTS Legacy selection is consistent with the in-game pause menu.
- `CONTROL_SETTINGS_STORAGE_KEY` now lives in `src/engine/controlSettings.ts` so the main menu and game entry share the same persistence contract.
- `buildOnboardingSections(...)` now includes an `经济与物流` section for shop, quickbuy queue, courier delivery, backpack no-stats behavior, and the 6-second backpack move delay.
- The map communication onboarding now teaches Alt-drag minimap drawing in addition to ping variants.
- Added `src/ui/tutorialCoachModel.ts` plus HUD wiring for a compact contextual `COACH` prompt. It surfaces one current actionable lesson at a time: item route, backpack delay, quickbuy ready, forest entrance, miss/evasion, high-ground, neutral camp, or river rune.
- Added hero-specific RTS Legacy ability aliases for the first classic hero set. `applyHeroLegacyAbilityHotkeys(...)` derives per-hero ability keys only while the saved preset infers `legacy`, HUD ability slots show the derived labels, and `InputManager` routes those physical keys through the normal ability slots without mutating saved user settings.
- Tests cover the expanded onboarding copy and the settings-aware RTS Legacy number-row explanation.
- Remaining work: a future playable tutorial route (`?mode=tutorial`) can build on this model once Opus finalizes objective/bot pacing.

What:
- Add a first-run control preset choice:
  - Modern MOBA: QWER, 1-6 items, F1/F2/F3 selection.
  - RTS classic: control groups on number row, alternative item keys.
- Add contextual onboarding gates for courier, backpack delay, quickbuy, control groups, and pings.

Why:
- The current UX is becoming powerful enough to need progressive teaching.

Tradeoff:
- Avoid modal tutorials during combat. Use subtle gates and menu reference.

Owner:
- Codex.

Acceptance:
- Preset switch changes labels and onboarding copy consistently.
- No command becomes unreachable after preset change.

## Execution Order

1. P0-4 Shared availability API, because it prevents UI/sim drift.
2. P0-5 Cast Preview V2, because it consumes the same reason metadata and improves every command.
3. P0-1 Subgroup/Tab/double-click, because multi-unit foundation already exists and needs the last Dota-like layer.
4. P0-2 Item Logistics Panel V2 and P0-3 Courier Control V2, preferably together because stash/courier/backpack are one user workflow.
5. P1-1 Communication Layer and P1-2 Modifier Icons/Disable Bar.
6. P1-3/P1-4/P1-5 polish passes.
7. P2 debug/onboarding once the core loops stabilize.

## Merge Notes For Opus

What:
- Codex should continue building pure UX models with tests first, then wire HUD/renderers.
- Opus should update shared reason/state APIs when sim semantics change.

Why:
- The project now has many read-only UI layers. The biggest risk is not missing UI, but UI lying about what the sim will do.

Tradeoff:
- We accept a staged UX backlog instead of one giant "make it Dota" patch. Each item above is independently testable.

Open Questions:
- Is the target still primarily DotA1/WC3 with selected Dota2 QoL, or should Dota2-specific layers like talents/status resistance become product requirements?
- Should `Tab` remain scoreboard-only, or become subgroup cycle with scoreboard moved to hold-Tab or another key?
- Should courier auto-delivery remain default, or should manual courier play become the default once UI is clear?
- How much item drag/drop and teammate item transfer fidelity do we want before calling item logistics complete?

Next Action:
- Start with P0-4 as the next Codex/Opus joint slice.
- Keep this document as the UX backlog source; keep `docs/2026-06-19-dota-fidelity-audit.md` as the sim-fidelity backlog source.
