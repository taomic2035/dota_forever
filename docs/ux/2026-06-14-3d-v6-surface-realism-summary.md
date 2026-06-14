# 3D V6 Surface Realism Summary

Date: 2026-06-14
Status: V6 cross-asset surface realism pass after V5 readability and FX timing

## Research Target

Reference documents:

- `docs/ux/2026-06-13-dota-unit-fx-research-target.md`
- `docs/ux/2026-06-13-dota-map-elements-research-target.md`

Reference sources:

- Dota 2 official heroes page: `https://www.dota2.com/heroes`
- Valve / Steam Support Dota 2 Workshop Character Art Guide: `https://help.steampowered.com/en/faqs/view/0688-7692-4D5A-1935`
- Dota 2 Wandering Waters page: `https://www.dota2.com/wanderingwaters`

Extracted direction:

- game-camera assets need strong silhouettes first, then material contrast;
- readable contact with the ground makes units feel present instead of floating;
- metal, crystal, energy, water, stone, cloth, foliage, and shadow surfaces should not share the same shine profile;
- improvements must stay original and procedural until a real GLB/PBR production pipeline exists.

## Player-Facing Changes

- Added V6 surface realism terms to resource material profiles:
  - `normalIntensity`
  - `rimLightIntensity`
  - `contactShadowOpacity`
  - `wearIntensity`
- Added equivalent hero material surface profiles through `heroMaterialSurfaceProfile(...)`.
- Hero and resource models now get named contact-shadow meshes:
  - `hero3d:v6-contact-shadow:<heroKey>`
  - `resource3d:v6-contact-shadow:<assetKey>`
- Metal, crystal, energy, water, and other rim-heavy materials get named surface glints:
  - `v6-surface-glint:<partName>`
- `MeshStandardMaterial` now consumes the surface profile through:
  - `normalScale`
  - `envMapIntensity`
  - `material.userData.surfaceProfile`
- Preview smoke data now exposes:
  - `window.__hero3dPreview.surfaceRealism`
  - `window.__resource3dPreview.surfaceRealism`

## Runtime Evidence

Hero preview screenshot:

- `docs/screenshots/ux-3d-v6-hero-surface-realism.png`

Resource preview screenshot:

- `docs/screenshots/ux-3d-v6-resource-surface-realism.png`

Smoke data:

```text
Hero preview:
count: 10
contactShadows: 10
glints: 168
rimEligible: 180
Screenshot: docs/screenshots/ux-3d-v6-hero-surface-realism.png
```

```text
Resource preview:
total: 408
contactShadows: 408
glintEligibleParts: 2366
maxContactShadow: 0.42
Screenshot: docs/screenshots/ux-3d-v6-resource-surface-realism.png
```

## Implementation Notes

- `src/render/hero3dFactory.ts`
  - Adds `HeroMaterialSurfaceProfile`.
  - Exports `heroMaterialSurfaceProfile(...)`.
  - Adds hero contact shadow meshes and material glints.
  - Stores `surfaceProfile` on material `userData`.
- `src/render/resource3dFactory.ts`
  - Extends `ResourceMaterialProfile`.
  - Adds resource contact shadow meshes and material glints.
  - Stores `surfaceProfile` on material `userData`.
- `src/ui/hero3dPreview.ts`
  - Exposes V6 hero surface realism smoke data.
- `src/ui/resource3dPreview.ts`
  - Exposes V6 resource surface realism smoke data.
- `tests/hero3dFactory.test.ts`
  - Locks hero surface realism profile terms.
- `tests/resource3dFactory.test.ts`
  - Locks resource surface realism profile terms.

## Verification

```text
npm test -- tests/resource3dFactory.test.ts tests/hero3dFactory.test.ts
2 files passed
5 tests passed
```

```text
npm test -- tests/resource3dFactory.test.ts tests/hero3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts
4 files passed
22 tests passed
```

```text
npm test -- tests/hero3dFactory.test.ts tests/resource3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
10 files passed
51 tests passed
```

```text
npm run build
passed
Vite still reports the existing large chunk warning.
```

```text
Playwright @ http://127.0.0.1:5204/?mode=hero3d-preview
EVAL: {"ok":true,"count":10,"contactShadows":10,"glints":168,"rimEligible":180}
Screenshot: docs/screenshots/ux-3d-v6-hero-surface-realism.png
```

```text
Playwright @ http://127.0.0.1:5204/?mode=resource3d-preview
EVAL: {"ok":true,"total":408,"contactShadows":408,"glintEligibleParts":2366,"maxContactShadow":0.42}
Screenshot: docs/screenshots/ux-3d-v6-resource-surface-realism.png
```

## Remaining UX Debt

- This is still procedural surface realism, not final authored PBR.
- There are no environment maps, real ambient-occlusion textures, baked normal maps, or authored roughness/metalness maps yet.
- Contact shadows are model-local visual grounding meshes; future production assets should replace them with authored shadows or renderer-level contact-shadow shaders.
- Surface glints are simple additive mesh overlays; final assets should use material maps and shader lighting.

## Opus Handoff

### What

Adds a cross-asset V6 surface realism layer for heroes and all resource3d samples.

### Why

The prior V5 work improved silhouette/readability. This pass improves whether assets feel physically present and material-differentiated from the game camera.

### Tradeoff

- Chose procedural contact shadows and mesh glints instead of new external textures.
- Kept changes renderer/preview-side and data-driven.
- Did not touch sim, combat, targeting, pathing, or balance.

### Next Action

Treat `surfaceProfile`, contact-shadow names, and `v6-surface-glint:*` names as interim runtime hooks. When GLB/PBR lands, map these terms to real material/lighting data or retire the procedural fallback per asset family.
