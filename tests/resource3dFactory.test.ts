import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createResource3DModel, resourceMaterialProfile, resourcePartAnimationUserData } from '../src/render/resource3dFactory';
import { RESOURCE3D_SAMPLE_ASSETS } from '../src/render/resource3dAssets';

const originalDocument = globalThis.document;

beforeAll(() => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: (tag: string) => {
        if (tag !== 'canvas') throw new Error(`unsupported test element: ${tag}`);
        return createCanvasStub();
      },
    },
  });
});

afterAll(() => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: originalDocument,
  });
});

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

  it('adds V6 surface realism terms for grounding and material glints', () => {
    const metal = resourceMaterialProfile('metal', false);
    const cloth = resourceMaterialProfile('cloth', false);
    const energy = resourceMaterialProfile('energy', true);
    const stone = resourceMaterialProfile('stone', false);

    expect(metal.rimLightIntensity).toBeGreaterThan(cloth.rimLightIntensity);
    expect(energy.rimLightIntensity).toBeGreaterThan(metal.rimLightIntensity);
    expect(stone.contactShadowOpacity).toBeGreaterThan(energy.contactShadowOpacity);
    expect(cloth.normalIntensity).toBeGreaterThan(0);
    expect(stone.wearIntensity).toBeGreaterThan(cloth.wearIntensity);
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

  it('consumes V7 placement and production metadata on runtime resource roots', () => {
    const asset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'prop_tree_green')!;
    const { root } = createResource3DModel(asset);
    const footprint = root.children.find((child) => child.name === `resource3d:v8-footprint:${asset.key}`);
    const lodAnchor = root.children.find((child) => child.name === `resource3d:v8-lod-anchor:${asset.key}`);

    expect(root.userData.placement).toMatchObject(asset.placement);
    expect(root.userData.lod).toMatchObject(asset.lod);
    expect(root.userData.production).toMatchObject(asset.production);
    expect(root.userData.runtimeIntegration).toMatchObject({
      resourceRuntime: true,
      placementLayer: 'prop',
      blocker: true,
      visionBlocker: true,
      heightLevel: 'lowground',
      productionModelPath: asset.production.modelPath,
    });
    expect(footprint?.userData).toMatchObject({
      resourceRuntimeFootprint: true,
      placementLayer: 'prop',
      blocker: true,
      visionBlocker: true,
    });
    expect(footprint?.scale.x).toBeCloseTo(asset.placement.footprintRadius);
    expect(lodAnchor?.userData).toMatchObject({
      resourceRuntimeLOD: true,
      lodNear: asset.lod.near,
      lodFar: asset.lod.far,
      productionModelPath: asset.production.modelPath,
    });
  });

  it('maps river terrain placement into runtime footprints without turning it into a blocker', () => {
    const asset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'terrain_river_water')!;
    const { root } = createResource3DModel(asset);
    const footprint = root.children.find((child) => child.name === `resource3d:v8-footprint:${asset.key}`);

    expect(root.userData.runtimeIntegration).toMatchObject({
      placementLayer: 'terrain',
      walkable: false,
      blocker: false,
      river: true,
      heightLevel: 'river',
    });
    expect(footprint?.userData).toMatchObject({
      resourceRuntimeFootprint: true,
      walkable: false,
      blocker: false,
      river: true,
      heightLevel: 'river',
    });
  });

  it('consumes V9 VFX/audio contracts on runtime resource roots', () => {
    const asset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'projectile_fireball')!;
    const { root } = createResource3DModel(asset);
    const syncAnchor = root.children.find((child) => child.name === `resource3d:v9-vfx-audio-sync:${asset.key}`);

    expect(root.userData.vfxAudio).toMatchObject(asset.vfxAudio!);
    expect(root.userData.runtimeVfxAudio).toMatchObject({
      resourceRuntimeVfxAudio: true,
      family: 'fire',
      dangerShape: 'path',
      particleLayers: asset.vfxAudio!.particleLayers.length,
      audioCues: asset.vfxAudio!.audioCues.length,
    });
    expect(syncAnchor?.userData).toMatchObject({
      resourceRuntimeVfxAudioAnchor: true,
      family: 'fire',
      dangerShape: 'path',
      phaseCount: 4,
      firstAudioCue: 'projectile_fireball:cast',
      productionAudioPath: asset.vfxAudio!.audioCues[0].assetPath,
    });
  });

  it('builds V10 visible playback layers for VFX/audio resource contracts', () => {
    const asset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'projectile_fireball')!;
    const { root } = createResource3DModel(asset);
    const playback = root.children.find((child) => child.name === `resource3d:v10-vfx-playback:${asset.key}`);
    const layers = playback?.children.filter((child) => child.name.startsWith(`resource3d:v10-vfx-layer:${asset.key}:`)) ?? [];

    expect(root.userData.runtimeVfxPlayback).toMatchObject({
      resourceRuntimeVfxPlayback: true,
      family: 'fire',
      dangerShape: 'path',
      visualLayers: asset.vfxAudio!.particleLayers.length,
      phaseNames: ['windup', 'impact', 'linger', 'fade'],
      hasAudioTimeline: true,
    });
    expect(playback?.userData).toMatchObject({
      resourceRuntimeVfxPlaybackRoot: true,
      family: 'fire',
      dangerShape: 'path',
      phaseTimelineMs: [0, 260, 520, 840],
    });
    expect(layers.length).toBe(asset.vfxAudio!.particleLayers.length);
    expect(layers.map((layer) => layer.userData.role)).toEqual(asset.vfxAudio!.particleLayers.map((layer) => layer.role));
    expect(layers.every((layer) => String(layer.userData.textureAtlas).includes('/fire/'))).toBe(true);
  });

  it('adds V10 ground decal and light hints for radius-shaped AoE playback', () => {
    const asset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'aoe_ground_crack')!;
    const { root } = createResource3DModel(asset);
    const playback = root.children.find((child) => child.name === `resource3d:v10-vfx-playback:${asset.key}`);
    const decal = playback?.children.find((child) => child.name === `resource3d:v10-vfx-decal:${asset.key}`);

    expect(root.userData.runtimeVfxPlayback).toMatchObject({
      resourceRuntimeVfxPlayback: true,
      family: 'earth',
      dangerShape: 'radius',
      decalKind: 'crack',
    });
    expect(playback?.userData).toMatchObject({
      dangerShape: 'radius',
      decalKind: 'crack',
      lightColor: asset.vfxAudio!.light.color,
    });
    expect(Number(playback?.userData.lightRadius)).toBeGreaterThan(3);
    expect(decal?.userData).toMatchObject({
      resourceRuntimeVfxDecal: true,
      decalKind: 'crack',
      lifetimeMs: asset.vfxAudio!.decal.lifetimeMs,
    });
  });
});

function createCanvasStub(): HTMLCanvasElement {
  const gradient = { addColorStop: () => undefined };
  const context = {
    globalAlpha: 1,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    createLinearGradient: () => gradient,
    fillRect: () => undefined,
    strokeRect: () => undefined,
    beginPath: () => undefined,
    arc: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    quadraticCurveTo: () => undefined,
    bezierCurveTo: () => undefined,
    closePath: () => undefined,
    stroke: () => undefined,
    fill: () => undefined,
  };
  return {
    width: 0,
    height: 0,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
}
