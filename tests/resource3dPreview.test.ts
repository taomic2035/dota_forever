import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createResource3DModel, updateResourceRuntimeFxReadability, updateResourceRuntimeMapPresentation, updateResourceRuntimeMotion, updateResourceRuntimeSurface, updateResourceRuntimeUnitPresentation, updateResourceVfxPlayback } from '../src/render/resource3dFactory';
import { RESOURCE3D_SAMPLE_ASSETS } from '../src/render/resource3dAssets';
import { resourceRuntimeFxReadabilitySmokeForModels, resourceRuntimeMapPresentationSmokeForModels, resourceRuntimeMotionSmokeForModels, resourceRuntimeSurfaceSmokeForModels, resourceRuntimeUnitPresentationSmokeForModels, resourceVfxAudioSmokeForAssets, resourceVfxPlaybackSmokeForModels } from '../src/ui/resource3dPreview';

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

describe('resource3d preview smoke metadata', () => {
  it('summarizes V9 VFX/audio contracts for browser and Opus handoff smoke checks', () => {
    const smoke = resourceVfxAudioSmokeForAssets(RESOURCE3D_SAMPLE_ASSETS);

    expect(smoke.total).toBe(55);
    expect(smoke.byCategory).toMatchObject({
      spell_fx: 10,
      projectiles: 10,
      aoe_indicators: 10,
      environment_fx: 15,
      sound_cue_markers: 10,
    });
    expect(smoke.families.fire).toBeGreaterThan(0);
    expect(smoke.families.ui).toBeGreaterThan(0);
    expect(smoke.dangerShapes.path).toBeGreaterThan(0);
    expect(smoke.dangerShapes.radius).toBeGreaterThan(0);
    expect(smoke.dangerShapes.ambient).toBeGreaterThan(0);
    expect(smoke.audioCueCount).toBeGreaterThanOrEqual(smoke.total * 2);
    expect(smoke.particleLayerCount).toBeGreaterThan(smoke.total * 2);
    expect(smoke.phaseSynced).toBe(smoke.total);
  });

  it('summarizes V10 visible VFX playback layers from generated runtime models', () => {
    const models = RESOURCE3D_SAMPLE_ASSETS
      .filter((asset) => asset.vfxAudio)
      .map((asset) => createResource3DModel(asset).root);
    for (const model of models) updateResourceVfxPlayback(model, 360);
    const smoke = resourceVfxPlaybackSmokeForModels(models);

    expect(smoke.playbackGroups).toBe(55);
    expect(smoke.playbackLayers).toBe(177);
    expect(smoke.lightHints).toBe(55);
    expect(smoke.decals).toBeGreaterThan(20);
    expect(smoke.animatedPlaybackGroups).toBe(55);
    expect(smoke.animatedLayers).toBeGreaterThan(100);
    expect(smoke.radiusPlaybackGroups).toBeGreaterThan(10);
    expect(smoke.pathPlaybackGroups).toBe(10);
  });

  it('summarizes V12 runtime motion contracts and animated resource parts', () => {
    const models = RESOURCE3D_SAMPLE_ASSETS.map((asset) => createResource3DModel(asset).root);
    for (const model of models) updateResourceRuntimeMotion(model, 420);
    const smoke = resourceRuntimeMotionSmokeForModels(models);

    expect(smoke.runtimeMotionRoots).toBe(RESOURCE3D_SAMPLE_ASSETS.length);
    expect(smoke.animatedRoots).toBe(RESOURCE3D_SAMPLE_ASSETS.length);
    expect(smoke.animatedParts).toBeGreaterThan(RESOURCE3D_SAMPLE_ASSETS.length);
    expect(smoke.motionIntents).toMatchObject({
      'idle-breathe': expect.any(Number),
      'pulse-energy': expect.any(Number),
      'spin-showcase': expect.any(Number),
      'float-hover': expect.any(Number),
      'impact-hit': expect.any(Number),
      'ambient-sway': expect.any(Number),
    });
    expect(smoke.surfaceReactiveParts).toBeGreaterThan(200);
  });

  it('summarizes V13 runtime surface animation contracts and material pulses', () => {
    const models = RESOURCE3D_SAMPLE_ASSETS.map((asset) => createResource3DModel(asset).root);
    for (const model of models) updateResourceRuntimeSurface(model, 420);
    const smoke = resourceRuntimeSurfaceSmokeForModels(models);

    expect(smoke.runtimeSurfaceRoots).toBe(RESOURCE3D_SAMPLE_ASSETS.length);
    expect(smoke.animatedRoots).toBe(RESOURCE3D_SAMPLE_ASSETS.length);
    expect(smoke.animatedMaterials).toBeGreaterThan(RESOURCE3D_SAMPLE_ASSETS.length);
    expect(smoke.reactiveMaterials).toBeGreaterThan(300);
    expect(smoke.glintLayers).toBeGreaterThan(200);
    expect(smoke.shaderIntents).toMatchObject({
      'energy-fresnel-pulse': expect.any(Number),
      'metal-rim-sweep': expect.any(Number),
      'cloth-dye-breathe': expect.any(Number),
    });
  });

  it('summarizes V15 runtime unit presentation for creeps, neutrals, bosses, and support objects', () => {
    const models = RESOURCE3D_SAMPLE_ASSETS.map((asset) => createResource3DModel(asset).root);
    for (const model of models) updateResourceRuntimeUnitPresentation(model, 'attack', 480);
    const smoke = resourceRuntimeUnitPresentationSmokeForModels(models);

    expect(smoke.runtimeUnitRoots).toBe(50);
    expect(smoke.animatedRoots).toBe(50);
    expect(smoke.actionCues).toBe(50);
    expect(smoke.animatedMaterials).toBeGreaterThan(300);
    expect(smoke.unitClasses).toMatchObject({
      'lane-melee': expect.any(Number),
      'lane-ranged': expect.any(Number),
      'wild-ancient': expect.any(Number),
      'boss-objective': expect.any(Number),
      'support-ward': expect.any(Number),
    });
    expect(smoke.actionStates).toMatchObject({ attack: 50 });
    expect(smoke.threatBands.high).toBeGreaterThan(0);
    expect(smoke.threatBands.low).toBeGreaterThan(0);
  });

  it('summarizes V16 runtime map ambience for terrain, props, and environment FX', () => {
    const models = RESOURCE3D_SAMPLE_ASSETS.map((asset) => createResource3DModel(asset).root);
    for (const model of models) updateResourceRuntimeMapPresentation(model, 720);
    const smoke = resourceRuntimeMapPresentationSmokeForModels(models);

    expect(smoke.runtimeMapRoots).toBe(58);
    expect(smoke.animatedRoots).toBe(58);
    expect(smoke.ambienceCues).toBe(58);
    expect(smoke.animatedMaterials).toBeGreaterThan(400);
    expect(smoke.mapClasses).toMatchObject({
      'river-corridor': expect.any(Number),
      'tree-wall': expect.any(Number),
      'grass-flower': expect.any(Number),
      'highground-edge': expect.any(Number),
      'sky-atmosphere': expect.any(Number),
    });
    expect(smoke.ambienceIntents).toMatchObject({
      'river-flow': expect.any(Number),
      'canopy-sway': expect.any(Number),
      'sky-haze': expect.any(Number),
      'ground-dust': expect.any(Number),
    });
    expect(smoke.biomeIntents.river).toBeGreaterThan(0);
    expect(smoke.biomeIntents.sky).toBeGreaterThan(0);
  });

  it('summarizes V17 combat FX readability for spells, projectiles, AoE, statuses, and reticles', () => {
    const models = RESOURCE3D_SAMPLE_ASSETS.map((asset) => createResource3DModel(asset).root);
    for (const model of models) updateResourceRuntimeFxReadability(model, 760);
    const smoke = resourceRuntimeFxReadabilitySmokeForModels(models);

    expect(smoke.runtimeFxRoots).toBe(50);
    expect(smoke.animatedRoots).toBe(50);
    expect(smoke.readabilityCues).toBe(50);
    expect(smoke.animatedMaterials).toBeGreaterThan(400);
    expect(smoke.fxClasses).toMatchObject({
      'spell-burst': expect.any(Number),
      'projectile-path': expect.any(Number),
      'area-telegraph': expect.any(Number),
      'status-aura': expect.any(Number),
      'targeting-reticle': expect.any(Number),
    });
    expect(smoke.timingIntents).toMatchObject({
      'windup-impact-linger': expect.any(Number),
      'travel-impact': expect.any(Number),
      'persistent-aura': expect.any(Number),
      'target-confirm': expect.any(Number),
    });
    expect(smoke.dangerReads.radius).toBeGreaterThan(0);
    expect(smoke.dangerReads.path).toBeGreaterThan(0);
    expect(smoke.dangerReads.invalid).toBeGreaterThan(0);
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
