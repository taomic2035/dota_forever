# Item Targeting UX Design

Date: 2026-06-12
Status: auto-approved continuation of UI and control focus

## Goal

Bring active item controls in line with ability targeting. The 1-6 keys should no longer fire point or unit items immediately at the current mouse position. They should enter a deliberate pending target mode with preview, confirmation, invalid-target rejection, and cancellation.

## Scope

This batch covers:

- Pending command state for item slots.
- Input callbacks for item prepare, preview, confirm, and pending state.
- Main game item targeting preview using `itemDef.active.targetMode`.
- HUD/cursor feedback for pending item mode.
- Tests for the unified command state.

This batch does not add custom item icons, item-specific target filters, smart-cast settings, or a keybinding menu.

## Interaction Rules

- `1-6` on an inactive, empty, passive, cooldown, no-mana, or unusable item: reject/no pending mode.
- `1-6` on no-target item: use immediately.
- `1-6` on point/unit item: enter pending item mode.
- Mouse movement updates the item target preview.
- Left click while pending item:
  - valid point or unit target: use item, clear pending mode.
  - invalid unit target or failed use: flash reject, keep pending mode.
- Right-click, Escape, or Stop cancels pending item mode.
- Pressing QWER replaces pending item mode with ability mode.
- Pressing another item slot replaces the pending item mode.

## Visual Rules

- Cursor badge uses `ITEM n` and item gold accent.
- Point items show an area preview at the cursor.
- Unit items show a unit reticle at the cursor, red when no unit is under cursor.
- Existing item HUD cooldown and charge rendering remain unchanged.

## Acceptance Criteria

- Command state tests cover pending item, invalid retention, replacement, and cancellation.
- Input manager supports pending item preview and confirmation.
- `main.ts` no longer immediate-casts point/unit items from `onItemKey`.
- `npm run typecheck`, focused tests, full tests, and build pass.

## Summary Protocol

After implementation, add `docs/ux/2026-06-12-item-targeting-summary.md` with player-facing changes, verification, screenshot path, and remaining control UX debt.
