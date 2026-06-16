# Courier Death Announcement Summary

Date: 2026-06-16
Owner: Codex UX/control line
Scope: UI, controls, and playability only. This slice consumes existing death events and does not change combat, courier respawn, bounty, AI, item transfer, economy, or balance.

## Mainline Check

This stays on the core Dota1/WC3 UX track. Courier death is a high-impact logistics event, so it needs immediate readable feedback in the match layer, not only a disappearing minimap marker or dead HUD state.

## Completed In This Slice

- Added pure `buildAnnouncements` model.
- Existing first blood and kill-streak announcements now flow through the same pure model.
- Courier death announcements are added from existing `unit_died` events:
  - allied courier death: `Courier killed!`, red warning, alert audio cue.
  - enemy courier death: `Enemy courier killed`, gold positive event, announce audio cue.
- `Announce.consume()` now receives the viewer team from `main.ts` so allied and enemy courier deaths can be distinguished.
- Only one courier death announcement is emitted per event batch to keep central announcements readable.

## Current UX Contract

- This is presentation only.
- It does not create or mutate `unit_died` events.
- It does not change courier bounty, respawn, delivery, pathing, or item movement.
- It does not add a separate toast stack yet; it reuses the existing central announcement component.

## Validation

- `tests/announceModel.test.ts` covers allied courier death, enemy courier death, non-courier deaths, and one-announcement-per-batch priority.
- Targeted TypeScript check covers `announce.ts`, `announceModel.ts`, `main.ts`, and the new tests.

## Next Stage

1. Add a compact secondary notification lane if central announcements become overloaded.
2. Add courier death minimap pulse using existing UX pulse contracts.
3. Add manual courier controls only after command semantics are stable.
