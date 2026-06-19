# Control Presets UX Summary

Date: 2026-06-19
Owner: Codex UX
Scope: pause-menu control presets and keybind recovery

## Handoff To Opus

### What

- Codex added a control preset model for the pause menu.
- `applyControlPreset(settings, "legacy")` restores an RTS/DotA-like control baseline:
  - normal ability cast
  - normal item cast
  - number row controls groups
  - standard auto-attack
  - default command hotkeys such as A/S/H/F1/F2/F3
- `applyControlPreset(settings, "modern")` restores the project modern baseline:
  - number row items
  - normal global cast modes
  - default key binds
- Both presets preserve display/accessibility preferences:
  - edge pan
  - camera speed
  - HUD scale
  - accessibility color mode
- The pause menu now exposes a `预设 现代 / RTS Legacy` button.

### Why

DotA-like UX depends on recoverable muscle-memory layouts. Once rebinding and number-row modes exist, players need a fast way to return to a known-good control baseline without losing visual/accessibility preferences.

### Tradeoff

- This is an RTS Legacy control preset, not a full per-hero DotA1 Legacy Keys implementation.
- The preset intentionally resets input and cast settings, but preserves visual/accessibility settings so players do not lose readability work.
- No gameplay logic or command execution semantics changed.

### Open Questions

- Should a later phase add per-hero Legacy ability hotkeys once hero identities stabilize?
- Should preset application show a stronger confirmation toast, or is the pause-menu label enough?
- Should presets become import/export profiles if cloud/save support appears?

### Next Action

- Opus can rely on `applyControlPreset(...)` for deterministic settings reset behavior.
- If Opus adds more rebindable actions, update `DEFAULT_KEY_BINDS`, `ACTION_LABEL`, and the preset tests together.
- If hero-specific Legacy keys are added later, keep them separate from this RTS baseline preset.

## What Changed

- `src/engine/controlSettings.ts`
  - Added `ControlPreset`, `applyControlPreset(...)`, `inferControlPreset(...)`, `cycleControlPreset(...)`, and `controlPresetLabel(...)`.
- `src/ui/menu.ts`
  - Added the pause-menu preset button and label sync.
- `tests/controlSettings.test.ts`
  - Covers modern and RTS Legacy preset behavior.

## Verification

```bash
npm test -- tests/controlSettings.test.ts
```
