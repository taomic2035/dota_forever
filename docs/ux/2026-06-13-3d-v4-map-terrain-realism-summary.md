# 3D V4 Map Terrain Realism Summary

Date: 2026-06-13
Status: V4 map terrain realism continuation, based on Dota map-element research target

## Research Target

Research target document:

- `docs/ux/2026-06-13-dota-map-elements-research-target.md`

The target is not to copy Dota assets. The extracted direction is:

- terrain should communicate gameplay rules before decoration;
- Dota-style ground should read as worn lanes, dirt/stone travel paths, grass mottling, and side-biome color shifts, not a single flat field;
- high ground, cliffs, ramps, tree walls, river, jungle clearings, landmarks, sky/fog must be visually distinct;
- map elements should stay original, procedural, deterministic, and compatible with current sim/pathing.

Live references checked this pass:

- Valve Dota 2 New Frontiers page: `https://www.dota2.com/newfrontiers`
- Dota 2 Dawnbreaker page environment screenshots: `https://www.dota2.com/dawnbreaker`

## Player-Facing Changes

- Added deterministic V4 terrain dressing samples for:
  - grass tufts
  - ground dirt path decals
  - ground grass mottle decals
  - ground stone slab decals
  - flower patches
  - river reeds
  - river stones
  - riverbank wet mud
  - river foam glints
  - layered cliff faces / rocky ledges
  - Radiant/Dire cliff tint, rubble, and crack details
  - cliff fences / terrain blockers
  - highground edge shadow markers
  - landmark rings for runes, shops, camps, and boss pit
  - sky dome
  - cloud shadows
  - horizon haze
  - sun shafts
- Added runtime 3D layers in `buildTerrain3D`:
  - `terrain-sky-dome`
  - `terrain-cloud-shadows`
  - `terrain-atmosphere`
    - `terrain-horizon-haze`
    - `terrain-sun-shafts`
  - `terrain-river-current`
  - `terrain-river-bank-mud`
  - `terrain-river-foam-glints`
  - `terrain-ground-decals`
    - `terrain-ground-dirt-paths`
    - `terrain-ground-grass-mottle`
    - `terrain-ground-stone-slabs`
  - `terrain-tree-trunks`
  - `terrain-tree-canopy-primary`
  - `terrain-tree-canopy-secondary`
  - `terrain-tree-biome-accents`
    - `terrain-tree-radiant-light-canopy`
    - `terrain-tree-radiant-blooms`
    - `terrain-tree-dire-dark-canopy`
    - `terrain-tree-dire-dead-branches`
  - `terrain-grass-tufts`
  - `terrain-flower-patches`
  - `terrain-river-reeds`
  - `terrain-river-stones`
  - `terrain-cliff-faces`
    - `terrain-cliff-face-walls`
    - `terrain-cliff-rock-caps`
    - `terrain-cliff-ledge-shadows`
  - `terrain-cliff-biome-details`
    - `terrain-cliff-radiant-moss`
    - `terrain-cliff-dire-scorch`
    - `terrain-cliff-rubble`
    - `terrain-cliff-cracks`
  - `terrain-cliff-fences`
    - `terrain-cliff-fence-rails`
    - `terrain-cliff-fence-posts`
    - `terrain-cliff-fence-stone-bases`
  - `terrain-highground-edges`
  - `terrain-ramp-stairs`
  - `terrain-landmark-rings`
- Upgraded tree walls from single cone canopies to trunk + primary canopy + secondary canopy instancing.
- Added side-biome accents so Radiant-side trees read lusher with lighter foliage / blooms, while Dire-side trees read darker with dead branches.
- Added river current highlight strips over the water surface.
- Added riverbank wet mud patches and foam/glint strips so the river reads as a banked corridor, not a flat blue plane.
- Added runtime-only river motion so current strips drift, foam/glints pulse, and reeds sway without changing map pathing.
- Added ground decals for worn dirt paths, mottled grass patches, and scattered stone slabs so flat walkable areas no longer read as one solid green material.
- Added horizon haze and subtle sun shafts so the sky/fog reads as outdoor battlefield atmosphere instead of a flat overhead board.
- Added ramp stair slabs so passable highground entrances read differently from obstructing cliff/fence edges.
- Upgraded highground cliffs from a single dark edge marker into layered rocky walls with top caps and bottom shadows.
- Added side-specific cliff tint, rubble, and crack layers so Radiant highground reads greener/lusher while Dire highground reads darker and scorched.
- Upgraded cliff fences / blockers from a single bar into rails, posts, and stone bases.

