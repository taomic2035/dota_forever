# Command Cursor UX Design

Date: 2026-06-12
Status: auto-approved continuation of core UX polish

## Goal

Make current command intent readable at the cursor, not only after the command lands in the world. This preserves RTS/Dota-style controls while making the prototype feel less raw.

## Scope

This batch covers:

- Track latest cursor screen position in `UxFeedback`.
- Track cursor intent for attack-move, cast flash, item targeting, and neutral default.
- Render a small non-interactive DOM overlay near the mouse.
- Keep existing world command pulses and targeting overlays unchanged.

This batch does not replace the OS cursor asset or add platform-specific cursor files.

## Design

The overlay should be compact and symbolic:

- `A-MOVE`: amber crosshair badge while attack-move is pending.
- `CAST Q/W/E/R`: blue ability badge briefly when a skill key is used.
- `ITEM 1-6`: gold item badge while item targeting is pending.
- Default state hides the badge.

The cursor state belongs in `UxFeedback` because it is UX-only state and already bridges input, HUD, renderer, and screenshot hooks.

## Acceptance Criteria

- Tests prove cursor position, timed intent, and clearing behavior.
- `InputManager` reports pointer motion and pending command state.
- `CommandCursor` renders without intercepting clicks.
- Screenshot shows the cursor intent overlay in a deterministic state.
- `npm run typecheck`, focused tests, full tests, and build pass.
