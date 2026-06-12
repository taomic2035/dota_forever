# Command Reject Feedback UX Design

Date: 2026-06-12
Status: auto-approved continuation of UI and control focus

## Goal

Make failed commands explain themselves immediately. When a player presses QWER or 1-6 and the command cannot start or cannot confirm, the UI should answer the practical control question: why did nothing happen?

## Scope

This batch covers:

- A short-lived command message channel in `UxFeedback`.
- Cursor-adjacent reject labels such as `NO MANA`, `ON COOLDOWN`, `NOT LEARNED`, `PASSIVE`, `EMPTY SLOT`, `NO CHARGES`, and `INVALID TARGET`.
- HUD slot flashes for failed abilities and failed item slots.
- Item slot flash rendering, including empty slots.
- Reuse of existing world reject pulses.

This batch does not change cooldown, mana, target validation, item use, cast movement, or combat resolution.

## Interaction Rules

- Pressing an unusable ability flashes its slot, shows a red cursor message, and emits a reject pulse near the hero.
- Confirming an invalid unit target flashes the pending ability or item slot, shows `INVALID TARGET`, and keeps the pending target mode active.
- Pressing an unusable item slot flashes that item slot, shows a reason, and emits a reject pulse near the hero.
- Successful no-target item use and successful targeted item confirmation flash the item slot as confirm.
- Existing pending cast and item labels remain visible; reject messages stack under them briefly instead of replacing them.

## Visual Rules

- Reject messages use compact all-caps text beside the cursor.
- Ability pending labels keep the current blue accent.
- Item pending labels keep the current gold accent.
- Reject labels use the same red language as invalid target rings and reject world pulses.
- HUD rejects use an inset red outline; item slots get the same treatment as ability slots.

## Acceptance Criteria

- `UxFeedback` can store, replace, expire, and clear command messages.
- `CommandCursor` can render an intent label and a reject message at the same time.
- Ability and item failure paths set command messages with specific labels.
- Item slots support `ux.hudFlashFor("item-n", time)`.
- Focused tests pass before broader validation.
- Screenshot captures a visible reject reason next to the cursor.

## Summary Protocol

After implementation, add `docs/ux/2026-06-12-command-reject-feedback-summary.md` with player-facing changes, verification, screenshot path, and remaining control UX debt.
