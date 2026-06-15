# Shop Recipe Progress Summary

Date: 2026-06-15

Scope: core in-game UX only. This slice improves shop recipe readability during live play. It does not change recipe completion, item movement, purchase routing, courier behavior, economy, or balance.

## Why This Matters

Dota-like shopping depends on knowing whether a combined item is close to completion. The shop already showed destination and owned-location badges, but recipe rows still required players to mentally inspect tooltips and inventory slots. This pass makes component progress visible directly on combined item rows.

## Implemented

- Added a pure recipe progress model:
  - `src/ui/shopRecipeModel.ts`
  - `buildShopRecipeProgressModel()` tracks required components, owned components, hero-ready components, and missing components.
- Added focused tests:
  - `tests/shopRecipeModel.test.ts`
  - Covers non-recipe items, duplicate component requirements, missing components, and TP-slot counting.
- Updated shop row UI:
  - `src/ui/shop.ts`
  - Combined item rows now show `Recipe x/y` and `Hero x/y`.
  - Missing components are shown inline when ownership is incomplete.

## UX Boundary

This is read-only UI. It mirrors existing recipe data and current item containers.

Important rule reflected by the UI: current auto-combine only consumes components from the hero's main inventory. The `Recipe x/y` badge shows total owned across containers; the `Hero x/y` badge shows how many components are actually ready in the main inventory.

It does not:

- move components
- trigger combine
- change recipe scroll behavior
- change purchase target logic
- add quickbuy
- add courier logistics

Remaining shop work can focus on true quickbuy, keyboard-first buy flow, component transfer affordances, and courier-aware delivery controls once the sim contract is stable.
