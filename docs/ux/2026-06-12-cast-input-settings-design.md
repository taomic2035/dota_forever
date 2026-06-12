# Cast Input Settings UX Design

Date: 2026-06-12
Status: active continuation of UI and control focus

## Goal

Add visible cast input settings so players can choose how ability and item hotkeys confirm targets.

## UX Problem

The current command loop supports reliable two-step targeting, but Dota-like controls need more than one confirmation style. Players often expect:

- Normal cast: press hotkey, preview target, click to confirm.
- Quick cast: press hotkey, cast immediately at the current cursor.
- Smart cast: press and hold hotkey to preview, release to confirm.

Without these settings, the core controls feel slower and less personal than the genre baseline.

## Scope

This batch covers:

- Shared control setting types for ability and item cast mode.
- URL and localStorage-backed settings.
- Pause menu controls for changing ability and item cast modes.
- InputManager support for normal, quick, and smart cast behavior.
- Screenshot validation for the visible settings and a quick-cast item path.

This batch does not add per-ability overrides, rebinding, or audio.

## Interaction Rules

- Ability and item cast modes are configured independently.
- `normal`: current behavior, press hotkey to enter pending mode, click to confirm.
- `quick`: if a command waits for a target, pressing the hotkey immediately confirms at the cursor.
- `smart`: if a command waits for a target, keydown enters pending preview and keyup confirms at the cursor.
- Invalid quick or smart confirms keep pending mode active so the player can correct the cursor or cancel.
- Settings persist in localStorage and can be overridden through URL parameters.

## Acceptance Criteria

- Pure setting tests prove mode parsing, normalization, and cycling.
- Existing normal mode behavior remains unchanged by default.
- Pause menu exposes ability and item cast mode controls.
- URL `abilityCast=quick` and `itemCast=quick` are accepted.
- Screenshot validation proves quick item cast uses the current cursor.
- Focused tests, typecheck, full tests, and build pass.
