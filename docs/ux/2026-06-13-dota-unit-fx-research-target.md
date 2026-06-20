# Dota Unit And FX Research Target

Date: 2026-06-13
Worktree: `~/vibecoding/dota_forever-shift-queue`
Status: Research target for the next UX/art polish phase after V4 terrain

## Research Goal

After the terrain pass, improve the current heroes, lane creeps, summons, neutral creeps, skills, and battle FX with the same rule:

- first study the real Dota visual language;
- then define an original implementation target;
- keep every asset readable from the game camera;
- preserve `tree3d.js` / Three.js runtime compatibility with model parts, texture metadata, and action/fx contracts.

This is not a copied-asset target. The branch should keep using original procedural assets until a production GLB/PBR pipeline exists.

## Sources Reviewed

- Dota 2 official heroes page: hero roster and ability-forward framing.
  - `https://www.dota2.com/heroes`
- Valve / Steam Support Dota 2 Workshop Character Art Guide: silhouette, orientation, and first-glance recognition rules.
  - `https://help.steampowered.com/en/faqs/view/0688-7692-4D5A-1935`
- Dota 2 Wiki: creeps and abilities definitions.
  - `https://dota2.fandom.com/wiki/Creeps`
  - `https://dota2.fandom.com/wiki/Abilities`
- Liquipedia: lane creeps and neutral creeps gameplay role.
  - `https://liquipedia.net/dota2/Creeps`
  - `https://liquipedia.net/dota2/Neutral_Creeps`
- Official Dota 2 Wandering Waters page: newer neutral camp / flooded camp direction.
  - `https://www.dota2.com/wanderingwaters`

## Observations

### Hero Visual Language

- Heroes must be recognizable by silhouette, orientation, scale, and primary identity props.
- The camera view means body mass, weapon angle, shoulder/head shape, cape/wings/staff silhouettes, and color blocking matter more than tiny surface detail.
- Attribute/readability families are useful but should not become one-note color coding:
  - strength-like heroes: heavier base, bigger shoulders, armor mass, grounded stance;
  - agility-like heroes: narrower limbs, weapon arcs, tails/capes/blades, faster idle motion;
  - intelligence-like heroes: staff/orb/book/robe silhouettes, floating layers, magical glows.
- Each hero needs at least:
  - model part hierarchy;
  - material/texture channels;
  - idle/move/attack/cast/hit/death action clips;
  - combat state overlays that do not hide the silhouette.

### Lane Creeps

- Lane creeps are readable by faction, role, and formation more than individuality.
- Melee/ranged/siege units need different silhouettes at a glance:
  - melee: compact body, weapon front, shield/shoulder mass;
  - ranged: thinner body, bow/staff/projectile armature;
  - siege: low heavy profile, wheels/treads, barrel/launcher.
- Team variants should share role shape but differ in palette, banners, armor trim, and glow accents.

### Summons And Wards

- Summons should read as player-controlled but lower priority than heroes.
- Wards/traps need unmistakable placement markers without becoming hero-scale objects.
- Summon visuals should use owner/team accents, simple action clips, and reduced particle intensity.

### Neutral Creeps And Bosses

- Neutral creeps should communicate camp tier and biome:
  - small: simple animal/beast silhouettes, low height;
  - medium/large: heavier shoulders/horns/claws;
  - ancient/boss: large footprint, high contrast weak/strong parts, special idle aura.
- Camp packs need internal variety but must still read as one camp from a distance.
- Flooded/river-adjacent neutrals can get amphibian materials, wet highlights, and cooler palette accents later.

### Skills And Battle FX

- Abilities range from passive/simple effects to large explosions and terrain-changing effects, so one FX shape will not be enough.
- FX should communicate:
  - source and target;
  - danger radius / beam / projectile path;
  - damage school or status family;
  - timing: windup, impact, lingering zone, fade.
- Battle FX must stay below hero readability priority. A cast can flare, but the hero and target should remain visible.

## Implementation Target For Next Phase

### Must Do Next

1. Hero polish pass
   - Pick the existing first 10 classic heroes.
   - Increase silhouette uniqueness, material richness, and action pose quality.
   - Add per-hero texture/detail hooks that can later map to GLB/PBR assets.
2. Lane creep polish pass
   - Define melee/ranged/siege silhouettes for both teams.
   - Add faction banners/trim and role-specific movement/attack motion.
3. Neutral / boss polish pass
   - Define small, medium, large, ancient, and boss visual tiers.
   - Add camp-pack color/material variation.
4. Summon / ward polish pass
   - Keep them visibly team-owned and lower visual priority than heroes.
   - Add simple idle/cast/expire cues.
5. Skill / FX polish pass
   - Expand existing burst/beam/AoE/projectile families with better windup, impact, linger, and fade layering.
   - Keep named runtime layers for inspection, like the terrain pass.

### Tests And Evidence

Each slice should include:

- pure metadata tests for visual contracts;
- runtime layer tests for named Three.js objects;
- Playwright screenshot evidence from `?mode=play&renderer=3d`;
- an Opus handoff update in `docs/ux/2026-06-13-resource3d-opus-handoff.md`.

### Explicit Non-Goals

- No copied Dota models, textures, particles, icons, or audio.
- No gameplay balance or sim-rule changes unless Opus requests a specific integration point.
- No final production-asset claim until GLB/PBR import, rigging, LOD, animation clips, and texture packaging exist.

## Quality Bar

This next phase is successful only if:

- the first 10 heroes are individually recognizable from the 3D camera;
- lane creeps, summons, neutrals, and bosses each read as distinct gameplay classes;
- FX clearly communicates cast type and danger shape without burying units;
- all changes remain deterministic, inspectable, test-covered, and documented for Opus merge.
