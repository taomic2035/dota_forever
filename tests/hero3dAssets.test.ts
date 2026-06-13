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
      expect(asset.model.parts.length, asset.key).toBeGreaterThanOrEqual(13);
      expect(asset.model.silhouette, asset.key).toBeTruthy();
      expect(asset.model.scale, asset.key).toBeGreaterThan(0);
      expect(asset.textures.map((texture) => texture.channel), asset.key).toEqual(REQUIRED_HERO3D_TEXTURES);
      expect(asset.actions.map((action) => action.name), asset.key).toEqual(REQUIRED_HERO3D_ACTIONS);
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

  it('keeps the top-down silhouette hook unique for each hero', () => {
    const silhouettes = CLASSIC_HERO3D_ASSETS.map((asset) => asset.model.silhouette);
    expect(new Set(silhouettes).size).toBe(CLASSIC_HERO3D_ASSETS.length);
  });
});
