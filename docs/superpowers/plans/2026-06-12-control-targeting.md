# Control Targeting Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make QWER targeting a real command mode with prepare, preview, confirm, and cancel behavior.

**Architecture:** Add a small pure input state helper, wire it into `InputManager`, then update `main.ts`, `UxFeedback`, and renderer targeting overlay. Simulation rules stay unchanged.

**Tech Stack:** TypeScript, Canvas2D, DOM events, Vitest, Vite screenshot helper.

---

## File Structure

- Add `src/engine/commandMode.ts`: pure pending command state.
- Add `tests/commandMode.test.ts`: red/green tests for control mode transitions.
- Modify `src/engine/input.ts`: use command mode and split prepare/preview/confirm.
- Modify `src/main.ts`: prepare and preview ability targeting.
- Modify `src/ui/uxFeedback.ts`: cursor target and validity metadata.
- Modify `src/render/renderer.ts`: draw cursor-based target previews.
- Create `docs/ux/2026-06-12-control-targeting-summary.md`.
- Capture `docs/screenshots/ux-control-targeting.png`.

## Task 1: Pure Command State

- [x] Add failing tests for pending cast, attack-move, replacing pending cast, primary-click consumption, invalid-confirm retention, and cancel.
- [x] Run `npm test -- tests/commandMode.test.ts` and confirm the missing module failure.
- [x] Implement `CommandMode`.
- [x] Run `npm test -- tests/commandMode.test.ts`.

## Task 2: Input Integration

- [x] Change QWER from immediate cast to prepare/preview/confirm.
- [x] Keep no-target abilities instant through `onPrepareCast`.
- [x] Keep invalid confirms pending by honoring a `false` return from `onCastKey`.
- [x] Keep right-click, Escape, and Stop cancel behavior.
- [x] Run typecheck and focused input/UX tests.
- [x] Commit as `feat(ux): add pending cast command mode`.

## Task 3: Target Overlay Preview

- [x] Add cursor world position and valid state to targeting metadata.
- [x] Draw range from hero origin and target circle/reticle at cursor.
- [x] Use red overlay for invalid targets.
- [x] Run focused tests and typecheck.

## Task 4: Screenshots, Summary, Verification

- [x] Capture `docs/screenshots/ux-control-targeting.png`.
- [x] Write `docs/ux/2026-06-12-control-targeting-summary.md`.
- [x] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [x] Commit as `feat(ux): complete control targeting pass`.

## Self-Review

- Spec coverage: UI/control loop, targeting preview, cancellation, invalid-target retention, verification, and summary are covered.
- Deferred intentionally: item targeting, keybinding menu, custom cursor sprite sheet, and smart-cast toggles.
