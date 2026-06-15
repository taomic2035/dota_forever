# Real Dota UX Gap Audit

Date: 2026-06-15
Scope: core game UX, controls, HUD, minimap, shop, communication, and readability.

This audit compares the current `main` branch with the real Dota lineage. The primary target is Dota 1 as a Warcraft III custom-map experience: RTS selection, command hotkeys, command card, minimap navigation, hero inventory, shop/courier flow, and high-pressure combat readability. Dota 2 references are used only where they clarify how the same UX problems evolved after Dota 1.

The project should keep its newer original art direction. The goal is not copying old Blizzard or Valve assets. The goal is to reproduce the player-facing control semantics and information rhythm that made Dota feel precise.

## Research Sources

- Blizzard Warcraft III basics: [Hot Keys and Special Commands](https://classic.battle.net/war3/basics/specialcommands.shtml)
- Blizzard Warcraft III basics: [Unit Commands](https://classic.battle.net/war3/basics/unitcommands.shtml)
- Blizzard Warcraft III basics: [Unit Control](https://classic.battle.net/war3/basics/unitcontrol.shtml)
- Blizzard Warcraft III basics: [Hero Control](https://classic.battle.net/war3/basics/herocontrol.shtml)
- Blizzard Warcraft III basics: [Spell Basics](https://classic.battle.net/war3/basics/spellbasics.shtml)
- Liquipedia Warcraft: [Custom Hotkeys Guide](https://liquipedia.net/warcraft/Custom_Hotkeys_Guide)
- Modern comparison only: [Dota 2 Wiki Controls](https://dota2.fandom.com/wiki/Controls) and [Dota 2 Wiki Hotkeys](https://dota2.fandom.com/wiki/Hotkeys)

## Real Dota 1 UX Model

### 1. Warcraft III RTS Shell

Dota 1 inherits Warcraft III's RTS interaction grammar:

- Left-click selects units or UI buttons.
- Right-click issues context-sensitive commands: move, attack, follow, interact, or shop-related targeting depending on clicked object.
- Command card buttons have visible hotkey letters, and keyboard control is first-class.
- Attack, move, stop, hold, patrol/follow, and ability casts are explicit command states.
- Shift modifies commands into queued actions.
- Control groups and multi-unit selection are part of the skill ceiling.

For Dota, this means the hero is the main unit, but the UX must still support other controlled units: summons, illusions, wards, courier, dominated creeps, and temporary units. If these units exist in simulation but are not selectable or commandable, the game still feels unlike Dota.

### 2. Hero-First HUD With RTS DNA

Dota 1 uses the Warcraft III bottom interface: portrait, stats, command buttons, hero abilities, inventory, and selection information live in a dense lower UI. The design has high information density but strong spatial memory:

- Hero state is always visible: HP, mana, level, attributes, damage, armor, gold, death/respawn.
- Abilities are read by icon position, cooldown overlay, mana availability, and hotkey.
- Inventory is fixed-slot and spatial; players learn item positions as muscle memory.
- Selected enemy/ally/unit information matters, even if the player cannot command it.
- Tooltips carry advanced detail, but the first read must be visual.

The current project is closer than before, but some information is still text-heavy or hidden behind generic programmatic icons.

### 3. Command Anticipation

Real Dota UX is not just "click and see what happens." The player must know what the next click will do before committing:

- Pending spell/item target state must be visually different from normal cursor mode.
- Attack-move must be visibly different from move.
- Invalid target feedback should explain team, target type, range, mana, cooldown, immunity, or visibility.
- Out-of-range casts should communicate whether the hero will walk forward or fail.
- AoE, line, cone, and unit-target casts need different previews.

The project has a strong foundation here, but range, path, ground validity, and approach-to-cast feedback remain incomplete.

### 4. Minimap As A Command Surface

In Dota, the minimap is not only a display:

- It is used for camera jumps.
- It is used for movement commands.
- It is used for pings and alert communication.
- It compresses fog, towers, lanes, heroes, creeps, neutral areas, shops, runes, and boss/pit into a fast-scannable map.

The current minimap is already substantially improved and works in 3D now, but it still lacks several Dota-like command and communication layers.

### 5. Shop, Courier, Stash, And Inventory Loop

The shop/courier flow is a core Dota UX loop, not a side panel:

- Player buys from base, lane shop, or secret shop constraints.
- Overflow goes to stash/backpack.
- Courier retrieves, delivers, returns, and can die.
- Quickbuy and recipe planning reduce shop friction during combat.
- Inventory manipulation is spatial: drag/swap/sell/use/move from backpack.

The current project has meaningful systems and some UI, but the end-to-end player workflow still needs a polished Dota-like loop.

### 6. Combat Readability Under Noise

Real Dota combat is readable because multiple channels reinforce each other:

- Selection rings, health bars, cast animations, projectile travel, impact FX, and sound align.
- Important effects do not completely cover unit identity.
- Buff/debuff/status visibility is small but consistent.
- Death, buyback, killfeed, and scoreboard tell the story after the fight.

The 3D work has moved strongly in this direction, especially model identity, status FX, and occlusion budgets. The remaining gap is not just making models prettier; it is making every state legible during real play.

## Current Project State

### Already Strong

- Core game loop exists: lanes, creeps, towers, heroes, items, abilities, fog, runes, boss, economy, buyback, bot matches.
- Dota-like command basics exist: right-click, A-click, stop, hold, QWER, item hotkeys, TP slot, shop key, glyph key.
- Cast UX exists: normal/quick/smart cast, per-slot overrides, Alt self-cast, pending target state, reject reasons.
- Shift queue exists with visible route-chain feedback in 2D and 3D.
- Key rebinding exists in pause menu for major command actions.
- Camera UX exists: edge pan, arrow pan, middle drag, zoom, space-to-hero, configurable speed.
- Minimap exists in both 2D and 3D with fog, units, landmarks, pings, camera rectangle, left-click camera jump, and right-click move command.
- HUD has hero portrait, stats, HP/MP, abilities, item slots, TP slot, backpack, buff/debuff chips, low-HP vignette, buyback, and death recap.
- Shop exists with categories, prices, recipe text, range validation, stash/retrieve/sell paths.
- Left-click selection and inspect panel exist for non-owned units.
- 3D renderer has runtime model identity, action pose, unit readability, terrain dressing, resource models, command queue, status FX, and FX occlusion budget.
- Documentation and screenshots are extensive.

### Main Weakness

The current build has many Dota-like pieces, but the UX is still fragmented. It behaves like a strong prototype with many advanced features, while real Dota feels like one continuous control surface. The next work should focus on closing loops:

- Select something, understand it, command it, queue it, and see the result.
- Buy something, plan the next item, courier it, move it, use it, and see why it failed.
- Read a fight, understand statuses, identify threats, recover after death, and communicate on map.

## Gap Matrix

### P0. Multi-Unit Selection And Command Authority

Current status:

- The sim includes many unit kinds: heroes, creeps, neutrals, boss, buildings, wards, illusions, couriers.
- Inspect panel can show selected non-hero units.
- Input still primarily commands the player's hero.
- Shift queue exists, but the queue loop is mainly hero-oriented.

Real Dota expectation:

- Box select controllable units.
- Shift-click add/remove selection.
- Select all controlled units, select all other units, select courier, select hero.
- Ctrl + number binds control groups; number selects; double-tap centers.
- Controlled summons/illusions receive orders.
- Non-controllable enemy/ally units can be selected for information only.
- Command card adapts to selected unit or subgroup.

Gap:

- No full selection set model.
- No box selection.
- No control groups.
- No subgroup/unit command card.
- No summon/illusion/courier command routing.
- No consistent distinction between inspect-only selection and commandable selection.

Why it matters:

This is the biggest Dota1/WC3 UX gap. Dota is hero-first, but not hero-only. Without this, illusion heroes, summoned units, courier play, wards, and micro-heavy abilities cannot feel authentic.

Implementation direction:

- Add `SelectionState`: primary unit id, selected unit ids, commandable unit ids, inspect unit id.
- Route commands to selection set when commandable, otherwise to hero fallback.
- Add drag-box selection in `InputManager`.
- Add `Ctrl + 1..6` group bind and `1..6` conflict strategy, because item hotkeys currently occupy number keys. Use a setting: `Classic items on numpad` versus `Modern items on 1-6`.
- Add command-card metadata per unit kind.
- Add tests for selection filtering, group persistence, and fog-hidden target selection.

### P0. Command Card And Visible Action Buttons

Current status:

- QWER abilities and item slots are visible.
- Stop, hold, attack-move, glyph, shop, and TP exist mostly as hotkeys.
- Pause menu lists several bindings.

Real Dota expectation:

- Important commands exist as visible buttons, not only hidden hotkeys.
- Button hover shows hotkey and action explanation.
- Disabled commands show why they are unavailable.
- Ability and item hotkey display must match current rebinding.

Gap:

- No classic command-card region for Attack/Stop/Hold/Patrol/Move/unit-specific commands.
- Ability/item slots still mostly show fixed labels rather than always reflecting rebinding.
- Rebinding exists, but the player does not get a complete "current controls" surface during play.
- Some commands are implemented but discoverability is weak.

Implementation direction:

- Add a compact command strip next to abilities or below portrait.
- Render action buttons from `ControlSettings.keyBinds`.
- Add tooltips: "Attack Move", "Stop", "Hold Position", "Glyph", "Shop", "Select Hero", "Select Courier".
- Add disabled/rejected states with shared `uxFeedback`.

### P0. Courier And Delivery Workflow

Current status:

- Courier simulation/tests exist.
- Shop can buy, stash, retrieve, and sell.
- Backpack and TP slot exist.

Real Dota expectation:

- Courier is directly selectable.
- Courier has a visible status: idle, retrieving, delivering, returning, dead.
- Player can deliver items, return to base, speed boost, transfer stash, and see courier danger.
- Shop purchases should make it obvious where the item went.

Gap:

- Courier is not yet a fully exposed UI/control flow.
- No courier panel/button/hotkey loop.
- No delivery ETA or map path.
- Stash/backpack exists, but the mental model is not fully visible.
- Courier death/respawn feedback is not a first-class HUD event.

Implementation direction:

- Add courier button near inventory: status icon, select, deliver, return.
- Add courier command bindings in `ControlSettings`.
- Add stash panel with "on hero / backpack / stash / courier" lanes.
- Add map marker and path preview for courier.
- Add killfeed/audio/toast for courier death.

### P0. Cast Preview Completeness

Current status:

- Pending cast/item state exists.
- Target team and kind filters are shared with sim.
- Reject feedback exists.
- Cursor semantics and target hints exist.
- Some spell geometry readability exists.

Real Dota expectation:

- AoE circle, line, cone, point target, no-target, unit-target, and vector target all read differently.
- Out-of-range should show cast range and walk-to-cast intent.
- Invalid terrain, fog, magic immune, spell immune, invulnerable, building/ward/hero-only should be explained.
- Quickcast should still provide enough pre-cast or post-cast readability.

Gap:

- Target preview does not yet cover every targeting shape as a unified language.
- Rangefinder exists partially but not as a full cast contract.
- No explicit walk-to-cast path or "will move closer" feedback.
- No consistent immunity/status reason line.
- Ground invalidity and pathing invalidity are not complete.

Implementation direction:

- Extend ability/item metadata with `previewShape`.
- Add shared `TargetPreviewModel`: range, shape, legal target, reject reason, approach position.
- Render preview in both 2D and 3D from the same model.
- Add audio ticks for reject category.
- Add tests for every target mode/category.

### P1. Inventory, Backpack, Quickbuy, And Recipe Planning

Current status:

- Six item slots, TP slot, backpack, stash behavior, active item hotkeys, recipes, and shop categories exist.
- Item icons are programmatic and category-based.

Real Dota expectation:

- Inventory is spatial and manipulable: drag/swap, sell, move to backpack/stash.
- Quickbuy and sticky item reduce shop friction.
- Recipe tree is visual, not only text.
- Component ownership is readable: owned, in stash, on courier, missing, affordable.

Gap:

- No full drag/drop inventory.
- No quickbuy or sticky item.
- Recipe information is text-heavy.
- Backpack and stash are functional but not visually integrated into one item logistics model.
- No item lock/disassemble/split behavior.

Implementation direction:

- Add inventory drag/drop with tests around swap, backpack, stash, sell range.
- Add quickbuy panel: target item, missing components, buy next, buy all affordable.
- Replace recipe text with component graph.
- Add item state badges: on hero, backpack, stash, courier.

### P1. HUD Information Density And Spatial Stability

Current status:

- Bottom HUD is rich: portrait, stats, ability slots, inventory, TP, backpack, buff chips.
- Topbar shows team kills, time, day/night, rune timer, glyph, gold.
- Low HP vignette and death recap exist.

Real Dota expectation:

- HUD elements remain spatially stable under combat pressure.
- XP progress, respawn, buyback, status, and resources are visible without panel hunting.
- Tooltips are deep; first read is icon/color/position.
- Selected unit info and player hero info do not fight for attention.

Gap:

- Some labels are currently mixed Chinese/English or garbled in terminal output; final in-game language strategy needs a pass.
- XP progress is less visible than it should be.
- Buff/debuff chips are compact but not yet a full icon language.
- Damage type, immunity, dispel type, and status resistance are not visible enough.
- Command, shop, inspect, and minimap layout still needs final responsive proof across common resolutions.

Implementation direction:

- Add HUD layout contract tests for 1280x720, 1440x900, 1920x1080.
- Add XP bar and next-level tooltip.
- Promote status chips into status icons with stable shapes.
- Add selected target inventory/abilities summary for enemy heroes.
- Normalize display language.

### P1. Minimap Communication And Anti-Misclick Behavior

Current status:

- Minimap supports fog, units, buildings, runes, camps, shops, pit, camera rectangle, ping, camera jump, right-click move.
- 3D mode now has minimap.

Real Dota expectation:

- Left/right/Alt/Ctrl-Alt click semantics are predictable.
- Pings have categories: normal, danger, retreat, missing, on-my-way, item/ability/status pings.
- Minimap has anti-misclick delay/guard options.
- Minimap icons can switch between dots and hero icons.
- Minimap size, side, and opacity are configurable.

Gap:

- Ping vocabulary is too small.
- No anti-misclick delay or click-through protection.
- No minimap customization.
- No broadcast log for pings.
- No Alt-click status pings for HP/mana/items/abilities/buyback.

Implementation direction:

- Add ping model with categories and timestamps.
- Add `Alt-click` broadcast hooks for HUD slots, topbar timers, and minimap.
- Add minimap settings: size, position, hero icons, misclick delay.
- Add audio and visual variants for danger/retreat.

### P1. Shop UX And Search

Current status:

- Shop categories, price display, recipe text, purchase validation, stash/retrieve, sell, and range checks exist.

Real Dota expectation:

- Shop supports fast search, item categories, recommended/common builds, component graph, and stateful shopping intent.
- Player can shop while maintaining lane awareness.
- Shop layout must not obscure minimap or critical fight information.

Gap:

- Search is missing.
- Recommended builds are missing.
- Quickbuy is missing.
- Shop is still panel-like rather than a high-speed item planning tool.
- Secret/lane/base shop constraints need clearer UI language.

Implementation direction:

- Add item search and keyboard navigation.
- Add hero-based recommended items.
- Add quickbuy and sticky item.
- Add component ownership and affordability visualization.
- Add compact/collapsed shop mode.

### P2. Scoreboard, Death Recap, And Match Timeline

Current status:

- Scoreboard shows teams, heroes, level, KDA, last hits/denies, gold, short item names, respawn state.
- Killfeed and endscreen exist.
- Death recap shows killer in HUD.

Real Dota expectation:

- Scoreboard summarizes power: items, net worth, levels, respawn timers, buyback, hero icons, team objectives.
- Death recap explains damage sources and disables/control.
- Spectator/replay UI can follow the action.

Gap:

- Scoreboard still lacks full power read: net worth, item icons, buyback status, cooldowns, objectives.
- Death recap is too shallow.
- No match timeline.
- No spectator controls, speed, fog perspective, or hero follow controls.

Implementation direction:

- Add item icon row and net worth to scoreboard.
- Add death recap event accumulator: last damage, control, killer, assist sources.
- Add objective state row: tower counts, boss status, rune timer, glyph.
- Add spectator control bar.

### P2. Tutorial And Discoverability

Current status:

- Menu and HUD mention some hotkeys.
- Pause menu exposes control settings.
- Onboarding module exists.

Real Dota expectation:

- Even experienced players need immediate confidence in this project's controls.
- New players need progressive hints for right-click, A-click deny, shop, courier, quickbuy, minimap ping, and cast modes.

Gap:

- No guided training mode.
- No first-match contextual hints based on failed actions.
- No compact hotkey overlay.
- No "why did this command fail?" persistent help trail.

Implementation direction:

- Add training route `?mode=tutorial`.
- Add optional first-match hint layer.
- Add `F1` or `?` controls overlay.
- Add rejection history panel with last 3 command failures.

### P2. Audio Feedback Contract

Current status:

- AudioDirector exists and command/reject audio has been added.
- VFX/audio sync metadata exists in 3D resource docs.

Real Dota expectation:

- Command confirm, cannot cast, cooldown, no mana, attack, hit, death, buyback, courier, ping, tower under attack, and kill streak events have recognizable audio classes.

Gap:

- Audio categories are not yet complete.
- No user volume categories.
- No priority ducking in large fights.
- No per-event cooldown policy document.

Implementation direction:

- Define `AudioEventKind` contract.
- Add mixer categories: UI, command, combat, alert, ambience.
- Add event priority and throttling tests.
- Add volume settings per category.

### P2. 3D Play Readability And Map Semantics

Current status:

- 3D has many readability passes: hero models, resource models, terrain dressing, runtime pose, VFX layers, status FX budget, command queue, minimap.

Real Dota expectation:

- Map semantics read instantly: lanes, river, ramps, high ground, tree walls, shops, pit, tower zones, fog edges.
- Units remain readable in teamfights.
- FX sells impact without hiding selection/targeting.

Gap:

- 3D visual quality is improving but still needs real-play screenshot QA per system, not only model/factory tests.
- Terrain semantics and pathing blockers are not fully reflected as gameplay-readable surfaces.
- FX and hero material lighting still risk overpowering target read in some states.
- Real assets are still procedural/runtime placeholders.

Implementation direction:

- Add recurring 3D play-camera QA script for lane, river, base, pit, teamfight, shop.
- Add terrain semantics overlays for ramps, high ground, blockers, fog edge.
- Continue FX occlusion budgeting by family: projectile, AoE, channel, aura, status.
- Add art asset replacement contract for models/icons without changing sim keys.

### P3. Accessibility And Localization

Current status:

- Some settings exist: camera, cast mode, key binds, volume step.

Real Dota expectation:

- Players need readable UI under different displays, languages, and color perception.

Gap:

- No HUD scale setting.
- No minimap scale/opacity/side setting.
- No colorblind palette.
- No text size setting.
- Mixed language and encoded-display issues make documentation and UI inspection harder.

Implementation direction:

- Add UI scale and minimap scale settings.
- Add colorblind team palettes.
- Add language resource table instead of inline strings.
- Ensure docs and source comments are UTF-8 clean in tooling.

## Updated Priority Roadmap

### Next Slice A: Selection, Control Groups, And Command Card

Why first:

- It closes the largest Dota1/WC3 identity gap.
- It unlocks summons, courier, illusions, wards, and micro-heavy heroes.
- It makes the existing inspect panel and queue system part of a coherent RTS control surface.

Deliverables:

- Selection state model.
- Left-drag box select.
- Shift-click add/remove.
- Select hero / select courier / select all controlled.
- Control groups with a conflict plan for item hotkeys.
- Compact command-card strip.
- Tests for selection, group binding, command routing, and fog constraints.
- Screenshot: selected hero, selected summon group, inspect enemy, command card visible.

### Next Slice B: Courier And Item Logistics

Why second:

- Shop/backpack/stash systems already exist but need player-facing closure.
- Dota item UX is one of the biggest differentiators from generic action games.

Deliverables:

- Courier HUD button and status.
- Deliver/return/select courier commands.
- Stash/backpack/courier item lanes.
- Quickbuy target item panel.
- Shop search.
- Tests for courier commands and item movement.
- Screenshot: shop open, quickbuy set, courier delivering, stash visible.

### Next Slice C: Cast Preview Model V2

Why third:

- The game already has many abilities and items.
- Better preview/reject feedback improves every hero at once.

Deliverables:

- Shared `TargetPreviewModel`.
- AoE/line/cone/unit/ground/no-target shapes.
- Range and walk-to-cast indicators.
- Rejection reason taxonomy.
- 2D and 3D preview parity.
- Tests for target preview metadata.
- Screenshot set: legal target, wrong team, out of range, AoE ground, line spell.

### Next Slice D: HUD And Minimap Communication

Why fourth:

- The HUD is rich enough that layout and communication quality now matter more than raw feature count.

Deliverables:

- XP bar and status icon pass.
- Minimap danger/retreat/normal pings.
- Alt-click broadcasts for HP/mana/items/abilities/topbar timers.
- Minimap anti-misclick and size/position settings.
- Scoreboard item icon/net worth pass.
- Screenshot set: pings, scoreboard, low HP, selected enemy hero.

### Next Slice E: 3D Real-Play QA Loop

Why fifth:

- The 3D work is now advanced enough to need a repeatable player-camera QA harness.

Deliverables:

- Scripted screenshots for lane, river, base, pit, shop, teamfight.
- Visual budget checks for model size, FX opacity, healthbar overlap, minimap visibility.
- Terrain semantic overlays.
- 3D parity checklist in docs.

## What Not To Prioritize Yet

- Full cosmetic asset replacement before controls are closed.
- More heroes before selection/courier/shop loops are stable.
- More combat mechanics before cast preview and status readability are consistent.
- Exact Dota1 UI art copying. The current original style is acceptable; the missing value is interaction closure.

## Acceptance Standard For Future UX Slices

Every UX slice should answer these questions:

1. Can the player tell what state they are in without reading long text?
2. Can the player predict what the next click or hotkey will do?
3. If the command fails, does the player know why?
4. Does the same action work in 2D and 3D?
5. Does the feature support keyboard-first play?
6. Does the feature have at least one runtime screenshot or scripted smoke check?
7. Does the feature update this roadmap or a summary document?

## Summary

The project has moved beyond a rough prototype. Its biggest remaining UX debt is no longer "basic controls are missing." The issue is that Dota1's RTS control surface is not fully closed:

- Multi-unit selection and control groups are still the top gap.
- Courier/item logistics need a real Dota loop.
- Cast previews need a shared shape/range/reject model.
- Minimap communication and HUD state need a more complete information language.
- 3D readability needs repeatable real-play QA, not only asset-level polish.

The next work should therefore stay on UI and controls, not branch into broad new mechanics.
