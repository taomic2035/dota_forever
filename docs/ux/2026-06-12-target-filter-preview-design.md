# Target Filter Preview UX Design

Date: 2026-06-12
Status: auto-approved continuation of UI and control focus

## Goal

Make unit-target pending previews match the target category the command can actually use. Enemy-only abilities should not show a valid reticle on allies, and ally/self items should not invite the player to click enemies.

## Scope

This batch covers:

- A small target filter helper for enemy, ally, self, ally-or-self, and any unit.
- Optional `targetTeam` metadata on ability and item active definitions.
- Pending ability and item previews that use the same filter as click confirmation.
- Focused metadata for core sample heroes and common active items.
- Screenshot coverage for invalid ally/enemy mismatch feedback.

This batch does not reclassify every hero ability in the data set, change cast behavior for unannotated data, or alter ability/item effects.

## Interaction Rules

- Unit-target ability or item definitions without `targetTeam` keep the previous any-unit behavior.
- `targetTeam: "enemy"` accepts only living enemy units.
- `targetTeam: "ally"` accepts only living allied non-self units.
- `targetTeam: "allyOrSelf"` accepts self and allied units.
- `targetTeam: "self"` accepts only the caster.
- Invalid filtered targets show the existing red unit reticle and `INVALID TARGET` reject message when clicked.
- Preview and confirm must use the same filter so the cursor does not lie.

## Initial Metadata Focus

Abilities:

- `rein_hammer`: enemy.
- `zola_chain`: enemy.
- `zola_bolt`: enemy.
- `olan_purify`: ally or self.
- `olan_shield`: ally or self.

Items:

- Enemy: `atos`, `orchid`, `abyssal`, `hex`, `dagon`, `halberd`, `bloodthorn`, `nullifier`, `harpoon`.
- Ally or self: `glimmer`, `holy_locket`.
- Any: `force_staff`, `medallion`, `diffusal`, `eul`, `solar_crest`, `hurricane_pike`, `ethereal`, `disperser`.

## Acceptance Criteria

- Filter helper tests prove enemy/ally/self behavior.
- Type definitions accept optional target filters.
- `main.ts` preview and confirmation use filtered target lookup.
- Annotated enemy abilities show invalid previews on allied units.
- Annotated ally/self items show invalid previews on enemy units.
- Unannotated unit-target definitions keep old any-unit behavior.
- Full typecheck, tests, build, and screenshot verification pass.

## Summary Protocol

After implementation, add `docs/ux/2026-06-12-target-filter-preview-summary.md` with player-facing changes, verification, screenshot path, and remaining control UX debt.
