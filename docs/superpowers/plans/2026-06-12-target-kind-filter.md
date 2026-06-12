# Target Kind Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make unit-target ability and item pending previews reject wrong unit kinds before click confirmation.

**Architecture:** Extend the shared `targetFilters` helper from team-only filtering to team plus kind filtering. Add optional metadata fields to abilities and item actives, then route `main.ts` preview and confirmation through the combined filter.

**Tech Stack:** TypeScript, Vitest, Canvas2D, Vite screenshot helper.

---

## File Structure

- Modify `src/engine/targetFilters.ts`: add `TargetKindFilter` and combined matching.
- Modify `tests/targetFilters.test.ts`: add red tests for unit kind filters.
- Create `tests/targetKindMetadata.test.ts`: pin initial metadata for Midas, Dark Ritual, and Devour.
- Modify `src/data/heroes/types.ts`: optional `targetKind` on `AbilityDef`.
- Modify `src/data/items.ts`: optional `targetKind` on item active definitions and Midas metadata.
- Modify `src/data/heroes/batch8.ts`: Dark Ritual and Devour metadata.
- Modify `src/main.ts`: pass both target filters into preview and confirm.
- Capture `docs/screenshots/ux-target-kind-filter.png`.
- Create `docs/ux/2026-06-12-target-kind-filter-summary.md`.

## Task 1: Red Tests

- [x] Extend `tests/targetFilters.test.ts` with kind and combined team-kind expectations.
- [x] Add `tests/targetKindMetadata.test.ts` for Midas, Dark Ritual, and Devour.
- [x] Run focused tests and confirm the expected failure.

## Task 2: Filter Helper

- [x] Add `TargetKindFilter`.
- [x] Extend `TargetableUnit` with optional unit kind fields.
- [x] Implement `targetMatchesKind` and combine it with `targetMatchesFilter`.
- [x] Preserve old team-only call sites through default parameters.
- [x] Run `npm test -- tests/targetFilters.test.ts`.

## Task 3: Metadata and Main Integration

- [x] Add optional `targetKind` to ability and item active types.
- [x] Annotate `midas`, `lyk_ritual`, and `dum_devour`.
- [x] Pass `targetKind` through ability and item preview.
- [x] Pass `targetKind` through ability and item confirmation.
- [x] Run focused tests and `npm run typecheck`.

## Task 4: Verification and Summary

- [x] Capture the target-kind invalid hover screenshot.
- [x] Write `docs/ux/2026-06-12-target-kind-filter-summary.md`.
- [x] Run `npm test` and `npm run build`.
- [x] Commit as `feat(ux): add target kind filters`.

## Self-Review

- [x] Preview and confirm share one target lookup.
- [x] Missing metadata remains backward compatible.
- [x] Scope stays focused on control UX, not broad content creation.
