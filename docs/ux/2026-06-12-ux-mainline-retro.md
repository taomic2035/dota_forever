# Core UX Mainline Retro

Date: 2026-06-12
Status: continuing under UI and control focus

## Verdict

The work has not drifted away from the UX mainline.

The recent target metadata and cursor semantics work looks like data plumbing on the surface, but it is part of core control UX: when the player presses a hotkey, the game must show what the command can target, whether the current hover is valid, and why a click failed. If preview and confirmation use different rules, the cursor lies and the player loses trust in the controls.

## What Is Already On-Track

- Command mode is now explicit for attack-move, ability targeting, item targeting, stop, hold, and cancel.
- Ability and item pending states have visual feedback instead of silent hidden state.
- Invalid confirms keep the pending mode alive and flash the command slot.
- Unit-target preview now respects team filters such as enemy, ally, ally-or-self, self, and any.
- The semantic cursor now communicates hostile, support, ground, attack, neutral, item, and reject intent.

## Current UX Gap

The next control problem is target kind. Some commands are not simply "enemy" or "ally":

- Midas should not advertise hero or building targets as valid.
- Dark Ritual should not advertise allied heroes or self as valid.
- Devour should not advertise enemy heroes or buildings as valid if the control fantasy is "consume a small unit."

This is still a UI/control problem, not a content detour. The player feels it directly through the mouse cursor, target reticle, click confirmation, and reject message.

## Next Task Stack

1. Target kind filtering: add shared `targetKind` rules and wire preview plus confirmation to the same lookup.
2. Reject reason detail: distinguish wrong team from wrong target kind in click feedback.
3. Quick cast and smart cast settings: let the player choose Dota-like cast confirmation behavior per command family.

## Execution Rule

Each step must include:

- A UX design note before or during implementation.
- A checked implementation plan.
- Red tests before the behavior change where practical.
- Focused verification and screenshot coverage for user-facing control state.
