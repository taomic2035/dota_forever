# Resource3D Handoff for Opus

Date: 2026-06-13
Branch/worktree: `codex/dota-shift-queue` at `/Users/taomic/vibecoding/dota_forever-shift-queue`
Primary preview routes: `?mode=resource3d-preview`, `?mode=hero3d-preview`, `?mode=play&renderer=3d`
Legacy phase-1 screenshot: `docs/screenshots/ux-resource3d-preview.png`

Current V3 update for Opus merge:

- Worktree/branch: `codex/dota-shift-queue` at `/Users/taomic/vibecoding/dota_forever-shift-queue`.
- V3 summary: `docs/ux/2026-06-13-3d-v3-resource-polish-summary.md`.
- V3 screenshot: `docs/screenshots/ux-3d-v3-resource-material-motion.png`.
- V3 part-motion screenshot: `docs/screenshots/ux-3d-v3-resource-part-motion.png`.
- V3 FX screenshot: `docs/screenshots/ux-3d-v3-fx-polish.png`.
- Shift queue controls screenshot: `docs/screenshots/ux-shift-queue-controls.png`.
- V4 map terrain research target: `docs/ux/2026-06-13-dota-map-elements-research-target.md`.
- V4 map terrain summary: `docs/ux/2026-06-13-3d-v4-map-terrain-realism-summary.md`.
- Next unit/FX research target: `docs/ux/2026-06-13-dota-unit-fx-research-target.md`.
- V4 map terrain screenshot: `docs/screenshots/ux-3d-v4-map-terrain-realism.png`.
- V4 tree-wall close-up screenshot: `docs/screenshots/ux-3d-v4-map-treewall-closeup.png`.
- V4 tree-wall biome screenshots: `docs/screenshots/ux-3d-v4-map-treewall-biome-radiant.png`, `docs/screenshots/ux-3d-v4-map-treewall-biome-dire.png`.
- V4 riverbank polish screenshot: `docs/screenshots/ux-3d-v4-map-river-bank-polish.png`.
- V4 ground decal polish screenshot: `docs/screenshots/ux-3d-v4-map-ground-decals-polish.png`.
- V4 sky/fog polish screenshot: `docs/screenshots/ux-3d-v4-map-sky-fog-polish.png`.
- V4 fence/blocker polish screenshot: `docs/screenshots/ux-3d-v4-map-fence-blocker-polish.png`.
- V4 highground/ramp screenshot: `docs/screenshots/ux-3d-v4-map-highground-ramp.png`.
- V4 rocky cliff-face screenshot: `docs/screenshots/ux-3d-v4-map-cliff-face-rocky.png`.
- V4 cliff biome polish screenshots: `docs/screenshots/ux-3d-v4-map-cliff-biome-polish.png`, `docs/screenshots/ux-3d-v4-map-cliff-biome-dire-polish.png`.
- V4 river runtime motion screenshot: `docs/screenshots/ux-3d-v4-map-river-motion-polish.png`.
- V5 hero readability summary: `docs/ux/2026-06-14-3d-v5-hero-readability-summary.md`.
- V5 hero readability screenshot: `docs/screenshots/ux-3d-v5-hero-readability.png`.
- V5 lane-unit readability summary: `docs/ux/2026-06-14-3d-v5-lane-unit-readability-summary.md`.
- V5 lane-unit readability screenshot: `docs/screenshots/ux-3d-v5-lane-unit-readability.png`.
- V5 neutral/boss readability summary: `docs/ux/2026-06-14-3d-v5-neutral-boss-readability-summary.md`.
- V5 neutral/boss readability screenshot: `docs/screenshots/ux-3d-v5-neutral-boss-readability.png`.
- V5 summon/ward readability summary: `docs/ux/2026-06-14-3d-v5-summon-ward-readability-summary.md`.
- V5 summon/ward readability screenshot: `docs/screenshots/ux-3d-v5-summon-ward-readability.png`.
- Adds material/detail metadata, high-detail procedural texture overlays, runtime resource motion, part-level model motion, richer 3D battle FX, V4 map terrain realism layers, and shift-queued command UX.
- Scope note: this branch now includes UI/control plumbing for queued orders in `src/sim/unit.ts`, `src/engine/input.ts`, and related tests. Those changes are intentional UX/control-side work for Opus to review against mainline logic.

Terrain screenshots:

- `docs/screenshots/ux-resource3d-terrain-preview.png`
- `docs/screenshots/ux-resource3d-map-props-preview.png`
- `docs/screenshots/ux-resource3d-environment-preview.png`
Feedback screenshot:

- `docs/screenshots/ux-resource3d-feedback-preview.png`
Match-shell screenshot:

- `docs/screenshots/ux-resource3d-match-ui-preview.png`

