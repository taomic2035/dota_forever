import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CLASSIC_HERO3D_ASSETS } from '../src/render/hero3dAssets';
import { createHero3DModel, updateHeroRuntimePresentation } from '../src/render/hero3dFactory';
import { heroRuntimePresentationSmokeForModels } from '../src/ui/hero3dPreview';

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

describe('hero3d preview smoke metadata', () => {
  it('summarizes V14 runtime action and surface presentation contracts', () => {
    const models = CLASSIC_HERO3D_ASSETS.map((asset) => createHero3DModel(asset).root);
    for (const model of models) updateHeroRuntimePresentation(model, 'cast_r', 520);

    const smoke = heroRuntimePresentationSmokeForModels(models);

    expect(smoke.runtimeActionRoots).toBe(CLASSIC_HERO3D_ASSETS.length);
    expect(smoke.runtimeSurfaceRoots).toBe(CLASSIC_HERO3D_ASSETS.length);
    expect(smoke.animatedRoots).toBe(CLASSIC_HERO3D_ASSETS.length);
    expect(smoke.actionReactiveParts).toBeGreaterThan(CLASSIC_HERO3D_ASSETS.length * 3);
    expect(smoke.surfaceMaterials).toBeGreaterThan(CLASSIC_HERO3D_ASSETS.length * 10);
    expect(smoke.glintLayers).toBeGreaterThan(CLASSIC_HERO3D_ASSETS.length);
    expect(smoke.actionStates).toMatchObject({ cast: CLASSIC_HERO3D_ASSETS.length });
    expect(smoke.shaderIntents).toMatchObject({
      'hero-armor-rim-sweep': expect.any(Number),
      'hero-arcane-fresnel': expect.any(Number),
      'hero-cloth-breathe': expect.any(Number),
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
    ellipse: () => undefined,
    save: () => undefined,
    restore: () => undefined,
    translate: () => undefined,
    rotate: () => undefined,
    stroke: () => undefined,
  };
  return {
    width: 0,
    height: 0,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
}
