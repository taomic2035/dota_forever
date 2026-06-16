# Courier Minimap Marker Summary

Date: 2026-06-16
Owner: Codex UX/control line
Scope: UI, controls, and playability only. This slice does not change courier simulation, item movement, AI, economy, or balance.

## Mainline Check

This remains on the core UX track: players need to locate and read their courier during real play without opening peripheral panels. The work improves the minimap communication layer and keeps courier logistics behavior unchanged.

## Completed In This Slice

- Added a pure `buildCourierMinimapMarkers` model.
- Added a distinct minimap marker for live couriers instead of rendering couriers as generic 2x2 unit dots.
- Allied couriers remain visible to the owning viewer on the minimap even when normal unit vision would hide them.
- Enemy couriers remain vision-gated.
- Dead couriers are hidden from the minimap marker model.
- Marker tone communicates the most important state:
  - `danger`: courier HP is at or below 35%.
  - `busy`: courier is moving.
  - `ally`: allied courier is healthy and idle.
  - `enemy`: visible enemy courier is healthy and idle.

## Current UX Contract

- The minimap marker is a readability layer only.
- The marker does not issue courier commands.
- The marker does not add delivery path preview yet.
- The marker does not expose new courier inventory lanes or manual transfer controls.
- The marker consumes existing live unit state: position, team, alive, HP, max HP, and current order type.

## Files Added Or Updated

- `src/render/minimapCourierMarker.ts`
- `src/render/minimap.ts`
- `tests/minimapCourierMarker.test.ts`
- UX roadmap and recap docs

## Validation Target

- Focused model tests for marker filtering, coordinate mapping, and tone priority.
- Type check for minimap integration.
- Build.
- Browser smoke that opens play mode and captures the minimap with the courier marker visible.

## Next Stage

Keep the next courier work in UI/control space unless Opus hands off a stable sim contract:

1. Courier danger/death toast and audio cues.
2. Courier minimap path preview when delivery target/path data is stable.
3. Manual deliver/return controls only after command semantics are agreed.
4. Stash/courier item lanes after item transfer ownership is stable.
