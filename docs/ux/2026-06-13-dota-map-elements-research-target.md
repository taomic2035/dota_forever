# Dota Map Elements Research Target

Date: 2026-06-13
Worktree: `/Users/taomic/vibecoding/dota_forever-shift-queue`
Status: Research target for V4 map realism polish

## Research Goal

Before continuing implementation, align the 3D map art target with the real Dota map language:

- high ground
- trees and tree walls
- grass and flowers
- fences / terrain blockers
- cliffs and ramps
- river and banks
- sky / haze / cloud shadows
- objective landmarks

This is not a copy-assets target. The goal is to extract visual and gameplay readability principles, then implement an original procedural style that feels like a real MOBA battlefield.

## Sources Reviewed

- Dota 2 Wiki: Map terrain, jungle, buildings, vision, and pathing semantics.
  - `https://dota2.fandom.com/wiki/Map`
- Liquipedia: Map page and river/rune screenshots.
  - `https://liquipedia.net/dota2/Map`
  - `https://liquipedia.net/commons/File:Dota_2_Rune_Spot_Radiant_jungle_preview.jpg`
- Official Dota 2 pages surfaced by search/image results:
  - `https://www.dota2.com/dawnbreaker`
  - `https://www.dota2.com/newfrontiers`
  - `https://www.dota2.com/wanderingwaters`
- Existing local design notes:
  - `docs/ux/2026-06-12-world-readability-design.md`
  - `docs/superpowers/specs/2026-06-13-3d-visual-overhaul-design.md`

## Dota Map Observations

### Gameplay-First Terrain Language

Dota's terrain communicates rules before decoration:

- Height levels matter. Public map docs identify river, low ground, high ground, elevated ground, cliffs, and valleys as gameplay-relevant levels.
- Height transitions must read clearly. A connection can be passable stairs/ramp or an obstructing cliff.
- Trees are not background decoration. They define lane and jungle contours, block paths, obstruct vision, and create juke routes.
- River is a control lane. It divides the map, hosts important runes/objectives, and visually contrasts against land with cooler water, banks, rocks, reeds, and reflection/shimmer.
- Jungle is a dense readability zone: darker ground, tree masses, camp clearings, narrow routes, and obvious entrances.
- Landmark areas are readable from the camera height: rune spots, shops, boss pit, camps, towers, barracks, and bases have local visual frames.

### Visual Shape Language

From official screenshots and map references:

- Radiant-style areas feel lush: varied green trees, yellow/white flowering canopies, dirt paths, grass patches, stone steps, bright sky haze.
- Dire-style areas feel harsher: darker ground, dead or red-orange trees, twisted silhouettes, cooler fog, sharper cliffs, flame/ember accents.
- River zones use blue-green water, visible banks, stones, reeds/grass clusters, and rune glow.
- High ground and ramps use stone slabs/stairs and stronger shadows, so players immediately see elevation and passable entries.
- Tree walls work best as clustered masses with varied canopy heights and colors, not isolated repeated cones.
- The sky is not a main object, but it gives atmosphere through fog, background color, and cloud-shadow movement.

## Our V4 Map Art Target

### 1. High Ground

Target:

- Preserve the current simulated height contract, but make high ground visually stronger.
- Add darker vertical cliff/edge treatment around height changes.
- Add passable ramp/stair slabs where traversal exists.
- Use warmer dry stone/grass colors on elevated areas.
- Add sparse fence/stone boundary accents on obstructing edges.

Acceptance evidence:

- Runtime screenshot shows base/highground edges without needing UI labels.
- Pure tests can distinguish highground edge samples from flat ground samples.

### 2. Trees And Tree Walls

Target:

- Replace "single cone tree" feel with clustered tree walls:
  - trunk + 2-3 canopy lobes
  - height/color variance
  - broadleaf, pine, dead tree, flowering tree variants
- Tree walls should cast/receive visible shadow and create dark mass at jungle boundaries.
- Keep trees aligned with `GameMap.trees`, because they affect pathing and vision.

