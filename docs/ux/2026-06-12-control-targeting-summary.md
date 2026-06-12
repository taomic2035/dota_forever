# Control Targeting Summary

Date: 2026-06-12

## Recap

The project has gained several readability layers: HUD structure, command cursor feedback, unit identity, map readability, projectile/effect families, and spell geometry patterns. This pass corrected focus back to the main UI/control problem: QWER targeting previously behaved like a rough quick-cast attempt instead of a deliberate command mode.

## Player-Facing Changes

- QWER now uses a prepare/preview/confirm flow.
- No-target abilities still fire immediately.
- Point and unit abilities enter pending target mode and wait for left-click confirmation.
- Mouse movement updates the target preview while pending.
- Unit-target previews show a cursor reticle and red invalid state when there is no valid unit under the cursor.
- Invalid unit-target clicks reject but keep the pending cast active, so the player can keep aiming.
- Right-click, Escape, and Stop cancel pending casts cleanly.
- Escape no longer opens the pause menu while a targeting overlay is active.
- Cursor cast badge stays visible while pending instead of expiring after a short timeout.

## Design Notes

- This improves the Dota-like control loop without changing simulation rules.
- Point abilities are still allowed to confirm at the chosen ground position; the range ring is guidance, not a hard blocker.
- The screenshot uses an injected pending targeting state to make the invalid-target UI stable for review.

## Verification

- `npm run typecheck`: passed.
- `npm test -- tests/commandMode.test.ts tests/uxFeedback.test.ts`: passed, 13 tests.
- `npm test`: passed, 49 files / 573 tests.
- `npm run build`: passed, 76 modules transformed.
- Build note: Vite reported the existing large chunk warning after minification; build still succeeded.
- Screenshot captured: `docs/screenshots/ux-control-targeting.png`.

## Remaining Control UX Debt

- Add item targeting to the same prepare/preview/confirm model.
- Add explicit keybinding/settings UI for quick-cast versus normal-cast preferences.
- Add target filters per ability type so ally-only/enemy-only spells preview more accurately.
- Add audible/UI error reasons for mana, cooldown, passive, and invalid target states.
