# Shift Queue Controls Summary

日期: 2026-06-13
状态: P0-A Dota-like 操控闭环增量

## Player-Facing Changes

- Shift + right-click now queues the next move or attack order instead of replacing the current command.
- Shift + A then left-click queues attack-move.
- Shift + ability hotkey can preserve queued intent through pending targeting.
- Shift + no-target ability hotkey queues the cast behind the current order.
- Queued commands show a green world pulse with a small flag mark, separate from normal move/attack/attack-move pulses.
- Selected heroes now render a persistent green queue route chain when queued orders exist.
- Queue route nodes are numbered so players can read execution order at a glance.
- Pending cursor copy distinguishes queued intent, for example `QUEUE A-MOVE` and `QUEUE CAST R`.

## Implementation Notes

- `src/sim/unit.ts`
  - Adds `Unit.queueOrder(order)` so queued commands append without interrupting the current order.
  - Adds `Unit.advanceOrder()` so movement, attack-move, and cast completion promote the next queued order consistently.
- `src/engine/commandMode.ts`
  - Carries `{ queued: true }` metadata through pending cast/item/attack-move confirmation.
- `src/engine/input.ts`
  - Reads `Shift` from mouse and hotkey events.
  - Passes queued intent to right-click, attack-move, ability, and item command callbacks.
- `src/main.ts`
  - Uses `hero.queueOrder()` for queued hero move/attack/attack-move/cast orders.
  - Keeps normal commands on `hero.issueOrder()`.
- `src/ui/uxFeedback.ts` and `src/render/renderer.ts`
  - Add `queued` world pulse rendering.
- `src/render/commandQueuePath.ts` and `src/render/renderer.ts`
  - Build and draw selected-unit command queue legs from the current order through queued point/target orders.
  - Skip orders without drawable destinations, such as no-target queued casts, instead of drawing misleading route segments.

## Verification

Automated tests:

```text
npm test -- tests/commandMode.test.ts tests/queuedOrders.test.ts tests/uxFeedback.test.ts
3 files passed
24 tests passed
```

```text
npm test -- tests/commandQueuePath.test.ts
1 file passed
3 tests passed
```

```text
npm test -- tests/commandQueuePath.test.ts tests/queuedOrders.test.ts tests/commandMode.test.ts tests/uxFeedback.test.ts
4 files passed
27 tests passed
```

```text
npm test -- tests/commandMode.test.ts tests/queuedOrders.test.ts tests/uxFeedback.test.ts tests/controlSettings.test.ts tests/selfCast.test.ts tests/targetFilters.test.ts tests/targetKindMetadata.test.ts tests/targetTeamCoverage.test.ts tests/cursorTargetHint.test.ts tests/abilities.test.ts tests/items.test.ts
11 files passed
72 tests passed
```

```text
npm test -- tests/creeps.test.ts
1 file passed
5 tests passed
```

```text
npm test -- --run
94 files passed
836 tests passed
```

```text
npm run typecheck
passed
```

```text
npm run build
passed
Vite still reports the existing large bundle warning.
```

Runtime smoke:

```text
Playwright @ http://127.0.0.1:5184/?mode=play&hero=zola&seed=42&speed=0
Queue result: current move order + queued move + queued attackmove + queued cast(R)
Visual result: persistent route chain with numbered nodes 1/2/3; no overlap with the hero command panel.
Console/page errors: none
Screenshot: docs/screenshots/ux-shift-queue-controls.png
```

## Remaining UX Debt

- Item active orders still need a real queued item-use order type before Shift + item can become fully Dota-like.
- Queued no-target casts are visible in the queue state and pulse feedback, but intentionally do not add route legs because they have no world destination.
- Control groups, multi-unit selection, and queued commands for summons/couriers remain separate P2 work.
- Full key rebinding is still pending; this batch only respects Shift as a hard-coded modifier.

## Opus Handoff

### What

This branch adds the first Dota-like Shift command queue slice:

- Shift + right-click queues move/attack orders.
- Shift + A queues attack-move.
- Shift + ability hotkeys preserve queued intent through quick and pending casts.
- Selected heroes draw a persistent numbered queue route chain for drawable move/attack/attack-move/target orders.
- Green queued world pulses and cursor labels make queued intent visually distinct from immediate commands.

Primary files:

- `src/sim/unit.ts`
- `src/sim/combat.ts`
- `src/sim/abilities.ts`
- `src/engine/commandMode.ts`
- `src/engine/input.ts`
- `src/main.ts`
- `src/render/commandQueuePath.ts`
- `src/render/renderer.ts`
- `src/ui/uxFeedback.ts`

### Why

The previous command UX could issue orders, but it still felt unlike classic Dota because every command replaced the current one. Shift queue is a core muscle-memory feature for lane movement, spell setup, retreat routing, and multi-step micro. The route chain makes queued intent inspectable instead of hidden in internal state.

### Tradeoff

- Chose to queue existing `Order` objects instead of introducing a separate human-command timeline, keeping this batch scoped to UX/control feel and avoiding conflict with opus mainline logic.
- Chose a lightweight 2D route overlay rather than full pathfinding preview; it communicates execution order now and can later be upgraded to actual path segments.
- No-target casts are queued but not drawn as route legs because they have no world destination.
- Item active queueing is wired through input metadata but still needs a real item-use order type before it becomes complete.

### Open Questions

- Should item active use become a first-class `Order` type, or should opus route it through a separate item command executor?
- Should summons/couriers inherit the same queue behavior when multi-unit selection lands?
- Should 3D renderer mirror the same queue route data from `src/render/commandQueuePath.ts`, or use a renderer-specific mesh/line layer?

### Next Action

Please review and merge this as a UX/control slice only. Recommended review focus:

- `Unit.advanceOrder()` promotion points in movement, combat, and ability completion.
- `commandMode` / `input` queued metadata propagation.
- `main.ts` order dispatch boundary between immediate `issueOrder` and queued `queueOrder`.
- `commandQueuePath.ts` as the shared 2D/3D route-preview data source.
