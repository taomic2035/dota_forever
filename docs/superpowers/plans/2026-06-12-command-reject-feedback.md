# Command Reject Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add immediate, readable command failure feedback for ability and item controls.

**Architecture:** Extend `UxFeedback` with a short-lived command message state, render it in `CommandCursor`, and wire ability/item reject paths in `main.ts` through a small local feedback helper. Extend HUD item slots to consume the same flash keys already used by ability slots.

**Tech Stack:** TypeScript, DOM/CSS, Canvas2D, Vitest, Vite screenshot helper.

---

## File Structure

- Modify `src/ui/uxFeedback.ts`: command message state and expiry.
- Modify `tests/uxFeedback.test.ts`: red tests for message replacement, expiry, and clearing.
- Modify `src/ui/commandCursor.ts`: stacked intent plus reject message rendering.
- Modify `src/ui/hud.ts`: item slot flash rendering.
- Modify `src/main.ts`: ability/item reject reason mapping and slot flashes.
- Create `docs/ux/2026-06-12-command-reject-feedback-summary.md`.
- Capture `docs/screenshots/ux-command-reject-feedback.png`.

## Task 1: Feedback State

- [x] Add failing `UxFeedback` tests for `setCommandMessage`, `commandMessageAt`, replacement, expiry, and clearing.
- [x] Run `npm test -- tests/uxFeedback.test.ts` and confirm the expected API failure.
- [x] Extend `UxFeedback` with command message storage and a default transient TTL.
- [x] Run `npm test -- tests/uxFeedback.test.ts`.

## Task 2: Cursor and HUD Rendering

- [x] Update `CommandCursor` to show intent and command message together.
- [x] Pass `UxFeedback` into `Hud.itemSlot`.
- [x] Render red reject and gold confirm flashes for item slots.
- [x] Run `npm run typecheck` and focused tests.

## Task 3: Main Control Wiring

- [x] Add ability reject reason checks in `main.ts`.
- [x] Add item reject reason checks in `main.ts`.
- [x] Flash ability and item slots on reject and confirm.
- [x] Keep invalid target confirmation pending while showing `INVALID TARGET`.
- [x] Run `npm run typecheck` and focused tests.
- [x] Commit as `feat(ux): add command reject feedback`.

## Task 4: Screenshot, Summary, Verification

- [x] Capture `docs/screenshots/ux-command-reject-feedback.png`.
- [x] Write `docs/ux/2026-06-12-command-reject-feedback-summary.md`.
- [x] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [x] Commit as `feat(ux): complete command reject feedback pass`.

## Self-Review

- Spec coverage: command message state, cursor rendering, item HUD flashes, ability/item reject wiring, tests, screenshot, and summary are covered.
- Deferred intentionally: audio error barks, localization, detailed per-item target filters, and settings for quick-cast/smart-cast.
