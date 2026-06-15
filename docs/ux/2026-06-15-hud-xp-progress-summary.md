# HUD XP Progress Summary

Date: 2026-06-15

Scope: core in-game UX only. This slice improves hero growth readability in the bottom HUD and does not add peripheral systems.

## Why

Real Dota-like HUDs make level growth visible during lane and fight decisions. The project already had hero level, accumulated XP, skill points, and the classic XP table in sim data, but the bottom HUD only showed the current level badge. Players could not read how close they were to the next level without inferring it from future skill-point changes.

## Implemented

- Added a pure XP HUD model:
  - `src/ui/heroXpHudModel.ts`
  - inputs: current hero level and cumulative XP
  - outputs: previous threshold, next threshold, current-level XP, required XP, remaining XP, progress percent, compact label, tooltip detail, max-level state
- Added focused tests:
  - `tests/heroXpHudModel.test.ts`
  - covers level 1 progress, cumulative higher-level thresholds, and max-level handling
- Integrated the model into `src/ui/hud.ts`:
  - thin gold XP bar below HP/MP
  - compact `XP current/required` label
  - tooltip shows remaining XP to the next level or max-level status

## UX Boundary

This is UI-only. It does not change XP gain, level-up rules, skill-point rules, economy, bot logic, combat, or balance. It reads the existing `hero.level`, `hero.heroMeta.xp`, `XP_TABLE`, and `MAX_LEVEL`.

## Verification

- RED: `npm test -- tests/heroXpHudModel.test.ts` failed because `src/ui/heroXpHudModel` did not exist.
- GREEN: `npm test -- tests/heroXpHudModel.test.ts` passed with 3 tests.

Broader build and smoke verification are tracked in the active turn summary.
