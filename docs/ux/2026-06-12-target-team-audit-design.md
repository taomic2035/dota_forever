# Target Team Audit UX Design

Date: 2026-06-12
Status: auto-approved continuation of UI and control focus

## Goal

Make every unit-target ability and active item declare its team targeting semantics, so pending previews, semantic cursor icons, and invalid-target feedback stay consistent across the full playable roster.

## Scope

This batch covers:

- A coverage test that fails when any `targetMode: "unit"` ability or item active omits `targetTeam`.
- A source audit of hero ability data and active item data.
- Team-level metadata only: enemy, ally, ally-or-self, self, and any.
- Manual correction of obvious dual-use skills such as X mark, swap, decrepify, ion shell, purifying flames, and spirit-vessel style actives.

This batch does not add target kind filters such as hero-only, creep-only, building, ward, illusion, neutral-only, or magic-immune states.

## Classification Rules

- `enemy`: direct hostile damage, disable, debuff, forced attack, chase, drain, execute, or enemy-only AI target.
- `ally`: support command that explicitly requires a non-self allied unit.
- `allyOrSelf`: support command that targets an ally and falls back to self when no valid allied unit is supplied.
- `any`: dual-use commands with both ally and enemy behavior, or intentionally targetable units from either team.
- `self`: reserved for future explicit self-only targeted commands; none are expected in this pass.

## Acceptance Criteria

- The red coverage test reports missing `targetTeam` metadata before implementation.
- After metadata fill, every unit-target hero ability and active item has `targetTeam`.
- Cursor hint derivation can rely on complete target metadata instead of defaulting most unit commands to `any`.
- Focused tests and full test/build verification pass.
- Screenshot verifies an audited support command shows support target semantics.

## Summary Protocol

After implementation, add `docs/ux/2026-06-12-target-team-audit-summary.md` with counts, player-facing changes, verification, screenshot path, and remaining non-team target-filter debt.
