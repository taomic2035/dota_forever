# Inspect Inventory Summary

Date: 2026-06-15

Scope: core in-game UX only. This slice improves enemy and non-primary hero inspection; it does not add scoreboard, tutorial, chat, or peripheral systems.

## Why

The inspect panel already made view-only selection safer by showing unit authority, level, HP/MP, combat stats, and status chips. The remaining gap in the core Dota-like read was equipment: when selecting an enemy hero or another non-primary hero, the player could not quickly see what items that unit carried.

## Implemented

- Extended the inspect panel model:
  - `inspectInventorySummary()` in `src/ui/inspectPanelModel.ts`
  - summarizes visible main inventory items and the TP slot
  - uses project item names from `itemDef`
  - compresses non-TP names to short labels for compact panel layout
  - shows charges when present
- Extended focused tests:
  - `tests/inspectPanelModel.test.ts`
  - covers populated inventory + TP slot
  - covers empty inventory hidden state
- Integrated the summary into `src/ui/inspectPanel.ts`:
  - hero inspect panels now show compact item chips under combat stats
  - non-hero inspect panels and empty inventories stay unchanged

## UX Boundary

This is UI-only. It does not change item visibility rules, inventory ownership, item effects, economy, shop logic, bot shopping, or combat. It reads the inspected unit's current `inventory` and `tpSlot`.

## Verification

- RED: `npm test -- tests/inspectPanelModel.test.ts` failed because `inspectInventorySummary` was not implemented.
- GREEN: `npm test -- tests/inspectPanelModel.test.ts` passed with 5 tests.

Broader build and runtime smoke verification are tracked in the active turn summary.
