# P0-A Selection, Command Card, Inspect, And Courier HUD Summary

Date: 2026-06-15
Owner: Codex UX/control line
Scope: UI, input, HUD, and playability only. This slice intentionally does not change courier, combat, item, or renderer simulation contracts while Opus is developing adjacent systems.

## Mainline Check

This work is still on the UX mainline. It improves how players select, command, inspect, and understand controlled units in the Warcraft III / Dota 1 style control model:

- Multi-unit selection is commandable without turning the game into a hero-only action UI.
- Command-card buttons now mirror hotkey behavior instead of being passive labels.
- Inspect-only targets are explicitly separated from commandable selected units.
- Courier status is visible in the core HUD, so item logistics are no longer hidden behind shop behavior.

It does not prioritize new heroes, art asset volume, balance tuning, or simulation rewrites.

## Completed In This Slice

- Command card click closure:
  - Move enters a pending ground-click forced move flow.
  - Attack enters the same pending attack-move flow as the hotkey.
  - Stop, Hold, Hero, Courier, All, Glyph, and Shop reuse the existing input callbacks.
- Inspect panel authority:
  - Commandable selected units show a green `COMMANDABLE` state.
  - Inspect-only units show a gold `VIEW ONLY` state and clarify that orders fall back to the hero.
- Courier HUD status first pass:
  - New pure `buildCourierHudModel` contract.
  - HUD reads allied courier state from `world.units` and hero stash count only.
  - States covered: `missing`, `dead`, `ready`, `delivering`, `returning`.
  - The courier strip is clickable and reuses the existing `selectCourier` command-card action.
- Shop destination preview first pass:
  - New pure `buildShopDestinationModel` contract.
  - Shop rows now preview whether a purchase will go to hero inventory, backpack, stash, or TP slot.
  - Blocked rows explain the leading reason first: wrong shop, not enough gold, or full storage.
  - This is preview-only UI and does not change `buyItem`.
- Shop search first pass:
  - New pure `buildShopVisibleItems` contract.
  - The shop panel now has a keyboard-friendly search box.
  - Search scans item key, name, category, and description.
  - Empty search keeps the selected tab; active search searches across categories.

## Files Added Or Updated

- `src/ui/inspectPanelModel.ts`
- `src/ui/courierHudModel.ts`
- `src/ui/shopDestinationModel.ts`
- `src/ui/shopListModel.ts`
- `src/ui/inspectPanel.ts`
- `src/ui/hud.ts`
- `src/ui/shop.ts`
- `tests/inspectPanelModel.test.ts`
- `tests/courierHudModel.test.ts`
- `tests/shopDestinationModel.test.ts`
- `tests/shopListModel.test.ts`
- UX roadmap and recap docs

## Current UX Contract

- F1 selects hero.
- F2 selects allied courier.
- F3 selects all controlled units.
- Command card and hotkeys share the same callbacks.
- HUD courier strip is a status and selection entry point, not yet a full manual courier logistics controller.
- Courier status is inferred from existing live state:
  - dead courier: `Dead / respawning`
  - moving while stash has items: `Delivering stash xN`
  - moving without stash cargo: `Returning to base`
  - idle at fountain: `Ready at base` or `Ready / stash xN`
- Shop list rows expose purchase destination before click:
  - `Hero`: item goes to inventory or adds inventory charge.
  - `Backpack`: inventory is full and backpack can receive it.
  - `Stash`: dead purchase or overflow goes to stash.
  - `TP`: scroll goes to the dedicated TP slot or adds a TP charge.
  - `Secret`, `Shop`, `Gold`, `Full`: purchase is blocked with the first actionable reason.
- Shop search behavior:
  - no query: current category tab determines visible rows.
  - with query: matching rows can come from any category.
  - every query token must match item key, name, category, or description text.
  - recipes and zero-cost utility entries stay hidden.

## Verification

Focused automated coverage added:

- `tests/inspectPanelModel.test.ts`
- `tests/courierHudModel.test.ts`
- `tests/shopDestinationModel.test.ts`
- `tests/shopListModel.test.ts`
- existing selection, routing, command-card, input, and UX feedback tests remain the regression net.

Required before closing this stage:

- focused tests
- `npm run typecheck`
- `npm run build`
- browser smoke for HUD command card, inspect panel, and courier strip visibility

## Next Stage

Keep the next stage on UI and controls:

1. Courier logistics UI v2:
   - Deliver / return / select buttons
   - courier danger and death feedback
   - stash / backpack / courier lanes in HUD or shop
2. Shop destination feedback:
   - purchased item went to hero, backpack, stash, or courier
   - clear failure reasons
3. Minimap and ping controls:
   - courier marker
   - delivery path preview when a stable sim contract exists
   - Alt-click communication for core HUD resources

Avoid touching Opus-owned sim contracts unless a handoff doc explicitly asks for it.
