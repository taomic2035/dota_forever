# Map Ping Types Summary

Date: 2026-06-16
Owner: Codex UX/control line
Scope: UI, controls, and playability only. This slice changes minimap ping input and feedback rendering; it does not change sim, AI, vision, combat, economy, or balance.

## Mainline Check

This stays on the Dota1/WC3 control readability line. The minimap is not only a display surface; it is also a fast tactical communication and attention-control surface. Regular, danger, and retreat pings make the same click gesture carry clearer intent without adding a peripheral system.

## Completed In This Slice

- Added pure `mapPingModel` in `src/ui/mapPingModel.ts`.
- `Alt + minimap click` remains regular ping.
- `Alt + Ctrl + minimap click` now creates a danger ping.
- `Alt + Shift + minimap click` now creates a retreat ping.
- Ctrl has priority over Shift when both are held, avoiding ambiguous input.
- `WorldPulseKind` now includes `dangerPing` and `retreatPing`.
- 2D world pulse, 3D world pulse, minimap local ping, and minimap UX pulse all share the same visual color contract:
  - regular ping: blue.
  - danger ping: red.
  - retreat ping: green.

## Current UX Contract

- This is feedback-only and input-only.
- It does not broadcast chat messages or create a new multiplayer communication layer.
- It does not change visibility, team logic, or minimap unit reveal rules.
- Courier death pulses still use regular `ping`; richer automatic danger semantics can be added later if needed.

## Validation

- `tests/mapPingModel.test.ts` covers modifier mapping, Ctrl priority, no-Alt rejection, and the shared visual contract.
- Existing pulse lifecycle tests continue to cover `UxFeedback` expiry behavior.

## Next Stage

1. Add ping audio differentiation if the current audio contract can support it cleanly.
2. Add short HUD/toast text for danger/retreat only if visual feedback is not enough.
3. Consider mapping courier low-health/death automation to danger ping after manual ping semantics settle.
