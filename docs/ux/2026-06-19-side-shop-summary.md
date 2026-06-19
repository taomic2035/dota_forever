# Side Shop UX Summary

Date: 2026-06-19
Owner: Codex UX
Scope: lane side-shop access, purchase rules, and shop preview copy

## Handoff To Opus

### What

- Codex added lane side shops to the map:
  - `ShopZone.kind` is now `home | side | secret`.
  - Dawn side shop uses `DAWN_SIDE_SHOP`; Night side shop is mirrored.
  - `shopAt(...)` can now return `side`.
- Item definitions can opt into side-shop availability through `sideShop: true`.
- Current side-shop sample list includes lane utility basics:
  - TP scroll
  - boots
  - quelling blade
  - tango
  - bottle
  - magic stick
  - branch, circlet, basic stat small items
  - gloves of haste
  - ring of regen, sobi mask, ring of protection
- `buyItem(...)` allows side-shop items at `home` or `side`, but keeps normal home-only and secret-only restrictions.
- Side-shop purchases go to hero inventory or backpack, but never overflow into base stash.
- Shop destination preview now understands `sideShop` and shows side-specific copy such as `Side shop: goes to inventory` and `Side shop cannot stash`.
- Shop toast copy is more precise when the player stands at side shop but tries to buy a home-only item.
- Shop panel header now uses `buildShopAccessModel(...)` to show the current access state:
  - `基地商店`: full catalog and stash access
  - `边路商店`: lane utility basics only, no stash delivery
  - `秘密商店`: secret components only, no stash fallback
  - `远程浏览`: browse/quickbuy only until entering shop range
- Shop rows are now availability-sorted for the current shop state: buyable rows stay at the top, blocked rows keep stable order below them. This makes side-shop basics easier to scan inside large categories.
- Map readability now treats side shops as their own landmark kind:
  - `landmarkVisuals(...)` emits `sideShop` separately from `shop` and `secretShop`.
  - 2D world markers draw side shops with a warm rectangular stall marker.
  - Minimap markers draw side shops as small warm shop flags, distinct from secret-shop blue diamonds.
  - 3D terrain dressing gives side shops distinct `#ffc65f` landmark rings.

### Why

DotA shop UX is partly map control: lane shops let players solve small sustain and movement needs without returning to base, while still preserving pressure around larger purchases and secret-shop components. This adds that strategic texture without changing recipe economics or bot shopping behavior yet.

### Tradeoff

- This is a side-shop rules slice, not a full shop UI redesign.
- Side shops use a curated classic-basics whitelist instead of exposing whole categories.
- Side shops do not stash overflow purchases, even though base shop can; this preserves the positional cost of buying in lane.
- Bots still shop at home only for now, avoiding unintended economy/pathing churn in Opus mainline logic.

### Open Questions

- Should side shops get unique 3D NPC/prop presentation in the real play map, using the existing `shops_npcs` resource samples?
- Should bot AI eventually route to side shops for TP/boots/sustain, or is that too much lane pathing churn for this phase?
- Should the shop UI add a visible side-shop filter chip, or is destination/blocked copy enough for the first pass?
- Should the minimap add hover/title help for shop types once tooltip plumbing exists?

### Next Action

- Opus can rely on `shopAt(...) === "side"` for lane-shop proximity checks.
- If Opus changes map coordinates or lane widths, revalidate `DAWN_SIDE_SHOP` and mirrored Night placement.
- If Opus adds new early-game basics, mark them with `sideShop: true` and extend `tests/items.test.ts` / `tests/shopDestinationModel.test.ts`.

## What Changed

- `src/data/mapLayout.ts`
  - Added `DAWN_SIDE_SHOP`.
- `src/sim/map.ts`
  - Added `ShopKind` and `ShopZone.kind`.
  - Added mirrored side-shop zones.
- `src/data/items.ts`
  - Added optional `sideShop` to `ItemDef`.
  - Marked first-pass lane utility basics as side-shop buyable.
- `src/sim/items.ts`
  - `shopAt(...)` now returns `home | side | secret | null`.
  - `buyItem(...)` supports side-shop availability and blocks side-shop stash overflow.
- `src/ui/shopDestinationModel.ts`
  - Models side-shop availability and destination copy.
- `src/ui/shop.ts`
  - Passes `sideShop` into destination preview and improves side-shop blocked toasts.
  - Renders the current shop access chip in the panel header.
  - Sorts visible rows by current buyability before quick actions and row rendering.
- `src/ui/shopAccessModel.ts`
  - Adds a pure model for current shop access labels/details/tone.
- `src/ui/shopListModel.ts`
  - Adds `orderShopVisibleItemsByAvailability(...)` for stable buyable-first list ordering.
- `src/render/mapReadability.ts`
  - Adds `sideShop` landmark classification for shared map/minimap knowledge.
- `src/render/minimap.ts`
  - Draws side shops as distinct warm shop flags.
- `src/render/renderer.ts`
  - Draws side-shop range and stall markers separately from home and secret shops.
- `src/render3d/terrainDressing.ts`
  - Gives side-shop landmark rings a distinct warm color.
- `tests/items.test.ts`
  - Covers side-shop availability and no-stash overflow.
- `tests/shopDestinationModel.test.ts`
  - Covers side-shop preview and blocked copy.
- `tests/shopAccessModel.test.ts`
  - Covers home/side/secret/away shop access copy.
- `tests/shopListModel.test.ts`
  - Covers stable buyable-first shop row ordering.
- `tests/mapReadability.test.ts`
  - Covers side-shop landmarks and mirrored ownership.
- `tests/render3d/terrainDressing.test.ts`
  - Covers distinct side-shop 3D landmark rings.

## Verification

```bash
npm test -- tests/items.test.ts tests/shopDestinationModel.test.ts
npm test -- tests/items.test.ts tests/shopDestinationModel.test.ts tests/map.test.ts tests/mapIntegrity.test.ts tests/mapReadability.test.ts tests/shopListModel.test.ts tests/shopQuickActionModel.test.ts
npm test -- tests/mapReadability.test.ts tests/render3d/terrainDressing.test.ts
npm test -- tests/shopAccessModel.test.ts tests/shopDestinationModel.test.ts tests/shopListModel.test.ts tests/shopQuickActionModel.test.ts
npm test -- tests/shopListModel.test.ts tests/shopAccessModel.test.ts tests/shopDestinationModel.test.ts tests/shopQuickActionModel.test.ts
npm run build
git diff --check
```
