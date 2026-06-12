# Command Cursor Semantics UX Design

Date: 2026-06-12
Status: auto-approved continuation of UI and control focus

## Goal

Make pending command state readable as shape and color at the cursor, not only as text. The player should be able to tell whether the next click is enemy-target, ally/self-target, ground-target, item-target, attack-move, or invalid without reading the label first.

## Scope

This batch covers:

- A small typed cursor visual spec for command intent icons.
- Target semantic metadata on cursor intent: enemy, ally, ally-or-self, self, ground, any, attack, item, and invalid.
- Cursor rendering that uses different silhouettes for attack-move, hostile targeting, support targeting, ground targeting, item use, and reject messages.
- Main input wiring so pending ability and item modes pass target semantics from existing target metadata.
- Screenshot coverage for an enemy-only ability hovering an allied unit in invalid state.

This batch does not replace the OS cursor asset, add platform-specific `.cur` files, change command routing, or add quick-cast settings.

## Interaction Rules

- Attack-move uses an amber crosshair icon and remains pending until confirm/cancel.
- Enemy-target abilities and items use a red diamond/crosshair icon.
- Ally/self abilities and items use a green shield/plus icon.
- Ground-target abilities and items use a blue/gold ground marker icon.
- Any-unit abilities and items use a neutral ring icon.
- Invalid target messages use a red warning icon and stack below the active command intent.
- Text labels stay available for precision, but shape and color carry the first-read signal.

## Architecture

- `src/ui/commandCursorTheme.ts` owns pure cursor visual mapping and HTML escaping.
- `src/ui/uxFeedback.ts` extends `CursorIntent` with optional `targetHint`.
- `src/ui/commandCursor.ts` consumes the theme helper instead of hardcoding icon and color logic.
- `src/main.ts` derives `targetHint` from `targetMode` and `targetTeam` when pending ability or item targeting begins.

## Acceptance Criteria

- Cursor theme tests cover hostile, support, ground, any-unit, attack-move, item, and reject message visuals.
- Existing cursor intent expiry behavior still passes.
- Pending cast and item intent include target hints for point/unit target modes.
- Screenshot shows a visible hostile cast cursor with invalid target feedback stacked below it.
- Full typecheck, tests, build, and screenshot verification pass.

## Summary Protocol

After implementation, add `docs/ux/2026-06-12-command-cursor-semantics-summary.md` with player-facing changes, verification, screenshot path, and remaining control UX debt.
