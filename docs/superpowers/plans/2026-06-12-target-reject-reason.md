# Target Reject Reason Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make click rejection explain whether a visible target failed by team or by unit kind.

**Architecture:** Extend `targetFilters` with a reason helper, then use a nearest raw hover candidate in `main.ts` when filtered lookup fails. Map reason values to new `RejectReason` labels without changing target effects.

**Tech Stack:** TypeScript, Vitest, Canvas2D, Vite screenshot helper.

---

## File Structure

- Modify `src/engine/targetFilters.ts`: add `TargetFilterRejectReason` and `targetFilterRejectReason`.
- Modify `tests/targetFilters.test.ts`: add red tests for rejection reasons.
- Modify `src/main.ts`: add `wrong-team` and `wrong-target-type` reject labels and filtered failure mapping.
- Capture `docs/screenshots/ux-target-reject-reason.png`.
- Create `docs/ux/2026-06-12-target-reject-reason-summary.md`.

## Task 1: Red Tests

- [x] Add rejection reason expectations to `tests/targetFilters.test.ts`.
- [x] Run focused tests and confirm the expected failure.

## Task 2: Helper Implementation

- [x] Add reason type and helper.
- [x] Preserve boolean matching API.
- [x] Run `npm test -- tests/targetFilters.test.ts`.

## Task 3: Main Integration

- [x] Add reject labels for wrong team and wrong target type.
- [x] Find nearest unfiltered visible unit when filtered target lookup fails.
- [x] Map helper reasons to click feedback for abilities and items.
- [x] Run focused tests and `npm run typecheck`.

## Task 4: Verification and Summary

- [x] Capture Midas wrong-target-type screenshot.
- [x] Write summary doc.
- [x] Run `npm test` and `npm run build`.
- [x] Commit as `feat(ux): split target reject reasons`.

## Self-Review

- [x] No ability or item effects changed.
- [x] Pending mode remains active after failure.
- [x] Generic invalid target remains for empty ground clicks.