## What

This branch adds first-pass Three.js samples for non-hero game resources.

Covered resource categories:

- `lane_units`: 10 samples
- `neutral_units`: 10 samples
- `boss_objectives`: 10 samples
- `buildings`: 10 samples
- `shops_npcs`: 10 samples
- `couriers_summons`: 10 samples
- `items`: 10 samples
- `item_components`: 10 samples
- `consumables`: 10 samples
- `wards_traps`: 10 samples
- `spell_fx`: 10 samples
- `projectiles`: 10 samples
- `aoe_indicators`: 10 samples
- `environment_fx`: 15 samples
- `map_props`: 21 samples
- `runes_powerups`: 10 samples
- `pickups_drops`: 10 samples
- `status_effects`: 10 samples
- `ability_icons`: 10 samples
- `targeting_reticles`: 10 samples
- `combat_numbers`: 10 samples
- `health_mana_ui`: 10 samples
- `screen_overlays`: 10 samples
- `announcements`: 10 samples
- `shop_inventory_ui`: 10 samples
- `sound_cue_markers`: 10 samples
- `hero_roster_ui`: 10 samples
- `level_talent_ui`: 10 samples
- `death_recap_ui`: 10 samples
- `scoreboard_ui`: 10 samples
- `match_flow_ui`: 10 samples
- `cursor_commands`: 10 samples
- `system_notifications`: 10 samples
- `tutorial_guides`: 10 samples
- `ui_badges`: 10 samples
- `terrain_tiles`: 22 samples
- `minimap_markers`: 10 samples
- `team_banners`: 10 samples

Total: 408 samples.

## Completion Checklist

### Completed

- [x] Hero3D first batch exists as an in-project Three.js preview.
  - 10 classic heroes are defined in `src/render/hero3dAssets.ts`.
  - Each hero has procedural model parts, generated texture channels, action clip metadata, silhouette metadata, and preview camera metadata.
  - Preview route: `?mode=hero3d-preview`.
  - Evidence: `docs/screenshots/ux-hero3d-preview.png`.
- [x] V5 hero readability polish exists for the first 10 classic heroes.
  - Each hero has a unique `readability.primaryRead`, named silhouette anchors, stance/weapon/spell-focus pose metadata, and bounded `fxPriority`.
  - Each hero receives visible V5 model anchors: crest read, weapon line read, rear profile read, and cast focus read.
  - Hero preview exposes `window.__hero3dPreview.readability` for Opus smoke checks.
  - Evidence: `docs/screenshots/ux-3d-v5-hero-readability.png`.
- [x] Resource3D taxonomy is broad enough for a first integration pass.
  - 38 non-hero resource categories are defined in `RESOURCE3D_CATEGORIES`.
  - 408 total resource samples are defined in `RESOURCE3D_SAMPLE_ASSETS`.
  - Every category has at least 10 samples; terrain-heavy categories have more:
    - `environment_fx`: 15
    - `map_props`: 21
    - `terrain_tiles`: 22
- [x] Core world/resource categories are covered.
  - Lane units, neutral units, Boss/objectives, buildings, shops/NPCs, couriers/summons.
  - Items, item components, consumables, wards/traps.
  - Runes/power-ups, pickups/drops, team banners, minimap markers.
- [x] V5 lane-unit readability polish exists for the first 10 lane samples.
  - Lane units now expose `laneReadability.teamRead`, `roleClass`, `formationSlot`, `attackRead`, and `silhouetteAnchors`.
  - Covered role classes: melee, ranged, siege, super, utility, scout.
  - Covered team reads: dawn, night, neutral.
  - Each lane unit receives visible V5 model anchors: formation banner, role attack read, team trim plate, and formation foot rune.
  - Resource preview exposes `window.__resource3dPreview.laneReadability` for Opus smoke checks.
  - Evidence: `docs/screenshots/ux-3d-v5-lane-unit-readability.png`.
- [x] V5 neutral / boss readability polish exists for 20 wild/objective samples.
  - Neutral and boss/objective resources now expose `wildReadability.tier`, `biome`, `packRole`, `threatRead`, and `silhouetteAnchors`.
  - Covered neutral tiers: small, medium, large, ancient, special.
  - Covered objective tiers: boss, objective.
  - Covered pack roles: fodder, leader, caster, flying, ancient, boss-core, objective-mechanic.
  - Resource preview exposes `window.__resource3dPreview.wildReadability` for Opus smoke checks.
  - Evidence: `docs/screenshots/ux-3d-v5-neutral-boss-readability.png`.
