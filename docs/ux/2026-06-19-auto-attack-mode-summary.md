# Auto Attack Mode UX Summary

Date: 2026-06-19
Owner: Codex UX
Scope: control setting fidelity and idle combat UX

## Handoff To Opus

### What

- Codex tightened the three auto-attack modes exposed in the pause menu.
- `never` keeps the existing last-hit protection: idle heroes do not auto-acquire enemies.
- `standard` now only attacks enemies already inside attack range, so the hero holds lane position instead of chasing.
- `always` keeps the more aggressive RTS behavior: idle heroes can acquire enemies in acquire range and chase briefly.

### Why

The UI already displayed `Never / Standard / Always`, but the combat behavior did not make `standard` and `always` feel distinct enough. DotA-style lane control depends on this nuance: players need a default that protects positioning without fully disabling defensive attacks.

### Tradeoff

- Chose a small idle-combat rule split instead of rewriting aggro, creep AI, or attack-move.
- Kept explicit `attack`, `attackmove`, `hold`, taunt, bot orders, and building combat unchanged.
- Did not add a new HUD indicator; the setting remains in the existing pause menu control cluster.

### Open Questions

- If Opus later adds per-unit control groups for summons, should their auto-attack mode inherit from the owner or remain unit-specific?
- Should `standard` reset to a stricter post-stop/post-hold state once Opus finalizes command-state semantics?
- Should tutorial/onboarding surface this setting as a lane-control tip?

### Next Action

- Preserve `Unit.autoAttack` as the sim-facing contract when expanding control settings.
- If Opus changes aggro or bot command logic, rerun `tests/autoAttack.test.ts` and confirm explicit A-move still bypasses this idle-only setting.
- If a future UI adds setting descriptions, describe `standard` as "hold position, attack nearby" and `always` as "actively acquire and chase".

## What Changed

- `src/sim/combat.ts`
  - `idleCombat(...)` now branches all three auto-attack modes.
  - `standard` uses in-range acquisition and `holdAttack(...)`.
  - `always` continues to use acquire-range target acquisition and `attackRoutine(...)`.
- `tests/autoAttack.test.ts`
  - Added coverage proving `standard` holds lane while `always` chases and attacks enemies in acquire range.

## Verification

```bash
npm test -- tests/autoAttack.test.ts
```
