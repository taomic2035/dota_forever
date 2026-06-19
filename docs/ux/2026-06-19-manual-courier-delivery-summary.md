# Manual Courier Delivery UX Summary

Date: 2026-06-19
Owner: Codex UX
Scope: courier control UX and minimal delivery support

## Handoff To Opus

### What

- Codex added the player-facing courier delivery action.
- The HUD can now show `Deliver stash` when the selected hero has stash items and an allied courier is available.
- Clicking the courier status strip dispatches the courier toward the hero.
- If Opus moves the courier manually near a living allied hero with stash items, the courier system now performs the delivery and returns the courier to the fountain.

### Why

This closes a high-frequency DotA UX expectation without taking over Opus' broader economy, item, courier lifecycle, or hero progression systems. The player now has an intentional delivery affordance instead of relying only on background auto-delivery.

### Tradeoff

- Chose a narrow HUD action plus proximity delivery fallback instead of implementing the full DotA courier backpack, retrieve, transfer, speed burst, shield, or queue semantics.
- Kept existing automatic delivery behavior intact so Opus can continue mainline item/courier logic without reconciling a large system rewrite.
- Did not add new visual model assets in this slice; this is interaction polish and integration surface only.

### Open Questions

- Should manual courier delivery require selection ownership once Opus finalizes selection authority for multi-unit command groups?
- Should future courier inventory/backpack slots be represented as real item containers or as a delivery-only abstraction?
- Should the HUD action dispatch to the selected hero, primary controlled hero, or nearest allied hero when multi-hero/control-group support lands?

### Next Action

- Opus can wire this into the main shop/item flow by calling `requestCourierDelivery(world, hero)` from any non-HUD input path that should trigger delivery.
- Please preserve the result-code contract (`ok`, `no-courier`, `dead`, `no-stash`) if mainline courier logic expands, because HUD toast/audio feedback depends on it.
- If Opus changes courier ownership, inventory, or stash rules, update `tests/courier.test.ts` and `tests/courierHudModel.test.ts` with the new expected behavior.

## What Changed

- Added `requestCourierDelivery(world, hero)` in `src/sim/courier.ts`.
- Manual request result codes:
  - `ok`
  - `no-courier`
  - `dead`
  - `no-stash`
- Courier system now also delivers stash when an allied courier is manually moved within delivery range of a living allied hero with stash items.
- Courier HUD model now exposes `primaryAction`.
  - `deliver` when the courier is ready and hero stash has items.
  - `select` for normal follow/select states.
  - `none` when missing/dead.
- Clicking the courier status strip dispatches delivery when `primaryAction === "deliver"`; otherwise it keeps the existing select-courier behavior.

## Why

The DotA UX gap list still had manual courier delivery as a remaining core shop/courier interaction. The project already had automatic courier delivery, but the player could not intentionally request delivery from the HUD. This pass makes the courier status chip actionable without replacing the existing automatic delivery system.

## Integration Notes For Opus

- Sim support: `src/sim/courier.ts`
- HUD model: `src/ui/courierHudModel.ts`
- HUD click wiring: `src/ui/hud.ts`
- Runtime wiring: `src/main.ts`
- Tests:
  - `tests/courier.test.ts`
  - `tests/courierHudModel.test.ts`

This pass does not alter item prices, stash capacity, courier respawn timing, courier bounty, inventory stat rules, or shop purchase legality. It only adds a player-visible delivery request and a proximity delivery fallback for manually moved couriers.

## Verification

```bash
npm test -- tests/courier.test.ts tests/courierHudModel.test.ts
```
