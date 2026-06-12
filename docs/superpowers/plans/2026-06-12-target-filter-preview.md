# Target Filter Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make unit-target ability and item pending previews respect enemy, ally, self, and ally-or-self target categories.

**Architecture:** Add a focused `targetFilters` engine helper with tests, then attach optional `targetTeam` metadata to ability and item definitions. Replace `main.ts` unit target lookup with filtered lookup for both preview and confirmation so visual validity and click behavior stay consistent.

**Tech Stack:** TypeScript, Vitest, Canvas2D, Vite screenshot helper.

---

## File Structure

- Create `src/engine/targetFilters.ts`: shared target filter types and matching helpers.
- Create `tests/targetFilters.test.ts`: red/green tests for target filter behavior.
- Modify `src/data/heroes/types.ts`: optional `targetTeam` on `AbilityDef`.
- Modify `src/data/items.ts`: optional `targetTeam` on active item definitions and metadata annotations.
- Modify `src/data/heroes/rein.ts`, `src/data/heroes/zola.ts`, and `src/data/heroes/batch2.ts`: ability metadata annotations.
- Modify `src/main.ts`: filtered target lookup for cast and item preview/confirm.
- Create `docs/ux/2026-06-12-target-filter-preview-summary.md`.
- Capture `docs/screenshots/ux-target-filter-preview.png`.

## Task 1: Filter Helper

- [x] Add failing tests for enemy, ally, self, ally-or-self, any, dead target rejection, and nearest filtered target selection.
- [x] Run `npm test -- tests/targetFilters.test.ts` and confirm the expected missing-module failure.
- [x] Implement `src/engine/targetFilters.ts`.
- [x] Run `npm test -- tests/targetFilters.test.ts`.

## Task 2: Metadata and Main Integration

- [x] Add `targetTeam` types to ability and item active definitions.
- [x] Annotate the initial ability and item set from the design doc.
- [x] Replace `targetAt` in `main.ts` with filtered ability/item target lookup.
- [x] Preserve default any-unit behavior for unannotated unit-target definitions.
- [x] Run `npm run typecheck` and focused tests.
- [x] Commit as `feat(ux): add target filter previews`.

## Task 3: Screenshot, Summary, Verification

- [x] Capture `docs/screenshots/ux-target-filter-preview.png`.
- [x] Write `docs/ux/2026-06-12-target-filter-preview-summary.md`.
- [x] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [x] Commit as `feat(ux): complete target filter preview pass`.

## Self-Review

- Spec coverage: filter helper, types, initial metadata, main preview/confirm integration, tests, screenshot, and summary are covered.
- Deferred intentionally: full dataset classification, item-specific non-team filters such as hero-only or non-hero-only, and audio feedback.
