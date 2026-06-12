# Spell Impact Readability Summary

Date: 2026-06-12

## Player-Facing Changes

- Added a second spell readability channel beyond color: impact silhouettes now differ by family.
- Fire hits render as ember sparks, frost as angular shards, lightning as jagged strokes, poison/nature as soft clouds, earth as ground cracks, holy as halos, arcane as orbiting rune marks, and blood/shadow as splatter.
- Skill event particles now carry `pattern` metadata from `fxStyle`, so future beam, ring, and field polish can reuse the same grammar.
- Existing flash, buff rise, and debuff fall motion styles are preserved.

## Design Notes

- This is an original modernized MOBA visual language inspired by classic readability goals, not a copy of Dota 1 assets.
- Pattern and motion are separate. A skill can share the same element family while still using blink, buff, debuff, burst, or crack motion.
- The screenshot deliberately injects eight representative patterns into one live play scene to validate silhouette separation under the real camera, terrain, HUD, and minimap.

## Verification

- `npm run typecheck`: passed.
- `npm test -- tests/fxstyle.test.ts tests/fxlayer.test.ts`: passed, 31 tests.
- `npm test`: passed, 48 files / 564 tests.
- `npm run build`: passed, 75 modules transformed.
- Screenshot captured: `docs/screenshots/ux-spell-impact-readability.png`.

## Remaining UX Debt

- Add pattern-specific ring, field, and beam treatments beyond metadata propagation.
- Add stronger ultimate-scale VFX timing: screen-space pulse, dust, and short-lived screen emphasis.
- Build authored icon/portrait assets later; current work remains procedural and code-native.
- Add sound timing and cast windup feedback after visual readability stabilizes.
