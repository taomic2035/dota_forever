# Command Cursor Batch Summary

Date: 2026-06-12

## Player-Facing Changes

- Added cursor position and command intent state to the shared UX feedback model.
- Added a compact non-interactive command cursor badge near the mouse.
- Added visible `A-MOVE`, `CAST Q/W/E/R`, and `ITEM 1-6` cursor intent states.
- Wired pointer movement from `InputManager` into UX state.
- Kept world command pulses, targeting overlays, and gameplay simulation unchanged.

## Design Mapping

- `docs/ux/2026-06-12-command-cursor-design.md`: cursor-adjacent command intent.
- `docs/ux/2026-06-12-core-ux-design.md`: command feedback requirement for A-click, invalid commands, and cast state.
- `docs/ux/references/ux-target-cast-feedback.png`: compact targeting and command affordance direction.

## Verification

- `npm test -- tests/uxFeedback.test.ts`: PASS, 6 tests.
- `npm run typecheck`: PASS during implementation.
- `node scripts/shot.mjs "http://127.0.0.1:5183/?mode=play&hero=zola&seed=42&speed=1" docs/screenshots/ux-command-cursor.png 1800 "...cursor intent eval..."`: PASS.
- `npm test`: PASS, 48 files and 560 tests.
- `npm run build`: PASS, 75 modules transformed.

## Screenshots

- `docs/screenshots/ux-command-cursor.png`

## Remaining UX Debt

- Custom OS cursor images are still not implemented.
- Cast mode is currently a brief quick-cast badge; a future non-quick-cast mode could keep it persistent until confirmation.
- Invalid-command cursor state could be added alongside the existing world reject pulse.
