# 3D V5 Hero Readability Summary

Date: 2026-06-14
Status: V5 hero polish continuation after V4 terrain realism

## Research Target

Research target document:

- `docs/ux/2026-06-13-dota-unit-fx-research-target.md`

Live references checked this pass:

- Dota 2 official heroes page: `https://www.dota2.com/heroes`
- Valve / Steam Support Dota 2 Workshop Character Art Guide: `https://help.steampowered.com/en/faqs/view/0688-7692-4D5A-1935`

Extracted direction:

- heroes should read from silhouette, stance, orientation, weapon line, crest/head shape, and spell focus before surface detail;
- ability and combat FX should enhance identity but not bury the hero body;
- each hero needs a first-read contract that can later map to authored GLB/PBR assets;
- current implementation remains original procedural Three.js art and does not copy Dota assets.

## Player-Facing Changes

- Added V5 first-read contracts to the first 10 classic heroes:
  - `primaryRead`
  - `silhouetteAnchors`
  - `pose.stance`
  - `pose.weaponLine`
  - `pose.spellFocus`
  - `pose.profile`
  - `fxPriority`
- Added four visible V5 identity parts to every hero:
  - `v5 <hero> crest read`
  - `v5 <hero> weapon line read`
  - `v5 <hero> rear profile read`
  - `v5 <hero> cast focus read`
- Each V5 identity part is a real model part, not only metadata.
- Hero preview smoke data now exposes `window.__hero3dPreview.readability`.
- Cleaned the previous Three.js material `side: undefined` warning by using explicit `FrontSide` for non-aura materials.

## First-Read Contracts

```text
rein: tower shield plus royal back banner
liya: ice mantle plus floating snow crown
zola: forked lightning crown and storm orb
aili: leaf longbow and quiver feathers
gorm: stone totem back and earth crown slab
grosh: hook chain halo and toxic belly glyph
kai: dual daggers and smoke step crescent
chenblade: crossed twin blades and blade trails
olan: sun halo staff and radiant disc
morphis: abyss book flame and horn circlet
```

## Runtime Evidence

Playwright runtime screenshot:

- `docs/screenshots/ux-3d-v5-hero-readability.png`

Preview smoke data:

```text
Hero count: 10
Readability contracts: 10
Anchors per hero: 6
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v5-hero-readability.png
```

Warnings after this pass:

```text
THREE.Clock deprecated
PCFSoftShadowMap deprecated
WebGL ReadPixels GPU stall during screenshot capture
```

The previous repeated `THREE.Material: parameter 'side' has value of undefined` warning is removed.

## Implementation Notes

- `src/render/hero3dAssets.ts`
  - Adds `Hero3DReadabilitySpec`.
  - Keeps base hero definitions separate from final V5 enriched assets.
  - Adds `v5IdentityParts(...)` so readability contracts have visible model anchors.
  - Adds `readabilityForKey(...)` with unique first-read phrasing for the first 10 heroes.
- `src/render/hero3dFactory.ts`
  - Uses explicit `FrontSide` for non-aura materials.
- `src/ui/hero3dPreview.ts`
  - Exposes V5 readability smoke data for Playwright and Opus inspection.
- `tests/hero3dAssets.test.ts`
  - Locks V5 first-read contracts, anchor mapping, visible V5 identity parts, glow anchors, and FX priority bounds.

## Verification

```text
npm test -- tests/hero3dAssets.test.ts
1 file passed
8 tests passed
```

```text
Playwright @ http://127.0.0.1:5200/?mode=hero3d-preview
Hero count: 10
Readability contracts: 10
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v5-hero-readability.png
```

## Remaining UX Debt

- The first 10 heroes now have stronger procedural first-read contracts, but they are still not final authored GLB/PBR models.
- Runtime animation clips still use generic clip families; future pass can make per-hero attack/cast timing more differentiated.
- Full roster coverage remains incomplete. This pass only improves the existing first 10 classic heroes.
- Lane creeps, neutral creeps, summons/wards, and deeper skill/FX polish remain next in the V5 sequence.

## Opus Handoff

### What

Adds V5 hero readability metadata and visible 3D identity anchors for the existing first 10 classic heroes.

### Why

The heroes already had procedural models, textures, and action clips, but the merge target needs stronger game-camera recognition. This pass converts the Dota-informed visual-language target into concrete first-read contracts and visible model parts.

### Tradeoff

- Chose procedural identity anchors instead of external assets.
- Kept changes visual/data-only.
- Did not touch hero combat rules, ability balance, pathing, or roster order.

### Next Action

Continue to lane creep polish:

1. melee / ranged / siege silhouettes for both teams;
2. faction banners, armor trim, and role-specific movement/attack motion;
3. tests, screenshot evidence, and handoff update.
