# World Readability UX Design

Date: 2026-06-12
Status: auto-approved continuation of the core UX direction

## Goal

Make the live battlefield easier to parse before adding more art volume. This batch focuses on map language, landmark icons, minimap consistency, and projectile families. It keeps the DotA 1 / Warcraft III command grammar, but follows the newer approved fantasy MOBA look instead of copying original assets.

## Scope

This pass owns four player-facing reads:

- Where am I standing: river, lane, jungle, ramp, high ground, base, or tree wall.
- What is important nearby: tower, barracks, ancient, fountain, shop, rune, pit, and neutral camp.
- What is moving toward me: physical projectile, tower shot, or ability projectile.
- What does the minimap mean: the same landmark categories should appear in compact form.

It does not replace every hero model, spell icon, or terrain tile with final art. The renderer remains procedural and independent.

## Design

### Terrain Language

Terrain should encode gameplay hierarchy:

- River: cooler blue-green base, moving highlight flecks, darker banks.
- Lane: worn earth/stone strokes along lane paths so creep routes read at a glance.
- Jungle: darker ground pockets with dense tree walls and camp clearings.
- High ground/base: warmer stone/grass mix with strong edge shadows.
- Ramps: visible mouth/bridge treatment that breaks the high-ground edge.
- Tree walls: grouped dark silhouettes with edge shadow, not random background circles.

The first implementation should introduce a pure `mapReadability` helper so tests can lock the semantic classification before Canvas styling changes.

### Landmarks

Landmarks should use simple vector marks instead of text glyphs, because font fallback currently makes some symbols render inconsistently on Windows:

- Secret shop: cyan diamond with small ring.
- Normal shop/fountain zone: gold ring.
- Pit/Boss: purple lair ring and triangular fang mark.
- Rune spot: gold-purple rune ring.
- Camps: tiered small dots on the minimap only for now.
- Base buildings: tower, barracks, ancient, fountain already have separate world silhouettes; minimap should mirror those categories with shape differences.

### Projectile Families

Projectile shape should communicate threat:

- Physical attack: slim arrow/bolt, team-tinted.
- Tower shot: heavier glowing lance, high contrast, source-team tint.
- Ability projectile: larger magic orb with colored trail based on effect style.

This batch should avoid changing damage or projectile rules.

## Acceptance Criteria

- A deterministic pure test can classify river, base, tree wall, ramp, pit, rune, shop, and camp visual categories.
- World render uses the classification for stronger terrain and landmark visuals.
- Minimap no longer relies on broken text glyphs for secret shop and pit icons.
- Projectile drawing differentiates physical, tower, and ability shots.
- New screenshots show the map/base readability pass and the lane HUD still has no minimap overlap.

## Summary Protocol

After implementation, add `docs/ux/2026-06-12-world-readability-summary.md` with player-facing changes, design mapping, screenshots, commands run, and remaining UX debt.
