# Item Targeting Summary

Date: 2026-06-12

## Recap

The last control pass made QWER abilities use a deliberate prepare, preview, confirm, and cancel flow. This pass applies the same UX rhythm to active items, keeping the focus on core game controls rather than adding new simulation behavior.

## Player-Facing Changes

- Active point and unit items on keys `1-6` now enter pending target mode instead of firing immediately at the current cursor.
- No-target active items still execute instantly.
- Mouse movement updates the item target preview while pending.
- Unit-target items show a cursor reticle and red invalid state when no valid unit is under the cursor.
- Failed or invalid item confirmation rejects but keeps the pending item active, so the player can keep aiming.
- Right-click, Escape, and Stop cancel pending item targeting cleanly.
- Pressing QWER replaces pending item mode with ability targeting.
- Pressing another usable item slot replaces the previous pending item mode.
- Cursor feedback now shows an `ITEM n` badge with an item-gold accent.

## Design Notes

- This keeps item use closer to classic command-mode muscle memory while preserving current item definitions and cooldown, mana, and charge checks.
- Item previews reuse the existing targeting overlay so ability and item controls share one visual grammar.
- The screenshot uses an injected pending item state to make the invalid-target UI stable for review.

## Verification

- `npm run typecheck`: passed.
- `npm test -- tests/commandMode.test.ts tests/uxFeedback.test.ts`: passed, 18 tests.
- `npm test`: passed, 49 files / 578 tests.
- `npm run build`: passed, 76 modules transformed.
- Build note: Vite reported the existing large chunk warning after minification; build still succeeded.
- Screenshot captured and visually inspected: `docs/screenshots/ux-item-targeting.png`.

## Remaining Control UX Debt

- Add item-specific ally/enemy/self target filters so unit-item previews can be more precise.
- Add item slot focus flash and better HUD affordance when an item enters pending mode.
- Add a keybinding/settings UI for normal-cast, quick-cast, and smart-cast preferences.
- Add player-readable reject reasons for cooldown, mana, passive, no charges, and invalid target states.