- [x] V5 summon / ward readability polish exists for 20 support-object samples.
  - Couriers, summons, illusions, wards, traps, and totems now expose `supportReadability`.
  - Support objects define owner read, interaction read, expiration cue, priority band, and bounded visual priority.
  - Max support-object visual priority is `0.56`, keeping them below hero-priority visuals.
  - Resource preview exposes `window.__resource3dPreview.supportReadability` for Opus smoke checks.
  - Evidence: `docs/screenshots/ux-3d-v5-summon-ward-readability.png`.
- [x] Combat readability and VFX categories are covered.
  - Spell FX, projectiles, AoE indicators, status effects, targeting reticles.
  - Combat numbers, health/mana UI, screen overlays, announcements.
- [x] Terrain/art dressing categories are explicitly covered.
  - Flat ground, trees, grass, flowers, high ground, fences, slopes/ramps, river/riverbanks, sky domes, cloud shadows, sky lighting.
  - Evidence screenshots:
    - `docs/screenshots/ux-resource3d-terrain-preview.png`
    - `docs/screenshots/ux-resource3d-map-props-preview.png`
    - `docs/screenshots/ux-resource3d-environment-preview.png`
- [x] Match-shell and UI support categories are covered.
  - Ability icons, shop/inventory UI, sound cue markers, hero roster, level/talent UI, death recap, scoreboard, match flow, cursor commands, system notifications, tutorial guides.
  - Evidence screenshots:
    - `docs/screenshots/ux-resource3d-feedback-preview.png`
    - `docs/screenshots/ux-resource3d-match-ui-preview.png`
- [x] Preview and validation plumbing exists.
  - Preview route: `?mode=resource3d-preview`.
  - `window.__resource3dPreview` exposes category/count smoke data.
  - `tests/resource3dAssets.test.ts` locks taxonomy, minimum sample count, renderability, visual variety, unique keys, and requested terrain subtypes.
  - `tests/hero3dAssets.test.ts` locks hero keys, texture/action contract, silhouettes, and detail thresholds.
- [x] Shift-queue command UX exists for controls integration.
  - Shift + right click, attack move, abilities, and item commands can append to the selected unit order queue.
  - 2D and 3D renderers can draw the selected unit queued route with numbered waypoints.
  - Evidence: `docs/screenshots/ux-shift-queue-controls.png` and `docs/screenshots/ux-3d-shift-queue-route.png`.
- [x] V3 resource runtime polish exists.
  - Resource3D parts include material/detail/texture metadata.
  - Runtime unit resources apply whole-model motion and part-level local motion.
  - Evidence: `docs/screenshots/ux-3d-v3-resource-material-motion.png` and `docs/screenshots/ux-3d-v3-resource-part-motion.png`.
- [x] V3 3D battle FX polish exists.
  - `src/render3d/fx3dVisual.ts` maps `fxStyle` family/pattern metadata into 3D FX layers.
  - `src/render3d/fx3d.ts` renders burst / beam / AoE / projectile as multi-layer Three.js groups.
  - Evidence: `docs/screenshots/ux-3d-v3-fx-polish.png`.
- [x] V4 map terrain realism research target and first runtime pass exist.
  - Research target: `docs/ux/2026-06-13-dota-map-elements-research-target.md`.
  - Runtime layers cover sky, cloud shadows, horizon haze, sun shafts, river current, wet riverbanks, foam/glints, worn dirt paths, grass mottle, stone slabs, tree wall trunks/canopies, Radiant/Dire tree biome accents, grass, flowers, reeds, river stones, layered cliff faces, Radiant/Dire cliff tint, rubble/cracks, layered cliff fences/blockers, highground edges, ramp stairs, and landmark rings.
  - Riverbank polish adds `terrain-river-bank-mud` and `terrain-river-foam-glints` on top of existing `terrain-river-current`, `terrain-river-reeds`, and `terrain-river-stones`.
  - River runtime motion adds visual-only contracts: `terrain-river-current.motion = flow`, `terrain-river-foam-glints.motion = foam-pulse`, and `terrain-river-reeds.motion = reed-sway`.
  - Ground polish groups `terrain-ground-decals` with child layers `terrain-ground-dirt-paths`, `terrain-ground-grass-mottle`, and `terrain-ground-stone-slabs`.
  - Sky/fog polish groups `terrain-atmosphere` with child layers `terrain-horizon-haze` and `terrain-sun-shafts`.
  - Tree biome accents are grouped as `terrain-tree-biome-accents` with child layers `terrain-tree-radiant-light-canopy`, `terrain-tree-radiant-blooms`, `terrain-tree-dire-dark-canopy`, and `terrain-tree-dire-dead-branches`.
  - Layered cliff faces are grouped as `terrain-cliff-faces` with child layers `terrain-cliff-face-walls`, `terrain-cliff-rock-caps`, and `terrain-cliff-ledge-shadows`.
  - Cliff biome details are grouped as `terrain-cliff-biome-details` with child layers `terrain-cliff-radiant-moss`, `terrain-cliff-dire-scorch`, `terrain-cliff-rubble`, and `terrain-cliff-cracks`.
  - Layered cliff fences are grouped as `terrain-cliff-fences` with child layers `terrain-cliff-fence-rails`, `terrain-cliff-fence-posts`, and `terrain-cliff-fence-stone-bases`.
  - Evidence: `docs/screenshots/ux-3d-v4-map-terrain-realism.png`, `docs/screenshots/ux-3d-v4-map-treewall-closeup.png`, `docs/screenshots/ux-3d-v4-map-treewall-biome-radiant.png`, `docs/screenshots/ux-3d-v4-map-treewall-biome-dire.png`, `docs/screenshots/ux-3d-v4-map-river-bank-polish.png`, `docs/screenshots/ux-3d-v4-map-river-motion-polish.png`, `docs/screenshots/ux-3d-v4-map-ground-decals-polish.png`, `docs/screenshots/ux-3d-v4-map-sky-fog-polish.png`, `docs/screenshots/ux-3d-v4-map-fence-blocker-polish.png`, `docs/screenshots/ux-3d-v4-map-highground-ramp.png`, `docs/screenshots/ux-3d-v4-map-cliff-face-rocky.png`, `docs/screenshots/ux-3d-v4-map-cliff-biome-polish.png`, `docs/screenshots/ux-3d-v4-map-cliff-biome-dire-polish.png`.
