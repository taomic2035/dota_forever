# Courier Death Pulse Summary

Date: 2026-06-16
Owner: Codex UX/control line
Scope: UI, controls, and playability only. This slice consumes existing `unit_died` events and does not change combat, courier respawn, bounty, AI, item transfer, economy, or balance.

## Mainline Check

This continues the Dota1/WC3-style logistics feedback work. A courier death should not only be heard or shown as central text; the player also needs to know where the logistics failure happened so they can reassess lane safety, warding, and item delivery risk.

## Completed In This Slice

- Added pure `buildCourierDeathPulses()` model in `src/ui/courierEventFeedback.ts`.
- Courier death events now create a short `ping` world pulse at the death location.
- The pulse reuses existing UX feedback contracts:
  - 2D world pulse ring.
  - 3D world pulse ring.
  - minimap ping ring.
- Allied courier death is prioritized if multiple courier deaths occur in the same event batch.
- Enemy courier death still receives a location pulse when it is the relevant courier event in the batch.
- Events without a courier unit match or without a position are ignored.

## Current UX Contract

- This is presentation only.
- It does not create or mutate death events.
- It does not introduce a new minimap event type yet; it intentionally reuses `ping` so existing 2D, 3D, and minimap feedback stay aligned.
- It does not add courier path preview, retreat commands, item transfer commands, or dedicated courier toast history.

## Validation

- `tests/courierEventFeedback.test.ts` covers allied courier death, enemy courier death, non-courier filtering, missing-position filtering, and allied-priority batching.
- Integrated in `src/main.ts` immediately after central announcements so text/audio and location feedback happen on the same event frame.

## Next Stage

1. Add distinct danger/retreat ping types only if minimap communication expands beyond regular ping.
2. Add courier path preview once the courier task/path contract is stable.
3. Add manual courier logistics controls after sim ownership boundaries settle.
