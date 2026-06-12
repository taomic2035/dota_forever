# Command Cursor Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade cursor-adjacent command feedback from plain text badges into semantic icons and colors for attack, hostile targeting, support targeting, ground targeting, item use, and rejects.

**Architecture:** Add a pure `commandCursorTheme` helper so command icon/color mapping can be tested without the DOM. Extend `CursorIntent` with an optional target hint, then have `main.ts` populate that hint from existing ability/item target metadata.

**Tech Stack:** TypeScript, Vitest, DOM/CSS command cursor overlay, Vite screenshot helper.

---

## File Structure

- Create `src/ui/commandCursorTheme.ts`: cursor target hint types, safe label escaping, visual spec mapping, and badge HTML helpers.
- Create `tests/commandCursorTheme.test.ts`: red/green tests for visual mapping and escaping.
- Create `src/ui/cursorTargetHint.ts`: pure helper that maps target mode and target team metadata to cursor target hints.
- Create `tests/cursorTargetHint.test.ts`: red/green tests for target hint derivation.
- Modify `src/ui/uxFeedback.ts`: add optional `targetHint` to `CursorIntent`.
- Modify `src/ui/commandCursor.ts`: render from `commandCursorTheme` instead of local icon/color branches.
- Modify `src/main.ts`: derive target hints for pending attack-move, ability, and item intents.
- Create `docs/ux/2026-06-12-command-cursor-semantics-summary.md`.
- Capture `docs/screenshots/ux-command-cursor-semantics.png`.

## Task 1: Cursor Theme Helper

- [x] Add failing tests for cursor intent visual mapping:
  - hostile cast uses red hostile icon/color.
  - support cast uses green support icon/color.
  - point cast uses blue ground icon/color.
  - any unit cast uses neutral ring icon.
  - attack-move uses amber crosshair.
  - item ground targeting keeps item-gold styling while using ground icon.
  - reject message escapes its label.
- [x] Run `npm test -- tests/commandCursorTheme.test.ts` and confirm the expected missing-module failure.
- [x] Implement `src/ui/commandCursorTheme.ts`.
- [x] Run `npm test -- tests/commandCursorTheme.test.ts`.
- [x] Commit as `feat(ux): add semantic cursor theme`.

## Task 2: Cursor Intent Integration

- [x] Add `targetHint` to `CursorIntent`.
- [x] Add red/green tests and implementation for `src/ui/cursorTargetHint.ts`.
- [x] Replace hardcoded icon/color rendering in `src/ui/commandCursor.ts` with the theme helper.
- [x] Add `cursorTargetHint` derivation in `src/main.ts`:
  - `point`, `area`, and `line` modes become `ground`.
  - `targetTeam: "enemy"` becomes `enemy`.
  - `targetTeam: "ally"` becomes `ally`.
  - `targetTeam: "allyOrSelf"` becomes `allyOrSelf`.
  - `targetTeam: "self"` becomes `self`.
  - unannotated unit targeting becomes `any`.
- [x] Set attack-move intent to `targetHint: "attack"`.
- [x] Set pending cast and item intents with derived target hints.
- [x] Run `npm run typecheck` and focused tests.
- [x] Commit as `feat(ux): wire semantic command cursor`.

## Task 3: Screenshot, Summary, Verification

- [ ] Capture `docs/screenshots/ux-command-cursor-semantics.png`.
- [ ] Write `docs/ux/2026-06-12-command-cursor-semantics-summary.md`.
- [ ] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Commit as `feat(ux): complete semantic cursor pass`.

## Self-Review

- Spec coverage: target semantic icon grammar, typed helper, UI integration, screenshot, and verification are covered.
- Deferred intentionally: OS cursor replacement, quick-cast/smart-cast settings, keybinding UI, and audio cues.