- [x] Next-phase hero/creep/summon/neutral/skill/FX research target exists.
  - Research target: `docs/ux/2026-06-13-dota-unit-fx-research-target.md`.
  - Scope is visual/UX asset polish only; no copied Dota assets and no gameplay-rule changes.

### Not Completed

- [ ] Production art assets are not done.
  - Current assets are procedural Three.js samples for art direction and integration contracts.
  - Final GLB/FBX models, hand-authored PBR textures, authored particles, rigging, and final animation clips still need a production pipeline.
- [ ] Full `tree3d.js` production-asset pipeline is not done.
  - This branch provides in-project Three.js procedural assets and runtime visual contracts.
  - Final external model import, skeleton retargeting, PBR texture file loading, LOD, and asset bundle packaging still need a formal production pipeline.
- [ ] Placement/collision/LOD metadata is not defined.
  - Terrain and map props do not yet include fields such as `walkable`, `blocker`, `heightLevel`, `river`, `visionBlocker`, `placementLayer`, or LOD rules.
- [ ] Final VFX and audio runtime contracts are still placeholders.
  - `spell_fx`, `projectiles`, `aoe_indicators`, `environment_fx`, and `sound_cue_markers` are visual/audio-binding samples, not final particle/audio systems.
  - No real `.wav`/`.ogg` sound files are included.
  - V3 3D FX now has layered runtime geometry, but not GPU particles, texture atlases, or audio sync.
- [ ] UI categories are sample style guides, not final UI implementation.
  - Ability icons, combat numbers, screen overlays, announcements, roster, scoreboard, death recap, and tutorial guides are sample 3D/style assets.
  - They are not yet wired into HUD/state screens.
- [ ] Per-hero and per-item depth is not complete.
  - The first 10 heroes now have V5 first-read contracts and visible identity anchors, but not every hero in the eventual roster.
  - The first 10 heroes still need authored GLB/PBR models, authored rigs, and per-hero final animation clips before production-art completion.
  - Items/components/abilities have representative samples, not one final unique asset per final gameplay entry.
- [ ] Code splitting is not done.
  - Three.js is still statically imported through preview paths, so Vite reports a large chunk warning.
  - Recommended before production merge: lazy-load `hero3dPreview.ts` and `resource3dPreview.ts` behind query routes.
- [x] Full-suite timing has fresh merge evidence.
  - `npm test -- --run --pool=forks` passed in this worktree after the V4 terrain/cliff polish.
  - 102 test files passed, 871 tests passed.

### Suggested Priority For Opus

1. Review and merge the UI/asset/control slice as a branch, not as a preview-only patch.
2. Resolve route/dependency conflicts in `src/main.ts`, `package.json`, and `package-lock.json`.
3. Lazy-load Three.js preview modules if the branch is going near production.
4. Choose the first production-asset lane:
   - Recommended: `lane_units`, `buildings`, `terrain_tiles`, `projectiles`, `aoe_indicators`, then `ability_icons`.
5. Define the runtime mapping shape before replacing samples with GLB/PBR:
   - `gameEntityKey -> hero/resource asset key`
   - `resource category -> renderer layer`
   - `terrain/map prop -> placement + collision metadata`
   - `sound cue marker -> final audio event id`

