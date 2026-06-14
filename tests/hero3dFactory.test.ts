import { describe, expect, it } from 'vitest';
import { heroMaterialSurfaceProfile } from '../src/render/hero3dFactory';

describe('heroMaterialSurfaceProfile', () => {
  it('adds V6 surface realism terms for hero grounding and material glints', () => {
    const metal = heroMaterialSurfaceProfile('metal');
    const cloth = heroMaterialSurfaceProfile('cloth');
    const energy = heroMaterialSurfaceProfile('energy');
    const stone = heroMaterialSurfaceProfile('stone');
    const shadow = heroMaterialSurfaceProfile('shadow');

    expect(metal.rimLightIntensity).toBeGreaterThan(cloth.rimLightIntensity);
    expect(energy.rimLightIntensity).toBeGreaterThan(metal.rimLightIntensity);
    expect(stone.contactShadowOpacity).toBeGreaterThan(energy.contactShadowOpacity);
    expect(shadow.contactShadowOpacity).toBeGreaterThan(cloth.contactShadowOpacity);
    expect(cloth.normalIntensity).toBeGreaterThan(0);
    expect(stone.wearIntensity).toBeGreaterThan(cloth.wearIntensity);
  });
});