## Runtime Evidence

Playwright runtime screenshot:

- `docs/screenshots/ux-3d-v4-map-terrain-realism.png`
- `docs/screenshots/ux-3d-v4-map-treewall-closeup.png`
- `docs/screenshots/ux-3d-v4-map-treewall-biome-radiant.png`
- `docs/screenshots/ux-3d-v4-map-treewall-biome-dire.png`
- `docs/screenshots/ux-3d-v4-map-river-bank-polish.png`
- `docs/screenshots/ux-3d-v4-map-river-motion-polish.png`
- `docs/screenshots/ux-3d-v4-map-ground-decals-polish.png`
- `docs/screenshots/ux-3d-v4-map-sky-fog-polish.png`
- `docs/screenshots/ux-3d-v4-map-fence-blocker-polish.png`
- `docs/screenshots/ux-3d-v4-map-highground-ramp.png`
- `docs/screenshots/ux-3d-v4-map-cliff-face-rocky.png`
- `docs/screenshots/ux-3d-v4-map-cliff-biome-polish.png`
- `docs/screenshots/ux-3d-v4-map-cliff-biome-dire-polish.png`

Captured layer counts:

```text
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
```

## Implementation Notes

- `src/render3d/terrainDressing.ts`
  - Adds pure deterministic sampler `terrainDressingSamples(map)`.
  - Adds `terrainDressingSummary(samples)` for tests and review.
  - Sampling reads current `GameMap` height/walkability/tree/rune/shop/camp/pit data.
- `src/render3d/terrain3d.ts`
  - Keeps current terrain elevation contract.
  - Adds named Three.js layers for Opus inspection.
  - Uses `InstancedMesh` for repeated low vegetation, river stones, blockers, and tree wall layers.
  - Exports `updateTerrainRuntimeMotion(root, t)` for visual-only water/foam/reed movement in the 3D renderer.
  - Samples trees across the full map instead of taking the first scan-order subset, improving tree-wall coverage near multiple jungle regions.
  - Keeps all changes visual-only: no pathing, combat, map-layout, or sim-rule changes.

## Verification

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

Runtime:

```text
Playwright @ http://127.0.0.1:5190/?mode=play&hero=zola&renderer=3d&seed=42&speed=0
Canvas count: 2
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v4-map-terrain-realism.png
```

```text
Playwright @ http://127.0.0.1:5191/?mode=play&hero=zola&renderer=3d&seed=42&speed=0
Tree-wall close-up layers:
terrain-tree-trunks: 2800
terrain-tree-canopy-primary: 2800
terrain-tree-canopy-secondary: 5600
Screenshot: docs/screenshots/ux-3d-v4-map-treewall-closeup.png
```

```text
Playwright @ http://127.0.0.1:5193/?mode=play&hero=zola&renderer=3d&seed=42&speed=0
Tree-wall biome layers:
terrain-tree-biome-accents: 3470
terrain-tree-radiant-light-canopy: 1171
terrain-tree-radiant-blooms: 586
terrain-tree-dire-dark-canopy: 1142
terrain-tree-dire-dead-branches: 571
Console/page errors: none
Screenshots:
docs/screenshots/ux-3d-v4-map-treewall-biome-radiant.png
docs/screenshots/ux-3d-v4-map-treewall-biome-dire.png
```

```text
Playwright @ http://127.0.0.1:5194/?mode=play&hero=zola&renderer=3d&seed=42&speed=0
Riverbank polish layers:
terrain-river-current: 9
terrain-river-bank-mud: 250
terrain-river-foam-glints: 189
terrain-river-reeds: 275
terrain-river-stones: 273
terrain-landmark-rings: 17
terrain-grass-tufts: 3672
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v4-map-river-bank-polish.png
```

```text
Playwright @ http://127.0.0.1:5199/?mode=play&renderer=3d
River runtime motion layers:
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
Playwright @ http://127.0.0.1:5196/?mode=play&renderer=3d
Ground decal polish layers:
terrain-ground-decals: 2182
terrain-ground-dirt-paths: 1306
terrain-ground-grass-mottle: 483
terrain-ground-stone-slabs: 393
terrain-grass-tufts: 3672
terrain-flower-patches: 651
terrain-river-bank-mud: 250
Screenshot: docs/screenshots/ux-3d-v4-map-ground-decals-polish.png
```

