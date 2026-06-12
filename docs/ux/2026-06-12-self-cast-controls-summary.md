# Self-Cast Controls UX Summary

Date: 2026-06-12
Status: implemented and verified

## Player-Facing Change

Players can now hold `Alt` while pressing an ability or item hotkey to attempt an immediate self-cast. This removes the need to place the cursor directly over the hero for defensive buffs, heals, and utility items.

## Implemented Rules

- `Alt + Q/W/E/R` attempts self-cast for unit-target abilities.
- `Alt + 1/2/3/4/5/6` attempts self-cast for unit-target item actives.
- Self-cast ignores the cursor position.
- Self-cast succeeds only for explicit `self`, `allyOrSelf`, or `any` target-team commands.
- Enemy-only, ally-only, kind-incompatible, and implicit target-team commands reject cleanly.
- Invalid self-cast does not leave pending targeting active.
- Normal, quick, smart, and per-slot cast modes are unchanged when `Alt` is not held.

## Code Changes

- `src/engine/selfCast.ts` defines the shared self-cast target policy.
- `src/engine/input.ts` detects `Alt` on ability and item hotkeys and routes self-cast attempts through immediate confirmation.
- `src/main.ts` resolves self targets before regular cursor target lookup for abilities and items.
- `tests/selfCast.test.ts` covers self-cast target-team and target-kind policy.

## Verification So Far

- Red test confirmed before implementation:
  - `npm test -- tests/selfCast.test.ts` failed because `src/engine/selfCast.ts` did not exist.
- Focused validation after implementation:
  - `npm test -- tests/selfCast.test.ts`
  - `npm test -- tests/selfCast.test.ts tests/controlSettings.test.ts`
  - `npm run typecheck`
- Screenshot validation:
  - `node scripts/shot.mjs "http://127.0.0.1:5180/?mode=play&hero=rein&seed=42&speed=1&itemCast=normal" docs/screenshots/ux-self-cast-controls.png 1200 <eval>`
  - Eval returned `item: "force_staff"`, `movedX: 600`, `movedY: 0`, `cooldownActive: true`, `targetingActive: false`, and `cursorMessage: null`.
- Full validation:
  - `npm test`: 56 test files and 613 tests passed.
  - `npm run build`: passed. Vite reported the existing large chunk warning.

## Screenshot

- `docs/screenshots/ux-self-cast-controls.png`

## Remaining UX Debt

- Add double-tap self-cast only if playtesting shows Alt is not enough.
- Add key rebinding after modifier behavior is stable.
- Add a compact controls page if hidden modifier controls become too hard to discover.
