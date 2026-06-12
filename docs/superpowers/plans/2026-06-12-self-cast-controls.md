# Self-Cast Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Alt + hotkey` self-cast for valid unit-target abilities and item actives.

**Architecture:** Add a pure self-cast policy helper, pass self-cast intent through `InputManager`, and resolve self targets in `main.ts` before regular cursor target lookup.

**Tech Stack:** TypeScript, Vitest, Canvas2D, Vite screenshot helper.

---

## File Structure

- Create `src/engine/selfCast.ts`: policy for whether a command can target self and direct self target resolution.
- Create `tests/selfCast.test.ts`: red/green tests for target filters and kind filters.
- Modify `src/engine/input.ts`: detect `Alt` for ability and item hotkeys, bypass pending mode for self-cast attempts.
- Modify `src/main.ts`: use the hero as target when a valid self-cast request is present.
- Capture `docs/screenshots/ux-self-cast-controls.png`.
- Create `docs/ux/2026-06-12-self-cast-controls-summary.md`.

## Task 1: Red Tests

- [x] Add pure self-cast policy tests.
- [x] Run focused tests and confirm the expected missing-module failure.

## Task 2: Self-Cast Policy

- [x] Implement target-team and target-kind policy helper.
- [x] Run `npm test -- tests/selfCast.test.ts`.

## Task 3: Input and Confirmation Integration

- [x] Pass self-cast intent through QWER and item hotkeys.
- [x] Resolve self targets in ability and item confirmation paths.
- [x] Keep invalid self-cast from leaving pending state.
- [x] Run focused tests and `npm run typecheck`.

## Task 4: Screenshot, Verification, Commit

- [x] Capture visible self-cast behavior.
- [x] Write summary doc.
- [x] Run `npm test` and `npm run build`.
- [x] Commit as `feat(ux): add self cast controls`.

## Self-Review

- [ ] Alt-free controls remain unchanged.
- [ ] Enemy-only commands reject self-cast cleanly.
- [ ] Self-cast is deterministic and independent from cursor position.
