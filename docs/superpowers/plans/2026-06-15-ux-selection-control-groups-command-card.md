# Selection Control Groups Command Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first complete Dota1/WC3-style RTS control surface: selection sets, control groups, multi-unit command routing, and a visible command card.

**Architecture:** Add a pure selection/control-group model first, then wire input and command dispatch through it. Keep existing hero-first behavior as fallback so current play remains stable while multi-unit control expands.

**Tech Stack:** TypeScript, Vite, Vitest, Canvas2D, Three.js, DOM HUD.

---

## File Structure

- Create `src/engine/selection.ts`: pure selection state, control groups, commandable filtering, inspect-only selection.
- Create `tests/selection.test.ts`: selection and control-group behavior.
- Modify `src/engine/input.ts`: drag selection, Shift select, Ctrl group bind, group select, callbacks.
- Modify `src/main.ts`: selection state ownership, pick/box-pick wiring, multi-unit command dispatch.
- Modify `src/ui/hud.ts`: command card and multi-selection summary.
- Modify `src/ui/inspectPanel.ts`: distinguish inspect-only selected unit from commandable selected units.
- Modify `src/engine/controlSettings.ts`: add select/control command bindings without breaking current item hotkeys.
- Modify `src/render/renderer.ts`: draw box selection rectangle and multi-selection rings in 2D.
- Modify `src/render3d/renderer3d.ts`: draw multi-selection markers in 3D.
- Add or extend tests: `tests/controlSettings.test.ts`, `tests/commandMode.test.ts`, `tests/queuedOrders.test.ts`, `tests/render3d/commandQueue3d.test.ts`.
- Add docs/screenshots after implementation: `docs/ux/2026-06-15-selection-control-groups-summary.md`, `docs/screenshots/ux-selection-control-groups.png`.

## Input Conflict Decision

Current item hotkeys use `1..6`. Dota1/WC3 control groups also traditionally use number keys. For this project, implement a safe default first:

- Keep `1..6` as item hotkeys by default.
- Keep `Alt + 1..6` reserved for current item self-cast behavior.
- Add a future setting named `numberRowMode` with values `items` and `controlGroups`, but do not flip the default in this slice.
- First pass selection shortcuts are `F1` select hero, `F2` select courier, and `F3` select all controlled units.

This avoids breaking existing item UX while still introducing persistent groups.

## Task 1: Pure Selection State

**Files:**

- Create: `src/engine/selection.ts`
- Create: `tests/selection.test.ts`

- [x] **Step 1: Define selection model tests**

Cover these behaviors:

- Selecting own hero creates a commandable single selection.
- Selecting enemy unit creates inspect-only selection.
- Shift selecting own summon adds it to the commandable set.
- Shift selecting an already selected unit removes it when more than one selected unit remains.
- Control group bind stores commandable ids only.
- Selecting a group restores existing alive commandable ids and drops missing ids.

Run:

```powershell
npm test -- tests/selection.test.ts
```

Expected before implementation: fail because `src/engine/selection.ts` does not exist.

- [x] **Step 2: Implement `SelectionState`**

Required exports:

- `SelectableUnitLike`
- `SelectionSnapshot`
- `ControlGroupSlot`
- `SelectionState`
- `isCommandableByPlayer(unit, playerTeam, playerHeroId)`

Minimum behavior:

- `select(unit, options)`
- `selectMany(units, options)`
- `clearToHero(hero)`
- `bindGroup(slot)`
- `selectGroup(slot, unitsById)`
- `snapshot()`

- [x] **Step 3: Verify pure selection tests pass**

Run:

```powershell
npm test -- tests/selection.test.ts
```

Expected: pass.

## Task 2: Input Wiring For Selection And Groups

**Files:**

- Modify: `src/engine/input.ts`
- Modify: `src/engine/controlSettings.ts`
- Test: `tests/controlSettings.test.ts`

- [x] **Step 1: Add input callbacks**

Extend `InputCallbacks` with:

- `onLeftClick(world, options)`
- `onSelectBox(startScreen, endScreen, options)`
- `onSelectHero()`
- `onSelectCourier()`
- `onSelectAllControlled()`

Still pending:

- `onBindControlGroup(slot)`
- `onSelectControlGroup(slot, options)`

- [ ] **Step 2: Add selection gestures**

Implement:

- [x] Left-click with no pending command calls `onLeftClick`.
- [x] Drag left mouse beyond a small threshold calls `onSelectBox`.
- [x] Shift modifier is passed to select callbacks.
- [x] F1/F2/F3 select hero/courier/all controlled.
- [x] Ctrl + `1..6` binds control group.
- [x] `numberRowMode='controlGroups'` makes `1..6` select control groups while default mode keeps item hotkeys.
- [x] Repeated control-group selection requests camera centering.
- [ ] Control-group select hotkeys are added after the item-hotkey conflict setting exists.
- [x] Space keeps current center-on-hero behavior.

Original target:

- Left-click with no pending command calls `onSelectPoint`.
- Drag left mouse beyond a small threshold calls `onSelectBox`.
- Shift modifier is passed to select callbacks.
- Ctrl + `1..6` binds control group.
- Space keeps current center-on-hero behavior.

- [x] **Step 3: Update key binding tests**

Add coverage that:

- Existing item hotkeys still normalize to `1..6`.
- New selection command bindings do not overwrite item bindings.
- F1/F2/F3 route to selection callbacks.

Still pending:

- Escape cancels pending selection box.

