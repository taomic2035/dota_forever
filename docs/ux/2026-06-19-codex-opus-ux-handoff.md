# Codex UX/UI Handoff for Opus

Date: 2026-06-19
Owner split: Codex owns UX/material/control polish; Opus owns mainline gameplay integration and deeper sim rules.

## Unified Merge Entry

Use this document as the short entry point for the combined Codex + Opus version. The long resource archive remains `docs/ux/2026-06-13-resource3d-opus-handoff.md`; this file is the practical merge checklist.

Next UX backlog source: `docs/ux/2026-06-19-real-dota-ux-audit-todo.md`.

Current combined snapshot:

- Treat this worktree as the current Codex UX merge candidate. It includes the recent hero/resource/terrain presentation work plus the latest HUD/control/shop availability polish.
- Codex-side changes are intended to be presentation-first and pure-model-first. The high-confidence merge set is `src/ui/*Model.ts`, `src/render/attackCommandWorldHint.ts`, `src/render3d/attackCommand3d.ts`, matching tests, and HUD/shop renderer consumption.
- Opus-side review is still required anywhere the UI touches authoritative gameplay truth: ability cast rejection, item transfer/backpack delay, shop purchase result, courier task state, autocast policy, and combat order semantics.
- The shared `availabilityModel` is now the preferred bridge for ability/item/shop visible readiness copy. It is not yet the final sim-wide rejection API, but it gives Opus a stable enum/copy contract to align against. Backpack move-delay is now explicitly marked in sim via `ItemInstance.backpackReadyUntil`, so tooltip, Alt-click item status, and command rejection all say backpack delay rather than generic cooldown.
- Command-card disabled states now also consume the shared availability copy for no selected commandable unit, no controlled group, unavailable courier, and Glyph cooldown. HUD no longer emits command-card click targets for disabled buttons.
- Target previews now carry shared cast availability for ready, walk-into-range, and invalid-target states, keeping cursor/preview copy aligned without changing cast legality.
- The new `itemLogisticsModel` is the preferred bridge for HUD item-lane readability: Hero inventory, Backpack, Stash, TP, and Courier are summarized in one read-only contract, with quickbuy-component, combine-ready, and live backpack-ready-delay slot highlights.
- `itemLogisticsModel.primaryAction` now exposes the next executable item logistics step: `Backpack -> Hero`, `Hero -> Backpack`, `Stash -> Hero`, or `Deliver stash`. HUD renders that label in the ITEMS strip and keeps the tooltip detail tied to existing click actions rather than inventing new sim movement.
- The new `shopPurchaseTraceModel` is the preferred bridge for "where did my purchase go" feedback. ShopPanel records recent direct, recipe, and quickbuy purchase attempts and renders their Hero / Backpack / Stash / blocked route without changing `buyItem(...)` semantics.
- `shopListModel` now also carries local search/highlight metadata: normalized query tokens, matched fields, relevance score, and buyable/blocked tone. ShopPanel renders those as search summary plus row-level `MATCH` / `BUY` / `LOCK` badges while stock/cooldown-specific state remains Opus-owned future data.
- The new `courierControlModel` is the preferred bridge for the courier command strip. It exposes Select and Deliver as currently wired actions, while Return, Stop, and Burst stay visible but disabled until Opus provides authoritative sim APIs.
- The new `courierRouteModel` is the preferred bridge for courier path readability. The 2D world renderer and minimap consume it to show allied delivery/return routes while keeping courier sim task ownership with Opus.
- The new `targetPreviewModel` is the preferred bridge for Cast Preview V2. Ability/item targeting now stores this shared model on `UxFeedback.targetPreview`; 2D and 3D renderers prefer it directly, while projected legacy `targeting` fields remain as fallback.
- `SelectionState` now has the core subgroup primitives for P0-1: `cyclePrimary()` and `selectSameType(...)`. Double-click same-type selection is wired through `InputManager` and `main.ts`; subgroup cycling is wired through the rebindable `cycleSubgroup` action, defaulting to `C`, while Tab remains scoreboard-owned until Opus/Codex choose a tap/hold policy.
- The new `modifierDisplayModel` is the preferred bridge for selected-unit modifier readability. It exposes compact buff/debuff/disable tokens and a longest-active-disable bar for HUD, inspect panel, 2D status pips, and 3D status FX consumption.
- The new `threatDirectionModel` is the preferred bridge for incoming damage direction. It keeps edge bucket, source/category, damage type, and decay logic in a pure UX model, then lets HUD render restrained screen-edge indicators.
- The new `shopRelatedItemsModel` is the preferred bridge for selected shop item planning. It exposes builds-from, builds-into, owned/missing/gated, duplicate component counts, and secret-shop gates without changing purchase semantics.
- The new `minimapDrawingModel` is the preferred bridge for minimap communication gestures. It keeps Alt short-click as ping and upgrades Alt+left-drag into a short-lived tactical drawing stroke without issuing camera or movement commands.
- The new `tacticalStatusBroadcastModel` is the preferred bridge for non-slot HUD communication labels: game clock, hero resources, Glyph, rune objective state, Boss objective state, and buyback status.
- The new `chatWheelModel` is the preferred bridge for the HUD chat wheel. The first pass exposes 8 default tactical calls and routes them through the same local status-broadcast path as other HUD pings. The `chatWheel` hotkey is now rebindable through `ControlSettings`, defaulting to `Y`.
- `ControlSettings.chatWheelPreset` now provides local chat-wheel content presets with `balanced`, `objective`, and `defensive`. `ControlSettings.chatWheelCustomLabels` persists eight optional local slot labels, HUD renders custom labels over the active preset, and the pause menu can edit each slot; network/replay delivery remains Opus-owned follow-up work.
- The new `teamCommunicationLogModel` is the preferred local bridge for status-broadcast/chat-wheel message retention. It keeps short-lived HUD entries with time/source/tone while Opus decides any shared team-chat, network, or replay event bus.
- `enemyHeroBarModel` now also carries fog-safe hero-chip broadcast labels for ally resources, ally TP/ultimate/buyback readiness, enemy visible/missing state, and public death/respawn state.
- The new `mapMechanicsModel` is the preferred bridge for making hidden map rules visible: neutral camp presence/next check, active river runes/next wave, hero height, nearby forest/tree-wall zones, evasion/uphill-miss/true-strike state, and a HUD map-mechanics radar for nearest camp/rune/high-ground/forest-pocket discovery.
- 2026-06-20 feedback follow-up: map mechanics now explicitly separates tree blockers from jungle entrance/shadow readability. Forest chips/radar say "树线/林影" instead of promising new passable pockets, spawned neutral camps use `ready` tone, and 3D terrain exposes `terrain-jungle-walkway-entrances` with floor/arch sublayers in addition to forest shadow pockets, high-ground miss cues, neutral camp beacons, and rune beacons.
- 2026-06-20 playtest follow-up for "树林/野怪/高地/miss/神符看不到": `GameMap` now exposes `forestPockets` and `highgroundPlateaus` as visual/discovery anchors; minimap landmarks show `F` forest pockets and `H` high-ground plateau markers; neutral camp UX shows explicit 0:30 first-spawn countdown; and 3D terrain adds `terrain-forest-walkable-pockets`, `terrain-forest-pocket-floor`, `terrain-forest-pocket-canopy-shadows`, and `terrain-highground-plateau-banners` without changing gameplay topology.
- 2026-06-20 Opus feedback response: active `world.runes` now use the shared `src/render/runeWorldMarker.ts` model and render as large colored 2D world markers plus 3D overlay beacons. This fixes the "runes exist in sim/minimap but are not visible in 3D gameplay" gap without changing rune spawn/pickup truth.
- 2026-06-20 Opus balance response: after Opus' second QA, Codex made authored `forestPockets`, jungle `highgroundPlateaus`, and extra high-ground ramps visual-only. They no longer carve walkable pockets or write `height=2`, and `tests/mapIntegrity.test.ts` guards that topology-sensitive behavior.
- The new `tutorialCoachModel` is the preferred bridge for contextual in-match teaching. HUD renders a compact `COACH` strip that promotes one current actionable lesson from item logistics, backpack delay, quickbuy readiness, forest entrances, miss/evasion, high-ground, neutral camps, or river runes. It is presentation-only and intentionally consumes existing UX models instead of redefining sim truth.
- `ControlSettings` now also owns persistent minimap display preferences: hero dots/icons/names, terrain/simple background, and left/right dock side. `MiniMap` consumes normalized settings from `main.ts`.
- The main menu now exposes the Modern / RTS Legacy control preset switch before match start, using the same persisted `ControlSettings` key as the in-game pause menu.
- `ControlSettings` now also exposes `applyHeroLegacyAbilityHotkeys(...)` and `abilityKeyLabels(...)` for hero-specific RTS Legacy ability aliases. `main.ts` derives an effective runtime setting from the saved preset plus current hero key, so HUD labels and `InputManager` aliases switch to the hero's legacy keys without writing those aliases back to local storage.
- The new `spectatorTimelineModel` is the preferred bridge for spectate/debug event review. It turns major world events into jumpable entries, includes a local capped jump-history log for clicked events, and HUD shows both only in `?mode=spectate` or `?debug=1`.
- The new `spectatorControlsModel` is the preferred bridge for spectate/debug controls. It exposes pause/resume, speed down/up, follow target, cycle follow target, and fog perspective cycling while staying hidden from normal play unless `?debug=1`.
- The new `orbPriorityModel` is the preferred bridge for read-only attack-modifier readability. HUD shows an `ORB` summary plus per-slot `MAIN` / `+ORB` / `OFF` badges from learned orb/autocast state without changing current combat hook execution.
- Do not treat a full-suite `npm test` as green from Codex's last pass; use the focused commands below plus `npm run build`, then let Opus re-run the broader suite after resolving/owning the known neutral-camp timeout.
- Treat `map.ts`/`mapLayout.ts` as balance-sensitive. Current Codex map additions are constrained to visual/discovery anchors; any future topology, tree, ramp, or `height=2` change needs Opus batchsim before mainline.

