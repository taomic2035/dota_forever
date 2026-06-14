import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Group } from 'three';
import { buildResource3DUnitModel, resourceAssetForUnit } from '../../src/render3d/resource3dModel';

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

describe('resource3d gameplay unit bridge', () => {
  it('routes real play-route creep poses through the resource runtime unit helper', () => {
    const mapped = resourceAssetForUnit('creepMelee', 0, '近战兵');
    expect(mapped).toMatchObject({ key: 'dawn_melee_creep' });

    const model = buildResource3DUnitModel(mapped!.key, mapped!.scale);
    const resourceRoot = model.root.getObjectByName('resource3d:dawn_melee_creep') as Group;

    expect(resourceRoot).toBeDefined();
    expect(resourceRoot.userData.runtimeUnitAnimated).toBeUndefined();

    model.applyPose({ state: 'attack', t: 0.48, phase: 1.2, progress: 0.52, status: {} });

    expect(resourceRoot.userData.gameplayRuntimeBridge).toMatchObject({
      bridge: 'render3d/resource3dModel',
      runtimeHelper: 'updateResourceRuntimeUnitPresentation',
    });
    expect(resourceRoot.userData.runtimeUnitState).toBe('attack');
    expect(resourceRoot.userData.runtimeUnitAnimated).toBe(true);
    expect(resourceRoot.userData.runtimeUnitAnimatedParts).toBeGreaterThan(0);
    expect(resourceRoot.userData.runtimeUnitAnimatedMaterials).toBeGreaterThan(0);
    expect(resourceRoot.userData.runtimeUnitActionCues).toBeGreaterThan(0);
    expect(resourceRoot.userData.runtimeUnitThreatPulse).toBeGreaterThan(0);
    expect(resourceRoot.userData.runtimeUnitPresentation.baseRootScale).toEqual([1, 1, 1]);
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
    closePath: () => undefined,
    arc: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    bezierCurveTo: () => undefined,
    quadraticCurveTo: () => undefined,
    ellipse: () => undefined,
    save: () => undefined,
    restore: () => undefined,
    translate: () => undefined,
    rotate: () => undefined,
    fill: () => undefined,
    stroke: () => undefined,
  };
  return {
    width: 0,
    height: 0,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
}