Run:

```powershell
npm test -- tests/controlSettings.test.ts
```

Expected: pass.

## Task 3: Main Game Selection Ownership

**Files:**

- Modify: `src/main.ts`
- Modify: `src/sim/pick.ts` if box-pick helper is missing
- Test: `tests/pick.test.ts`

- [x] **Step 1: Add box-pick helper if needed**

Add or extend a pure helper that receives a world-space rectangle and returns visible units sorted by command priority:

- own commandable units first
- own hero before own non-hero
- enemy heroes before enemy creeps for inspect-only selection
- hidden units excluded

- [x] **Step 2: Own `SelectionState` in `main.ts`**

Initialize selection with the player hero. Replace direct `ux.selectedUnitId` writes with `SelectionState.snapshot()` based updates.

- [x] **Step 3: Route commands through selected commandable units**

For move, attack, attack-move, stop, hold, and queued move:

- If commandable selection exists, issue to every commandable selected unit.
- If selection is inspect-only, fall back to player hero for commands.
- Preserve current hero-only behavior when only hero is selected.

- [x] **Step 4: Verify pick and command tests**

Run:

```powershell
npm test -- tests/pick.test.ts tests/queuedOrders.test.ts tests/commandMode.test.ts
```

Expected: pass.

## Task 4: HUD Command Card

**Files:**

- Modify: `src/ui/hud.ts`
- Modify: `src/ui/inspectPanel.ts`
- Test: `tests/uxFeedback.test.ts` or add `tests/hudCommandCard.test.ts` if pure helpers are extracted

- [x] **Step 1: Add command-card data helper**

Create a pure helper inside `src/ui/hud.ts` or a new `src/ui/commandCard.ts` if `hud.ts` becomes too large.

It should produce button metadata for:

- Attack Move
- Stop
- Hold
- Move
- Select Hero
- Select Courier
- Select All Controlled
- Glyph
- Shop

Each button needs:

- action id
- label
- current hotkey from `ControlSettings`
- enabled/disabled state
- tooltip text

- [x] **Step 2: Render command card**

Place the card in the bottom HUD without pushing ability/item slots off screen. If space is tight, use a 3x3 compact grid near the portrait/stat area.

- [x] **Step 3: Render multi-selection summary**

When more than one commandable unit is selected, show:

- selected count
- hero/summon/courier/illusion counts
- primary unit name

- [ ] **Step 4: Keep inspect panel focused**

Inspect panel should show enemy/ally non-commandable unit detail. It should not duplicate the commandable multi-selection summary.

## Task 5: 2D And 3D Selection Rendering

**Files:**

- Modify: `src/render/renderer.ts`
- Modify: `src/render3d/renderer3d.ts`
- Test: `tests/render3d/renderer3dReadability.test.ts`

- [x] **Step 1: Draw drag selection rectangle**

2D canvas should show a faint rectangular selection area while dragging.

- [x] **Step 2: Draw selected unit rings**

Selected commandable units should get a clear player-team ring. The primary selected unit should remain visually stronger.

Current status: implemented for Canvas2D via `selectionVisualState`; drag rectangle is implemented through `UxFeedback.selectionBox` and `selectionBoxRect`; 3D now mirrors multi-selection through `selection3DMarkerIds` and secondary selection ring pooling in `renderer3d`.

- [x] **Step 3: Mirror selection in 3D**

3D should render all selected commandable units with a subtle ring and primary selection with the existing stronger selection read.

- [x] **Step 4: Verify renderer tests**

Run:

```powershell
npm test -- tests/render3d/selection3d.test.ts tests/selectionVisual.test.ts tests/uxFeedback.test.ts
```

Expected: pass.

Current status: passed, and the broader P0-A focused suite also passed.

## Task 6: Runtime Validation And Docs

**Files:**

- Create: `docs/ux/2026-06-15-selection-control-groups-summary.md`
- Create: `docs/screenshots/ux-selection-control-groups.png`
- Modify: `docs/ux/README.md`
- Modify: `docs/screenshots/README.md`

- [ ] **Step 1: Run focused tests**

Run:

```powershell
npm test -- tests/selection.test.ts tests/pick.test.ts tests/controlSettings.test.ts tests/queuedOrders.test.ts tests/commandMode.test.ts
```

Expected: pass.

- [ ] **Step 2: Run full verification**

Run:

```powershell
npm test
npm run build
```

Expected:

- all tests pass
- build passes
- existing Vite chunk-size warning may remain

- [ ] **Step 3: Capture runtime screenshot**

Use the existing screenshot workflow:

```powershell
node scripts/shot.mjs "http://127.0.0.1:<port>/?mode=play&hero=zola&seed=42&renderer=3d" docs/screenshots/ux-selection-control-groups.png 1500
```

Expected screenshot state:

- command card visible
- selected hero visible
- at least one additional selected/inspectable unit visible
- minimap still visible
- HUD not overlapping command card

- [ ] **Step 4: Write summary**

Document:

- player-facing behavior
- key files changed
- tests run
- screenshot path
- remaining debt

## Self-Review Checklist

- [ ] Existing hero-only play still works.
- [ ] Existing item hotkeys still work.
- [ ] Selection never commands enemy units.
- [ ] Hidden-in-fog units cannot be selected.
- [ ] Shift queue still works for selected commandable units.
- [ ] 2D and 3D both show selected units.
- [ ] Command card hotkeys reflect key bindings.
- [ ] Docs and screenshot indexes are updated.
