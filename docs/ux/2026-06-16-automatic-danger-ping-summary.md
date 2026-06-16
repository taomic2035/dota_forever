# Automatic Danger Ping Summary

Date: 2026-06-16
Owner: Codex UX/control line
Scope: UI, controls, and playability only. This slice consumes existing event batches and changes alert feedback; it does not change combat, AI, vision, building damage, courier death, economy, or balance.

## Mainline Check

This continues the Dota1/WC3-style tactical readability work. Manual danger pings are useful, but the game should also mark the highest-impact local threats with the same danger language so players can react without reading central text first.

## Completed In This Slice

- Allied courier death now emits `dangerPing` instead of regular `ping`.
- Enemy courier death stays regular `ping`, because it is positive information rather than a local danger warning.
- Added pure `buildBuildingAttackAlertPulses()` model in `src/ui/buildingAttackAlertModel.ts`.
- Allied buildings attacked by enemy heroes now emit `dangerPing`.
- The existing per-building 6 second cooldown and alert audio behavior are preserved.
- Creep damage, friendly hero damage, enemy buildings, and cooldown-blocked repeats are ignored.

## Current UX Contract

- This is feedback-only.
- It reuses `WorldPulseKind` and the existing 2D/3D/minimap `dangerPing` rendering path.
- It does not add chat, multiplayer broadcast, visibility reveals, damage rules, or new sim events.
- Building attack alerts remain hero-source only to avoid noisy creep-wave spam.

## Validation

- `tests/courierEventFeedback.test.ts` covers allied courier death as danger, enemy courier death as regular ping, non-courier filtering, and allied-priority batching.
- `tests/buildingAttackAlertModel.test.ts` covers allied building danger ping, ignored non-hero/friendly/enemy-building cases, cooldown blocking, and cooldown expiry.

## Next Stage

1. Consider distinct alert audio only after the current audio contract can separate ping classes cleanly.
2. Add a short threat toast only if danger pings alone are insufficient in live play.
3. Extend automatic danger semantics to courier low-health route exposure once courier path preview is stable.
