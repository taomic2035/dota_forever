# Keybind Capture UX Summary

Date: 2026-06-19
Owner: Codex UX
Scope: rebind reliability and pause-menu input safety

## Handoff To Opus

### What

- Codex extracted pause-menu key capture into `captureRebindKey(...)`.
- Rebinding now has shared tested behavior:
  - captured keys are normalized to lowercase
  - `Escape` cancels without mutating keybinds
  - empty captures cancel without mutating keybinds
  - conflicts swap the old key onto the displaced action, preserving one action per key
- The pause menu now uses this shared model instead of duplicating the swap logic inline.

### Why

DotA-like UX depends on reliable hotkeys. Rebinding is risky because one duplicate key can silently break commands, item usage, or control groups. The project already supported rebinding, but the capture/swap behavior lived only in DOM event code and lacked direct test coverage.

### Tradeoff

- This pass does not add new rebindable actions or hero-specific Legacy Keys.
- It keeps the existing conflict-swap behavior instead of introducing hard conflict rejection, because swapping is already what the pause menu taught users.
- It does not change `buildKeyTranslation(...)` or command execution semantics.

### Open Questions

- Should future UI show a toast when a conflict swap happens?
- Should some physical keys be blocked beyond `Escape`, such as modifier-only keys?
- If hero-specific Legacy Keys land later, should they use this same capture model or a separate profile import path?

### Next Action

- Opus can rely on `captureRebindKey(...)` when adding any new keybind surface.
- If new actions are added, update `REBINDABLE_ACTIONS`, `DEFAULT_KEY_BINDS`, `ACTION_LABEL`, and `tests/controlKeyBinds.test.ts` together.
- Keep system keys such as pause, scoreboard, and modifiers out of `REBINDABLE_ACTIONS` unless the input router is updated deliberately.

## What Changed

- `src/engine/controlSettings.ts`
  - Added `captureRebindKey(...)` and `CaptureRebindResult`.
- `src/ui/menu.ts`
  - Replaced inline capture/swap code with the shared model.
- `tests/controlKeyBinds.test.ts`
  - Added conflict-swap and cancel coverage.

## Verification

```bash
npm test -- tests/controlKeyBinds.test.ts tests/controlSettings.test.ts
```
