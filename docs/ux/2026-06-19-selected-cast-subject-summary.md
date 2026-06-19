# Selected Cast Subject UX Summary

Date: 2026-06-19
Owner: Codex UX
Scope: multi-unit command UX

## What Changed

- Added `selectedCastSubject(...)` in `src/engine/selectionCommandRouting.ts`.
- QWER ability commands and item hotkeys now use the current primary commandable selected unit as the cast/item subject.
- Inspect-only selections still fall back to the player hero.
- Missing or stale primary selected ids also fall back to the player hero.
- Move, attack, stop, hold, and group command routing are unchanged.

## Why

The DotA UX gap list still had “召唤物/信使施法物品” as a remaining multi-unit control item. Movement and attack commands already routed through the selection set, but ability/item commands were still hard-bound to `hero`. This pass removes that hard binding at the input-routing layer.

## Integration Notes For Opus

- Pure routing model: `src/engine/selectionCommandRouting.ts`
- Game input wiring: `src/main.ts`
- Tests: `tests/selectionCommandRouting.test.ts`

This is UX/input routing only. It does not add new summon abilities, courier inventory rules, item transfer rules, cooldown semantics, or sim-side ability behavior.

## Verification

```bash
npm test -- tests/selectionCommandRouting.test.ts tests/inputSelectionHotkeys.test.ts tests/controlSettings.test.ts
npm run build
```
