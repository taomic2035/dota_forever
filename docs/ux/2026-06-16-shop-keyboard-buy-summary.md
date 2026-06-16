# Shop Keyboard Buy Summary

Scope: core in-game UX only. This slice improves live shop operation speed. It does not change item costs, shop access, recipe completion, inventory routing, economy, courier behavior, or balance.

## Problem

The shop already showed search results, purchase destination, owned locations, and recipe progress. The remaining friction was that a player still had to move from keyboard search back to the mouse to buy the obvious first affordable result.

## Implemented

- Added a pure quick-action model:
  - `src/ui/shopQuickActionModel.ts`
  - `tests/shopQuickActionModel.test.ts`
- The model selects the first buyable visible shop row for keyboard purchase.
- If all visible rows are blocked, it keeps the quick-action strip visible and explains the first block reason.
- `src/ui/shop.ts` now renders a compact quick-action strip below search:
  - `Enter: Buy <item>`
  - or `Enter: blocked`
- Pressing Enter in the shop search box buys the selected first buyable row through the existing `buyItem` + `purchaseKeyFor` path.
- Recipe rows now expose their next missing component:
  - `Next <component>` appears directly under the recipe progress chips.
  - `Shift+Enter: Buy <component>` appears below search when the current visible row has a missing component.
  - Shift+Enter buys that component through the existing `buyItem` path.
- Current recipe rows now expose a batch component action:
  - `Ctrl+Enter: Buy N components` appears below search when missing components are currently buyable.
  - Ctrl+Enter buys the currently buyable missing components in order, stopping on the first existing purchase failure.
- Stash retrieval now has a compact action:
  - `Take all xN` appears above stash rows when stash items can be retrieved at the home shop.
  - Limited inventory room is surfaced as `Take M / N`.
  - Blocked states explain `Need home shop` or `Inventory full`.

## UX Boundary

This is intentionally a UI/control improvement, not a mechanics change:

- No new item movement logic.
- No new combine logic.
- No quickbuy queue persistence yet.
- No courier delivery command changes.
- Mouse row purchase behavior remains on the existing path.
- Shift+Enter is a one-shot component purchase helper, not a persistent quickbuy queue.
- Ctrl+Enter is a one-shot batch helper for the current visible recipe row, not a persistent quickbuy queue.
- Take-all stash calls the existing `takeFromStash` path repeatedly and stops on the first existing failure.

## Verification

- RED: `npm test -- tests/shopQuickActionModel.test.ts` failed on missing behavior.
- GREEN: `npm test -- tests/shopQuickActionModel.test.ts` passed.
- Regression set: `npm test -- tests/shopStashActionModel.test.ts tests/shopQuickActionModel.test.ts tests/shopRecipeModel.test.ts tests/shopOwnershipModel.test.ts tests/shopDestinationModel.test.ts tests/shopListModel.test.ts` passed with 37 tests.
- Targeted type check: `npx tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --lib "es2022,dom" --skipLibCheck src\ui\shop.ts src\ui\shopQuickActionModel.ts tests\shopQuickActionModel.test.ts` passed.
- Browser smoke: opened 2D play mode, opened shop, searched `branch`, verified `Enter: Buy`, pressed Enter, and confirmed `branch` entered inventory.
- Browser smoke: opened 2D play mode, searched `magic_wand`, verified `Shift+Enter`, pressed Shift+Enter, and confirmed `magic_stick` entered inventory.
- Browser smoke: opened 2D play mode, searched `magic_wand`, verified `Ctrl+Enter`, pressed Ctrl+Enter, and confirmed all Magic Wand missing components entered inventory.
- Browser smoke: opened 2D play mode with stash items at the home shop, clicked `Take all x2`, and confirmed both stash items moved into inventory.
- Full build: `npm run build` passed. Vite still reports the existing large chunk warning.
