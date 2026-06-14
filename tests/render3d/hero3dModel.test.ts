import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Group } from 'three';
import { buildHero3DUnitModel, hasHero3DAsset } from '../../src/render3d/hero3dModel';

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

describe('hero3d gameplay unit bridge', () => {
  it('routes real play-route poses through the hero runtime presentation helper', () => {
    expect(hasHero3DAsset('rein')).toBe(true);
    const model = buildHero3DUnitModel('rein');
    const heroRoot = model.root.getObjectByName('hero3d:rein') as Group;

    expect(heroRoot).toBeDefined();
    expect(heroRoot.userData.runtimeActionAnimated).toBeUndefined();

    model.applyPose({ state: 'cast', t: 0.52, phase: 0, progress: 0.65, status: {} });

    expect(heroRoot.userData.gameplayRuntimeBridge).toMatchObject({
      runtimeHelper: 'updateHeroRuntimePresentation',
      bridge: 'render3d/hero3dModel',
    });
    expect(heroRoot.userData.runtimeAction.activeAction).toBe('cast_q');
    expect(heroRoot.userData.runtimeActionAnimated).toBe(true);
    expect(heroRoot.userData.runtimeSurfaceAnimated).toBe(true);
    expect(heroRoot.userData.runtimeActionAnimatedParts).toBeGreaterThan(0);
    expect(heroRoot.userData.runtimeSurfaceAnimatedMaterials).toBeGreaterThan(0);
    expect(heroRoot.userData.baseScale).toEqual([1, 1, 1]);
    expect(heroRoot.scale.y).toBeGreaterThan(1);
    expect(heroRoot.scale.y).toBeLessThan(1.2);
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
