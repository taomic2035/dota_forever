# Command Cursor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact cursor-adjacent command intent overlay for attack-move, cast, and item targeting states.

**Architecture:** Store cursor state in `UxFeedback`, update it from `InputManager` callbacks, and render it through a small DOM component. Gameplay simulation remains unchanged.

**Tech Stack:** TypeScript, DOM UI, Vitest, Vite screenshot helper.

---

## File Structure

- Modify `src/ui/uxFeedback.ts`: cursor position and cursor intent state.
- Modify `tests/uxFeedback.test.ts`: cursor state tests.
- Modify `src/engine/input.ts`: pointer movement callback.
- Create `src/ui/commandCursor.ts`: non-interactive cursor badge overlay.
- Modify `src/main.ts`: wire pointer and command intent callbacks.
- Create `docs/ux/2026-06-12-command-cursor-summary.md`.

## Task 1: Cursor Intent Model

- [ ] Add failing tests for cursor position, intent expiry, and clear behavior.
- [ ] Implement `setCursorPosition`, `setCursorIntent`, `clearCursorIntent`, and `cursorIntentAt`.
- [ ] Run `npm test -- tests/uxFeedback.test.ts`.
- [ ] Commit as `feat(ux): add cursor intent feedback model`.

## Task 2: Input and Overlay Wiring

- [ ] Add `onPointerMove(screen, world)` to `InputCallbacks`.
- [ ] Create `CommandCursor` with fixed-position DOM badge.
- [ ] Update `main.ts` to wire pointer motion, attack-move, cast, and item intent.
- [ ] Run `npm run typecheck` and `npm test -- tests/uxFeedback.test.ts`.
- [ ] Commit as `feat(ux): show command cursor overlay`.

## Task 3: Screenshot, Summary, Verification

- [ ] Capture `docs/screenshots/ux-command-cursor.png`.
- [ ] Write `docs/ux/2026-06-12-command-cursor-summary.md`.
- [ ] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Commit as `feat(ux): complete command cursor pass`.