```text
Playwright @ http://127.0.0.1:5197/?mode=play&renderer=3d
Sky/fog polish layers:
terrain-sky-dome: 1
terrain-cloud-shadows: 5
terrain-atmosphere: 10
terrain-horizon-haze: 4
terrain-sun-shafts: 6
terrain-ground-decals: 2182
terrain-river-current: 9
Canvas count: 2
Page errors: none
Screenshot: docs/screenshots/ux-3d-v4-map-sky-fog-polish.png
```

```text
Playwright @ http://127.0.0.1:5191/?mode=play&hero=zola&renderer=3d&seed=42&speed=0
Highground/ramp close-up layers:
terrain-cliff-faces: 316
terrain-cliff-face-walls: 316
terrain-cliff-rock-caps: 316
terrain-cliff-ledge-shadows: 316
terrain-cliff-fences: 254
terrain-highground-edges: 316
terrain-ramp-stairs: 18
Screenshot: docs/screenshots/ux-3d-v4-map-highground-ramp.png
```

```text
Playwright @ http://127.0.0.1:5195/?mode=play&hero=zola&renderer=3d&seed=42&speed=0
Fence/blocker polish layers:
terrain-cliff-fences: 254
terrain-cliff-fence-rails: 254
terrain-cliff-fence-posts: 508
terrain-cliff-fence-stone-bases: 508
terrain-cliff-faces: 316
terrain-highground-edges: 316
terrain-ramp-stairs: 18
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v4-map-fence-blocker-polish.png
```

```text
Playwright @ http://127.0.0.1:5192/?mode=play&hero=zola&renderer=3d&seed=42&speed=0
Rocky cliff close-up layers:
terrain-cliff-faces: 316
terrain-cliff-face-walls: 316
terrain-cliff-rock-caps: 316
terrain-cliff-ledge-shadows: 316
terrain-cliff-fences: 254
terrain-highground-edges: 316
terrain-ramp-stairs: 18
terrain-tree-trunks: 2800
terrain-tree-canopy-secondary: 5600
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v4-map-cliff-face-rocky.png
```

```text
Playwright @ http://127.0.0.1:5198/?mode=play&renderer=3d
Cliff biome polish layers:
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
terrain-highground-edges: 316
terrain-ramp-stairs: 18
Canvas count: 2
Page errors: none
Screenshots:
docs/screenshots/ux-3d-v4-map-cliff-biome-polish.png
docs/screenshots/ux-3d-v4-map-cliff-biome-dire-polish.png
```

## Remaining UX Debt

- Tree canopy now has Radiant/Dire biome accents, but future passes can add hand-authored branch silhouettes, denser wall clumping, and side-specific seasonal variants.
- River now has wet banks, foam/glint strips, current strip drift, foam opacity pulse, and reed sway; future passes can add texture UV shaders and water normal maps if the production pipeline supports them.
- Ground now has dirt path, grass mottle, and stone slab decal layers; future pass can add authored path masks, side-specific terrain materials, and subtle shader noise.
- Sky/fog now has a named atmosphere group with horizon haze and sun shafts; future pass can animate cloud/haze drift and tune team-side color grading.
- Cliff side geometry now has vertical walls, rock caps, ledge shadows, side tint, rubble, and cracks; future passes can still add authored cliff silhouettes and sharper per-region rock masks.
- Fences/blockers now have rails, posts, and stone bases; they remain sparse visual separators and do not imply destructible gameplay.

## Opus Handoff

### What

Adds V4 map terrain realism layers and a Dota-informed research target for highground, tree walls, grass/flowers, blockers, river, sky/fog, and landmarks.

### Why

The previous map had height mesh, water, and tree placement, but still read too much like a flat board. This pass starts converting it into a readable MOBA battlefield where terrain communicates gameplay affordances.

### Tradeoff

- Chose deterministic procedural layers instead of external assets.
- Chose named runtime layers for inspection and merge safety.
- Kept tree/vegetation draw calls bounded with instancing.
- Did not change map layout, pathing, highground rules, vision, or combat.

### Next Action

After this terrain pass is verified, continue the same workflow for:

1. heroes
2. lane creeps
3. summons
4. neutral creeps / bosses
5. skills
6. battle FX

Each should start with Dota visual-language research, then an original implementation target, tests, runtime screenshots, and Opus handoff notes.
