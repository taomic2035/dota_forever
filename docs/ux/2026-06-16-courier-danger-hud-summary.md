# Courier Danger HUD Summary

Date: 2026-06-16
Owner: Codex UX/control line
Scope: UI, controls, and playability only. This slice reads existing courier HP and does not change courier simulation, AI, item transfer, economy, or balance.

## Mainline Check

This remains on the Dota1/WC3 core UX line. Courier deaths are high-impact gameplay events, so a low-health courier needs immediate HUD priority instead of being hidden behind a normal delivery or ready state.

## Completed In This Slice

- `buildCourierHudModel` now treats live couriers at or below 35% HP as danger state for presentation.
- The model preserves task context:
  - delivering remains `delivering`.
  - returning remains `returning`.
  - idle remains `ready`.
- Low-health detail text is prefixed with `Low HP / ...`.
- Low-health action text becomes `F2 select / save courier`.
- HUD tone becomes `danger`, so the existing courier strip renders with danger styling.

## Current UX Contract

- This is read-only HUD feedback.
- It does not issue a courier retreat command.
- It does not change courier targeting, movement, respawn, bounty, or delivery behavior.
- It does not add sound/toast yet.
- It consumes existing HP/max HP values already available to the HUD.

## Validation

- `tests/courierHudModel.test.ts` covers low-health live couriers without losing current task context.
- Existing courier status tests still cover missing, dead, returning, delivering, ready-with-stash, and idle-ready states.

## Next Stage

1. Add courier death/danger toast and audio cues.
2. Add minimap path preview once delivery target/path data is stable.
3. Add manual courier controls only after sim command semantics are agreed.