Changed files:

- `src/render/resource3dAssets.ts`
  - New category/resource sample contract.
  - Adds V5 lane-unit readability contracts and visible lane identity-anchor part generation.
  - Adds V5 wild-creature readability contracts for neutral units and boss/objectives.
  - Adds V5 support-object readability contracts for couriers, summons, wards, traps, illusions, and totems.
- `src/render/resource3dFactory.ts`
  - Procedural Three.js resource model factory.
  - Exposes lane-unit, wild-creature, and support-object readability on Resource3D model `userData`.
  - Removes the previous resource material `side: undefined` warning.
- `src/render/hero3dAssets.ts`
  - Adds V5 hero readability contracts and visible identity-anchor part generation for the first 10 classic heroes.
- `src/render/hero3dFactory.ts`
  - Uses explicit `FrontSide` for non-aura materials, removing the previous Three.js `side: undefined` warning.
- `src/ui/hero3dPreview.ts`
  - Exposes V5 readability smoke data through `window.__hero3dPreview.readability`.
- `src/ui/resource3dPreview.ts`
  - Category-tabbed preview page.
  - Exposes lane-unit V5 readability smoke data through `window.__resource3dPreview.laneReadability`.
  - Exposes wild-creature and support-object V5 smoke data through `window.__resource3dPreview.wildReadability` and `supportReadability`.
- `src/main.ts`
  - Adds route-gated previews and renderer/UX wiring.
- `src/render3d/fx3dVisual.ts`
  - Pure 3D FX layer contract from `fxStyle` family/pattern metadata.
- `src/render3d/fx3d.ts`
  - Runtime multi-layer 3D FX and projectile group renderer.
- `src/render3d/terrainDressing.ts`
  - Pure deterministic terrain dressing sampler for V4 map realism.
- `src/render3d/terrain3d.ts`
  - Adds V4 named map layers: sky, cloud shadows, horizon haze, sun shafts, river current, wet riverbanks, foam/glints, ground dirt paths, grass mottle, stone slabs, tree canopies, Radiant/Dire tree biome accents, grass, flowers, reeds, river stones, layered cliff faces, cliff side tint/rubble/cracks, layered blockers, highground edges, ramp stairs, landmark rings.
  - Exposes `updateTerrainRuntimeMotion(root, t)` for visual-only river current drift, foam pulsing, and reed sway.
- `src/render/commandQueuePath.ts`
  - 2D queued route visual.
- `src/render3d/commandQueue3d.ts`
  - 3D queued route visual.
- `src/sim/unit.ts`
  - Queued order state and advancement for shift-queue controls.
- `src/engine/input.ts`
  - Shift-modified command appending for movement/attack/ability/item flows.
- `tests/resource3dAssets.test.ts`
  - Locks full category coverage, at least 10 samples per category, renderability, variety, and unique keys.
- `docs/screenshots/ux-resource3d-preview.png`
  - Current preview screenshot evidence.
- `docs/screenshots/ux-resource3d-terrain-preview.png`
  - Terrain tile evidence for flat ground, flower meadow, slopes/ramps, riverbank, riverbed, and fence foundations.
- `docs/screenshots/ux-resource3d-map-props-preview.png`
  - Map prop evidence for trees, grass, flowers, fences, high-ground stairs, and river bridge props.
- `docs/screenshots/ux-resource3d-environment-preview.png`
  - Environment evidence for sky domes, cloud shadows, sun shafts, and pollen wind.
- `docs/screenshots/ux-resource3d-feedback-preview.png`
  - UX feedback evidence for ability icon style; adjacent categories cover targeting reticles, combat numbers, health/mana UI, overlays, announcements, shop/inventory UI, and sound cue markers.
- `docs/screenshots/ux-resource3d-match-ui-preview.png`
  - Match-shell evidence for hero roster UI; adjacent categories cover level/talent UI, death recap, scoreboard, match flow, cursor commands, system notifications, and tutorial guides.
- `docs/ux/2026-06-13-resource3d-phase1-summary.md`
  - Phase summary and future production-asset plan.
- `docs/ux/2026-06-13-3d-v3-resource-polish-summary.md`
  - V3 material/detail/texture, model motion, part motion, and 3D FX polish summary.
- `docs/ux/2026-06-13-shift-queue-controls-summary.md`
  - Shift queue control UX summary.
- `docs/ux/2026-06-13-dota-map-elements-research-target.md`
  - Dota-informed map element research target.
- `docs/ux/2026-06-13-3d-v4-map-terrain-realism-summary.md`
  - V4 map terrain realism summary, screenshot evidence, and Opus handoff.

