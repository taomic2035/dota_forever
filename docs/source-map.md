# Source Map

This map is for quick handoff when continuing UI/control work.

## Core Ownership

- `src/main.ts`: game bootstrap, player callbacks, HUD/UX wiring, target preview and confirmation flow.
- `src/engine/input.ts`: keyboard/mouse interpretation, pending command state, cast mode timing, camera pan updates.
- `src/engine/controlSettings.ts`: persistent control settings, cast mode parsing, slot overrides, camera preferences.
- `src/engine/commandMode.ts`: pure pending-command state machine for cast, item, and attack-move.
- `src/sim/targeting.ts`: **canonical** team and unit-kind target-legality rules (single source of truth; sim enforces, engine/ui reuse).
- `src/engine/targetFilters.ts`: compatibility re-export of `src/sim/targeting.ts`.
- `src/engine/selfCast.ts`: self-cast policy.

## UI Layer

- `src/ui/hud.ts`: bottom command console, ability slots, item slots, hero stats, cooldown display.
- `src/ui/menu.ts`: main menu, hero pick, pause menu, control settings.
- `src/ui/uxFeedback.ts`: command messages, HUD flashes, targeting model, world pulses.
- `src/ui/commandCursor.ts`: on-screen command cursor rendering.
- `src/ui/commandCursorTheme.ts`: cursor visual language.
- `src/ui/cursorTargetHint.ts`: cursor target copy based on targeting metadata.
- `src/ui/shop.ts`, `src/ui/scoreboard.ts`, `src/ui/killfeed.ts`, `src/ui/endscreen.ts`: secondary UI panels.

## Rendering Layer

- `src/render/renderer.ts`: Canvas2D render orchestration.
- `src/render/camera.ts`: world/screen transforms, zoom, pan, camera bounds.
- `src/render/minimap.ts`: minimap drawing and ping entry point.
- `src/render/fx.ts`, `src/render/fxStyle.ts`: combat FX and floating text.
- `src/render/unitArt.ts`: programmatic unit silhouettes and identity marks.
- `src/render/mapReadability.ts`, `src/render/projectileReadability.ts`, `src/render/fog.ts`: readability helpers.

## Simulation Layer

- `src/sim/world.ts`: deterministic world state and event stream.
- `src/sim/combat.ts`: order execution, attacks, casts, damage, projectile hits.
- `src/sim/abilities.ts`, `src/sim/items.ts`, `src/sim/modifiers.ts`: gameplay effect execution.
- `src/sim/ai/bots.ts`: bot behavior.
- `src/sim/setup.ts`: world construction.
- `src/sim/creeps.ts`, `src/sim/buildings.ts`, `src/sim/neutrals.ts`, `src/sim/runes.ts`, `src/sim/pitlord.ts`: map systems.

## Data Layer

- `src/data/heroes/`: hero definitions and ability metadata.
- `src/data/items.ts`: item definitions, active metadata, recipes.
- `src/data/balance.ts`: shared numeric rules.
- `src/data/mapLayout.ts`, `src/data/creeps.ts`, `src/data/neutrals.ts`: map and unit data.

## Tests

- `tests/controlSettings.test.ts`: cast mode, slot override, and camera setting rules.
- `tests/selfCast.test.ts`: self-cast policy.
- `tests/commandMode.test.ts`: pending command state machine.
- `tests/targetFilters.test.ts`, `tests/targetKindMetadata.test.ts`, `tests/targetTeamCoverage.test.ts`: targeting correctness.
- `tests/uxFeedback.test.ts`, `tests/commandCursorTheme.test.ts`, `tests/mapReadability.test.ts`, `tests/projectileReadability.test.ts`, `tests/unitart.test.ts`: UX/render helper coverage.

## Where To Continue UX Work

- Targeting or command confirmation: start in `src/main.ts`, then check `src/engine/input.ts` and `src/engine/targetFilters.ts`.
- New control settings: start in `src/engine/controlSettings.ts`, then wire `src/ui/menu.ts`, `src/main.ts`, and `src/engine/input.ts`.
- HUD or command console changes: start in `src/ui/hud.ts`.
- Cursor and command feedback changes: start in `src/ui/commandCursor.ts`, `src/ui/uxFeedback.ts`, and `src/ui/commandCursorTheme.ts`.
- Visual readability changes: start in `src/render/`.
