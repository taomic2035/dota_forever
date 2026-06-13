# 3D V5 Lane Unit Readability Summary

Date: 2026-06-14
Status: V5 lane-unit polish continuation after hero readability

## Research Target

Research target document:

- `docs/ux/2026-06-13-dota-unit-fx-research-target.md`

Extracted direction:

- lane units should read by faction, role, and formation first;
- melee/ranged/siege silhouettes must be distinguishable from the game camera;
- team variants should share role shape but differ through palette, banners, trim, and glow accents;
- current implementation remains original procedural Three.js art and does not copy Dota assets.

## Player-Facing Changes

- Added V5 lane-unit readability contracts for all 10 `lane_units` samples:
  - `teamRead`
  - `roleClass`
  - `formationSlot`
  - `attackRead`
  - `silhouetteAnchors`
- Covered role classes:
  - `melee`
  - `ranged`
  - `siege`
  - `super`
  - `utility`
  - `scout`
- Covered team reads:
  - `dawn`
  - `night`
  - `neutral`
- Added visible V5 lane identity parts to every lane unit:
  - `v5 lane <key> formation banner`
  - `v5 lane <key> role attack read`
  - `v5 lane <key> team trim plate`
  - `v5 lane <key> formation foot rune`
- Resource preview smoke data now exposes `window.__resource3dPreview.laneReadability`.
- Cleaned resource model material `side: undefined` warnings by using explicit `FrontSide` for non-additive materials.

## Runtime Evidence

Playwright runtime screenshot:

- `docs/screenshots/ux-3d-v5-lane-unit-readability.png`

Preview smoke data:

```text
Lane unit count: 10
Lane readability contracts: 10
Anchors per lane unit: 6
Role classes: melee, ranged, siege, super, utility, scout
Team reads: dawn, night, neutral
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v5-lane-unit-readability.png
```

Warnings after this pass:

```text
THREE.Clock deprecated
PCFSoftShadowMap deprecated
WebGL ReadPixels GPU stall during screenshot capture
```

The previous repeated `THREE.Material: parameter 'side' has value of undefined` warning is removed from Resource3D preview capture.

## Implementation Notes

- `src/render/resource3dAssets.ts`
  - Adds `ResourceLaneReadabilitySpec`.
  - Adds `laneReadabilityFor(...)` for the `lane_units` category.
  - Adds `v5LaneUnitParts(...)` so each readability contract maps to real model parts.
- `src/render/resource3dFactory.ts`
  - Exposes `laneReadability` through `root.userData`.
  - Uses explicit `FrontSide` for non-additive materials.
- `src/ui/resource3dPreview.ts`
  - Exposes lane-unit smoke data through `window.__resource3dPreview.laneReadability`.
- `tests/resource3dAssets.test.ts`
  - Locks lane role/team coverage, anchor mapping, visible V5 parts, faction banner read, role attack read, and rear formation read.

## Verification

```text
npm test -- tests/resource3dAssets.test.ts
1 file passed
7 tests passed
```

```text
Playwright @ http://127.0.0.1:5201/?mode=resource3d-preview
Lane unit count: 10
Lane readability contracts: 10
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v5-lane-unit-readability.png
```

## Remaining UX Debt

- Lane units now have V5 role/faction readability contracts, but they still use procedural samples rather than final authored GLB/PBR assets.
- Runtime combat wiring still maps lane creeps through existing unit/resource visuals; final per-creep attack/cast timing remains future work.
- Neutral creeps, summons/wards, and deeper skill/FX polish remain next in the V5 sequence.

## Opus Handoff

### What

Adds V5 lane-unit readability metadata and visible identity anchors for melee, ranged, siege, super, utility, and scout lane units.

### Why

Lane units are repeated often, so their role read needs to be instant without competing with heroes. This pass makes the first 10 lane-unit samples clearer by faction, formation slot, and attack grammar.

### Tradeoff

- Chose procedural identity anchors instead of external assets.
- Kept changes visual/data-only.
- Did not touch creep stats, spawning, attack behavior, pathing, or lane logic.

### Next Action

Continue to neutral / boss polish:

1. small, medium, large, ancient, and boss visual tiers;
2. camp-pack color/material variation;
3. tests, screenshot evidence, and handoff update.