`src/sim/**` changes in this branch are limited to queued-order control plumbing and related tests; no combat/math/pathing tuning is intended.

## Why

After the Hero3D pass, the next art requirement is to cover all other game resource types without trying to finish production assets in one jump.

This gives Opus a stable preview and data contract for non-hero resources now, while also providing the UX/control visual layer needed for queued commands and 3D combat readability. It lets the team replace procedural samples category by category with GLB/PBR assets later.

## Tradeoff

Chosen approach: 408 procedural Three.js samples with strict metadata and a tabbed preview.

Why this approach:

- Covers all major visible resource types quickly.
- Gives Opus a broader taxonomy for gameplay systems: objectives, NPCs, summons, consumables, traps, projectile/VFX layers, drops, minimap markers, and team banners.
- Terrain coverage is now explicit rather than implied: flat ground, trees, grass, flowers, high ground, fences, slopes/ramps, river/riverbanks, sky domes, cloud shadows, and sky lighting all have in-project samples.
- UX feedback coverage now includes ability icons, targeting reticles, combat numbers, health/mana bars, screen overlays, announcements, shop/inventory UI, and sound cue markers.
- Match-shell UX coverage now includes hero roster, level/talent UI, death recap, scoreboard, match flow, cursor commands, system notifications, and tutorial guides.
- Lets each type be reviewed independently.
- Keeps every sample in-project and directly previewable.
- Avoids blocking on final modeling, rigging, or texture production.
- Adds runtime visual polish only where it improves asset/control readability: queued routes, unit resource motion, part motion, and layered 3D FX.

Alternatives considered:

- Build final GLB packs immediately.
  - Deferred. This branch is for art-direction sampling and integration contracts.
- Put all 408 samples on one canvas at once.
  - Rejected for readability. The preview uses category tabs so each type can be inspected cleanly.
- Fully replace gameplay visuals with production assets immediately.
  - Deferred to avoid collision with Opus mainline work and because the GLB/PBR pipeline is not defined yet.

Known cost:

- Three.js remains statically imported through preview modules, so the Vite bundle still reports a large chunk warning.
- Recommended follow-up: lazy-load `hero3dPreview.ts` and `resource3dPreview.ts` behind query routes.

## Open Questions

1. Which resource categories should be promoted to real GLB first: lane units/buildings/spell FX/terrain, or another order?
2. Should `spell_fx` remain in the same resource contract as model assets, or split into a dedicated VFX contract later?
3. Should item resources become shop icon 3D previews, inventory icons, or both?
4. Should map props get placement metadata for the actual map renderer in a later phase?
5. Should the current procedural assets stay as fallback/debug assets after production art arrives?
6. Should `projectiles`, `aoe_indicators`, and `environment_fx` eventually move into a dedicated VFX runtime contract?
7. Should terrain assets get tile/prop placement metadata such as walkable, blocker, height level, river, and sky/background layer?
8. Which first 10 heroes should stay in the immediate V5 polish batch if Opus changes the roster order?

## Next Action

Suggested Opus integration flow:

1. Review `src/main.ts` route additions:
   - `?mode=hero3d-preview`
   - `?mode=resource3d-preview`
2. Treat `src/sim/unit.ts` queued-order changes as UX/control plumbing; keep unrelated sim/combat/pathing changes out of the merge.
3. Run:

```bash
npm test -- tests/resource3dAssets.test.ts tests/hero3dAssets.test.ts tests/render3d/fx3dVisual.test.ts tests/queuedOrders.test.ts
npm run build
npm test -- --run
```

4. Open:

```text
http://127.0.0.1:5182/?mode=resource3d-preview
```

5. Use the category tabs to review all 38 resource groups.
6. Also open the 3D play route and verify shift-queued routes plus layered FX in a live scene.
7. If merging into main, consider lazy-loading preview modules to reduce the main chunk before production release.

After V4 terrain merge review, recommended next UX/art sequence:

1. V5 hero polish for the existing first 10 classic heroes: completed as a first-read/readability pass.
2. V5 lane creep melee/ranged/siege polish for both teams: completed as a role/faction/readability pass.
3. V5 neutral creep and boss tier polish: completed as a tier/biome/threat-read pass.
4. V5 summon and ward polish: completed as an owner/interaction/low-priority pass.
5. Skill and battle-FX timing/layer polish.

## Verification Evidence

Latest verified commands in this worktree:

```text
npm test -- tests/resource3dAssets.test.ts tests/hero3dAssets.test.ts
2 files passed
10 tests passed
```

```text
npm test -- tests/hero3dAssets.test.ts
1 file passed
8 tests passed
```

```text
npm test -- tests/resource3dAssets.test.ts
1 file passed
9 tests passed
```

