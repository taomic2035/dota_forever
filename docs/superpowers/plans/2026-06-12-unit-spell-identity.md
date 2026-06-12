# Unit and Spell Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stable unit role metadata and spell family metadata, then use them for lightweight in-world and HUD readability.

**Architecture:** Extend existing pure helpers (`unitArt`, `fxStyle`) first, then consume their metadata from `renderer.ts` and `hud.ts`. No gameplay simulation rules change.

**Tech Stack:** TypeScript, Canvas2D, DOM HUD, Vitest, Vite screenshot helper.

---

## File Structure

- Modify `src/render/unitArt.ts`: add `UnitVisualRole` metadata.
- Modify `tests/unitart.test.ts`: add role and tier assertions.
- Modify `src/render/fxStyle.ts`: add `FxFamily` metadata.
- Modify `tests/fxstyle.test.ts`: add family assertions.
- Modify `src/render/renderer.ts`: draw hero identity marks.
- Modify `src/ui/hud.ts`: draw family color strips on ability slots.
- Create `docs/ux/2026-06-12-unit-spell-identity-summary.md`.

## Task 1: Unit Identity Metadata

- [ ] Add failing `unitArt` tests for tank, support, assassin, ranged carry, creep categories, neutral tiers, and boss.
- [ ] Run `npm test -- tests/unitart.test.ts` and confirm failures on missing role metadata.
- [ ] Extend `UnitArt` with `role` and `weight`.
- [ ] Implement role classification in `heroArt`, `creepArt`, neutral, boss, and ward paths.
- [ ] Run `npm test -- tests/unitart.test.ts`.
- [ ] Commit as `feat(ux): add unit identity metadata`.

## Task 2: Spell Family Metadata

- [ ] Add failing `fxStyle` tests for family output.
- [ ] Run `npm test -- tests/fxstyle.test.ts` and confirm failures on missing family metadata.
- [ ] Extend `FxStyle` with `family` and return the matched element key.
- [ ] Run `npm test -- tests/fxstyle.test.ts`.
- [ ] Commit as `feat(ux): add spell family metadata`.

## Task 3: Consume Identity in Renderer and HUD

- [ ] Draw a small role mark around heroes in `renderer.ts`.
- [ ] Add a fixed top color strip to each HUD ability slot using `fxStyle(def.key)`.
- [ ] Keep slot dimensions unchanged.
- [ ] Run `npm run typecheck` and `npm test -- tests/unitart.test.ts tests/fxstyle.test.ts`.
- [ ] Commit as `feat(ux): show unit and spell identity cues`.

## Task 4: Screenshots, Summary, Verification

- [ ] Capture `docs/screenshots/ux-unit-spell-identity.png`.
- [ ] Write `docs/ux/2026-06-12-unit-spell-identity-summary.md`.
- [ ] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Commit as `feat(ux): complete unit spell identity pass`.

## Self-Review

- Spec coverage: unit identity, spell family metadata, renderer marks, HUD strips, verification, and summary are covered.
- Deferred intentionally: final image-generated portraits, full icon set, bespoke spell animation assets.
- Each task has concrete files and verification commands.