Acceptance evidence:

- Tree layer uses instancing or grouped static meshes.
- Screenshot shows dense wall silhouettes, not evenly spaced toy trees.

### 3. Grass, Flowers, And Low Vegetation

Target:

- Add low-profile instanced grass tufts on walkable lowland and jungle clearings.
- Add flower patches mostly around Radiant-like grass, lane edges, and open clearings.
- Add reeds near riverbanks.
- Keep all vegetation below unit silhouette height, so it adds texture without hiding units.

Acceptance evidence:

- Pure dressing sample test covers grass, flowers, reeds.
- Runtime screenshot shows ground richness without occluding heroes/creeps.

### 4. Fences And Terrain Blockers

Target:

- Use wood/stone fence fragments as readable edge dressing for no-walk or cliff boundaries.
- Do not make fences look like interactive destructibles unless gameplay supports it.
- Keep them short, broken, and sparse, so they signal terrain separation rather than walling the whole map.

Acceptance evidence:

- Fence samples appear along highground/cliff or tree-wall boundary zones.
- They do not cover lane centers or ramp mouths.

### 5. River, Banks, And Water

Target:

- Lower water below flat ground.
- Use transparent blue-green water with subtle moving highlight/current ribbons.
- Add darker muddy banks.
- Add reeds and stones near river edge.
- Add rune/objective rings over the water/bank where relevant.

Acceptance evidence:

- Screenshot shows river as a distinct gameplay corridor, not just a flat blue strip.
- Water, reeds, stones, and rune rings are separate inspectable scene layers.

### 6. Sky, Fog, And Cloud Shadows

Target:

- Add a large non-interactive sky dome/background gradient.
- Keep fog tied to day/night mood.
- Add a few soft cloud-shadow planes/ribbons over terrain, very low opacity.
- Never obscure unit readability.

Acceptance evidence:

- Scene contains named sky/cloud layers.
- Screenshot reads as outdoor battlefield instead of objects on a flat green plane.

### 7. Landmarks

Target:

- Add ground rings/plates for:
  - rune spots
  - shops
  - neutral camps
  - boss pit
- Use color and material language, not text labels.
- Keep these visual-only; do not alter sim rules.

Acceptance evidence:

- Named `terrain-landmark-rings` layer exists.
- Rings sit on terrain elevation and are visible from the 3D camera.

## Implementation Target For This Branch

### Must Add Now

- `terrainDressingSamples(map)` pure sampler:
  - deterministic
  - emits grass, flowers, reeds, river stones, cliff fences, highground edge markers, landmark rings, sky dome, cloud shadows
  - each sample includes kind, position, scale, rotation, color, variant
- `buildTerrain3D(map)` consumes samples and adds named scene layers:
  - `terrain-sky-dome`
  - `terrain-cloud-shadows`
  - `terrain-grass-tufts`
  - `terrain-flower-patches`
  - `terrain-river-reeds`
  - `terrain-river-stones`
  - `terrain-cliff-fences`
  - `terrain-landmark-rings`
- Keep changes visual-only:
  - no pathing changes
  - no combat changes
  - no map layout changes

### Should Improve If Time Allows

- Upgrade tree instancing from cone-only to trunk + multi-canopy variants.
- Add river water material with transparent shimmer strips.
- Add cliff shadow skirts along highground edges.
- Add a dedicated screenshot route or scripted camera for terrain review.

### Explicit Non-Goals For This Pass

- No copied Dota assets, textures, models, or map layout.
- No GLB/PBR import pipeline yet.
- No gameplay changes for high ground, river current, tree destruction, or neutral objectives.
- No final art completion claim; this is a V4 procedural target pass.

## Quality Bar

This pass is successful only if:

- The live 3D map reads as terrain, not a flat board.
- High ground, river, tree walls, vegetation, blockers, and landmarks are each visually distinguishable.
- The implementation remains deterministic and testable.
- Screenshot evidence is generated from the current worktree.
- Opus can merge it as a visual/control slice without hunting through undocumented intent.
