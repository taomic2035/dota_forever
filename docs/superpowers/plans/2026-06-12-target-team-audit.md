# Target Team Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every unit-target hero ability and active item has explicit `targetTeam` metadata for accurate pending preview and semantic cursor UX.

**Architecture:** Add a durable metadata coverage test over `HEROES` and `ITEMS`, then fill missing `targetTeam` values directly in data definitions. Keep this pass limited to team semantics and document non-team target kind debt separately.

**Tech Stack:** TypeScript, Vitest, hero/item data modules, Vite screenshot helper.

---

## File Structure

- Create `tests/targetTeamCoverage.test.ts`: fails if any unit-target ability or active item omits `targetTeam`.
- Modify `src/data/items.ts`: add `targetTeam` for remaining unit active items.
- Modify `src/data/heroes/*.ts`: add `targetTeam` for all unit-target ability definitions.
- Create `docs/ux/2026-06-12-target-team-audit-summary.md`.
- Capture `docs/screenshots/ux-target-team-audit.png`.

## Task 1: Coverage Test

- [x] Add failing coverage test over all `HEROES` and `ITEMS`.
- [x] Run `npm test -- tests/targetTeamCoverage.test.ts` and confirm it fails with missing ability/item keys.
- [x] Commit the red test only if useful; otherwise continue directly to metadata fill in the same task.

## Task 2: Metadata Fill

- [x] Add `targetTeam` to the two remaining unit active items: `midas` and `urn`.
- [x] Add `targetTeam: "enemy"` to hostile unit-target abilities.
- [x] Add `targetTeam: "ally"` to explicit non-self ally-target abilities.
- [x] Add `targetTeam: "allyOrSelf"` to support abilities that fall back to self.
- [x] Add `targetTeam: "any"` to dual-use or intentionally any-team abilities.
- [x] Run `npm test -- tests/targetTeamCoverage.test.ts tests/cursorTargetHint.test.ts tests/targetFilters.test.ts`.
- [x] Commit as `feat(ux): audit target team metadata`.

## Task 3: Screenshot, Summary, Verification

- [ ] Capture `docs/screenshots/ux-target-team-audit.png`.
- [ ] Write `docs/ux/2026-06-12-target-team-audit-summary.md`.
- [ ] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Commit as `feat(ux): complete target team audit pass`.

## Self-Review

- Spec coverage: complete metadata coverage test, item metadata, hero metadata, screenshot, and summary are covered.
- Deferred intentionally: target kind filters such as hero-only, creep-only, building, ward, neutral-only, and immunity states.
