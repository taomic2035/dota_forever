# Spell Geometry Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply spell pattern grammar to beams, rings, and fields so family readability survives across effect geometry.

**Architecture:** Reuse `FxParticle.pattern` from the impact pass. Add Canvas2D accent helpers under `FxLayer`; keep simulation events and particle caps unchanged.

**Tech Stack:** TypeScript, Canvas2D, Vitest, Vite screenshot helper.

---

## File Structure

- Modify `src/render/fx.ts`: add beam, ring, and field pattern accent helpers.
- Modify `tests/fxlayer.test.ts`: verify beam and field particles carry pattern metadata.
- Create `docs/ux/2026-06-12-spell-geometry-readability-summary.md`.
- Capture `docs/screenshots/ux-spell-geometry-readability.png`.

## Task 1: Geometry Metadata Coverage

- [x] Add `FxLayer` tests for beam and field pattern propagation.
- [x] Run `npm test -- tests/fxlayer.test.ts`.
- [x] Confirm beam, ring, field, and point particles all carry pattern metadata.

## Task 2: Pattern-Aware Beam/Ring/Field Rendering

- [x] Replace beam raw color check with `p.pattern === 'jagged'`.
- [x] Add ring rim accents for shards, jagged, cloud, cracks, halo, runes, embers, splatter, and spark.
- [x] Add low-alpha field accents for the same pattern set.
- [x] Add beam accents along the path while preserving the main beam direction.
- [x] Run `npm run typecheck` and focused FX tests.
- [x] Commit as `feat(ux): extend spell patterns across geometry`.

## Task 3: Screenshots, Summary, Verification

- [x] Capture `docs/screenshots/ux-spell-geometry-readability.png`.
- [x] Write `docs/ux/2026-06-12-spell-geometry-readability-summary.md`.
- [x] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [x] Commit as `feat(ux): complete spell geometry readability pass`.

## Self-Review

- Spec coverage: beams, rings, fields, focused metadata tests, screenshot, verification, and summary are covered.
- Deferred intentionally: bespoke particle sprites, terrain scorch decals, audio timing, and camera shake.
