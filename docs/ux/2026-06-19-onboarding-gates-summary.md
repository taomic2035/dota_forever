# Onboarding Gates UX Summary

Date: 2026-06-19
Owner: Codex UX
Scope: opening control guide and settings-aware onboarding copy

## Handoff To Opus

### What

- Codex added `buildOnboardingSections(...)` as a pure onboarding content model.
- The opening `showOnboarding(...)` panel now renders from that model instead of hard-coded HTML rows.
- The panel receives current `ControlSettings` from `main.ts`, so the number-row hint changes between:
  - modern: `1-6 用物品`
  - RTS Legacy: `1-6 选控制组`
- The refreshed panel covers the current Dota-like UX surface:
  - right-click movement, A-click, S/H
  - QWER ability use plus QWER/right-click ability slot toggle/autocast state
  - items/TP or control groups depending on settings
  - world/minimap Alt ping variants
  - minimap target confirmation for armed skills/TP
  - F1/F2/F3 selection and F1 double-tap center
  - P menu for RTS Legacy, auto attack, HUD scale, accessibility color mode

### Why

The project now has many high-value Dota-style controls, but the first-run prompt still described an older subset. A settings-aware model gives players a compact entry map for the real control surface, and gives Opus a stable place to extend onboarding copy as mainline logic evolves.

### Tradeoff

- This is a compact first-run gate, not a full interactive tutorial.
- The model intentionally stays text-only and pure; it does not inspect live hero ability metadata or branch into hero-specific Legacy Keys.
- The panel still auto-dismisses after 18 seconds to avoid blocking actual play.

### Open Questions

- Should a later phase add a playable tutorial mission once mainline objectives and bot pacing stabilize?
- Should hero-specific Legacy Keys surface in this panel, or remain in hero select/tooltips?
- Should the onboarding gate persist per settings preset rather than per session once save/profile UX is finalized?

### Next Action

- Opus can call or extend `buildOnboardingSections(settings)` when adding new control categories.
- If Opus changes number-row, selection, courier, or ping semantics, update `tests/onboardingModel.test.ts` with the new player-facing contract.
- Keep this panel short; more detailed teaching should go into pause-menu help or a future tutorial flow.

## What Changed

- `src/ui/onboardingModel.ts`
  - Added `OnboardingSection`, `OnboardingTip`, and `buildOnboardingSections(...)`.
  - Updated the skill tip so keyboard-first players learn that QWER can toggle learned passive AUTO/switch states.
- `src/ui/onboarding.ts`
  - Renders grouped onboarding content from the model.
  - Escapes rendered text and keeps the existing click/key/timeout close behavior.
- `src/main.ts`
  - Passes current `controlSettings` into `showOnboarding(...)`.
- `tests/onboardingModel.test.ts`
  - Covers grouped Dota-style control tips and RTS Legacy number-row copy.

## Verification

```bash
npm test -- tests/onboardingModel.test.ts
npm test -- tests/onboardingModel.test.ts tests/abilitySlotToggleModel.test.ts tests/inputSelectionHotkeys.test.ts tests/heroes1.test.ts tests/heroes18.test.ts
npm run build
git diff --check
```
