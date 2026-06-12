# Command Cursor Semantics Summary

Date: 2026-06-12

## Player-Facing Changes

- Pending command badges now carry target meaning through icon and color, not just text.
- Enemy-target commands show a red `X` icon, so hostile casts read differently from generic cast labels.
- Ally/self support commands use a green `+` icon.
- Ground-target commands use a ground marker icon while preserving ability blue or item gold.
- Any-unit targeting uses a neutral ring icon.
- Attack-move uses an amber `A` icon.
- Reject messages still stack under the active command intent, now through the same badge renderer.

## Design Notes

- This pass keeps the current browser overlay rather than replacing the operating system cursor.
- The visual mapping lives in `src/ui/commandCursorTheme.ts`, so icon/color choices are tested without DOM setup.
- Target semantics are derived in `src/ui/cursorTargetHint.ts` from existing `targetMode` and `targetTeam` metadata.
- `CommandCursor` now escapes labels through the shared renderer, which avoids unsafe HTML injection in cursor badges.
- No command routing, cast behavior, ability effects, or item effects were changed.

## Verification

- Red test confirmed before implementation: `npm test -- tests/commandCursorTheme.test.ts` failed on missing `../src/ui/commandCursorTheme`.
- Red test confirmed before target-hint helper: `npm test -- tests/cursorTargetHint.test.ts` failed on missing `../src/ui/cursorTargetHint`.
- Focused validation after implementation: `npm run typecheck` and `npm test -- tests/cursorTargetHint.test.ts tests/commandCursorTheme.test.ts tests/uxFeedback.test.ts tests/commandMode.test.ts tests/targetFilters.test.ts` passed, 35 tests.
- Screenshot eval returned `targetHint: "enemy"`, hostile badge `X CAST Q`, and reject badge `INVALID TARGET`.
- `npm run typecheck`: passed.
- `npm test`: passed, 52 files / 595 tests.
- `npm run build`: passed, 79 modules transformed.
- Build note: Vite reported the existing large chunk warning after minification; build still succeeded.
- Screenshot captured and visually inspected: `docs/screenshots/ux-command-cursor-semantics.png`.

## Screenshot Scenario

- Hero: Rein.
- Command: pending Q cast.
- Target under cursor: allied hero.
- Expected result: hostile red `X CAST Q` cursor badge plus `INVALID TARGET`, because `rein_hammer` is enemy-only.

## Remaining UX Debt

- Add true OS cursor assets or canvas-space cursor silhouettes if browser overlay latency becomes noticeable.
- Add quick-cast and smart-cast settings after target previews stabilize across the full ability dataset.
- Extend target semantics beyond team filters to hero-only, creep-only, building, ward, illusion, and immunity states.
- Add short audio cues for confirm, reject, hostile target, and support target once visual feedback is stable.
- Audit all hero and item metadata so cursor semantics are complete across the roster.
