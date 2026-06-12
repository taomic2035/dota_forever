# Control Targeting UX Design

Date: 2026-06-12
Status: auto-approved correction back to UI and controls

## Recap

Recent UX work improved HUD readability, command cursor feedback, unit identity, map readability, and spell visual grammar. Those changes help combat readability, but the primary UX gap is still control feel:

- QWER currently attempts to cast immediately at the current mouse position.
- Targeted and point skills do not have a durable "waiting for target" mode.
- Invalid targets flash after the fact instead of being previewed before click.
- Cancel behavior exists but does not feel like a first-class command mode.

This pass returns focus to the core player loop: press command, preview intent, confirm or cancel.

## Goal

Make ability targeting behave like a deliberate RTS/MOBA command mode:

- Press Q/W/E/R.
- Instant abilities fire immediately.
- Point/unit abilities enter pending target mode.
- Mouse movement previews range and target area.
- Left click confirms only when valid.
- Invalid click rejects and keeps the pending cast active.
- Right click, Escape, or Stop cancels pending cast cleanly.

## Scope

This batch covers:

- Input state machine for pending cast and attack-move modes.
- Prepare/preview/confirm callbacks for ability casts.
- Targeting overlay cursor preview and valid/invalid coloring.
- HUD/cursor intent staying active while a cast is pending.
- Tests for the input state machine and UX feedback state.

This batch does not cover item targeting, smart-cast configuration, key rebinding UI, or custom mouse cursor assets.

## Interaction Rules

- `Q/W/E/R` on a passive, unlearned, dead, or unavailable ability: reject pulse and no pending mode.
- `Q/W/E/R` on a no-target ability: cast immediately and no pending mode.
- `Q/W/E/R` on point/unit ability: enter pending cast mode and show overlay.
- Moving the mouse while pending updates the preview.
- Left click while pending cast:
  - valid target: issue cast, flash confirm, clear pending mode.
  - invalid target: flash reject, keep pending mode.
- Right click while pending: cancel pending mode, then process normal right-click move/attack.
- Escape while pending: cancel pending mode.
- `S` while pending: cancel pending mode and issue stop.
- Pressing another Q/W/E/R while pending replaces the pending ability.

## Acceptance Criteria

- Pending command state has unit tests.
- Input manager uses prepare/preview/confirm instead of immediate targeted casting.
- Targeting overlay can render around the cursor target point, not only the hero origin.
- Overlay uses blue for valid/unknown and red for invalid.
- Full verification passes: `npm run typecheck`, focused tests, `npm test`, and `npm run build`.

## Summary Protocol

After implementation, add `docs/ux/2026-06-12-control-targeting-summary.md` with player-facing changes, verification results, screenshot path, and remaining control UX debt.