Suggested merge order:

1. Merge pure UX model/test files first. These are low-risk and expose expected text/state contracts.
2. Merge HUD wiring next. It consumes the pure models and should not change sim outcomes.
3. Merge crossover control/sim points after Opus reviews semantics: autocast gates, QWER/right-click toggles, backpack move-delay presentation, and shop/onboarding affordances.
4. Run focused UI tests, then build, then broader gameplay tests if Opus touched sim in the same integration branch.

## What

- Codex has been polishing the UX/resource layer: 3D model/readability metadata, terrain/resource presentation, HUD affordances, controls, shop/onboarding, ability/item slot states, and local status feedback.
- Recent UX-model files now centralize hover/status text instead of keeping rules inline in HUD:
  - `src/ui/abilityTooltipModel.ts`
  - `src/ui/availabilityModel.ts`
  - `src/ui/itemTooltipModel.ts`
  - `src/ui/itemLogisticsModel.ts`
  - `src/ui/shopPurchaseTraceModel.ts`
  - `src/ui/abilitySlotToggleModel.ts`
  - `src/ui/statusBroadcastModel.ts`
  - `src/ui/courierControlModel.ts`
  - `src/ui/shopReminderModel.ts`
  - `src/ui/shopRelatedItemsModel.ts`
  - `src/ui/combatCommandHintModel.ts`
  - `src/ui/fountainStatusModel.ts`
  - `src/ui/threatDirectionModel.ts`
  - `src/ui/minimapDrawingModel.ts`
  - `src/ui/tacticalStatusBroadcastModel.ts`
  - `src/ui/chatWheelModel.ts`
  - `src/ui/enemyHeroBarModel.ts`
  - `src/ui/tutorialCoachModel.ts`
  - `src/ui/orbPriorityModel.ts`
  - `src/render/runeWorldMarker.ts`
  - `src/render/attackCommandWorldHint.ts`
  - `src/render/courierRouteModel.ts`
  - `src/render3d/attackCommand3d.ts`
  - `src/engine/targetPreviewModel.ts`
  - `src/ui/modifierDisplayModel.ts`
  - `src/engine/selection.ts`
