# Scoreboard Net Worth Summary

Date: 2026-06-15

Scope: core in-game UX only. This slice improves scoreboard readability during live play and does not change item economy, buy/sell rules, hero balance, courier logistics, or simulation ownership.

## Why This Matters

Dota-like scoreboards are not only kill lists. Players use them to answer combat questions quickly: who is actually ahead, who has hidden economy in backpack or stash, and whether a visible gold value is misleading. The previous scoreboard showed current gold and main inventory item labels, but it did not expose total carried/stashed item value.

## Implemented

- Added a pure scoreboard model:
  - `src/ui/scoreboardModel.ts`
  - `scoreboardHeroSummary()` returns current gold, net worth, and compact item summaries.
- Added focused model tests:
  - `tests/scoreboardModel.test.ts`
  - Covers inventory, backpack, stash, TP slot charges, empty inventory, and non-stack charge handling.
- Updated the Tab scoreboard UI:
  - `src/ui/scoreboard.ts`
  - Adds a stable `NW` column next to current gold.
  - Item summary now includes main inventory, backpack, stash, and TP slot instead of only the six active item slots.

## UX Boundary

Net worth is read-only UI. It mirrors current item definitions and hero item containers. It does not:

- change item costs
- change inventory, backpack, stash, or TP behavior
- add courier transfer actions
- add buyback logic
- modify combat, XP, or bounty rules

Remaining scoreboard work can still add item icons, buyback/death state, respawn time polish, level progress, and team objective rows. Those are next-stage UI improvements, not prerequisites for this net-worth slice.
