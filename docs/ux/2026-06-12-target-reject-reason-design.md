# Target Reject Reason UX Design

Date: 2026-06-12
Status: active continuation of UI and control focus

## Goal

Replace generic invalid target feedback with a more useful reason when the player clicks a visible unit that fails target filters.

## UX Problem

After target team and target kind filtering, the cursor can show invalid state before click. The click feedback still says only `INVALID TARGET`, which does not teach the player what was wrong.

For core control UX, two mistakes need different feedback:

- Wrong team: the hovered unit is alive and visible, but the command only targets enemies, allies, self, or ally-or-self.
- Wrong target type: the hovered unit is on the correct team, but it is a hero, building, ward, or other kind that the command cannot use.

## Scope

This batch covers:

- A shared helper that reports why a unit failed target filters.
- Ability and item click confirmation feedback that maps filter failure to a visible message.
- Screenshot validation for Midas on an enemy hero showing `WRONG TARGET TYPE`.

This batch does not localize all reject copy and does not add audio.

## Interaction Rules

- If there is no unit under the cursor, keep `INVALID TARGET`.
- If the nearest unit under the cursor fails the team filter, show `WRONG TEAM`.
- If the nearest unit passes team but fails kind, show `WRONG TARGET TYPE`.
- Pending mode stays active after either failure.
- HUD slot reject flash and world reject pulse stay unchanged.

## Acceptance Criteria

- Filter helper tests prove team and kind rejection reasons.
- Ability and item confirmation use the helper when target lookup fails.
- Midas on enemy hero produces `WRONG TARGET TYPE`.
- Enemy-only command on ally produces `WRONG TEAM`.
- Focused tests, typecheck, screenshot validation, full tests, and build pass.