- Item tooltips now cover main inventory, TP empty slot, active/passive readiness, charges, and backpack constraints. Backpack slots explicitly say they provide no bonus and become ready 6 seconds after being moved into inventory.
- HUD item logistics now summarize Hero / Backpack / Stash / TP / Courier lanes near the inventory block. Quickbuy recipe components get a `Q` slot badge/glow; hero-ready components that can complete the current quickbuy recipe get a stronger `C` combine-ready badge/glow. Items moved from Backpack into main inventory now surface the remaining ready delay in the logistics strip and slot badge while `cooldownUntil` is still active.
- The same logistics strip now promotes one next action when no stronger combine/quickbuy/backpack-delay alert is active: move a backpack item into Hero, move a Hero item into Backpack, take stash at home, or dispatch courier for stash. This is UX guidance over existing commands, not a new item-transfer API.
- ShopPanel now has a recent purchase route trace. Direct buys, recipe component batch buys, and quickbuy completions record each attempted result as Hero / Backpack / Stash / Blocked with a compact next action, so the player can recover from missed toasts and understand where components landed.
- Ability/item tooltip, alt-click status copy, and shop destination/buy shortcut prompts now share `src/ui/availabilityModel.ts` for the first read-only availability reason contract. This is not yet the full sim-confirmation API; Opus still needs to migrate command rejection and deeper gameplay checks into a shared reason source.
- Command-card buttons now accept a lightweight context and expose shared availability reasons for disabled Move / Attack / Stop / Hold, Select Courier, Select All Controlled, and Glyph cooldown states. HUD passes current selected-commandable count, controlled-commandable count, courier life state, and Glyph cooldown into that model.
- Shop reminders now consolidate quickbuy readiness, stash retrieval, courier delivery availability, buyable recipe components, next missing component, direct purchase, and blocked-shop reasons into a compact top-of-shop prompt. This is presentation only; `buyItem(...)`, recipe combine rules, shop range, stash rules, and courier dispatch/respawn remain authoritative in sim.
- Courier HUD now includes a compact command strip. `F2` Select and `D` Deliver reuse existing control paths; `R` Return, `S` Stop, and `B` Burst are disabled placeholders with pending-sim tooltips for Opus integration.
- Courier HUD and item logistics now show an estimated ETA while the courier is moving to deliver stash or return to fountain. The estimate is presentation-only from current distance/move speed until Opus exposes authoritative courier task target/cargo state.
- Courier path readability now uses `src/render/courierRouteModel.ts`. The 2D world layer draws dashed delivery/return arrows, and the minimap draws matching compact route lines before courier markers so courier movement intent is visible without opening debug views.
- Combat command hints now surface the selected controllable unit's current attack target, attack-move destination, hold/stop state, and idle auto-attack policy. This reads `Unit.order`, `attackTargetId`, and `autoAttack`; it does not issue orders or alter combat acquisition.
- Fountain status now appears in the HUD as a compact read-only prompt for allied fountain regen, stash pickup/shopping at base, low-resource return-to-fountain nudges, and enemy fountain danger. This reads current hero resources, stash count, and distance to fountain buildings; fountain regen/damage remains owned by `buildingsSystem`.
- 2D and 3D world-space command cues now draw selected-unit attack target locks, auto-acquired target rings, and attack-move destination reticles from the shared `src/render/attackCommandWorldHint.ts` contract. The 3D adapter in `src/render3d/attackCommand3d.ts` keeps terrain elevation, line glow, target rings, and crosshair visibility in sync with the same model state.
- Cast previews now build `src/engine/targetPreviewModel.ts` for ability and active-item targeting. It carries shape, range ring, cast status, approach line, action hint, and reject reason; current 2D/3D renderers prefer `UxFeedback.targetPreview` and keep projected legacy `UxFeedback.targeting` fields only as fallback.
- `TargetPreviewModel` now also carries the shared `AvailabilityModel` for cast readiness. `ready`, `walk`, and `invalid` preview states are mapped through `buildCastAvailability(...)`, so cursor hints and preview rejection copy can stay aligned as Opus tightens sim legality.
- Selection state now supports cycling the active primary command subject inside a multi-selection and selecting same-type visible owned units. Double-click left-click now triggers same-type selection for visible commandable matches; a rebindable `cycleSubgroup` key defaults to `C`, while Tab subgroup cycling still needs a scoreboard policy decision.
- The HUD selection summary now names the current primary command subject and the subgroup-cycle hotkey, so selected summons/illusions/courier groups show which unit will receive primary ability/item commands.
- Modifier readability now has a Dota-like display model. The bottom HUD and inspect panel show the longest active disable as a timed bar, plus compact modifier tokens with color, tooltip, and remaining time. The 2D overhead pips and 3D status FX now derive their control/invisibility semantics from the same model. The current implementation reads existing `ModifierDef.states` and selected key-name patterns for hex/sleep/cyclone/taunt-like cases; Opus should replace those heuristics with explicit state fields if the sim adds them.
- Incoming damage now has directional feedback. Player-hero `unit_damaged` events feed a `ThreatDirectionLog`; HUD renders short-decay edge indicators for top/right/bottom/left threats while reusing the same source names/colors and damage-type categories as the incoming damage feed/death recap. Death recap rows also carry visible-source context: visible sources get a `定位` action that centers camera and pings the last visible position, while hidden sources show `迷雾` without coordinates.
- Shop UX now has a selected-item related graph and queued quickbuy. `ShopPanel` tracks the current hover/recent item and shows a compact builds-from/builds-into plan with owned, missing, duplicate-count, and secret-shop-gated chips. Shift-click replaces the quickbuy queue, Ctrl+Shift-click appends/reorders an item at the end, and existing click-to-buy behavior is unchanged.
- Shop search now explains local matches. Search rows expose why they matched (`key/name/description/category`), whether they are currently buyable or blocked, and a relevance score that ranks key/name/category matches above description-only hits. This is UX metadata only; future stock/cooldown badges should wait for Opus to expose authoritative stock data.
- Minimap communication now supports Dota-like ping/draw disambiguation. Alt short-click uses the existing ping/audio/world-pulse path; Alt+left-drag draws a fading tactical stroke on the minimap canvas. This is local presentation only and does not change command, camera, or movement semantics.
- HUD tactical communication now covers more Dota-like Alt-click status targets. Game time, rune objective state, Glyph, Boss objective state, gold/buyback state, health/mana bars, top-bar hero chips, ability slots, and item slots all route through the existing `onStatusBroadcast` message path; non-slot labels live in `tacticalStatusBroadcastModel`, and hero-chip labels live with `enemyHeroBarModel` so fog privacy stays close to the top-bar state model. Ally hero-chip broadcasts now include TP scroll count, ultimate ready/cooldown state, and buyback ready/short-gold/cooldown state when available. A compact HUD `CHAT` panel exposes 8 default chat-wheel calls through the same local broadcast path, opens from the rebindable `chatWheel` hotkey, and the local `TEAM` log keeps recent broadcasts visible for a short TTL.
- HUD map-mechanics chips now make previously invisible rules explicit: visible neutral camps and next neutral check, active river rune count and next wave, current river/flat/high-ground state, nearby tree-wall/forest-shadow zones, and current evasion/uphill miss or true-strike state. A separate centered `MAP` radar row points to the nearest neutral camp, river rune point/active rune, high-ground/ramp area, and forest-shadow pocket so the player can actually go find them.
- Map structure now contains Codex-authored visual UX anchors for those chips: `GameMap.forestPockets` mark tree-adjacent shadow/readability areas without carving, and `GameMap.highgroundPlateaus` mark jungle high-ground-looking locations without writing `height=2`. Opus should review any future coordinate/radius change as balance-sensitive.
- After Opus reported high-ground/forest topology was hurting batchsim, Codex stopped authored jungle plateaus from affecting sim height and stopped forest pockets/high-ground ramps from carving new topology. `tests/mapIntegrity.test.ts` now guards both constraints.
- HUD now also has a compact contextual `COACH` strip. It turns the same map mechanics and item logistics contracts into one current teaching prompt, so players see forest shadow/tree-line, "野怪营已刷新", "MISS 不是 bug", "高地影响视野", "河道神符可控", or an item/courier action when that is the highest-value next lesson.
- Minimap camp/rune marks are now larger and labeled (`S/M/L/A/R`), while active runes render as brighter typed markers, so neutral camps and river runes are discoverable before the player walks over them.
- Active spawned river runes now also render in the main 2D world and 3D overlay from `runeWorldMarker`. The marker carries rune type, glyph, Chinese label, color/glow, world radius, and 3D beacon height, so future renderer polish can reuse one contract.
- Minimap map-knowledge landmarks now also label forest pockets (`F`) and jungle high ground (`H`), sourced from `landmarkVisuals(map)` rather than hardcoded minimap coordinates.
- 2D terrain readability now marks walkable forest-shadow pockets beside tree walls and stronger low/high-ground vision-break hatching, so forests and cliffs are visible as gameplay zones in the world view.
- 3D terrain now includes named mechanic-readability layers for direct gameplay preview: `terrain-forest-shadow-pockets`, `terrain-cliff-vision-break-cues`, `terrain-neutral-camp-beacons`, and `terrain-rune-beacons`. These layers now also expose runtime pulse contracts (`forest-breathe`, `highground-miss-pulse`, `camp-pulse`, `rune-pulse`) through `updateTerrainRuntimeMotion(...)`, so Opus can inspect both presence and motion while wiring exact sim truth.
- 3D terrain also includes `terrain-jungle-walkway-entrances`, `terrain-jungle-entrance-floor`, and `terrain-jungle-entrance-arches`. These are generated from walkable cells beside tree walls, so they mark intended forest entrances without changing tree blockers into passable terrain.
- 3D terrain now additionally includes `terrain-forest-walkable-pockets`, `terrain-forest-pocket-floor`, `terrain-forest-pocket-canopy-shadows`, and `terrain-highground-plateau-banners`. These are generated from `GameMap.forestPockets` and `GameMap.highgroundPlateaus`, so authored map mechanics can be inspected directly in the scene graph.
- Minimap display settings are now in the pause menu and local control settings. Players can switch hero markers between colored dots, glyph icons, and short name labels; switch the terrain thumbnail to a high-contrast simple background; and dock the minimap on the left or right.
- Onboarding now has an explicit economy/logistics section for shop, quickbuy queue, courier delivery, backpack no-stats behavior, and the 6-second backpack move delay. It also teaches Alt-drag minimap drawing. The main menu preset switch lets first-run players choose Modern or RTS Legacy before starting.
- RTS Legacy controls now have a first-pass hero-specific skill alias layer for the initial classic hero set. The saved preset still stores the normal QWER bind table; `main.ts` applies the hero alias only for runtime input/HUD display, and modern mode remains QWER.
- Autocast/toggle UX is partially integrated: QWER/right-click can switch learned passive autocast/toggle abilities; HUD badges and alt-click status use the same state.
- Attack-modifier readability now has a first-pass single-orb priority preview. `src/ui/orbPriorityModel.ts` scans learned orb abilities and current autocast state, HUD shows the primary `MAIN` modifier, competing `+ORB` modifiers, and disabled `OFF` autocast modifiers. This is visual guidance only; Opus still owns true single-orb resolution and manual orb-cast orders.

## Why

- Opus is moving core logic in parallel, so UX copy, badge state, and control hints need stable pure-model seams that can be updated alongside sim changes.
- Dota-like combat requires fast scanning under pressure. Cooldown, mana, passive, autocast, charge, backpack, and move-delay states must be visible without opening extra panels.
- Keeping user-facing text in model tests makes future mainline changes safer: if Opus changes ability or item availability semantics, the matching UX expectations fail close to the interface.

## Tradeoff

