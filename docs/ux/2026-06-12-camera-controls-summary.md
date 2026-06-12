# Camera Controls UX Summary

Date: 2026-06-12
Status: implemented and verified

## Player-Facing Change

Players can now tune camera navigation from the pause menu. Edge pan can be turned on or off, and camera pan speed can be cycled between `Slow`, `Normal`, and `Fast`.

## Implemented Rules

- Edge pan defaults to on.
- Camera speed defaults to normal.
- Arrow-key pan and edge pan use the configured speed.
- Middle-mouse drag and wheel zoom keep existing behavior.
- Settings persist through the existing control settings storage.

## Settings Entry Points

- Pause menu buttons:
  - `Camera Slow/Normal/Fast`
  - `Edge On/Off`
- URL overrides:
  - `cameraSpeed=slow|normal|fast`
  - `edgePan=on|off|true|false|1|0`

## Code Changes

- `src/engine/controlSettings.ts` now defines camera speed parsing, cycling, labels, and multipliers.
- `src/engine/input.ts` applies `cameraEdgePan` and `cameraPanSpeed` in camera panning.
- `src/main.ts` loads camera URL overrides into the shared control settings.
- `src/ui/menu.ts` exposes camera controls in the pause menu.
- `tests/controlSettings.test.ts` covers camera setting parsing, normalization, cycling, labels, and multipliers.

## Verification So Far

- Red test confirmed before implementation:
  - `npm test -- tests/controlSettings.test.ts` failed on missing camera speed symbols and settings.
- Focused validation after implementation:
  - `npm test -- tests/controlSettings.test.ts`
  - `npm test -- tests/controlSettings.test.ts tests/selfCast.test.ts`
  - `npm run typecheck`
- Screenshot validation:
  - `node scripts/shot.mjs "http://127.0.0.1:5180/?mode=play&hero=rein&seed=42&speed=1&cameraSpeed=fast&edgePan=off" docs/screenshots/ux-camera-controls.png 1200 <eval>`
  - Eval returned `camera: "Camera Fast"`, `edge: "Edge Off"`, `dx: 0`, and `dy: 0`.
- Full validation:
  - `npm test`: 56 test files and 616 tests passed.
  - `npm run build`: passed. Vite reported the existing large chunk warning.

## Screenshot

- `docs/screenshots/ux-camera-controls.png`

## Remaining UX Debt

- Add camera follow/lock only after playtesting confirms it is useful.
- Add minimap drag-scroll if lane scanning still feels slow.
- Add a dedicated controls screen if the pause menu becomes too dense.
