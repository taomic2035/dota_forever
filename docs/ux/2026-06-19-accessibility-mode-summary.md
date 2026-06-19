# Accessibility Mode UX Summary

Date: 2026-06-19
Owner: Codex UX
Scope: HUD accessibility settings

## What Changed

- Added `accessibilityMode` to `ControlSettings`.
- Supported modes:
  - `standard`
  - `colorblind`
- Added pause-menu control: `可访问性 标准 / 色盲友好`.
- Added `hudAccessibilityPalette(...)` in `src/ui/accessibilityPalette.ts`.
- HUD now consumes that palette for:
  - hero HP meter;
  - hero MP meter;
  - low-health danger vignette.
- Existing default visuals are preserved when `accessibilityMode === "standard"`.

## Why

The UX audit still had “可访问性(色盲/HUD 缩放)起步” as a remaining item. HUD scale was already implemented and persisted; this pass adds the missing colorblind-friendly entry point without broad theme churn.

## Integration Notes For Opus

- Settings contract: `src/engine/controlSettings.ts`
- Pause menu UI: `src/ui/menu.ts`
- HUD consumption: `src/ui/hud.ts`
- Palette model: `src/ui/accessibilityPalette.ts`
- Tests:
  - `tests/controlSettings.test.ts`
  - `tests/accessibilityPalette.test.ts`

This pass is UI-only. It does not alter unit stats, combat, targeting, selection, or renderer world colors.

## Verification

```bash
npm test -- tests/controlSettings.test.ts tests/accessibilityPalette.test.ts
```
