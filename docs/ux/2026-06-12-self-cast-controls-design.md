# Self-Cast Controls UX Design

Date: 2026-06-12
Status: active continuation of UI and control focus

## Goal

Add an explicit self-cast modifier so players can quickly cast valid unit-target abilities or items on their own hero without moving the cursor onto the hero model.

## UX Problem

The targeting loop is now precise, and cast modes can be tuned globally and per slot. The remaining friction is self-targeting. Defensive buffs, heals, and utility items often need to be used on the player instantly. Requiring the cursor to be exactly over the hero is too slow during combat.

## Scope

This batch covers:

- `Alt + Q/W/E/R` self-cast attempts for valid unit-target abilities.
- `Alt + 1/2/3/4/5/6` self-cast attempts for valid unit-target item actives.
- A shared self-cast target policy.
- Rejection feedback when the command cannot target self.
- Screenshot validation with a self-target item.

This batch does not add double-tap self-cast, key rebinding, or modifier remapping.

## Interaction Rules

- Holding `Alt` while pressing an ability or item hotkey attempts to confirm on the player's hero.
- Self-cast is an explicit confirm and does not enter pending targeting.
- Self-cast ignores the current cursor position.
- Self-cast is only valid when the command target team is explicitly `self`, `allyOrSelf`, or `any`.
- Enemy-only and ally-only commands reject immediately instead of leaving a pending cursor state.
- The existing normal, quick, smart, and per-slot cast modes remain unchanged when `Alt` is not held.

## Acceptance Criteria

- Pure self-cast policy tests prove allowed and rejected target filters.
- `InputManager` detects `Alt` for QWER and item hotkeys.
- Main cast and item confirmation paths can use the hero as a direct target.
- Invalid self-cast shows reject feedback and clears pending command state.
- Screenshot validation proves an item can self-cast with `Alt + hotkey`.
- Focused tests, full tests, and build pass.