- Codex did not expand deeper gameplay semantics in this pass beyond existing crossover points. Single-orb priority now has a read-only HUD preview, but default autocast policy, true attack-modifier exclusivity, manual orb-cast orders, item transfer edge cases, and exact cost/refund timing remain Opus-owned.
- Tooltip models use lightweight browser `title` strings for now, because they are low-risk and already fit current HUD architecture. A richer custom tooltip component can replace the rendering later while preserving the same model functions.
- Shop reminder priority is deliberately heuristic: quickbuy > courier/stash path > stash self-pickup > batch recipe components > next component > direct/blocked purchase. It avoids auto-buying or changing item route decisions, so Opus can still adjust economy and courier rules underneath.
- Courier controls deliberately do not fake unsupported commands. Return/Stop/Burst are visible to reserve the Dota-like control surface, but remain disabled until sim APIs exist.
- Courier route lines intentionally read the current courier `move` order and team stash count rather than inventing new task state. Enemy routes are not shown to a normal team viewer; spectator view may show all teams.
- Combat command hints intentionally stay read-only and compact; richer target portraits or ETA/path previews should reuse the same model rather than reading `Unit.order` directly from HUD markup.
- Fountain UX is intentionally distance/resource based rather than reading hidden regen ticks. It may show a return nudge when the hero is low, but it does not issue TP, move, or courier commands.
- World-space attack cues intentionally do not infer legality, range, or pathing; they visualize the order/target state that sim already owns.
- The 3D adapter keeps visuals as an overlay layer and does not create new combat state. It accepts a terrain elevation callback so Opus can keep renderer placement compatible with future map-height changes.
- The backpack tooltip and logistics strip say "move into inventory, ready after 6 seconds" while enforcement remains in sim/items flow. Current sim sets `ItemInstance.backpackReadyUntil` when an item moves from backpack to main inventory; HUD derives the live backpack-delay countdown from that marker instead of guessing from generic cooldown duration.
- Item logistics intentionally treat courier cargo as a presentation slot shape only. Current sim delivers from hero stash rather than an explicit courier inventory, so Opus should wire real courier cargo/ETA into `itemLogisticsModel` only after courier task state becomes authoritative.
- Purchase route trace intentionally mirrors `buyItem(...)` results. It does not infer hidden combine/transfers, refund, disassemble, teammate transfer, or ground-drop semantics; Opus can extend the event source if those flows become first-class.
- Courier ETA intentionally remains an estimate. It should be replaced by Opus-owned task target/path ETA if the courier sim later exposes those fields.
- TargetPreview V2 is now the primary renderer input through `UxFeedback.targetPreview`. It still preserves cone/vector as model-level extension points, but most ability/item metadata maps to point/unit/area/line. Pathability remains a future Opus-owned legality input.
- Subgroup cycling is enabled through the rebindable `cycleSubgroup` action, defaulting to `C`. Current Tab behavior still opens scoreboard, so Opus/Codex can later choose hold-Tab scoreboard vs tap-Tab subgroup without breaking this interim binding.
- Modifier display intentionally stays read-only. It does not alter modifier duration, purge logic, immunity, channel interruption, or combat control semantics.
- Threat direction intentionally stays read-only and event-driven. It does not infer hidden attackers beyond existing damage events, and it should not reveal enemy state that the current combat event did not already expose.
- Shop related-items planning is presentation-only. It uses item definitions and current hero inventory/backpack/stash/TP ownership; actual buy, combine, shop-range, and stash behavior still comes from sim/items.
- Minimap drawing is intentionally local and short-lived. It reuses ping colors for communication tone, but does not create replay/team-chat state or persistent tactical annotations yet. Minimap display settings are local UI preferences and do not affect vision or fog rules.
- Tactical status broadcasts and chat-wheel calls are local HUD messages for now. They create only a local short-lived `TEAM` HUD log; they do not create a networking event or replay marker until Opus defines a shared communication/event bus. Enemy hero-chip broadcasts intentionally say missing/迷雾 unless the hero is visible, and do not expose hidden HP/MP.
- Forest UX currently reads authored forest-pocket anchors and tree-wall proximity rather than exact tree-shadow fog state. Trees are blockers with existing carved jungle paths; `GameMap.forestPockets` no longer carves new passable regions. Opus needs to decide whether to add true tree-shadow / juking / tree-cutting vision rules before Codex can make the chip exact.
- The new forest-shadow and cliff-hatching visuals are presentation only. They do not alter pathing, current vision grids, or low-to-high miss calculations.
- The 3D map-mechanic beacons and HUD map-mechanics radar are also presentation-first. Neutral camp beacons cover current `GameMap.camps`, rune beacons cover `GameMap.runeSpots`, forest pocket layers cover `GameMap.forestPockets`, high-ground plateau banners cover `GameMap.highgroundPlateaus`, and radar distances are player-position estimates; they do not spawn neutrals, runes, fog, or miss events.
- Active rune world markers intentionally read `world.runes` directly and are presentation-only. They should stay visually obvious until Opus decides whether active rune visibility should be fog-gated, team-gated, or always exposed as a tutorial/readability affordance.
- The map-integrity guard prevents Codex-authored visual anchors from changing sim height or carving large new forest pockets. The latest batchsim restored 8/8 decisive outcomes, but Vitest still emitted an `onTaskUpdate` RPC timeout after all tests passed, so Opus should still re-run in the integration tree.
- Spectator timeline is read-only and debug-gated. It consumes the current tick's world events and stored UI log entries, then centers camera/pings when clicked; it does not create replay snapshots, alter fog, or issue commands.
- Orb priority is read-only and intentionally follows the current learned/autocast UI state. It does not change `attackHitHooks`, damage application, proc ordering, mana consumption, or cooldown semantics; Opus should replace the preview's ordering source if the sim later exposes authoritative attack-modifier priority.
- Hero-specific RTS Legacy aliases are intentionally a presentation/input adapter over the existing QWER ability slots. They do not change ability order, cast legality, replay command semantics, saved user keybinds, or AI casting; Opus can later expand the preset table or replace it with authored hero metadata.

## Open Questions

- Should autocast abilities default on/off per hero, and should only one attack modifier be active at a time?
- Should manual orb-cast consume mana/cooldown differently from regular auto attacks?
- Should backpack move delay be surfaced as a live countdown after transfer, or is the static tooltip enough for this phase?
- Should Opus expose a single shared availability API for abilities/items so HUD, command card, and sim all read the same reason codes?
- Should shop reminders eventually include measured courier travel ETA and fountain/stash pickup ETA, or remain scoped to current courier status?
- Should fountain status include exact regen-per-second and bottle-refill state, or stay as a lightweight resource/stash/danger prompt?
- Should command hints later show attack range/target HP deltas, or should those remain in world-space selection rings and health bars?
- Should future command cues include range/path legality once Opus finalizes any order-state naming or pathing APIs?
- Should Opus add explicit modifier state flags for `hexed`, `sleeping`, `cycloned`, and `taunted`, or keep Codex-side display recognition based on current modifier keys/state combinations?
- Should death recap rows eventually offer a "center last known source" or "ping threat source" action, and what fog/privacy rules should apply?
- Should quickbuy queue eventually support drag/reorder/remove-one controls, or is append/reorder-on-append enough for this phase?
- Should objective icons eventually show rune/camp/boss respawn or contested state once Opus exposes that timing/state, or remain as static map knowledge plus visible unit/rune markers?
- Should tree cells remain hard blockers with carved paths, or should Opus add tree-shadow / tree-cutting / juke-vision semantics so forest fog can be represented exactly?
- Should active rune markers be fog-gated in normal play, or stay always visible as a readability/tutorial affordance until the map is easier to learn?
- Should visual high-ground/forest anchors stay as non-topology markers until bot AI is improved, or should Opus later open a larger map-topology feature with batchsim gates?
- Should top-bar hero pings use visible-only enemy state, last-seen state, or explicit player-declared missing/returned calls when Opus finalizes fog privacy rules?
- Should a later phase add a playable `?mode=tutorial` route, or keep onboarding as a compact first-run panel plus pause-menu reference?

## Next Action

- Opus: when touching ability/item availability, update the pure UX models and tests in the same change.
- Opus: review these cross-over files first:
  - `src/sim/abilities.ts`
  - `src/main.ts`
  - `src/ui/hud.ts`
  - `src/ui/abilityTooltipModel.ts`
  - `src/ui/availabilityModel.ts`
  - `src/ui/itemTooltipModel.ts`
  - `src/ui/itemLogisticsModel.ts`
  - `src/ui/combatCommandHintModel.ts`
  - `src/ui/fountainStatusModel.ts`
  - `src/ui/courierControlModel.ts`
  - `src/ui/shopRelatedItemsModel.ts`
  - `src/ui/shopPurchaseTraceModel.ts`
  - `src/ui/threatDirectionModel.ts`
  - `src/ui/minimapDrawingModel.ts`
  - `src/ui/tacticalStatusBroadcastModel.ts`
  - `src/ui/chatWheelModel.ts`
  - `src/ui/mapMechanicsModel.ts`
  - `src/ui/modifierDisplayModel.ts`
  - `src/ui/orbPriorityModel.ts`
  - `src/ui/shopReminderModel.ts`
  - `src/ui/statusBroadcastModel.ts`
  - `src/render/attackCommandWorldHint.ts`
  - `src/render/courierRouteModel.ts`
  - `src/render3d/attackCommand3d.ts`
  - `src/engine/targetPreviewModel.ts`
  - `src/engine/selection.ts`
- Codex follow-up candidates: custom tooltip panel and broader sim-confirmation reason parity after Opus finalizes command rejection APIs.
- Codex/Opus immediate handoff: current `mapLayout.ts` additions are visual-only and no longer write topology. Pull `runeWorldMarker`/2D/3D rune visibility and visual anchors together if useful, then re-run batchsim in Opus' integration tree because this area is still balance-sensitive.

## Merge Checklist

