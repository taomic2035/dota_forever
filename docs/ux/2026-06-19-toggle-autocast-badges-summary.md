# Toggle And Autocast Badge UX Summary

Date: 2026-06-19
Owner: Codex UX
Scope: ability-slot readability, hotkey/right-click state toggling, and tagged orb attack gating

## Handoff To Opus

### What

- Codex added HUD badge support for DotA-like autocast and toggle ability states.
- `AbilityTag` now includes `autocast` and `toggle`.
- `AbilityInstance` now exposes optional `autocastOn` and `toggleOn` state hooks.
- Ability-slot badges can render:
  - `AUTO ON`
  - `AUTO OFF`
  - `ON`
  - `OFF`
- Right-clicking a learned autocast/toggle-tagged ability slot toggles the corresponding `AbilityInstance` state and shows a short HUD message.
- Pressing the QWER hotkey for a learned passive autocast/toggle ability now toggles the same state instead of rejecting as `被动技能`.
- Alt-click / status broadcast for learned autocast/toggle abilities now reports the actual state (`AUTO ON`, `AUTO OFF`, `ON`, `OFF`) instead of collapsing to generic `被动`.
- Hover tooltip for learned autocast/toggle abilities now repeats the current state and the `QWER/右键` toggle entry, keeping badges, status broadcast, and tooltip aligned.
- Hover tooltip for learned active abilities now also shows current readiness (`当前: 冷却 Ns`, `当前: 法力不足 X/Y`, or `当前: 就绪`) in addition to static mana/cooldown/range values.
- Tagged `autocast` orb effects now respect `AbilityInstance.autocastOn` in the shared attack-hit hook:
  - `autocastOn !== true` means the attack modifier stays off.
  - `autocastOn === true` allows the `orbOnHit(...)` effect to fire.
- First autocast metadata samples were added to three classic orb-like abilities:
  - `aili_frost`
  - `hsk_spears`
  - `vip_poison`

### Why

The previous HUD could label passive, orb, ultimate, scepter, and shard identity, but it could not show whether an orb/toggle-style ability was enabled. DotA players expect this state to be visible directly on the skill slot, especially for lane-control and attack-modifier decisions.

After the first pass, the HUD could say `AUTO OFF` while combat still applied the orb, keyboard-first players still had to use mouse right-click to change the state, and Alt-click/tooltip status still reduced those skills to generic passive hints. This update closes those UX contract gaps: visible state matches the real attack outcome, QWER can control learned passive autocast/toggle abilities, and all three readable surfaces (badge, status broadcast, hover tooltip) tell the actual state. Active ability hover titles now also show whether the slot is currently usable, cooling down, or mana-blocked.

### Tradeoff

- Chose a narrow tagged-orb gate instead of implementing autocast AI behavior, mana/life spend gates, manual orb-cast orders, or orb priority rules.
- Untagged `orbOnHit` behavior stays unchanged; only abilities explicitly tagged with `autocast` become state-gated.
- Hotkey toggling is intentionally limited to abilities whose sim cast reason is `passive`; active QWER abilities keep their existing cast behavior.
- Status broadcast only reports toggle/autocast state after the ability is learned; unlearned skills still say `未学习`.
- Only marked three representative abilities with `autocast` metadata so Opus can review the contract before wider data tagging.

### Open Questions

- Should autocast default to off for every hero long-term, or should some hero data opt into default-on behavior during spawn/learn initialization?
- If multiple orb/autocast modifiers exist, should Opus enforce one active orb at a time?
- Should `hsk_spears` eventually spend the health cost only when `autocastOn` is true and the burn actually applies?
- Should later manual orb-cast use QWER+target as a one-shot modifier while preserving QWER tap as toggle for passive orb abilities?

### Next Action

- Opus can build remaining gameplay behavior on top of `hero.abilities[index].autocastOn` or `.toggleOn`.
- Keep the HUD badge model read-only and continue using `buildAbilitySlotBadges(...)` as the shared presentation contract.
- Before mass-tagging all orb abilities, decide the default state and any one-orb priority rule.

## What Changed

- `src/data/heroes/types.ts`
  - Added `autocast` and `toggle` ability tags.
- `src/sim/abilities.ts`
  - Added optional `autocastOn` and `toggleOn` state hooks on `AbilityInstance`.
  - Gated `tags.includes('autocast')` orb hits behind `inst.autocastOn === true`.
- `src/ui/abilitySlotBadgeModel.ts`
  - Added autocast/toggle badge generation and compact priority.
- `src/ui/statusBroadcastModel.ts`
  - Added autocast/toggle state labels for Alt-click ability status.
- `src/ui/abilityTooltipModel.ts`
  - Added `buildAbilitySlotTitle(...)` so hover title shows current autocast/toggle state, the `QWER/右键` toggle entry, and active ability readiness.
- `src/ui/abilitySlotToggleModel.ts`
  - Added the shared right-click toggle state transition and feedback labels.
  - Added `shouldToggleAbilityFromHotkey(...)` so keyboard toggling has the same eligibility contract as HUD toggling.
- `src/ui/hud.ts`
  - Passes ability instance state into the badge, status-broadcast, and tooltip-title models; styles new badge tones; routes right-click on toggleable ability slots.
- `src/main.ts`
  - Applies the toggle model from both right-click ability slots and QWER passive autocast/toggle hotkeys, flashes the HUD slot, and shows info/reject feedback.
- `src/ui/onboardingModel.ts`
  - Tells players that QWER can toggle AUTO/passive switch states, while right-click ability slot remains available.
- Hero data:
  - `src/data/heroes/aili.ts`
  - `src/data/heroes/batch18.ts`
  - `src/data/heroes/batch16.ts`
- Tests:
  - `tests/heroes1.test.ts`
  - `tests/heroes18.test.ts`
  - `tests/abilitySlotToggleModel.test.ts`
  - `tests/abilitySlotBadgeModel.test.ts`
  - `tests/statusBroadcastModel.test.ts`
  - `tests/abilityTooltipModel.test.ts`
  - `tests/onboardingModel.test.ts`

## Verification

```bash
npm test -- tests/abilityTooltipModel.test.ts tests/abilitySlotBadgeModel.test.ts tests/statusBroadcastModel.test.ts tests/abilitySlotToggleModel.test.ts tests/onboardingModel.test.ts
```
