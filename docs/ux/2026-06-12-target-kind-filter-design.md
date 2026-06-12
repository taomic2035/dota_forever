# Target Kind Filter UX Design

Date: 2026-06-12
Status: active continuation of UI and control focus

## Goal

Make unit-target previews respect the kind of unit a command can actually use. The cursor should not show a valid command on heroes, buildings, or wards when the command can only affect basic units.

## UX Problem

The previous target filter pass solved team mismatch, but not kind mismatch. A command can still look clickable because the unit is on the correct team even when the command effect immediately rejects it. That creates a rough control loop:

1. Player presses an item or spell hotkey.
2. Cursor says the target is valid.
3. Player clicks.
4. Nothing useful happens or the generic invalid message appears.

The correct UX is to mark the hover invalid before the click.

## Scope

This batch covers:

- A shared `targetKind` filter for unit category rules.
- Optional `targetKind` metadata on unit-target abilities and item actives.
- Preview and confirm wiring in `main.ts` so both use `targetTeam + targetKind`.
- Initial metadata for Midas, Dark Ritual, and Devour.

This batch does not audit every ability in the full hero data set and does not add final copy for every possible reject reason. That follows in the next step.

## Interaction Rules

- Missing `targetKind` keeps the previous any-kind behavior.
- `targetKind: "hero"` accepts only heroes.
- `targetKind: "nonHero"` accepts living non-hero units.
- `targetKind: "nonHeroNonBuilding"` rejects heroes, towers, buildings, and wards.
- `targetKind: "creep"` accepts lane creeps and neutral creeps by unit kind.
- Preview and confirm must use the same function.
- Wrong kind targets keep pending mode active and show the existing invalid target affordance.

## Initial Metadata

- `midas`: `targetTeam: "enemy"`, `targetKind: "nonHeroNonBuilding"`.
- `lyk_ritual`: `targetTeam: "ally"`, `targetKind: "creep"`.
- `dum_devour`: `targetTeam: "enemy"`, `targetKind: "nonHeroNonBuilding"`.

## Acceptance Criteria

- Filter helper tests prove kind filtering and combined team plus kind filtering.
- Metadata tests pin the three initial definitions.
- Midas preview rejects enemy heroes and accepts enemy creeps.
- Dark Ritual preview rejects allied heroes and accepts allied creeps.
- Devour preview rejects enemy heroes and accepts enemy basic units.
- `npm run typecheck`, focused tests, full tests, build, and a screenshot verification pass.

## Follow-Up

The next UX pass should split invalid feedback into `WRONG TEAM` and `WRONG TARGET TYPE` so the player learns the rule without reading data tables.
