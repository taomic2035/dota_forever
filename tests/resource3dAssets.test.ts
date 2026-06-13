import { describe, expect, it } from 'vitest';
import {
  RESOURCE3D_CATEGORIES,
  RESOURCE3D_SAMPLE_ASSETS,
  RESOURCE3D_TEXTURE_CHANNELS,
} from '../src/render/resource3dAssets';

describe('non-hero 3D resource samples', () => {
  it('covers all first-pass resource categories with around 10 samples each', () => {
    expect(RESOURCE3D_CATEGORIES).toEqual([
      'lane_units',
      'neutral_units',
      'buildings',
      'items',
      'spell_fx',
      'map_props',
    ]);

    for (const category of RESOURCE3D_CATEGORIES) {
      const assets = RESOURCE3D_SAMPLE_ASSETS.filter((asset) => asset.category === category);
      expect(assets.length, category).toBe(10);
    }
  });

  it('keeps every sample renderable as an in-game Three.js resource', () => {
    for (const asset of RESOURCE3D_SAMPLE_ASSETS) {
      expect(asset.key, asset.name).toMatch(/^[a-z0-9_]+$/);
      expect(asset.name, asset.key).toBeTruthy();
      expect(asset.role, asset.key).toBeTruthy();
      expect(asset.parts.length, asset.key).toBeGreaterThanOrEqual(4);
      expect(asset.scale, asset.key).toBeGreaterThan(0);
      expect(asset.textureChannels, asset.key).toEqual(RESOURCE3D_TEXTURE_CHANNELS);
      expect(asset.previewMotion, asset.key).toMatch(/^(idle|pulse|spin|float|impact|ambient)$/);
    }
  });

  it('gives every category readable visual variety', () => {
    for (const category of RESOURCE3D_CATEGORIES) {
      const assets = RESOURCE3D_SAMPLE_ASSETS.filter((asset) => asset.category === category);
      const motifs = new Set(assets.map((asset) => asset.motif));
      const silhouettes = new Set(assets.map((asset) => asset.silhouette));
      const glowing = assets.filter((asset) => asset.parts.some((part) => part.emissive));

      expect(motifs.size, `${category} motifs`).toBeGreaterThanOrEqual(7);
      expect(silhouettes.size, `${category} silhouettes`).toBeGreaterThanOrEqual(8);
      expect(glowing.length, `${category} glow samples`).toBeGreaterThanOrEqual(6);
    }
  });

  it('uses globally unique resource keys', () => {
    const keys = RESOURCE3D_SAMPLE_ASSETS.map((asset) => asset.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
