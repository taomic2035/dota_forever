# Target Team Audit Summary

Date: 2026-06-12

## Player-Facing Changes

- Every unit-target hero ability now declares team targeting semantics for pending preview and command cursor UX.
- Every unit-target active item now declares team targeting semantics.
- Hostile single-target spells now default to red enemy cursor semantics instead of falling back to generic any-unit behavior.
- Support commands such as heals, armor, haste, and protection now show green support cursor semantics.
- Dual-use commands such as X mark, swap, decrepify, nightmare, purifying flames, and urn retain any-unit semantics.

## Metadata Coverage

- Hero unit-target abilities: 127 total.
- Hero distribution: 99 enemy, 19 ally-or-self, 7 any, 2 ally.
- Active item unit-targets: 20 total.
- Item distribution: 11 enemy, 7 any, 2 ally-or-self.
- New coverage test: `tests/targetTeamCoverage.test.ts`.

## Design Notes

- This pass intentionally covers only team-level targeting. It does not yet distinguish hero-only, creep-only, building, ward, neutral-only, illusion, or magic-immune filters.
- Neutral units are currently covered by enemy-style team filtering because neutral team differs from the player's team.
- Support skills that can sensibly be self-cast use `allyOrSelf` to avoid making defensive controls feel brittle.
- Non-self allied-unit mechanics such as dark ritual and recall use `ally` where self-targeting would be misleading.
- No ability effects, item effects, cooldowns, mana costs, or combat numbers were changed.

## Verification

- Red test confirmed before metadata fill: `npm test -- tests/targetTeamCoverage.test.ts` failed with 122 hero abilities and 2 items missing target metadata.
- Focused validation after metadata fill: `npm run typecheck` and `npm test -- tests/targetTeamCoverage.test.ts tests/cursorTargetHint.test.ts tests/targetFilters.test.ts tests/commandCursorTheme.test.ts tests/commandMode.test.ts tests/uxFeedback.test.ts` passed, 37 tests.
- Screenshot eval returned `hero: "olan"`, `ability: "olan_purify"`, `targetTeam: "allyOrSelf"`, and support badge `+ CAST Q`.
- `npm run typecheck`: passed.
- `npm test`: passed, 53 files / 597 tests.
- `npm run build`: passed, 79 modules transformed.
- Build note: Vite reported the existing large chunk warning after minification; build still succeeded.
- Screenshot captured and visually inspected: `docs/screenshots/ux-target-team-audit.png`.

## Screenshot Scenario

- Hero: Olan.
- Command: pending Q cast.
- Target under cursor: allied wounded hero.
- Expected result: valid support targeting preview with green `+ CAST Q` cursor badge.

## Remaining UX Debt

- Add target kind filters for hero-only, creep-only, building, ward, neutral-only, boss, and illusion targeting.
- Add invalid-preview reasons that distinguish wrong team from wrong target kind.
- Audit actual cast execution paths so out-of-band orders and bot casts use the same target filters.
- Add localized target reason labels after the command feedback language stabilizes.
- Add quick-cast and smart-cast settings once target filtering is fully typed.
