# Cast Slot Overrides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-ability and per-item cast mode overrides while keeping global cast modes as defaults.

**Architecture:** Extend `controlSettings`, resolve slot mode inside `InputManager`, expose compact pause menu controls, and parse URL slot overrides in `main.ts`.

**Tech Stack:** TypeScript, Vitest, Canvas2D, Vite screenshot helper.

---

## File Structure

- Modify `src/engine/controlSettings.ts`: slot counts, override arrays, normalization, fallback resolution, and override cycling.
- Modify `tests/controlSettings.test.ts`: red/green coverage for slot overrides.
- Modify `src/engine/input.ts`: resolve per-slot cast mode for QWER and item hotkeys.
- Modify `src/main.ts`: parse URL slot override params and persist normalized settings.
- Modify `src/ui/menu.ts`: add QWER and 1-6 override controls to the pause menu.
- Capture `docs/screenshots/ux-cast-slot-overrides.png`.
- Create `docs/ux/2026-06-12-cast-slot-overrides-summary.md`.

## Task 1: Red Tests

- [x] Add pure setting tests for slot normalization, fallback resolution, labels, and override cycling.
- [x] Run focused tests and confirm the expected missing-symbol or assertion failure.

## Task 2: Settings Module

- [x] Implement fixed ability and item override arrays.
- [x] Implement fallback resolvers and override cycling.
- [x] Run `npm test -- tests/controlSettings.test.ts`.

## Task 3: Input and UI Integration

- [x] Use resolved ability and item mode inside `InputManager`.
- [x] Load slot overrides from URL params.
- [x] Add pause menu slot override controls.
- [x] Run focused tests and `npm run typecheck`.

## Task 4: Screenshot, Verification, Commit

- [x] Capture visible slot override UI and quick item slot behavior.
- [x] Write summary doc.
- [x] Run `npm test` and `npm run build`.
- [x] Commit as `feat(ux): add cast slot overrides`.

## Self-Review

- [ ] Default settings still behave as global normal cast.
- [ ] Slot overrides do not mutate unrelated slots.
- [ ] Pause menu remains compact enough for the game overlay.
