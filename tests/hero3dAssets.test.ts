import { describe, expect, it } from 'vitest';
import {
  CLASSIC_HERO3D_ASSETS,
  REQUIRED_HERO3D_ACTIONS,
  REQUIRED_HERO3D_TEXTURES,
} from '../src/render/hero3dAssets';

describe('classic hero 3D assets', () => {
  it('selects the first 10 classic hero archetypes for the Three.js batch', () => {
    expect(CLASSIC_HERO3D_ASSETS.map((asset) => asset.key)).toEqual([
      'rein',
      'liya',
      'zola',
      'aili',
      'gorm',
      'grosh',
      'kai',
      'chenblade',
      'olan',
      'morphis',
    ]);
  });

  it('defines model, texture, and animation contracts for every hero', () => {
    for (const asset of CLASSIC_HERO3D_ASSETS) {
      expect(asset.model.parts.length, asset.key).toBeGreaterThanOrEqual(18);
      expect(asset.model.silhouette, asset.key).toBeTruthy();
      expect(asset.model.scale, asset.key).toBeGreaterThan(0);
      expect(asset.textures.map((texture) => texture.channel), asset.key).toEqual(REQUIRED_HERO3D_TEXTURES);
      expect(asset.actions.map((action) => action.name), asset.key).toEqual(REQUIRED_HERO3D_ACTIONS);
    }
  });

  it('adds V2 material layers and high-density texture metadata', () => {
    for (const asset of CLASSIC_HERO3D_ASSETS) {
      const materials = new Set(asset.model.parts.map((part) => part.material));
      const detailParts = asset.model.parts.filter((part) => part.detail);

      expect(materials.has('cloth') || materials.has('leather'), `${asset.key} needs soft costume materials`).toBe(true);
      expect(materials.has('metal') || materials.has('crystal') || materials.has('energy'), `${asset.key} needs premium hard/glow materials`).toBe(true);
      expect(detailParts.length, `${asset.key} needs enough engraved/trimmed parts`).toBeGreaterThanOrEqual(8);

      for (const texture of asset.textures) {
        expect(texture.detailLevel, `${asset.key}:${texture.channel} needs V2 detail level`).toBeGreaterThanOrEqual(2);
        expect(texture.overlays.length, `${asset.key}:${texture.channel} needs layered texture overlays`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('includes game-art polish layers on every hero', () => {
    for (const asset of CLASSIC_HERO3D_ASSETS) {
      const kinds = new Set(asset.model.parts.map((part) => part.kind));
      const colors = new Set(asset.model.parts.map((part) => part.color));
      const emissiveParts = asset.model.parts.filter((part) => part.emissive);

      expect(kinds.has('aura'), `${asset.key} needs a gameplay-readable base aura`).toBe(true);
      expect(kinds.has('sigil') || kinds.has('orb'), `${asset.key} needs a spell identity piece`).toBe(true);
      expect(colors.size, `${asset.key} needs layered color/material contrast`).toBeGreaterThanOrEqual(5);
      expect(emissiveParts.length, `${asset.key} needs at least four magical/glow accents`).toBeGreaterThanOrEqual(4);
    }
  });

  it('pushes each hero toward a readable premium selection-screen silhouette', () => {
    for (const asset of CLASSIC_HERO3D_ASSETS) {
      const highAccents = asset.model.parts.filter((part) => part.position[1] >= 2.05);
      const wideAccents = asset.model.parts.filter((part) => Math.abs(part.position[0]) >= 0.7);
      const nonBasePolish = asset.model.parts.filter((part) => part.kind !== 'body' && part.kind !== 'head' && part.kind !== 'aura');

      expect(highAccents.length, `${asset.key} needs crest/halo/head-read accents`).toBeGreaterThanOrEqual(2);
      expect(wideAccents.length, `${asset.key} needs lateral weapon/shoulder silhouette`).toBeGreaterThanOrEqual(4);
      expect(nonBasePolish.length, `${asset.key} needs layered costume and VFX details`).toBeGreaterThanOrEqual(8);
    }
  });

  it('keeps V2 polish pieces from occluding the hero body in gameplay camera', () => {
    for (const asset of CLASSIC_HERO3D_ASSETS) {
      const radius = asset.model.groundRadius;
      for (const part of asset.model.parts) {
        const isVerticalPlate = part.kind === 'cape' || part.kind === 'sigil' || part.kind === 'offhand';
        const frontFacing = part.position[2] <= -0.42;
        const tall = part.scale[2] > 0.58 || part.scale[1] > 0.9;

        expect(
          isVerticalPlate && frontFacing && tall,
          `${asset.key}:${part.name} is too large in front of the silhouette`,
        ).toBe(false);

        if (part.name === 'painted hero plinth') {
          expect(part.scale[0], `${asset.key}:${part.name} is too wide for gameplay camera`).toBeLessThanOrEqual(radius * 1.45);
          expect(part.scale[2], `${asset.key}:${part.name} is too deep for gameplay camera`).toBeLessThanOrEqual(radius * 1.45);
        }
        if (part.name === 'back silhouette plate') {
          expect(part.scale[2], `${asset.key}:${part.name} should read as a trim, not a wall`).toBeLessThanOrEqual(0.46);
        }
      }
    }
  });

  it('keeps the top-down silhouette hook unique for each hero', () => {
    const silhouettes = CLASSIC_HERO3D_ASSETS.map((asset) => asset.model.silhouette);
    expect(new Set(silhouettes).size).toBe(CLASSIC_HERO3D_ASSETS.length);
  });

  it('adds V5 first-read contracts and visible identity anchors for every hero', () => {
    const primaryReads = new Set<string>();

    for (const asset of CLASSIC_HERO3D_ASSETS) {
      const partNames = new Set(asset.model.parts.map((part) => part.name));
      const v5Anchors = asset.model.parts.filter((part) => part.name.startsWith('v5 '));

      expect(asset.readability.primaryRead, `${asset.key} needs a first-read hook`).toBeTruthy();
      expect(primaryReads.has(asset.readability.primaryRead), `${asset.key} primary read must be unique`).toBe(false);
      primaryReads.add(asset.readability.primaryRead);

      expect(asset.readability.silhouetteAnchors.length, `${asset.key} needs enough named silhouette anchors`).toBeGreaterThanOrEqual(5);
      for (const anchor of asset.readability.silhouetteAnchors) {
        expect(partNames.has(anchor), `${asset.key} anchor ${anchor} must map to a real part`).toBe(true);
      }

      expect(asset.readability.pose.stance, `${asset.key} needs a stance read`).toBeTruthy();
      expect(asset.readability.pose.weaponLine, `${asset.key} needs a weapon line read`).toBeTruthy();
      expect(asset.readability.pose.spellFocus, `${asset.key} needs a spell focus read`).toBeTruthy();
      expect(asset.readability.fxPriority, `${asset.key} FX priority should not bury the hero`).toBeGreaterThanOrEqual(0.35);
      expect(asset.readability.fxPriority, `${asset.key} FX priority should not bury the hero`).toBeLessThanOrEqual(0.85);

      expect(v5Anchors.length, `${asset.key} needs visible V5 identity pieces`).toBeGreaterThanOrEqual(4);
      expect(v5Anchors.some((part) => part.position[1] >= 2.2), `${asset.key} needs a head/crest read`).toBe(true);
      expect(v5Anchors.some((part) => Math.abs(part.position[0]) >= asset.model.groundRadius * 0.85), `${asset.key} needs lateral weapon/shoulder read`).toBe(true);
      expect(v5Anchors.some((part) => part.position[2] >= 0.55), `${asset.key} needs rear silhouette read`).toBe(true);
      expect(v5Anchors.filter((part) => part.emissive).length, `${asset.key} needs readable glow anchors`).toBeGreaterThanOrEqual(3);
    }
  });

  it('adds V19 gameplay-camera refinement pieces to fight the paper-box read', () => {
    for (const asset of CLASSIC_HERO3D_ASSETS) {
      const v19Parts = asset.model.parts.filter((part) => part.name.startsWith('v19 '));
      const materials = new Set(v19Parts.map((part) => part.material));
      const details = new Set(v19Parts.map((part) => part.detail));
      const headOrCrest = v19Parts.filter((part) => part.position[1] >= 2.05);
      const torsoLayer = v19Parts.filter((part) => part.position[1] >= 0.86 && part.position[1] <= 1.58 && part.position[2] <= -0.34);
      const weaponOrWideLayer = v19Parts.filter((part) => Math.abs(part.position[0]) >= asset.model.groundRadius * 0.72);

      expect(v19Parts.length, `${asset.key} needs enough gameplay-camera refinement pieces`).toBeGreaterThanOrEqual(6);
      expect(materials.size, `${asset.key} V19 pieces need material contrast`).toBeGreaterThanOrEqual(3);
      expect(details.has('trim') || details.has('engraving'), `${asset.key} needs modeled armor/costume detail`).toBe(true);
      expect(details.has('edgeLight') || details.has('gemSetting'), `${asset.key} needs readable highlight detail`).toBe(true);
      expect(headOrCrest.length, `${asset.key} needs a far-camera head/crest detail`).toBeGreaterThanOrEqual(1);
      expect(torsoLayer.length, `${asset.key} needs layered torso detail, not a single block`).toBeGreaterThanOrEqual(2);
      expect(weaponOrWideLayer.length, `${asset.key} needs wide weapon/shoulder detail for the play camera`).toBeGreaterThanOrEqual(2);
    }
  });
});
