# Shop Owned Locations Summary

Date: 2026-06-15

Scope: core in-game UX only. This slice improves shop decision readability during live play. It does not change item purchase rules, inventory movement, courier behavior, recipes, economy, or balance.

## Why This Matters

Dota-like shopping is partly a memory task: before buying a component, the player needs to know whether the item is already on the hero, in backpack, in stash, or in the TP slot. The shop already previewed where a new purchase would land; it did not show where matching owned items already were.

## Implemented

- Added a pure ownership model:
  - `src/ui/shopOwnershipModel.ts`
  - `buildShopOwnershipModel()` summarizes matching items across hero inventory, backpack, stash, and TP slot.
- Added focused tests:
  - `tests/shopOwnershipModel.test.ts`
  - Covers hidden state, inventory/backpack/stash counts, TP charges, and stackable consumable charges.
- Updated shop row UI:
  - `src/ui/shop.ts`
  - Item rows now show compact `Owned` badges below the purchase destination preview.
  - Badges identify `Hero`, `Backpack`, `Stash`, and `TP` ownership counts.

## UX Boundary

This is read-only UI. It mirrors the current hero item containers and item charge metadata.

It does not:

- move items
- buy or sell items
- change where purchases land
- change recipe completion
- change stack/charge behavior
- add courier logistics controls

Remaining shop work can focus on quickbuy, component tree visualization, recipe ownership lanes, and keyboard-first purchase flow.
