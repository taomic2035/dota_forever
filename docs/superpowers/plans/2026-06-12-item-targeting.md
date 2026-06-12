# Item Targeting Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pending target mode for active items so 1-6 point/unit items use the same control rhythm as QWER.

**Architecture:** Extend `CommandMode` from cast-only pending state into ability/item/attack-move pending state. Wire item prepare/preview/confirm callbacks through `InputManager`, then implement item targeting in `main.ts` using existing `useItem` semantics.

**Tech Stack:** TypeScript, Canvas2D, DOM events, Vitest, Vite screenshot helper.

---

## File Structure

- Modify `src/engine/commandMode.ts`: add pending item state.
- Modify `tests/commandMode.test.ts`: add pending item tests.
- Modify `src/engine/input.ts`: add item prepare/preview/confirm callbacks.
- Modify `src/main.ts`: item targeting preview and confirm.
- Modify `src/ui/uxFeedback.ts`: source metadata for targeting previews.
- Create `docs/ux/2026-06-12-item-targeting-summary.md`.
- Capture `docs/screenshots/ux-item-targeting.png`.

## Task 1: Command State

- [x] Add failing tests for pending item, invalid item confirm retention, item replacement, and ability replacing item.
- [x] Run `npm test -- tests/commandMode.test.ts` and confirm failures.
- [x] Extend `CommandMode`.
- [x] Run `npm test -- tests/commandMode.test.ts`.

## Task 2: Input and Main Integration

- [x] Add item prepare/preview/confirm callbacks to `InputManager`.
- [x] Change 1-6 handling to pending for point/unit active items.
- [x] Keep no-target active items instant.
- [x] Keep failed unit item confirmation pending.
- [x] Clear pending item on right-click, Escape, and Stop.
- [x] Run typecheck and focused tests.
- [x] Commit as `feat(ux): add pending item command mode`.

## Task 3: Screenshot, Summary, Verification

- [x] Capture `docs/screenshots/ux-item-targeting.png`.
- [x] Write `docs/ux/2026-06-12-item-targeting-summary.md`.
- [x] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [x] Commit as `feat(ux): complete item targeting pass`.

## Self-Review

- Spec coverage: item key flow, preview, confirm, invalid retention, cancellation, tests, screenshot, and summary are covered.
- Deferred intentionally: item-specific ally/enemy filters, item icon overhaul, smart-cast configuration, and keybinding UI.
