# Camera Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable edge pan and camera speed controls.

**Architecture:** Extend `controlSettings`, wire camera settings into `InputManager`, expose controls in the pause menu, and load URL overrides in `main.ts`.

**Tech Stack:** TypeScript, Vitest, Canvas2D, Vite screenshot helper.

---

## File Structure

- Modify `src/engine/controlSettings.ts`: camera speed enum, defaults, normalization, labels, cycling, and multipliers.
- Modify `tests/controlSettings.test.ts`: red/green coverage for camera controls.
- Modify `src/engine/input.ts`: apply `cameraEdgePan` and `cameraPanSpeed`.
- Modify `src/main.ts`: parse `cameraSpeed` and `edgePan` URL overrides.
- Modify `src/ui/menu.ts`: add compact camera controls to the pause menu.
- Capture `docs/screenshots/ux-camera-controls.png`.
- Create `docs/ux/2026-06-12-camera-controls-summary.md`.

## Task 1: Red Tests

- [x] Add pure setting tests for camera speed and edge pan.
- [x] Run focused tests and confirm expected missing-symbol or assertion failure.

## Task 2: Settings Module

- [x] Implement camera speed parsing, cycling, labels, and multipliers.
- [x] Extend control setting normalization with edge pan.
- [x] Run `npm test -- tests/controlSettings.test.ts`.

## Task 3: Input and UI Integration

- [x] Apply edge pan and speed in `InputManager`.
- [x] Load camera URL overrides.
- [x] Add pause menu camera controls.
- [x] Run focused tests and `npm run typecheck`.

## Task 4: Screenshot, Verification, Commit

- [x] Capture visible camera controls.
- [x] Write summary doc.
- [x] Run `npm test` and `npm run build`.
- [x] Commit as `feat(ux): add camera controls`.

## Self-Review

- [ ] Defaults preserve current camera behavior.
- [ ] Edge pan toggle takes effect immediately.
- [ ] Camera speed affects both edge and arrow-key pan.
