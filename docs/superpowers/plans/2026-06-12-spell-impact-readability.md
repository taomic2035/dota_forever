# Spell Impact Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add spell impact pattern metadata and consume it in Canvas2D point-hit rendering so major spell families read by silhouette.

**Architecture:** Extend the existing pure `fxStyle` helper first, then thread the result through `FxLayer` particles. Keep simulation events and gameplay rules unchanged.

**Tech Stack:** TypeScript, Canvas2D, Vitest, Vite screenshot helper.

---

## File Structure

- Modify `src/render/fxStyle.ts`: add `FxPattern` and family-to-pattern mapping.
- Modify `tests/fxstyle.test.ts`: add pattern assertions.
- Modify `src/render/fx.ts`: carry pattern on particles and draw pattern-specific point impacts.
- Modify `tests/fxlayer.test.ts`: verify emitted particles inherit spell patterns.
- Create `docs/ux/2026-06-12-spell-impact-readability-summary.md`.
- Capture `docs/screenshots/ux-spell-impact-readability.png`.

## Task 1: Pattern Metadata

- [x] Add failing `fxStyle` tests for fire, frost, lightning, poison, earth, holy, arcane, blood/shadow, and neutral patterns.
- [x] Run `npm test -- tests/fxstyle.test.ts` and confirm failure on missing `pattern`.
- [x] Add `FxPattern`, `patternOf`, and `pattern` to `FxStyle`.
- [x] Run `npm test -- tests/fxstyle.test.ts`.
- [x] Include pattern metadata in `feat(ux): add spell impact visual patterns`.

## Task 2: Particle Propagation

- [x] Add failing `FxLayer` tests that emitted spell particles carry pattern metadata.
- [x] Run `npm test -- tests/fxlayer.test.ts` and confirm failure.
- [x] Add `pattern` to `FxParticle` and set it for all emitted particles.
- [x] Run `npm test -- tests/fxlayer.test.ts`.

## Task 3: Pattern Rendering

- [x] Update `drawPoint` to render embers, shards, jagged arcs, cloud blobs, cracks, halo, runes, splatter, and spark.
- [x] Keep fixed particle lifetimes and caps unchanged.
- [x] Run `npm run typecheck` and focused FX tests.
- [x] Commit as `feat(ux): add spell impact visual patterns`.

## Task 4: Screenshots, Summary, Verification

- [x] Capture `docs/screenshots/ux-spell-impact-readability.png`.
- [x] Write `docs/ux/2026-06-12-spell-impact-readability-summary.md`.
- [x] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [x] Commit as `feat(ux): complete spell impact readability pass`.

## Self-Review

- Spec coverage: shape-readable impact patterns, metadata propagation, screenshot, verification, and summary are covered.
- Deferred intentionally: authored sprite sheets, sound timing, screen shake tuning, and bespoke ultimate-level effects.
- Each task has concrete files and verification commands.
