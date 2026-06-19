# Codex UX/UI Handoff for Opus

Date: 2026-06-19
Owner split: Codex owns UX/material/control polish; Opus owns mainline gameplay integration and deeper sim rules.

## Unified Merge Entry

Use this document as the short entry point for the combined Codex + Opus version. The long resource archive remains `docs/ux/2026-06-13-resource3d-opus-handoff.md`; this file is the practical merge checklist.

Suggested merge order:

1. Merge pure UX model/test files first. These are low-risk and expose expected text/state contracts.
2. Merge HUD wiring next. It consumes the pure models and should not change sim outcomes.
3. Merge crossover control/sim points after Opus reviews semantics: autocast gates, QWER/right-click toggles, backpack move-delay presentation, and shop/onboarding affordances.
4. Run focused UI tests, then build, then broader gameplay tests if Opus touched sim in the same integration branch.

## What

- Codex has been polishing the UX/resource layer: 3D model/readability metadata, terrain/resource presentation, HUD affordances, controls, shop/onboarding, ability/item slot states, and local status feedback.
- Recent UX-model files now centralize hover/status text instead of keeping rules inline in HUD:
  - `src/ui/abilityTooltipModel.ts`
  - `src/ui/itemTooltipModel.ts`
  - `src/ui/abilitySlotToggleModel.ts`
  - `src/ui/statusBroadcastModel.ts`
- Item tooltips now cover main inventory, TP empty slot, active/passive readiness, charges, and backpack constraints. Backpack slots explicitly say they provide no bonus and become ready 6 seconds after being moved into inventory.
- Autocast/toggle UX is partially integrated: QWER/right-click can switch learned passive autocast/toggle abilities; HUD badges and alt-click status use the same state.

## Why

- Opus is moving core logic in parallel, so UX copy, badge state, and control hints need stable pure-model seams that can be updated alongside sim changes.
- Dota-like combat requires fast scanning under pressure. Cooldown, mana, passive, autocast, charge, backpack, and move-delay states must be visible without opening extra panels.
- Keeping user-facing text in model tests makes future mainline changes safer: if Opus changes ability or item availability semantics, the matching UX expectations fail close to the interface.

## Tradeoff

- Codex did not expand deeper gameplay semantics in this pass beyond existing crossover points. For example, single-orb priority, default autocast policy, manual orb-cast orders, item transfer edge cases, and exact cost/refund timing remain Opus-owned unless you ask Codex to take a follow-up UX slice.
- Tooltip models use lightweight browser `title` strings for now, because they are low-risk and already fit current HUD architecture. A richer custom tooltip component can replace the rendering later while preserving the same model functions.
- The backpack tooltip says "move into inventory, ready after 6 seconds" but does not enforce the rule itself; enforcement remains in sim/items flow.

## Open Questions

- Should autocast abilities default on/off per hero, and should only one attack modifier be active at a time?
- Should manual orb-cast consume mana/cooldown differently from regular auto attacks?
- Should backpack move delay be surfaced as a live countdown after transfer, or is the static tooltip enough for this phase?
- Should Opus expose a single shared availability API for abilities/items so HUD, command card, and sim all read the same reason codes?

## Next Action

- Opus: when touching ability/item availability, update the pure UX models and tests in the same change.
- Opus: review these cross-over files first:
  - `src/sim/abilities.ts`
  - `src/main.ts`
  - `src/ui/hud.ts`
  - `src/ui/abilityTooltipModel.ts`
  - `src/ui/itemTooltipModel.ts`
  - `src/ui/statusBroadcastModel.ts`
- Codex follow-up candidates: live backpack move-delay countdown, custom tooltip panel, single-orb priority UX, and hero-specific legacy hotkey presets.

## Merge Checklist

- [ ] Ability/item tooltip tests pass after Opus sim changes.
- [ ] HUD still displays cooldown/mana/ready/passive/toggle/autocast/charge/backpack states.
- [ ] QWER/right-click toggle behavior matches Opus final autocast policy.
- [ ] Backpack move delay remains enforced in sim and merely presented in UX.
- [ ] No temporary preview media is left in the repo root.

## Verification Notes

- Focused tooltip check: `npm test -- tests/itemTooltipModel.test.ts`
- Suggested merge gate before Opus pulls UX work into mainline: `npm run build`, focused UI tests, then full `npm test` if the working tree is stable.