- [ ] Ability/item tooltip tests pass after Opus sim changes.
- [x] Subgroup cycle input binding is wired through rebindable `cycleSubgroup` default `C`; final Tab/scoreboard policy remains open.
- [x] Double-click same-type selection is wired for visible owned commandable units.
- [ ] Availability reason model stays aligned with Opus final command rejection reason codes.
- [x] Backpack move-delay has a dedicated sim/UI reason marker (`backpack-delay` / `backpackDelay`) instead of being presented as generic cooldown.
- [x] Command-card disabled states consume shared availability reasons and do not emit unavailable command click targets.
- [ ] HUD still displays cooldown/mana/ready/passive/toggle/autocast/charge/backpack states.
- [ ] QWER/right-click toggle behavior matches Opus final autocast policy.
- [x] HUD shows a read-only attack-modifier priority preview with `MAIN` / `+ORB` / `OFF` badges; final combat semantics remain Opus-owned.
- [x] Backpack move delay remains enforced in sim and is presented as a live UX countdown when visible.
- [x] Item logistics strip suggests the next executable route action for Hero / Backpack / Stash / Courier recovery.
- [ ] Item logistics lane/cargo summary matches Opus final inventory, stash, backpack, TP, and courier transfer semantics.
- [x] Shop purchase route trace shows recent Hero / Backpack / Stash / blocked outcomes.
- [ ] Courier command strip enables Return/Stop/Burst only after Opus provides authoritative sim APIs.
- [x] Courier delivery/return surfaces an estimated ETA in HUD/logistics while moving.
- [x] Courier delivery/return route is visible in 2D world and minimap layers.
- [ ] Shop reminder priority still matches Opus final buy/courier/stash/fountain flow.
- [x] Selected shop item related graph shows builds-from/builds-into owned/missing/gated state.
- [x] Quickbuy supports append/queue instead of only replacing the current target.
- [x] Shop search rows expose matched fields, relevance, and buyable/blocked highlight tone.
- [ ] Fountain status remains read-only and matches Opus final fountain aura/range semantics.
- [ ] Combat command hint labels still match Opus final order/auto-attack semantics.
- [ ] 2D/3D command cue parity still holds after Opus finalizes combat order naming/pathing.
- [x] 2D/3D targeting preview renderers now prefer `TargetPreviewModel`; projected legacy fields remain as fallback.
- [x] Target preview ready/walk/invalid states expose shared cast availability copy.
- [x] Selected-unit disable bar and modifier tokens render from a pure UI model in HUD and inspect panel.
- [x] 2D status pips and 3D status FX consume the same modifier display contract.
- [x] Incoming damage edge indicators render from a pure threat direction model.
- [x] Death recap rows can link back to visible world/teamfight context without leaking fog information.
- [x] Game clock, rune/Boss objective chips, Glyph, resource bars, gold/buyback, top-bar hero chips, ability slots, and item slots can produce local Alt-click status broadcasts.
- [x] Top-bar enemy missing/returned and ally TP/ultimate/buyback readiness broadcasts are wired without leaking hidden enemy state or enemy economic state.
- [x] Basic 8-call HUD chat wheel is wired to local status broadcasts.
- [x] Chat wheel has a persisted rebindable hotkey (`chatWheel`, default `Y`).
- [x] Chat wheel has local content presets (`balanced` / `objective` / `defensive`) persisted through `ControlSettings` and switchable in the pause menu.
- [x] Chat wheel has local free-form slot labels persisted through `ControlSettings.chatWheelCustomLabels` and editable from the pause menu.
- [x] Local HUD team communication log captures Alt-click status broadcasts and chat-wheel calls.
- [ ] Network/replay event integration for chat-wheel/status-broadcast history is still pending.
- [x] Minimap Alt short-click vs Alt-drag communication is covered by a pure model and wired to the minimap canvas.
- [x] Neutral camps, river runes, high-ground state, forest proximity, and miss/evasion are surfaced through HUD map-mechanics chips.
- [x] HUD map-mechanics radar points players toward the nearest camp, rune, high-ground/ramp, and forest-shadow pocket with spawn/miss context.
- [x] HUD contextual COACH prompt turns item logistics and map-mechanics state into one current actionable lesson.
- [x] Minimap camp/rune markers are larger and labeled for discoverability.
- [x] Minimap forest pocket and high-ground plateau landmarks are labeled from shared `landmarkVisuals`.
- [x] `GameMap` includes authored walkable forest pockets and base-external jungle high-ground plateaus.
- [x] 2D terrain bake shows forest-shadow pockets and high/low-ground vision-break hatching.
- [x] 3D terrain exposes forest-shadow pockets, high-ground vision-break cues, neutral camp beacons, and river rune beacons as named layers.
- [x] 3D terrain exposes walkable jungle entrance floor/arch layers so tree-line paths are visually enterable without making tree blockers passable.
- [x] 3D terrain exposes authored forest pocket floor/canopy-shadow layers and jungle high-ground plateau banners.
- [x] Active spawned river runes render in 2D world and 3D overlay from a shared marker model.
- [x] Added map-integrity guards keeping authored forest/high-ground anchors visual-only: no new carved forest clearings, no authored jungle `height=2`, and no key lane/building attack-axis overlap.
- [x] Batchsim decisive-health metric recovered locally after removing topology writes: 8/8 decisive, average 61min, max 85min. Note: the command still exited nonzero because Vitest reported an `onTaskUpdate` RPC timeout after tests passed, so Opus should re-run.
- [ ] Tree-shadow / forest fog chip is still approximate until Opus defines exact tree vision semantics.
- [x] Minimap hero icon/name, simple background, and side placement settings persist through `ControlSettings` and the pause menu.
- [x] First-run control preset choice is available from the main menu and uses the same saved settings as in-game controls.
- [x] RTS Legacy can derive hero-specific ability aliases for the initial classic hero set without mutating saved keybinds.
- [x] Onboarding covers quickbuy, courier, backpack delay, control groups, and ping/minimap drawing.
- [x] Spectate/debug event timeline exists for hero kills, structures, courier deaths, Boss, runes, and game-over, with click-to-center local ping.
- [x] Spectate/debug control strip exposes pause/resume, speed down/up, follow target cycling, and fog perspective switching using existing loop/camera/renderer state.
- [x] Local spectator jump history records clicked events and can recenter on recent focuses.
- [ ] Durable replay snapshots / persisted replay history are still pending.
- [x] No temporary preview media is left in the repo root.

## Verification Notes

