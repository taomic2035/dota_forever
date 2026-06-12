# Dota Forever Documentation

This folder is the handoff entry point for design, UX validation, screenshots, and implementation plans.

## Start Here

- [UX workstream index](ux/README.md): design docs and completion summaries grouped by gameplay UX topic.
- [Screenshot evidence index](screenshots/README.md): validation captures grouped by what they prove.
- [Source map](source-map.md): source folder ownership and where to edit UI/control behavior.
- [Implementation plans](superpowers/plans/): task-by-task execution notes for each major slice.
- [Original project spec](superpowers/specs/2026-06-10-dota1-remake-design.md): broad product and gameplay baseline.

## Current UX Focus

The active mainline is core game UX:

- World and unit readability.
- Command cursor, target preview, and rejection feedback.
- Item and ability targeting precision.
- Cast input modes, per-slot overrides, self-cast, and camera controls.

The visual direction is Dota1-inspired, but intentionally uses original programmatic art and a fresher interface style.

## Validation Pattern

Each UX slice should have:

- A design doc in `docs/ux/*-design.md`.
- A summary doc in `docs/ux/*-summary.md`.
- A screenshot in `docs/screenshots/` when visible behavior changed.
- A plan in `docs/superpowers/plans/`.
- Fresh `npm test` and `npm run build` evidence before commit.
