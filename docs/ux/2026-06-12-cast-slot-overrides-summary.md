# Cast Slot Overrides UX Summary

Date: 2026-06-12
Status: implemented and verified

## Player-Facing Change

Ability and item cast behavior can now be tuned at slot level. The global ability and item cast modes remain the default, while individual QWER and 1-6 slots can be set to `Auto`, `Normal`, `Quick`, or `Smart`.

## Implemented Rules

- `Auto`: inherit the current global mode for that command class.
- `Normal`: press hotkey, preview target, click to confirm.
- `Quick`: press hotkey to confirm immediately at the current cursor.
- `Smart`: press hotkey to preview, release the same hotkey to confirm.
- Slot buttons cycle `Auto -> Normal -> Quick -> Smart -> Auto`.
- Invalid quick or smart confirms keep the pending correction flow from the previous cast-mode batch.

## Settings Entry Points

- Pause menu global buttons:
  - `Ability Normal/Quick/Smart`
  - `Item Normal/Quick/Smart`
- Pause menu slot buttons:
  - `Q/W/E/R Auto|Normal|Quick|Smart`
  - `1/2/3/4/5/6 Auto|Normal|Quick|Smart`
- URL overrides:
  - `abilityQ=normal|quick|smart|auto`
  - `abilityW=normal|quick|smart|auto`
  - `abilityE=normal|quick|smart|auto`
  - `abilityR=normal|quick|smart|auto`
  - `item1=normal|quick|smart|auto` through `item6=normal|quick|smart|auto`

## Code Changes

- `src/engine/controlSettings.ts` now defines fixed ability and item override arrays, fallback resolution, override cycling, and labels.
- `src/engine/input.ts` resolves QWER and item hotkey cast modes per slot before applying normal, quick, or smart behavior.
- `src/main.ts` parses URL slot overrides and persists normalized settings.
- `src/ui/menu.ts` exposes compact global and slot-level pause menu controls.

## Verification So Far

- Red test confirmed before implementation:
  - `npm test -- tests/controlSettings.test.ts` failed on missing override normalization, resolvers, cycling, and labels.
- Focused validation after implementation:
  - `npm test -- tests/controlSettings.test.ts`
  - `npm run typecheck`
- Screenshot validation:
  - `node scripts/shot.mjs "http://127.0.0.1:5180/?mode=play&hero=rein&seed=42&speed=1&abilityCast=normal&itemCast=normal&abilityQ=smart&item1=quick" docs/screenshots/ux-cast-slot-overrides.png 1200 <eval>`
  - Eval returned `itemGlobal: "Item Normal"`, `abilityQ: "Q Smart"`, `item1: "1 Quick"`, `item2: "2 Auto"`, `creepAlive: false`, and `gold: 160`.
- Full validation:
  - `npm test`: 55 test files and 609 tests passed.
  - `npm run build`: passed. Vite reported the existing large chunk warning.

## Screenshot

- `docs/screenshots/ux-cast-slot-overrides.png`

## Remaining UX Debt

- Add key rebinding after slot cast behavior settles.
- Add self-cast and alt-cast modifiers after targeting rules are stable.
- Add a dedicated controls/options screen if the pause menu grows beyond one compact panel.
