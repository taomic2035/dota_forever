# Command Reject Feedback Summary

Date: 2026-06-12

## Recap

The previous control passes made ability and item targeting deliberate. This pass improves the next missing piece: when a command fails, the player now gets an immediate reason instead of only a vague reject pulse.

## Player-Facing Changes

- Failed ability and item commands now show a short red message next to the cursor.
- Pending command labels can stack with reject reasons, for example `CAST Q` plus `NO MANA`.
- Ability failures distinguish `NOT LEARNED`, `PASSIVE`, `ON COOLDOWN`, `NO MANA`, `SILENCED`, and `DEAD`.
- Item failures distinguish `EMPTY SLOT`, `NO ACTIVE`, `ON COOLDOWN`, `NO MANA`, `NO CHARGES`, `INVALID TARGET`, and `CAN'T USE`.
- Invalid unit-target confirmation keeps the pending cast or item active while showing `INVALID TARGET`.
- Item slots now support the same HUD flash language as ability slots.
- Successful item use flashes the item slot with a gold confirm state.
- Empty item slots can visibly flash red when the player presses their hotkey.

## Design Notes

- The change is a feedback-layer improvement only; it does not change item use, cast timing, mana/cooldown payment, or target validation.
- Cursor text is intentionally compact and all-caps because it appears during high-frequency control input.
- The screenshot uses an injected `NO MANA` command message to make the combined cursor and HUD feedback stable for review.

## Verification

- `npm test -- tests/uxFeedback.test.ts`: first failed as expected because `setCommandMessage` did not exist.
- `npm run typecheck`: passed.
- `npm test -- tests/uxFeedback.test.ts tests/commandMode.test.ts`: passed, 20 tests.
- `npm test`: passed, 49 files / 580 tests.
- `npm run build`: passed, 76 modules transformed.
- Build note: Vite reported the existing large chunk warning after minification; build still succeeded.
- Screenshot captured and visually inspected: `docs/screenshots/ux-command-reject-feedback.png`.

## Remaining Control UX Debt

- Add audio error barks that match the new reject reason categories.
- Add item-specific ally/enemy/self target filters for more accurate pending previews.
- Add a keybinding/settings UI for normal-cast, quick-cast, and smart-cast preferences.
- Localize command feedback once the broader UI language pass is scheduled.
