# Spell Geometry Readability UX Design

Date: 2026-06-12
Status: auto-approved continuation after spell impact pattern pass

## Goal

Extend spell family readability from point impacts to the other common combat geometries: beams, rings, and persistent fields. The player should recognize the same spell family whether it appears as a projectile hit, a circular nova, a lane beam, or a lingering area.

## Scope

This batch covers:

- Pattern-aware beam accents.
- Pattern-aware ring accents.
- Pattern-aware persistent field accents.
- Screenshot and summary documentation.

This batch does not add authored particle textures, shader effects, screen shake, or sound timing.

## Visual Grammar

The previous pass introduced these pattern families:

- `embers`: hot sparks and fire motes.
- `shards`: angular ice spikes.
- `jagged`: broken lightning strokes.
- `cloud`: soft poison/nature blobs.
- `cracks`: earth fracture lines.
- `halo`: clean holy rings and rays.
- `runes`: arcane orbit marks.
- `splatter`: blood/shadow droplets and heavy strokes.
- `spark`: neutral fallback.

This pass applies them by geometry:

- Beam: the main line keeps its readable path; accents ride along the beam so direction stays clear.
- Ring: the circle stays stable; accents sit on the rim to avoid hiding units.
- Field: the fill stays low alpha; accents move inside the area to communicate danger without blocking last-hit and target reading.

## Acceptance Criteria

- Beam and field emitted particles preserve pattern metadata in tests.
- Beam rendering uses pattern instead of raw color checks for lightning/jagged behavior.
- Ring and field rendering add family-specific accents without changing particle lifetime or event semantics.
- `npm run typecheck`, focused tests, full tests, and build pass.

## Summary Protocol

After implementation, add `docs/ux/2026-06-12-spell-geometry-readability-summary.md` with player-facing changes, verification, screenshot path, and remaining UX debt.
