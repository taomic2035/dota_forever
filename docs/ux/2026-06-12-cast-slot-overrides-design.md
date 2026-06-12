# Cast Slot Overrides UX Design

Date: 2026-06-12
Status: active continuation of UI and control focus

## Goal

Let players tune cast behavior per ability and per item slot while keeping the global ability and item cast modes as simple defaults.

## UX Problem

Global normal, quick, and smart cast modes improve the command loop, but mature MOBA control setups are rarely one-size-fits-all. A player may want:

- `Q` as quick cast for a frequent targeted spell.
- `R` as normal cast for a high-risk ultimate.
- Item slot `1` as quick cast for a reaction item.
- The remaining item slots to inherit the global item cast mode.

Without slot overrides, the input system is usable but still too coarse for practiced play.

## Scope

This batch covers:

- Per-ability cast overrides for `Q`, `W`, `E`, and `R`.
- Per-item cast overrides for slots `1` through `6`.
- A compact pause menu control surface for slot-level overrides.
- URL-backed slot overrides for deterministic QA scenarios.
- InputManager resolution that prefers a slot override and falls back to the global mode.

This batch does not add key rebinding, profile import/export, or separate self-cast modifiers.

## Interaction Rules

- Global `Ability` and `Item` modes remain the fallback behavior.
- Each ability or item slot may be `Auto`, `Normal`, `Quick`, or `Smart`.
- `Auto` means the slot inherits the current global mode for that command class.
- Slot controls cycle in this order: `Auto -> Normal -> Quick -> Smart -> Auto`.
- Existing normal-mode behavior remains the default for a fresh player.
- Invalid quick or smart confirms keep pending targeting active, matching the global cast setting behavior.

## Acceptance Criteria

- Pure setting tests prove slot normalization, fallback resolution, and override cycling.
- `InputManager` uses resolved per-slot mode for QWER and item hotkeys.
- Pause menu exposes global modes plus visible QWER and 1-6 slot override controls.
- URL params can force slot overrides for screenshot and regression checks.
- Screenshot validation proves an item slot can quick cast even while the global item mode is normal.
- Focused tests, full tests, and build pass.