```text
npm test -- tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
7 files passed
44 tests passed
```

```text
npm test -- tests/render3d/fx3dVisual.test.ts tests/fxstyle.test.ts tests/fxlayer.test.ts
3 files passed
40 tests passed
```

```text
npm test -- tests/render3d/fx3dVisual.test.ts tests/fxstyle.test.ts tests/fxlayer.test.ts tests/render3d/resourceMotion.test.ts tests/resource3dFactory.test.ts tests/resource3dAssets.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts tests/commandMode.test.ts
9 files passed
71 tests passed
```

```text
npm test -- tests/render3d/terrainDressing.test.ts
1 file passed
11 tests passed
```

```text
npm run typecheck
passed
```

```text
npm test -- tests/render3d/terrainDressing.test.ts tests/resource3dAssets.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
6 files passed
33 tests passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

```text
npm test -- --run --pool=forks
102 files passed
871 tests passed
```

Preview smoke evidence:

```json
{
  "categories": ["lane_units", "neutral_units", "boss_objectives", "buildings", "shops_npcs", "couriers_summons", "items", "item_components", "consumables", "wards_traps", "spell_fx", "projectiles", "aoe_indicators", "environment_fx", "map_props", "runes_powerups", "pickups_drops", "status_effects", "ability_icons", "targeting_reticles", "combat_numbers", "health_mana_ui", "screen_overlays", "announcements", "shop_inventory_ui", "sound_cue_markers", "hero_roster_ui", "level_talent_ui", "death_recap_ui", "scoreboard_ui", "match_flow_ui", "cursor_commands", "system_notifications", "tutorial_guides", "ui_badges", "terrain_tiles", "minimap_markers", "team_banners"],
  "total": 408,
  "counts": {
    "lane_units": 10,
    "neutral_units": 10,
    "boss_objectives": 10,
    "buildings": 10,
    "shops_npcs": 10,
    "couriers_summons": 10,
    "items": 10,
    "item_components": 10,
    "consumables": 10,
    "wards_traps": 10,
    "spell_fx": 10,
    "projectiles": 10,
    "aoe_indicators": 10,
    "environment_fx": 15,
    "map_props": 21,
    "runes_powerups": 10,
    "pickups_drops": 10,
    "status_effects": 10,
    "ability_icons": 10,
    "targeting_reticles": 10,
    "combat_numbers": 10,
    "health_mana_ui": 10,
    "screen_overlays": 10,
    "announcements": 10,
    "shop_inventory_ui": 10,
    "sound_cue_markers": 10,
    "hero_roster_ui": 10,
    "level_talent_ui": 10,
    "death_recap_ui": 10,
    "scoreboard_ui": 10,
    "match_flow_ui": 10,
    "cursor_commands": 10,
    "system_notifications": 10,
    "tutorial_guides": 10,
    "ui_badges": 10,
    "terrain_tiles": 22,
    "minimap_markers": 10,
    "team_banners": 10
  }
}
```

V3 3D FX runtime evidence:

```text
Playwright @ http://127.0.0.1:5189/?mode=play&hero=zola&renderer=3d&seed=42&speed=0
Injected FX: fireblast, frostnova, lightning, miasma, purification, arcanebolt
Scene objects: 2075
Canvas count: 2
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v3-fx-polish.png
```

V5 hero readability runtime evidence:

```text
Playwright @ http://127.0.0.1:5200/?mode=hero3d-preview
Hero count: 10
Readability contracts: 10
Anchors per hero: 6
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v5-hero-readability.png
```

V5 lane-unit readability runtime evidence:

```text
Playwright @ http://127.0.0.1:5201/?mode=resource3d-preview
Lane unit count: 10
Lane readability contracts: 10
Anchors per lane unit: 6
Role classes: melee, ranged, siege, super, utility, scout
Team reads: dawn, night, neutral
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v5-lane-unit-readability.png
```

V5 neutral / boss readability runtime evidence:

```text
Playwright @ http://127.0.0.1:5202/?mode=resource3d-preview
Wild readability contracts: 20
Neutral units: 10
Boss/objectives: 10
Tiers: ancient, boss, large, medium, objective, small, special
Pack roles: ancient, boss-core, caster, flying, fodder, leader, objective-mechanic
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v5-neutral-boss-readability.png
```

V5 summon / ward readability runtime evidence:

```text
Playwright @ http://127.0.0.1:5202/?mode=resource3d-preview
Support readability contracts: 20
Summons/couriers: 10
Wards/traps: 10
Role classes: courier, illusion, summon, totem, trap, ward
Priority bands: low, medium
Max visual priority: 0.56
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v5-summon-ward-readability.png
```

V4 3D map terrain runtime evidence:

```text
Playwright @ http://127.0.0.1:5190/?mode=play&hero=zola&renderer=3d&seed=42&speed=0
Runtime layers:
terrain-sky-dome: 1
terrain-cloud-shadows: 5
terrain-atmosphere: 10
terrain-horizon-haze: 4
terrain-sun-shafts: 6
terrain-river-current: 9
terrain-river-bank-mud: 250
terrain-river-foam-glints: 189
terrain-ground-decals: 2182
terrain-ground-dirt-paths: 1306
terrain-ground-grass-mottle: 483
terrain-ground-stone-slabs: 393
terrain-tree-trunks: 2800
terrain-tree-canopy-primary: 2800
terrain-tree-canopy-secondary: 5600
terrain-tree-biome-accents: 3470
terrain-tree-radiant-light-canopy: 1171
terrain-tree-radiant-blooms: 586
terrain-tree-dire-dark-canopy: 1142
terrain-tree-dire-dead-branches: 571
terrain-grass-tufts: 3672
terrain-flower-patches: 651
terrain-river-reeds: 275
terrain-river-stones: 273
terrain-cliff-faces: 316
terrain-cliff-face-walls: 316
terrain-cliff-rock-caps: 316
terrain-cliff-ledge-shadows: 316
terrain-cliff-biome-details: 803
terrain-cliff-radiant-moss: 158
terrain-cliff-dire-scorch: 158
terrain-cliff-rubble: 253
terrain-cliff-cracks: 234
terrain-cliff-fences: 254
terrain-cliff-fence-rails: 254
terrain-cliff-fence-posts: 508
terrain-cliff-fence-stone-bases: 508
terrain-highground-edges: 316
terrain-ramp-stairs: 18
terrain-landmark-rings: 17
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v4-map-terrain-realism.png
```

V4 river runtime-motion evidence:

```text
Playwright @ http://127.0.0.1:5199/?mode=play&renderer=3d
Runtime layers:
terrain-river-current: 9
terrain-river-bank-mud: 250
terrain-river-reeds: 275
terrain-river-stones: 273
terrain-river-foam-glints: 189
Motion contracts:
terrain-river-current.motion: flow
terrain-river-foam-glints.motion: foam-pulse
terrain-river-reeds.motion: reed-sway
Before:
current strip x/z: 2741.364 / 3042.164
foam opacity: 0.301
reed rotation z: -0.014
After:
current strip x/z: 2683.075 / 2983.875
foam opacity: 0.466
reed rotation z: -0.025
Canvas count: 2
Page errors: none
Screenshot: docs/screenshots/ux-3d-v4-map-river-motion-polish.png
```

```text
Additional V4 terrain screenshots:
docs/screenshots/ux-3d-v4-map-treewall-closeup.png
docs/screenshots/ux-3d-v4-map-treewall-biome-radiant.png
docs/screenshots/ux-3d-v4-map-treewall-biome-dire.png
docs/screenshots/ux-3d-v4-map-river-bank-polish.png
docs/screenshots/ux-3d-v4-map-river-motion-polish.png
docs/screenshots/ux-3d-v4-map-ground-decals-polish.png
docs/screenshots/ux-3d-v4-map-sky-fog-polish.png
docs/screenshots/ux-3d-v4-map-fence-blocker-polish.png
docs/screenshots/ux-3d-v4-map-highground-ramp.png
docs/screenshots/ux-3d-v4-map-cliff-face-rocky.png
docs/screenshots/ux-3d-v4-map-cliff-biome-polish.png
docs/screenshots/ux-3d-v4-map-cliff-biome-dire-polish.png
```

## Merge Notes

- Main collision risk: `src/main.ts`.
- Dependency collision risk remains `package.json` / `package-lock.json` from the shared Three.js dependency.
- `src/sim/unit.ts` has intentional queued-order control plumbing. Review it with `src/engine/input.ts`, `tests/queuedOrders.test.ts`, and `tests/commandMode.test.ts`.
- 3D FX runtime is now active in normal `renderer=3d` play mode through `src/render3d/fx3d.ts`.
- V4 map terrain runtime layers are active in normal `renderer=3d` play mode through `src/render3d/terrain3d.ts`.
- V5 first-read hero metadata is active in `?mode=hero3d-preview` and available for future GLB/PBR mapping through `src/render/hero3dAssets.ts`.
- V5 lane-unit role/faction metadata is active in `?mode=resource3d-preview` and available for future creep GLB/PBR mapping through `src/render/resource3dAssets.ts`.
- V5 neutral/boss and summon/ward metadata is active in `?mode=resource3d-preview` and available for future GLB/PBR mapping through `src/render/resource3dAssets.ts`.
- Screenshots are intentional evidence under `docs/screenshots/`.
