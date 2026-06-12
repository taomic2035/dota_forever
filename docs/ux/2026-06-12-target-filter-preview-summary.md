# Target Filter Preview Summary

Date: 2026-06-12

## Player-Facing Changes

- Unit-target cast previews now understand enemy, ally, self, ally-or-self, and any-unit target categories.
- Enemy-only abilities no longer present an allied unit as a valid click target during pending cast.
- Ally/self support actions can reject enemies before the player commits the click.
- The same filtered lookup is used for preview and confirmation, so the cursor state and actual command result stay aligned.
- The invalid target state reuses the existing red reticle, red HUD slot feedback, and `INVALID TARGET` message instead of adding a separate warning language.

## Design Notes

- This is a control-readability pass, not a balance or effect rewrite. Ability and item behavior was left intact.
- Unannotated unit-target definitions keep previous any-living-non-self behavior to avoid breaking older data.
- The first metadata batch covers representative enemy nukes/disables, ally/self support skills, and common active items.
- The helper is engine-level and tested outside canvas code so future targeting rules can be extended without duplicating UI logic.

## Verification

- Red test confirmed before implementation: `npm test -- tests/targetFilters.test.ts` failed on missing `../src/engine/targetFilters`.
- Focused validation after implementation: `npm test -- tests/targetFilters.test.ts tests/commandMode.test.ts tests/uxFeedback.test.ts` passed, 24 tests.
- `npm run typecheck`: passed.
- `npm test`: passed, 50 files / 584 tests.
- `npm run build`: passed, 77 modules transformed.
- Build note: Vite reported the existing large chunk warning after minification; build still succeeded.
- Screenshot captured: `docs/screenshots/ux-target-filter-preview.png`.

## Screenshot Scenario

- Hero: Rein.
- Command: pending Q cast.
- Target under cursor: allied hero.
- Expected result: invalid red preview and `INVALID TARGET` feedback because `rein_hammer` is enemy-only.

## Remaining UX Debt

- Classify the full ability data set, not only the representative batch.
- Add non-team target constraints such as hero-only, creep-only, building, ward, illusion, and magic-immune filters.
- Add command-specific cursor icons so enemy-target, ally-target, self-cast, and ground-cast modes are readable before hover.
- Add optional quick-cast and smart-cast settings once targeting validity is stable.
- Add localized error barks or short audio cues after the visual feedback language settles.
