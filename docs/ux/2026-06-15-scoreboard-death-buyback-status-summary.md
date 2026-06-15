# Scoreboard Death And Buyback Status Summary

Date: 2026-06-15

Scope: core in-game UX only. This slice improves Tab scoreboard readability after deaths and during buyback decisions. It does not change death, respawn, buyback, gold, bounty, or cooldown simulation rules.

## Why This Matters

In Dota-like play, the scoreboard is a fight recovery tool. Players need to know not only who died, but whether that hero can immediately rejoin with buyback, is blocked by cooldown, or lacks gold. The HUD already had local buyback affordance for the controlled hero; the scoreboard needed a team-wide readout.

## Implemented

- Extended the pure scoreboard model:
  - `src/ui/scoreboardModel.ts`
  - `scoreboardHeroSummary()` now returns a `status` object for each hero.
- Added focused tests:
  - `tests/scoreboardModel.test.ts`
  - Covers alive, buyback-ready, buyback-cooldown, and not-enough-gold states.
- Updated the Tab scoreboard UI:
  - `src/ui/scoreboard.ts`
  - Adds a `状态` column next to level.
  - Displays `LIVE`, `BUYBACK`, `BB CD`, or `NO GOLD`.
  - Death states include respawn time plus buyback cost, cooldown, or missing gold details.

## UX Boundary

This is read-only UI. It mirrors existing `heroMeta.respawnAt`, `heroMeta.buybackCooldownUntil`, current gold, level, and the shared `buybackCost()` table.

It does not:

- alter buyback eligibility
- alter buyback cost
- alter respawn timing
- add death recap event history
- add team objective rows
- add new audio, ping, or notification systems

Remaining scoreboard work can focus on item icon polish, hero portrait/icon polish, team objective rows, and fuller death recap if the sim later exposes richer combat history.
