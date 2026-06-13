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
- Adds material/detail metadata, high-detail procedural texture overlays, runtime resource motion, part-level model motion, richer 3D battle FX, and shift-queued command UX.
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
  - The first 10 heroes have sample model/action contracts, but not every hero in the eventual roster.
  - Items/components/abilities have representative samples, not one final unique asset per final gameplay entry.
- [ ] Code splitting is not done.
  - Three.js is still statically imported through preview paths, so Vite reports a large chunk warning.
  - Recommended before production merge: lazy-load `hero3dPreview.ts` and `resource3dPreview.ts` behind query routes.
- [x] Full-suite timing has fresh merge evidence.
  - `npm test -- --run` passed in this worktree after the V3 FX polish.
  - 101 test files passed, 867 tests passed.

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
- `src/render/resource3dFactory.ts`
  - Procedural Three.js resource model factory.
- `src/ui/resource3dPreview.ts`
  - Category-tabbed preview page.
- `src/main.ts`
  - Adds route-gated previews and renderer/UX wiring.
- `src/render3d/fx3dVisual.ts`
  - Pure 3D FX layer contract from `fxStyle` family/pattern metadata.
- `src/render3d/fx3d.ts`
  - Runtime multi-layer 3D FX and projectile group renderer.
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

## Verification Evidence

Latest verified commands in this worktree:

```text
npm test -- tests/resource3dAssets.test.ts tests/hero3dAssets.test.ts
2 files passed
10 tests passed
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
npm run typecheck
passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

```text
npm test -- --run
101 files passed
867 tests passed
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

## Merge Notes

- Main collision risk: `src/main.ts`.
- Dependency collision risk remains `package.json` / `package-lock.json` from the shared Three.js dependency.
- `src/sim/unit.ts` has intentional queued-order control plumbing. Review it with `src/engine/input.ts`, `tests/queuedOrders.test.ts`, and `tests/commandMode.test.ts`.
- 3D FX runtime is now active in normal `renderer=3d` play mode through `src/render3d/fx3d.ts`.
- Screenshots are intentional evidence under `docs/screenshots/`.
