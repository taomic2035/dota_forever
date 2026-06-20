# Resource3D Phase 1 Summary

Date: 2026-06-13  
Worktree: `~/vibecoding/dota_forever-hero-ingame-art`  
Preview URL: `http://127.0.0.1:5182/?mode=resource3d-preview`  
Screenshot: `docs/screenshots/ux-resource3d-preview.png`
Terrain screenshots:

- `docs/screenshots/ux-resource3d-terrain-preview.png`
- `docs/screenshots/ux-resource3d-map-props-preview.png`
- `docs/screenshots/ux-resource3d-environment-preview.png`
Feedback screenshot:

- `docs/screenshots/ux-resource3d-feedback-preview.png`
Match-shell screenshot:

- `docs/screenshots/ux-resource3d-match-ui-preview.png`

## Scope

This phase adds non-hero resource samples after the Hero3D pass. It is a first art-direction and integration-contract pass, not the final production asset pack.

Covered categories:

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

Total: 408 non-hero resource samples.

## Files

- `src/render/resource3dAssets.ts`
  - Resource category list, texture channel contract, 408 sample asset specs.
- `src/render/resource3dFactory.ts`
  - Procedural Three.js model factory for resource samples.
- `src/ui/resource3dPreview.ts`
  - Preview page with category tabs and at least 10 samples per category.
- `src/main.ts`
  - Adds `?mode=resource3d-preview`.
- `tests/resource3dAssets.test.ts`
  - Locks full category coverage, expandable sample counts, renderable part contract, visual variety, and unique keys.
- `docs/screenshots/ux-resource3d-preview.png`
  - Current preview evidence.
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

No `src/sim/**` files were changed.

## Contract

Every resource sample has:

- globally unique `key`,
- `category`,
- display `name`,
- gameplay/art `role`,
- `silhouette`,
- `motif`,
- `scale`,
- texture channels:
  - `albedo`
  - `normal`
  - `orm`
  - `emissive`
- a preview motion:
  - `idle`
  - `pulse`
  - `spin`
  - `float`
  - `impact`
  - `ambient`
- at least 4 model parts.

## Phase Plan

Phase 1, complete in this branch:

- Add procedural samples for all major non-hero resource types.
- Extend coverage beyond world objects into objectives, NPCs, summons, components, consumables, traps, projectile/VFX layers, pickups, tactical markers, UI badges, and terrain tiles.
- Add a terrain dressing expansion that explicitly covers flat ground, trees, grass, flowers, high ground, fences, slopes/ramps, river/riverbanks, sky domes, cloud shadows, and sky lighting.
- Add UX feedback categories for ability icons, targeting reticles, combat numbers, health/mana bars, screen overlays, announcements, shop/inventory UI, and sound cue markers.
- Add match-shell UX categories for hero roster, level/talent UI, death recap, scoreboard, match flow, cursor commands, system notifications, and tutorial guides.
- Provide a browser preview route for art review.
- Keep the preview route isolated from simulation logic.

Phase 2, recommended:

- Replace category samples with real GLB assets one category at a time.
- Start with `lane_units`, `buildings`, `spell_fx`, `projectiles`, `aoe_indicators`, and `terrain_tiles`, because these are most visible during gameplay.
- Keep the current keys and texture/action-style contract where possible.

Phase 3, recommended:

- Wire selected Resource3D assets into gameplay rendering.
- Add LOD/collision metadata if the renderer needs real map placement.
- Lazy-load Three.js preview modules to avoid increasing the main gameplay chunk.

## Verification

Latest verified commands:

```text
npm test -- tests/resource3dAssets.test.ts
5 tests passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

Preview smoke:

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
