# Cast Input Settings UX Summary

Date: 2026-06-12
Status: implemented and verified

## Player-Facing Change

Ability and item hotkeys now support configurable cast confirmation behavior. The default remains the existing two-step flow, while faster modes can be enabled independently for abilities and items.

## Implemented Modes

- `Normal`: press hotkey, preview target, click to confirm.
- `Quick`: press hotkey to confirm immediately at the current cursor.
- `Smart`: press hotkey to preview, release the same hotkey to confirm.

## Settings Entry Points

- Pause menu buttons:
  - `Ability Normal/Quick/Smart`
  - `Item Normal/Quick/Smart`
- URL overrides:
  - `abilityCast=normal|quick|smart`
  - `itemCast=normal|quick|smart`
- Settings are saved in localStorage under `dotaForever.controlSettings.v1`.

## Code Changes

- `src/engine/controlSettings.ts` defines shared cast mode parsing, normalization, labels, and cycling.
- `src/engine/input.ts` supports normal, quick, and smart behavior without changing default controls.
- `src/main.ts` loads settings from localStorage, applies URL overrides, persists menu changes, and passes settings into `InputManager`.
- `src/ui/menu.ts` exposes compact pause-menu controls for ability and item cast modes.

## Verification So Far

- Red test confirmed before implementation:
  - `npm test -- tests/controlSettings.test.ts` failed because `src/engine/controlSettings.ts` did not exist.
- Focused validation after implementation:
  - `npm test -- tests/controlSettings.test.ts`
  - `npm test -- tests/controlSettings.test.ts tests/commandMode.test.ts tests/uxFeedback.test.ts`
  - `npm run typecheck`
- Screenshot validation:
  - `node scripts/shot.mjs "http://127.0.0.1:5180/?mode=play&hero=rein&seed=42&speed=1&abilityCast=smart&itemCast=quick" docs/screenshots/ux-cast-input-settings.png 1500 <eval>`
  - Eval returned `creepAlive: false`, `goldDelta: 160`, `pending: null`, and labels `Ability Smart` / `Item Quick`.
- Full validation:
  - `npm test`: 55 test files and 605 tests passed.
  - `npm run build`: passed. Vite reported the existing large chunk warning.

## Screenshot

- `docs/screenshots/ux-cast-input-settings.png`

## Remaining UX Debt

- Add per-slot or per-ability overrides if playtesting shows global ability/item modes are too broad.
- Add key rebinding after core cast modes settle.
- Add audio or subtle cursor feedback for quick/smart confirmations.
