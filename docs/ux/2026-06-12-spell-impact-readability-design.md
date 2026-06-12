# Spell Impact Readability UX Design

Date: 2026-06-12
Status: auto-approved continuation of the modernized Dota-like UX direction

## Goal

Make spell hits and area effects readable by shape, not only by color. In a busy fight, the player should be able to identify "fire hit", "frost burst", "lightning strike", "poison cloud", or "earth crack" from silhouette and motion even when multiple effects overlap.

## Scope

This batch covers procedural Canvas2D spell impact grammar:

- Spell pattern metadata in `fxStyle`.
- Point-hit visuals for the main elemental families.
- Field/ring/impact particles carrying the same metadata for later expansion.
- Screenshot and summary documentation for the visual direction.

This batch does not add final hand-painted VFX sprites, copied Dota 1 particles, or gameplay balance changes.

## Visual Grammar

Each spell family gets a stable impact pattern:

- `embers`: hot core plus radial sparks for fire.
- `shards`: angular short shards for frost.
- `jagged`: broken segmented strokes for lightning.
- `cloud`: soft drifting blobs for poison and nature.
- `cracks`: branching ground fractures for earth.
- `halo`: clean concentric light for holy.
- `runes`: small orbiting marks for arcane.
- `splatter`: short heavy strokes for blood and shadow.
- `spark`: neutral fallback.

Motion still comes from the previous layer:

- `flash` means instant reposition or teleport.
- `crack` means heavy ground impact.
- `rise` means buff/heal/upward state.
- `fall` means debuff/curse/downward state.
- `burst` means normal hit.

Pattern and motion are intentionally separate. A fire blink can still be a flash, and a frost nova can still be a burst, while retaining family-specific shape language.

## Acceptance Criteria

- `fxStyle` exposes stable `pattern` metadata.
- Existing particles carry the pattern from emitted game events.
- Point-hit rendering uses pattern-specific silhouettes.
- Focused tests cover pattern selection and propagation.
- `npm run typecheck`, focused tests, full tests, and build pass.

## Summary Protocol

After implementation, add `docs/ux/2026-06-12-spell-impact-readability-summary.md` with player-facing changes, verification results, screenshot path, and remaining UX debt.
