# Unit and Spell Identity UX Design

Date: 2026-06-12
Status: auto-approved continuation of the modernized Dota-like UX direction

## Goal

Make units and skills recognizable by stable visual grammar before investing in final art assets. This pass strengthens the existing procedural system instead of replacing it with copied Dota 1 art.

## Scope

This batch covers:

- Unit identity metadata for hero role, creep type, neutral tier, and boss scale.
- Small in-world identity marks that make hero roles readable during fights.
- Spell family metadata shared by effects and HUD slots.
- HUD ability color strips so fire, frost, lightning, shadow, nature, earth, poison, blood, holy, and arcane skills are visually distinct.

This batch does not add final hand-painted hero portraits, item icons, or bespoke spell animations.

## Design

### Unit Identity

`unitArt` should return a role/tier in addition to shape, weapon, color, and radius:

- `tank`: bulky body, hammer/staff, shield-like mark.
- `mage`: robe body, staff, arcane halo.
- `rangedCarry`: blade/archer language with backline mark.
- `meleeCarry`: blade/sword language with slash mark.
- `support`: robe/staff language with plus/star support mark.
- `assassin`: blade/sword language with sharp diamond mark.
- `creepMelee`, `creepRanged`, `creepSiege`: clear lane unit categories.
- `neutralSmall`, `neutralLarge`, `neutralAncient`, `boss`: wilderness/boss categories.

Renderer should consume this metadata only for visible identity accents. Simulation stays unchanged.

### Spell Families

`fxStyle` already chooses color and motion. It should also expose a `family` field:

- `fire`, `frost`, `lightning`, `holy`, `shadow`, `blood`, `nature`, `earth`, `poison`, `arcane`, `neutral`.

HUD ability slots should draw a small top color strip using `fxStyle(def.key || def.name)`. This keeps compact cells readable without needing final icons.

## Acceptance Criteria

- Unit art tests verify hero role, creep type, neutral tier, and boss identity metadata.
- FX style tests verify family output for common spell names.
- HUD ability slots show an element-colored strip while keeping fixed dimensions.
- Renderer draws a small hero identity mark from `UnitArt.role`.
- `npm run typecheck`, focused tests, full tests, and build pass.

## Summary Protocol

After implementation, add `docs/ux/2026-06-12-unit-spell-identity-summary.md` with player-facing changes, verification, screenshots if captured, and remaining UX debt.
