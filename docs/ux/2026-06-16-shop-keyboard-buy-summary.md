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

## UX Boundary

This is intentionally a UI/control improvement, not a mechanics change:

- No new item movement logic.
- No new combine logic.
- No quickbuy queue persistence yet.
- No courier delivery command changes.
- Mouse row purchase behavior remains on the existing path.

## Verification

- RED: `npm test -- tests/shopQuickActionModel.test.ts` failed on missing behavior.
- GREEN: `npm test -- tests/shopQuickActionModel.test.ts` passed.
- Regression set: `npm test -- tests/shopQuickActionModel.test.ts tests/shopRecipeModel.test.ts tests/shopOwnershipModel.test.ts tests/shopDestinationModel.test.ts tests/shopListModel.test.ts` passed.
- Targeted type check: `npx tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --lib "es2022,dom" --skipLibCheck src\ui\shop.ts src\ui\shopQuickActionModel.ts tests\shopQuickActionModel.test.ts` passed.
- Browser smoke: opened 2D play mode, opened shop, searched `branch`, verified `Enter: Buy`, pressed Enter, and confirmed `branch` entered inventory.

Note: full `npm run build` is currently blocked by parallel uncommitted PRD work in `tests/prd.test.ts` importing a non-exported `mulberry32`. That file is outside this UX slice and was not staged.
