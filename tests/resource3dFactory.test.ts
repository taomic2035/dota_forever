import { describe, expect, it } from 'vitest';
import { resourceMaterialProfile, resourcePartAnimationUserData } from '../src/render/resource3dFactory';
import { RESOURCE3D_SAMPLE_ASSETS } from '../src/render/resource3dAssets';

describe('resourceMaterialProfile', () => {
  it('gives metal parts lower roughness and meaningful metalness', () => {
    const metal = resourceMaterialProfile('metal', false);
    const cloth = resourceMaterialProfile('cloth', false);

    expect(metal.metalness).toBeGreaterThan(cloth.metalness);
    expect(metal.roughness).toBeLessThan(cloth.roughness);
  });

  it('boosts emissive surfaces for energy and crystal resources', () => {
    const energy = resourceMaterialProfile('energy', true);
    const crystal = resourceMaterialProfile('crystal', true);
    const stone = resourceMaterialProfile('stone', true);

    expect(energy.emissiveIntensity).toBeGreaterThan(stone.emissiveIntensity);
    expect(crystal.emissiveIntensity).toBeGreaterThan(stone.emissiveIntensity);
  });

  it('tags returned resource parts with animation metadata for runtime part motion', () => {
    const asset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'dawn_melee_creep')!;
    const animatedParts = asset.parts.map((part) => {
      const data = resourcePartAnimationUserData(part);
      expect(data.resourcePart).toBe(true);
      expect(data.partName).toBe(part.name);
      return [data.partKind, data.partDetail, data.partMaterial].join(':');
    });

    expect(animatedParts.length).toBe(asset.parts.length);
    expect(animatedParts).toContain('ring:rune:metal');
    expect(animatedParts.some((entry) => entry.includes('sparkCore:crystal'))).toBe(true);
  });
});
