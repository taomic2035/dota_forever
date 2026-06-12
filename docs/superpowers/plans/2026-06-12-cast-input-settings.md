# Cast Input Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add normal, quick, and smart cast settings for abilities and items without changing default behavior.

**Architecture:** Add a pure `controlSettings` module, wire it into `InputManager`, expose settings in the pause menu, and load/save settings in `main.ts`.

**Tech Stack:** TypeScript, Vitest, Canvas2D, Vite screenshot helper.

---

## File Structure

- Create `src/engine/controlSettings.ts`: cast input modes, defaults, parsing, normalization, labels, cycling.
- Create `tests/controlSettings.test.ts`: red/green coverage for the pure module.
- Modify `src/engine/input.ts`: support normal, quick, and smart behavior.
- Modify `src/main.ts`: load/save control settings and pass them into input and pause menu.
- Modify `src/ui/menu.ts`: add pause menu cast mode controls.
- Capture `docs/screenshots/ux-cast-input-settings.png`.
- Create `docs/ux/2026-06-12-cast-input-settings-summary.md`.

## Task 1: Red Tests

- [x] Add pure setting tests.
- [x] Run focused tests and confirm expected missing-module failure.

## Task 2: Settings Module

- [x] Implement cast mode parsing, normalization, labels, and cycling.
- [x] Run `npm test -- tests/controlSettings.test.ts`.

## Task 3: Input and UI Integration

- [x] Add configurable cast mode behavior to `InputManager`.
- [x] Load settings from localStorage plus URL overrides.
- [x] Add pause menu controls for ability and item modes.
- [x] Run focused tests and `npm run typecheck`.

## Task 4: Screenshot, Verification, Commit

- [x] Capture settings/quick-cast screenshot.
- [x] Write summary doc.
- [x] Run `npm test` and `npm run build`.
- [x] Commit as `feat(ux): add cast input settings`.

## Self-Review

- [x] Default normal behavior stays unchanged.
- [x] Quick cast invalid target keeps pending correction mode.
- [x] Smart cast confirms on keyup only when the same pending command is active.