- Focused tooltip check: `npm test -- tests/itemTooltipModel.test.ts`
- Focused item logistics check: `npm test -- tests/itemLogisticsModel.test.ts tests/quickbuyModel.test.ts tests/itemTooltipModel.test.ts tests/shopRecipeModel.test.ts tests/shopOwnershipModel.test.ts tests/shopQuickActionModel.test.ts tests/shopReminderModel.test.ts tests/backpack.test.ts`
- Focused courier control check: `npm test -- tests/courierControlModel.test.ts tests/courierHudModel.test.ts tests/minimapCourierMarker.test.ts tests/shopReminderModel.test.ts tests/itemLogisticsModel.test.ts tests/courier.test.ts`
- Focused courier route check: `npm test -- tests/courierRouteModel.test.ts tests/minimapCourierMarker.test.ts tests/courierHudModel.test.ts tests/courierControlModel.test.ts tests/itemLogisticsModel.test.ts`
- Focused availability check: `npm test -- tests/availabilityModel.test.ts tests/abilityTooltipModel.test.ts tests/itemTooltipModel.test.ts tests/statusBroadcastModel.test.ts`
- Focused command-card availability check: `npm test -- tests/commandCard.test.ts tests/availabilityModel.test.ts tests/inputSelectionHotkeys.test.ts tests/controlSettings.test.ts`
- Focused cast availability check: `npm test -- tests/targetPreviewModel.test.ts tests/availabilityModel.test.ts tests/castValidity.test.ts tests/cursorTargetHint.test.ts`
- Focused shop availability check: `npm test -- tests/availabilityModel.test.ts tests/shopDestinationModel.test.ts tests/shopQuickActionModel.test.ts tests/shopReminderModel.test.ts`
- Focused shop reminder check: `npm test -- tests/shopReminderModel.test.ts tests/shopQuickActionModel.test.ts tests/shopRecipeModel.test.ts tests/shopDestinationModel.test.ts tests/shopListModel.test.ts tests/items.test.ts tests/recipes.test.ts`
- Focused shop related-items check: `npm test -- tests/shopRelatedItemsModel.test.ts tests/shopRecipeModel.test.ts tests/shopQuickActionModel.test.ts tests/shopListModel.test.ts tests/shopDestinationModel.test.ts tests/shopReminderModel.test.ts tests/quickbuyModel.test.ts`
- Focused shop queue check: `npm test -- tests/quickbuyModel.test.ts tests/shopReminderModel.test.ts tests/shopRelatedItemsModel.test.ts tests/shopRecipeModel.test.ts tests/shopQuickActionModel.test.ts tests/shopListModel.test.ts tests/shopDestinationModel.test.ts tests/itemLogisticsModel.test.ts`
- Focused shop purchase trace check: `npm test -- tests/shopPurchaseTraceModel.test.ts tests/shopReminderModel.test.ts tests/shopQuickActionModel.test.ts tests/shopDestinationModel.test.ts tests/itemLogisticsModel.test.ts tests/quickbuyModel.test.ts`
- Focused shop search/highlight check: `npm test -- tests/shopListModel.test.ts tests/shopReminderModel.test.ts tests/shopRelatedItemsModel.test.ts tests/shopRecipeModel.test.ts tests/shopQuickActionModel.test.ts tests/shopDestinationModel.test.ts`
- Focused orb priority check: `npm test -- tests/orbPriorityModel.test.ts tests/abilitySlotBadgeModel.test.ts tests/abilitySlotToggleModel.test.ts tests/abilityTooltipModel.test.ts tests/statusBroadcastModel.test.ts tests/autocastDefault.test.ts`
- Focused fountain status check: `npm test -- tests/fountainStatusModel.test.ts tests/courierHudModel.test.ts tests/shopReminderModel.test.ts`
- Focused command hint check: `npm test -- tests/combatCommandHintModel.test.ts tests/autoAttack.test.ts tests/commandCard.test.ts tests/commandMode.test.ts tests/selectionCommandRouting.test.ts`
- Focused world command cue check: `npm test -- tests/attackCommandWorldHint.test.ts tests/commandQueuePath.test.ts tests/autoAttack.test.ts`
- Focused 3D command cue check: `npm test -- tests/render3d/attackCommand3d.test.ts tests/attackCommandWorldHint.test.ts tests/render3d/commandQueue3d.test.ts tests/render3d/selection3d.test.ts tests/render3d/renderer3dReadability.test.ts tests/autoAttack.test.ts`
- Focused target preview check: `npm test -- tests/targetPreviewModel.test.ts tests/abilityPreviewShape.test.ts tests/abilityShapeData.test.ts tests/castValidity.test.ts tests/cursorTargetHint.test.ts tests/uxFeedback.test.ts tests/commandMode.test.ts tests/commandCursorTheme.test.ts`
- Focused selection subgroup check: `npm test -- tests/selection.test.ts tests/selectionCommandRouting.test.ts tests/inputSelectionHotkeys.test.ts tests/commandCard.test.ts tests/uxFeedback.test.ts tests/inspectPanelModel.test.ts tests/render3d/selection3d.test.ts`
- Focused modifier display check: `npm test -- tests/modifierDisplayModel.test.ts tests/statusChips.test.ts tests/statusPips.test.ts tests/render3d/statusFx.test.ts`
- Focused threat direction check: `npm test -- tests/threatDirectionModel.test.ts tests/deathRecapModel.test.ts tests/buildingAttackAlertModel.test.ts`
- Focused tactical communication check: `npm test -- tests/enemyHeroBarModel.test.ts tests/tacticalStatusBroadcastModel.test.ts tests/statusBroadcastModel.test.ts`
- Focused chat wheel check: `npm test -- tests/chatWheelModel.test.ts tests/controlSettings.test.ts tests/inputSelectionHotkeys.test.ts tests/tacticalStatusBroadcastModel.test.ts tests/statusBroadcastModel.test.ts tests/enemyHeroBarModel.test.ts`
- Focused minimap communication check: `npm test -- tests/minimapDrawingModel.test.ts tests/mapPingModel.test.ts tests/minimapClickGuard.test.ts`
- Focused map mechanics readability check: `npm test -- tests/minimapDrawingModel.test.ts tests/mapPingModel.test.ts tests/minimapClickGuard.test.ts tests/mapMechanicsModel.test.ts tests/mapReadability.test.ts tests/mapIntegrity.test.ts tests/render3d/terrainDressing.test.ts`
- 2026-06-20 map mechanics playtest feedback check: `npm test -- tests/mapReadability.test.ts tests/mapIntegrity.test.ts tests/mapMechanicsModel.test.ts tests/render3d/terrainDressing.test.ts` passed: 4 files, 35 tests.
- 2026-06-20 Opus feedback rune/high-ground guard check: `npm test -- tests/mapIntegrity.test.ts tests/runeWorldMarker.test.ts` passed: 2 files, 9 tests. This covers visual-only forest/high-ground topology guards and the shared active-rune marker model.
- 2026-06-20 Opus feedback related map/rune regression check: `npm test -- tests/mapReadability.test.ts tests/mapMechanicsModel.test.ts tests/render3d/terrainDressing.test.ts tests/runes.test.ts tests/minimapCourierMarker.test.ts tests/runeWorldMarker.test.ts tests/mapIntegrity.test.ts` passed: 7 files, 49 tests.
- 2026-06-20 Opus second-QA map-topology check: `npm run batchsim` restored the decisive-health metric after Codex made forest pockets/high-ground anchors visual-only. Aggregate: Dawn 3 / Night 5, decisive 8/8, average 61min, max 85min; seed 11 ended at 50min and seed 8088 ended at 67min. The process still exited nonzero because Vitest emitted an `onTaskUpdate` RPC timeout after all 8 tests passed, so Opus should re-run in the integration tree before treating this as the final merge gate.
- Focused tutorial coach check: `npm test -- tests/tutorialCoachModel.test.ts tests/mapMechanicsModel.test.ts tests/itemLogisticsModel.test.ts tests/courierHudModel.test.ts tests/onboardingModel.test.ts`
- Focused minimap settings check: `npm test -- tests/controlSettings.test.ts`
- Focused onboarding/presets check: `npm test -- tests/onboardingModel.test.ts tests/controlSettings.test.ts tests/controlKeyBinds.test.ts tests/commandCard.test.ts`
- Focused hero legacy hotkey check: `npm test -- tests/controlKeyBinds.test.ts tests/inputSelectionHotkeys.test.ts tests/controlSettings.test.ts tests/onboardingModel.test.ts tests/abilityTooltipModel.test.ts tests/statusBroadcastModel.test.ts`
- 2026-06-20 tactical communication increment check: `npm test -- tests/enemyHeroBarModel.test.ts tests/tacticalStatusBroadcastModel.test.ts tests/statusBroadcastModel.test.ts` passed: 3 files, 18 tests. `npm run build` passed after top-bar hero-chip broadcast wiring, with the existing Vite large chunk warning.
- 2026-06-20 ally TP/ultimate broadcast increment check: `npm test -- tests/enemyHeroBarModel.test.ts tests/tacticalStatusBroadcastModel.test.ts tests/statusBroadcastModel.test.ts` passed: 3 files, 19 tests. `npm run build` passed after HUD top-bar ally TP/ultimate input wiring, with the existing Vite large chunk warning.
- 2026-06-20 ally buyback broadcast increment check: `npm test -- tests/enemyHeroBarModel.test.ts tests/tacticalStatusBroadcastModel.test.ts tests/statusBroadcastModel.test.ts tests/teamCommunicationLogModel.test.ts` passed: 4 files, 26 tests. `npm run build` passed after top-bar ally buyback status wiring, with the existing Vite large chunk warning.
- 2026-06-20 chat wheel increment check: `npm test -- tests/chatWheelModel.test.ts tests/tacticalStatusBroadcastModel.test.ts tests/statusBroadcastModel.test.ts tests/enemyHeroBarModel.test.ts` passed: 4 files, 22 tests. `npm run build` passed after HUD chat wheel panel wiring, with the existing Vite large chunk warning.
- 2026-06-20 chat wheel hotkey increment check: `npm test -- tests/controlSettings.test.ts tests/inputSelectionHotkeys.test.ts` passed: 2 files, 34 tests. `npm run build` passed after adding the rebindable `chatWheel` action and HUD keyboard toggle, with the existing Vite large chunk warning.
- 2026-06-20 chat wheel preset follow-up check: `npm test -- tests/controlSettings.test.ts tests/chatWheelModel.test.ts tests/inputSelectionHotkeys.test.ts` passed: 3 files, 39 tests. This covers persisted `chatWheelPreset`, balanced/objective/defensive local content presets, and the existing rebindable hotkey path.
- 2026-06-20 chat wheel local customization check: `npm test -- tests/chatWheelModel.test.ts tests/controlSettings.test.ts tests/inputSelectionHotkeys.test.ts tests/tacticalStatusBroadcastModel.test.ts tests/statusBroadcastModel.test.ts tests/enemyHeroBarModel.test.ts` passed: 6 files, 64 tests. `npm run build` passed after settings/menu/HUD wiring, with the existing Vite large chunk warning. This covers local eight-slot label overrides, preset fallback for blank slots, persisted settings normalization, and the existing HUD/broadcast hotkey path.
- 2026-06-20 team communication log increment check: `npm test -- tests/teamCommunicationLogModel.test.ts tests/chatWheelModel.test.ts tests/tacticalStatusBroadcastModel.test.ts tests/statusBroadcastModel.test.ts` passed: 4 files, 18 tests. `npm run build` passed after local HUD `TEAM` log wiring, with the existing Vite large chunk warning.
- 2026-06-20 rune/Boss objective broadcast increment check: `npm test -- tests/tacticalStatusBroadcastModel.test.ts tests/statusBroadcastModel.test.ts tests/enemyHeroBarModel.test.ts tests/chatWheelModel.test.ts` passed: 4 files, 24 tests. `npm run build` passed after HUD rune/Boss broadcast wiring, with the existing Vite large chunk warning.
- 2026-06-20 command-card availability increment check: `npm test -- tests/commandCard.test.ts tests/availabilityModel.test.ts tests/inputSelectionHotkeys.test.ts tests/controlSettings.test.ts` passed: 4 files, 39 tests. `npm run build` passed after HUD command-card availability wiring, with the existing Vite large chunk warning.
- 2026-06-20 cast availability increment check: `npm test -- tests/targetPreviewModel.test.ts tests/availabilityModel.test.ts tests/castValidity.test.ts tests/cursorTargetHint.test.ts` passed: 4 files, 24 tests. `npm run build` passed after TargetPreview availability wiring, with the existing Vite large chunk warning.
- 2026-06-20 TargetPreview renderer migration check: `npm test -- tests/targetPreviewModel.test.ts tests/abilityPreviewShape.test.ts tests/castValidity.test.ts tests/cursorTargetHint.test.ts tests/uxFeedback.test.ts` passed: 5 files, 42 tests. `npm run build` passed after storing `UxFeedback.targetPreview` and making 2D/3D renderers prefer the model directly, with the existing Vite large chunk warning.
- 2026-06-20 backpack-delay availability parity check: `npm test -- tests/backpack.test.ts tests/itemTooltipModel.test.ts tests/statusBroadcastModel.test.ts tests/availabilityModel.test.ts` passed: 4 files, 22 tests. `npm run build` passed after adding explicit `ItemInstance.backpackReadyUntil`, HUD tooltip/status broadcast propagation, and `背包延迟` command rejection copy, with the existing Vite large chunk warning.
- 2026-06-20 map mechanics visibility increment check: `npm test -- tests/minimapDrawingModel.test.ts tests/mapPingModel.test.ts tests/minimapClickGuard.test.ts tests/mapMechanicsModel.test.ts tests/mapReadability.test.ts` passed: 5 files, 23 tests. `npm run build` passed after forest-shadow/high-ground hatch and minimap camp/rune label wiring, with the existing Vite large chunk warning.
- 2026-06-20 3D map mechanics readability increment check: `npm test -- tests/render3d/terrainDressing.test.ts tests/mapReadability.test.ts tests/mapMechanicsModel.test.ts` passed: 3 files, 25 tests. This covers the new 3D forest-shadow, cliff/high-ground miss, neutral camp, and river rune layers.
- 2026-06-20 map mechanics combined check: `npm test -- tests/minimapDrawingModel.test.ts tests/mapPingModel.test.ts tests/minimapClickGuard.test.ts tests/mapMechanicsModel.test.ts tests/mapReadability.test.ts tests/render3d/terrainDressing.test.ts` passed: 6 files, 36 tests. `npm run build` passed after the 3D map-mechanic layer wiring, with the existing Vite large chunk warning.
- 2026-06-20 map mechanics radar/pulse follow-up check: `npm test -- tests/mapMechanicsModel.test.ts tests/render3d/terrainDressing.test.ts tests/mapReadability.test.ts` passed: 3 files, 27 tests. `npm run build` passed after HUD radar wiring and 3D camp/rune/forest/high-ground pulse contracts, with the existing Vite large chunk warning. `git diff --check` passed; root-level preview media check found no new root `png/jpg/jpeg/webm/mp4` files.
- 2026-06-20 map mechanics user-feedback follow-up check: `npm test -- tests/mapMechanicsModel.test.ts tests/render3d/terrainDressing.test.ts tests/neutrals.test.ts tests/runes.test.ts tests/combat.test.ts` passed: 5 files, 40 tests. This specifically covers visible jungle entrances, neutral camp readiness/discoverability, river runes, high-ground/miss rules, and existing neutral spawn behavior.
- 2026-06-20 tutorial coach follow-up check: `npm test -- tests/tutorialCoachModel.test.ts tests/mapMechanicsModel.test.ts tests/itemLogisticsModel.test.ts tests/courierHudModel.test.ts tests/onboardingModel.test.ts` passed: 5 files, 24 tests. `npm run build` passed after HUD `COACH` wiring, with the existing Vite large chunk warning. This covers the new contextual HUD lesson priority for item logistics, forest entrances, neutral camps, high-ground/miss, evasion, and river-rune discoverability.
- 2026-06-20 onboarding/presets increment check: `npm test -- tests/onboardingModel.test.ts tests/controlSettings.test.ts tests/controlKeyBinds.test.ts tests/commandCard.test.ts` passed: 4 files, 27 tests. `npm run build` passed after main-menu preset wiring, with the existing Vite large chunk warning.
- 2026-06-20 minimap settings increment check: `npm test -- tests/controlSettings.test.ts` passed: 1 file, 17 tests. `npm run build` passed after MiniMap/menu wiring, with the existing Vite large chunk warning.
- 2026-06-20 minimap drawing increment check: `npm test -- tests/minimapDrawingModel.test.ts tests/mapPingModel.test.ts tests/minimapClickGuard.test.ts` passed: 3 files, 11 tests.
- 2026-06-20 spectator timeline increment check: `npm test -- tests/spectatorTimelineModel.test.ts tests/uxFeedback.test.ts tests/courierEventFeedback.test.ts tests/announceModel.test.ts` passed: 4 files, 24 tests. `npm run build` passed after spectate/debug HUD timeline wiring, with the existing Vite large chunk warning.
- 2026-06-20 spectator controls increment check: `npm test -- tests/spectatorControlsModel.test.ts tests/spectatorTimelineModel.test.ts tests/gameSpeedHudModel.test.ts tests/speedSteps.test.ts` passed: 4 files, 11 tests. `npm run build` passed after debug/spectate WATCH control strip wiring, with the existing Vite large chunk warning.
- 2026-06-20 spectator follow-target increment check: `npm test -- tests/spectatorControlsModel.test.ts tests/spectatorTimelineModel.test.ts tests/gameSpeedHudModel.test.ts tests/speedSteps.test.ts tests/uxFeedback.test.ts` passed: 5 files, 25 tests. `npm run build` passed after adding `cycleFollowTarget`, alive hero/Boss/courier follow targets, and per-frame follow target tracking, with the existing Vite large chunk warning.
- 2026-06-20 spectator jump-history increment check: `npm test -- tests/spectatorTimelineModel.test.ts tests/spectatorControlsModel.test.ts tests/uxFeedback.test.ts tests/gameSpeedHudModel.test.ts tests/speedSteps.test.ts` passed: 5 files, 26 tests. `npm run build` passed after adding local `JUMPS` history and click-to-recenter replay of recent spectator focuses, with the existing Vite large chunk warning.
- 2026-06-20 threat direction/death recap context increment check: `npm test -- tests/deathRecapModel.test.ts tests/threatDirectionModel.test.ts tests/buildingAttackAlertModel.test.ts` passed: 3 files, 38 tests.
- 2026-06-20 shop related-items increment check: `npm test -- tests/shopRelatedItemsModel.test.ts tests/shopRecipeModel.test.ts tests/shopQuickActionModel.test.ts tests/shopListModel.test.ts tests/shopDestinationModel.test.ts tests/shopReminderModel.test.ts tests/quickbuyModel.test.ts` passed: 7 files, 49 tests.
- 2026-06-20 quickbuy queue increment check: `npm test -- tests/quickbuyModel.test.ts tests/shopReminderModel.test.ts tests/shopRelatedItemsModel.test.ts tests/shopRecipeModel.test.ts tests/shopQuickActionModel.test.ts tests/shopListModel.test.ts tests/shopDestinationModel.test.ts tests/itemLogisticsModel.test.ts` passed: 8 files, 55 tests.
- 2026-06-20 shop search/highlight increment check: `npm test -- tests/shopListModel.test.ts tests/shopReminderModel.test.ts tests/shopRelatedItemsModel.test.ts tests/shopRecipeModel.test.ts tests/shopQuickActionModel.test.ts tests/shopDestinationModel.test.ts` passed: 6 files, 46 tests. `npm run build` passed after ShopPanel search summary and row-badge wiring, with the existing Vite large chunk warning.
- 2026-06-20 orb priority UX increment check: `npm test -- tests/orbPriorityModel.test.ts tests/abilitySlotBadgeModel.test.ts tests/abilitySlotToggleModel.test.ts tests/abilityTooltipModel.test.ts tests/statusBroadcastModel.test.ts tests/autocastDefault.test.ts` passed: 6 files, 31 tests. `npm run build` passed after HUD `ORB` summary and per-slot `MAIN` / `+ORB` / `OFF` badge wiring, with the existing Vite large chunk warning. This is a read-only preview and does not change attack-hit hook semantics.
- 2026-06-20 local visual smoke check: Playwright opened `http://127.0.0.1:5180/?mode=play&hero=rein`, dismissed onboarding, and captured `/private/tmp/dota-forever-ingame-hud-clear.png`. Text probes confirmed visible `MAP`, `COACH`, `ITEMS`, `树林入口`, `野怪`, `神符`, `MISS`, and `高地` HUD signals. The chosen starting hero has no active learned orb, so the `ORB` preview was not expected in this smoke path.
- 2026-06-20 hero legacy hotkey increment check: `npm test -- tests/controlKeyBinds.test.ts tests/inputSelectionHotkeys.test.ts tests/controlSettings.test.ts tests/onboardingModel.test.ts tests/abilityTooltipModel.test.ts tests/statusBroadcastModel.test.ts` passed: 6 files, 61 tests. `npm run build` passed after deriving hero-specific RTS Legacy ability aliases for runtime input/HUD labels, with the existing Vite large chunk warning.
- 2026-06-20 hero legacy visual smoke check: Playwright switched the main menu to RTS Legacy, opened `http://127.0.0.1:5180/?mode=play&hero=rein`, dismissed onboarding, and captured `/private/tmp/dota-forever-legacy-hotkeys.png`. Text probes confirmed the Rein HUD ability row exposed `Z`, `X`, `D`, and `B` aliases while the `ITEMS` strip remained visible.
- 2026-06-20 backpack ready-delay logistics increment check: `npm test -- tests/itemLogisticsModel.test.ts tests/quickbuyModel.test.ts tests/itemTooltipModel.test.ts tests/shopRecipeModel.test.ts tests/shopOwnershipModel.test.ts tests/shopQuickActionModel.test.ts tests/shopReminderModel.test.ts tests/backpack.test.ts` passed: 8 files, 47 tests. `npm run build` passed after HUD live countdown wiring, with the existing Vite large chunk warning.
- 2026-06-20 item logistics primary-action follow-up check: `npm test -- tests/itemLogisticsModel.test.ts tests/quickbuyModel.test.ts tests/itemTooltipModel.test.ts tests/shopRecipeModel.test.ts tests/shopOwnershipModel.test.ts tests/shopQuickActionModel.test.ts tests/shopReminderModel.test.ts tests/backpack.test.ts tests/courierHudModel.test.ts` passed: 9 files, 56 tests. This covers the new `primaryAction` hints for Backpack -> Hero, Hero -> Backpack, Stash -> Hero, and Deliver stash.
- 2026-06-20 courier ETA logistics increment check: `npm test -- tests/courierHudModel.test.ts tests/courierControlModel.test.ts tests/minimapCourierMarker.test.ts tests/shopReminderModel.test.ts tests/itemLogisticsModel.test.ts tests/courier.test.ts` passed: 6 files, 29 tests. `npm run build` passed after HUD/logistics courier ETA wiring, with the existing Vite large chunk warning.
- 2026-06-20 shop purchase trace increment check: `npm test -- tests/shopPurchaseTraceModel.test.ts tests/shopReminderModel.test.ts tests/shopQuickActionModel.test.ts tests/shopDestinationModel.test.ts tests/itemLogisticsModel.test.ts tests/quickbuyModel.test.ts` passed: 6 files, 44 tests. `npm run build` passed after ShopPanel purchase route trace wiring, with the existing Vite large chunk warning.
- 2026-06-20 courier route readability increment check: `npm test -- tests/courierRouteModel.test.ts tests/minimapCourierMarker.test.ts tests/courierHudModel.test.ts tests/courierControlModel.test.ts tests/itemLogisticsModel.test.ts` passed: 5 files, 23 tests. `npm run build` passed after 2D world/minimap courier route wiring, with the existing Vite large chunk warning.
- 2026-06-20 modifier display increment check: `npm test -- tests/modifierDisplayModel.test.ts tests/statusChips.test.ts tests/statusPips.test.ts tests/render3d/statusFx.test.ts` passed: 4 files, 21 tests.
- 2026-06-20 current Codex combined UX/control check: `npm test -- tests/selection.test.ts tests/inputSelectionHotkeys.test.ts tests/selectionCommandRouting.test.ts tests/commandCard.test.ts tests/uxFeedback.test.ts tests/inspectPanelModel.test.ts tests/render3d/selection3d.test.ts tests/targetPreviewModel.test.ts tests/abilityPreviewShape.test.ts tests/abilityShapeData.test.ts tests/castValidity.test.ts tests/cursorTargetHint.test.ts tests/commandMode.test.ts tests/commandCursorTheme.test.ts tests/controlSettings.test.ts tests/controlKeyBinds.test.ts tests/onboardingModel.test.ts tests/courierControlModel.test.ts tests/courierHudModel.test.ts tests/minimapCourierMarker.test.ts tests/minimapDrawingModel.test.ts tests/mapPingModel.test.ts tests/minimapClickGuard.test.ts tests/mapMechanicsModel.test.ts tests/mapReadability.test.ts tests/enemyHeroBarModel.test.ts tests/tacticalStatusBroadcastModel.test.ts tests/statusBroadcastModel.test.ts tests/itemLogisticsModel.test.ts tests/quickbuyModel.test.ts tests/availabilityModel.test.ts tests/abilityTooltipModel.test.ts tests/itemTooltipModel.test.ts tests/shopDestinationModel.test.ts tests/shopQuickActionModel.test.ts tests/shopReminderModel.test.ts tests/shopRecipeModel.test.ts tests/shopListModel.test.ts tests/shopOwnershipModel.test.ts tests/items.test.ts tests/recipes.test.ts tests/fountainStatusModel.test.ts tests/combatCommandHintModel.test.ts tests/attackCommandWorldHint.test.ts tests/render3d/attackCommand3d.test.ts tests/modifierDisplayModel.test.ts tests/statusChips.test.ts tests/statusPips.test.ts tests/render3d/statusFx.test.ts` passed: 49 files, 316 tests.
- 2026-06-20 current build check: `npm run build` passed after HUD map-mechanics chips and minimap label wiring. Vite still reports the existing large chunk warning for `dist/assets/index-*.js`.
- 2026-06-20 repo hygiene check: `git diff --check` passed. Root-level preview media check found no new root `png/jpg/jpeg/webm/mp4` files. `rg --files designs` reports no `designs/` directory in this worktree.
- 2026-06-19 current Codex combined check: `npm test -- tests/availabilityModel.test.ts tests/abilityTooltipModel.test.ts tests/itemTooltipModel.test.ts tests/statusBroadcastModel.test.ts tests/shopDestinationModel.test.ts tests/shopQuickActionModel.test.ts tests/shopReminderModel.test.ts tests/shopRecipeModel.test.ts tests/shopListModel.test.ts tests/items.test.ts tests/recipes.test.ts tests/fountainStatusModel.test.ts tests/combatCommandHintModel.test.ts tests/attackCommandWorldHint.test.ts tests/render3d/attackCommand3d.test.ts` passed: 15 files, 93 tests.
- 2026-06-19 current build check: `npm run build` passed. Vite still reports the existing large chunk warning for `dist/assets/index-*.js`.
- 2026-06-19 item logistics increment check: focused item logistics command passed: 7 files, 36 tests. `npm run build` passed after HUD wiring. Local dev server returned HTTP 200 at `http://127.0.0.1:5180/`; Hub preview gateway auto-open was unavailable in this session (`curl` exit 7), so no browser-panel visual claim is made.
- 2026-06-19 courier control increment check: focused courier control command passed: 5 files, 23 tests. `npm run build` passed after HUD wiring. Return/Stop/Burst are intentionally disabled pending Opus sim APIs.
- 2026-06-19 target preview increment check: focused target preview command passed: 8 files, 66 tests. Ability/item preview construction in `main.ts` now routes through `targetPreviewModel` before projecting into current renderer fields.
- 2026-06-20 selection subgroup increment check: focused selection command passed: 7 files, 55 tests. Core subgroup/same-type primitives are implemented in `SelectionState`; double-click same-type input is wired. At that point subgroup cycle key binding was still pending; the follow-up check below wires it through rebindable `cycleSubgroup`.
- 2026-06-20 subgroup cycle binding increment check: `npm test -- tests/inputSelectionHotkeys.test.ts tests/controlSettings.test.ts tests/commandCard.test.ts` passed: 3 files, 38 tests. The new rebindable `cycleSubgroup` action defaults to `C`, does not open the Tab scoreboard, and the HUD selection summary exposes primary subject plus cycle hotkey.
- 2026-06-20 subgroup cycle focused regression: `npm test -- tests/selection.test.ts tests/selectionCommandRouting.test.ts tests/inputSelectionHotkeys.test.ts tests/commandCard.test.ts tests/uxFeedback.test.ts tests/inspectPanelModel.test.ts tests/render3d/selection3d.test.ts tests/controlSettings.test.ts` passed: 8 files, 77 tests. `npm run build` passed after the `cycleSubgroup` input and HUD summary wiring, with the existing Vite large chunk warning.
- 2026-06-19 repo hygiene check: `git diff --check` passed. Root-level preview media check found no new root `png/jpg/jpeg/webm/mp4` files. `rg --files designs` reports no `designs/` directory in this worktree.
- 2026-06-19 full-suite note: `npm test` was attempted after the UX merge pass, but should not be treated as a green merge gate. It observed `tests/neutrals.test.ts` timing out in the stack-pull scenario (`堆野:野怪被引出出生框后整分钟刷新叠加新一组`) and later stopped after the Vitest process stopped producing output. The focused UX/control tests above and `npm run build` passed.
- Suggested merge gate before Opus pulls UX work into mainline: `npm run build`, focused UI tests, then full `npm test` if the working tree is stable.
