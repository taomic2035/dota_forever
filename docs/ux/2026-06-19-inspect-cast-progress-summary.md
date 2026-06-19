# Inspect Cast Progress UX Summary

Date: 2026-06-19
Owner: Codex UX
Scope: selected-unit inspect panel readability

## What Changed

- Added `inspectCastProgress(...)` in `src/ui/inspectPanelModel.ts`.
- The model reuses the shared `castBarInfo(...)` track from `src/render/castBar.ts`, so 2D, 3D, and the inspect panel agree on cast/channel progress.
- `InspectPanel` now renders a compact progress row under HP/MP while the inspected unit is casting or channeling.
- The row shows:
  - cast vs channel label (`施法中` / `引导中`);
  - ability name from `unit.heroDef.abilities[abilityIndex]`;
  - remaining seconds;
  - cyan cast color or gold channel color from the shared cast-bar constants.
- Added `data-inspect-cast-progress="cast|channel"` for Opus smoke checks.

## Why

DotA-style fights often require reading enemy or allied channel/cast state while inspecting a unit. Head bars already cover the world renderer, but the left inspect card did not repeat that information. This closes the information-card readability gap without touching simulation timing, cast validation, or ability behavior.

## Integration Notes For Opus

- Runtime UI entry: `src/ui/inspectPanel.ts`
- Pure model entry: `src/ui/inspectPanelModel.ts`
- Shared progress source: `src/render/castBar.ts`
- Test: `tests/inspectPanelModel.test.ts`

This is display-only UX. It does not alter `Unit.casting`, `Unit.channeling`, ability cooldowns, mana payment, interrupt rules, or target legality.

## Verification

```bash
npm test -- tests/inspectPanelModel.test.ts tests/castBar.test.ts
```
