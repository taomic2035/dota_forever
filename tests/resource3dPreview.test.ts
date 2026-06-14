import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createResource3DModel } from '../src/render/resource3dFactory';
import { RESOURCE3D_SAMPLE_ASSETS } from '../src/render/resource3dAssets';
import { resourceVfxAudioSmokeForAssets, resourceVfxPlaybackSmokeForModels } from '../src/ui/resource3dPreview';

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
    const smoke = resourceVfxPlaybackSmokeForModels(models);

    expect(smoke.playbackGroups).toBe(55);
    expect(smoke.playbackLayers).toBe(177);
    expect(smoke.lightHints).toBe(55);
    expect(smoke.decals).toBeGreaterThan(20);
    expect(smoke.radiusPlaybackGroups).toBeGreaterThan(10);
    expect(smoke.pathPlaybackGroups).toBe(10);
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
