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

- [ ] Add failing tests for pending cast, attack-move, replacing pending cast, primary-click consumption, invalid-confirm retention, and cancel.
- [ ] Run `npm test -- tests/commandMode.test.ts` and confirm the missing module failure.
- [ ] Implement `CommandMode`.
- [ ] Run `npm test -- tests/commandMode.test.ts`.

## Task 2: Input Integration

- [ ] Change QWER from immediate cast to prepare/preview/confirm.
- [ ] Keep no-target abilities instant through `onPrepareCast`.
- [ ] Keep invalid confirms pending by honoring a `false` return from `onCastKey`.
- [ ] Keep right-click, Escape, and Stop cancel behavior.
- [ ] Run typecheck and focused input/UX tests.
- [ ] Commit as `feat(ux): add pending cast command mode`.

## Task 3: Target Overlay Preview

- [ ] Add cursor world position and valid state to targeting metadata.
- [ ] Draw range from hero origin and target circle/reticle at cursor.
- [ ] Use red overlay for invalid targets.
- [ ] Run focused tests and typecheck.

## Task 4: Screenshots, Summary, Verification

- [ ] Capture `docs/screenshots/ux-control-targeting.png`.
- [ ] Write `docs/ux/2026-06-12-control-targeting-summary.md`.
- [ ] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Commit as `feat(ux): complete control targeting pass`.

## Self-Review

- Spec coverage: UI/control loop, targeting preview, cancellation, invalid-target retention, verification, and summary are covered.
- Deferred intentionally: item targeting, keybinding menu, custom cursor sprite sheet, and smart-cast toggles.
