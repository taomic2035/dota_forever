# Dota Forever Core UX Design

Date: 2026-06-12
Status: approved direction, ready for implementation planning

## Goal

Upgrade the project from a playable mechanics prototype into a readable, satisfying MOBA experience. The target is not a strict visual copy of DotA 1. The interaction model should still respect the Warcraft III / DotA 1 lineage: right-click move/attack, A-click, QWER spells, command confirmation, bottom information panel, minimap-driven navigation, clear creep last-hit feedback, projectile travel, fog, high-ground readability, and RTS-style camera control.

The visual layer can be more polished than DotA 1. The approved direction is a high-readability fantasy MOBA look: painterly terrain, strong silhouettes, rich but controlled spell effects, and a modernized bottom HUD that remains dense and scan-friendly.

## Visual References

These generated references are direction boards, not final in-game assets:

- `docs/ux/references/ux-target-lane-hud.png`: lane combat, bottom HUD, minimap, selected hero, abilities, inventory, floating gold/damage.
- `docs/ux/references/ux-target-cast-feedback.png`: cast range, line targeting, selected caster, enemy outline, command ping, cooldown overlays.
- `docs/ux/references/ux-target-map-base.png`: high-ground base entrance, tower projectiles, river-to-base transition, fog edge, landmark readability.

Use them to extract visual hierarchy and interaction feedback. Do not treat generated portraits, icons, buildings, or layout details as literal assets.

## Direction Decision

Use a hybrid target:

1. Preserve DotA 1 / WC3 interaction grammar.
2. Use the generated modern fantasy MOBA visual quality as the presentation benchmark.
3. Keep the project independent: no imported Valve, Blizzard, Warcraft, or DotA protected assets in the repository.
4. Favor immediate gameplay readability over decorative fidelity.

## First Milestone: Combat Readability

This milestone owns the first screen feel: the moment a player enters a lane, selects a hero, casts a spell, last-hits a creep, and reads danger.

### HUD

The bottom HUD should become a stable command console, not a floating debug panel.

Required layout:

- Lower-left minimap with terrain silhouette, visible units, hero camera box, ping marker, and shop/pit landmarks.
- Selected hero portrait/glyph block with level, respawn state, and skill point badge.
- Primary stat strip: HP, MP, damage, armor, move speed, K/D/A, last hits, denies, gold.
- Four ability slots with Q/W/E/R, level pips, mana cost, cooldown veil, learn plus, and unavailable/passive states.
- Six inventory slots with hotkeys, charges, cooldowns, active-item targeting states, and stash hint when relevant.
- Top strip with game time, day/night state, team kills, hero deaths, and gold.

HUD must not resize during normal play. Cooldowns, charges, and skill points update inside fixed-size cells.

### Command Feedback

Every player command needs a visible response within the next rendered frame.

Required states:

- Right-click ground: green move pulse at target point.
- Right-click enemy: red attack target bracket plus small impact-ready marker.
- A-click: amber attack-move cursor state until confirmed.
- Stop/Hold: brief hero-local command flash.
- Invalid command: small red reject pulse and no order change.
- Minimap click: camera box jumps or moves immediately; Alt-click creates a team-colored ping.

### Targeting Feedback

QWER should feel deliberate even when quick-cast behavior is used.

Required states:

- No-target spell: immediate self/area pulse.
- Point spell: cast point marker plus range-clamped target point.
- Unit-target spell: target outline, range line if out of range, and command queued/approach indication.
- Line spell: line preview, endpoint marker, and hit-width indicator.
- Area spell: radius circle, center point, and danger tint.
- Cooldown/mana/silence/stun failure: clear HUD slot feedback plus small world reject pulse.

### Combat Readability

The player must be able to parse combat without reading logs.

Required elements:

- Selection circles: player hero green, allied blue/green, enemy red, neutral gray.
- Health bars: creeps small, heroes larger with mana, buildings wider and damage-only unless selected or damaged.
- Floating text: last-hit gold, deny, hero damage, crit/burst emphasis, kill bounty.
- Projectile families: physical arrows/bolts, tower shots, magic bolts, beams, chain lightning, ground cracks, fields.
- Hit confirmation: brief target flash or impact particle on projectile arrival.
- Buff/debuff strip: control states first, hostile debuffs second, buffs third.
- Fog/night overlay must never hide HUD or command feedback.

## Map and World Readability

This is the second UX milestone, but the first milestone should avoid choices that block it.

Future map pass should establish:

- Distinct lane, river, jungle, ramp, high-ground, base, shop, pit, and tower visual languages.
- Tree walls as readable path blockers, not just background texture.
- High ground visible through elevation edge, ramp mouth, shadow, and fog cutoff.
- Base structures with strong silhouette categories: tower, melee barracks, ranged barracks, ancient, fountain, shop.
- Minimap icon language matching the main map hierarchy.

## Unit and Spell Identity

This is the third UX milestone.

The current procedural vector unit system can remain, but it needs a stricter taxonomy:

- Hero classes: tank, melee carry, ranged carry, mage, support, summoner, assassin.
- Creep classes: melee, ranged, siege, super, mega.
- Neutral classes: small beast, large beast, ancient, boss.
- Spell families: fire, frost, lightning, shadow, holy, poison, earth, arcane, blood, nature.

Each family needs a silhouette, palette, animation timing, and projectile/impact grammar. The goal is fast recognition, not one-off decoration.

## Implementation Boundaries

Simulation remains authoritative. UX reads existing state and events:

- `src/engine/input.ts`: command states, pending targeting, cursor modes.
- `src/main.ts`: order routing and invalid command feedback events.
- `src/render/renderer.ts`: selection, targeting overlays, bars, world command pulses.
- `src/render/fx.ts`: command pulses, impact particles, floating text tuning.
- `src/render/fxStyle.ts`: spell family grammar.
- `src/render/minimap.ts`: camera box, pings, landmark icons.
- `src/ui/hud.ts`: fixed console layout, ability/inventory states.
- `src/ui/killfeed.ts`, `src/ui/scoreboard.ts`, `src/ui/shop.ts`: secondary panels should visually align with the HUD console.

Avoid moving gameplay rules into UI or render modules.

## Acceptance Criteria

Manual acceptance:

- In `?mode=play&hero=zola&seed=42&speed=1`, a player can immediately tell where the selected hero is, what command was issued, whether a spell can be cast, what the spell is targeting, and whether a last hit succeeded.
- In a mid-lane fight, projectile source, projectile target, hit moment, damage result, and kill/deny/gold feedback are readable at normal zoom.
- HUD cells never jump or resize when cooldowns, charges, or skill points change.
- Night/fog reduce world visibility without hiding command overlays.
- The look matches the approved generated references more than the old debug/prototype style.

Automated acceptance:

- `npm run typecheck`
- `npm test`
- `npm run build`
- Playwright screenshot for `?mode=play&hero=zola&seed=42&speed=1` after entering lane.
- Playwright screenshot for a cast-targeting state, either via test hook or deterministic input script.

## Summary Protocol

After each UX implementation batch, record:

- What changed in player-facing UX.
- Which reference image or design section it maps to.
- Commands run and their results.
- Screenshots created.
- Remaining UX debt.

This summary can live in commit messages for small batches and in `docs/ux/` for larger passes.
