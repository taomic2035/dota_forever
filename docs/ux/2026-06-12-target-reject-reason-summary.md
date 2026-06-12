# Target Reject Reason UX Summary

Date: 2026-06-12
Status: implemented and verified

## Player-Facing Change

Clicking a visible but invalid unit now explains the target filter failure instead of always showing `INVALID TARGET`.

## Implemented Feedback

- `WRONG TEAM`: the hovered unit is alive but fails the command's team filter.
- `WRONG TARGET TYPE`: the hovered unit passes team filtering but fails the command's unit-kind filter.
- `INVALID TARGET`: kept for empty ground or no visible unit under the cursor.

## Code Changes

- `src/engine/targetFilters.ts` now exposes `targetFilterRejectReason`.
- `src/main.ts` now checks the nearest visible hover unit when filtered target lookup fails.
- Ability and item confirmation both use the same reason mapping.
- No ability or item effect logic changed.

## Verification So Far

- Red test confirmed before implementation:
  - `npm test -- tests/targetFilters.test.ts` failed because `targetFilterRejectReason` did not exist.
- Focused validation after implementation:
  - `npm test -- tests/targetFilters.test.ts`
  - `npm test -- tests/targetFilters.test.ts tests/targetKindMetadata.test.ts tests/commandMode.test.ts tests/uxFeedback.test.ts`
  - `npm run typecheck`
- Screenshot validation:
  - `node scripts/shot.mjs "http://127.0.0.1:5180/?mode=play&hero=rein&seed=42&speed=1" docs/screenshots/ux-target-reject-reason.png 1500 <eval>`
  - Eval returned `message.label: "WRONG TARGET TYPE"`, `valid: false`, and `pendingStillActive: true`.
- Full validation:
  - `npm test`: 54 test files and 601 tests passed.
  - `npm run build`: passed. Vite reported the existing large chunk warning.

## Screenshot

- `docs/screenshots/ux-target-reject-reason.png`

## Remaining UX Debt

- Add quick cast and smart cast settings.
- Add settings UI affordances so players can choose Dota-style cast confirmation behavior.
- Continue metadata audit for hero-only, building-only, ward-only, and creep-only commands.
