import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D } from 'three';
import { CLASSIC_HERO3D_ASSETS, REQUIRED_HERO3D_ACTIONS } from '../src/render/hero3dAssets';
import { createHero3DModel, heroMaterialSurfaceProfile, updateHeroRuntimePresentation } from '../src/render/hero3dFactory';

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

describe('hero3d runtime presentation', () => {
  it('creates V14 runtime action and surface contracts for every hero root', () => {
    for (const asset of CLASSIC_HERO3D_ASSETS) {
      const { root } = createHero3DModel(asset);

      expect(root.userData.runtimeAction).toMatchObject({
        heroRuntimeAction: true,
        heroKey: asset.key,
        actionNames: [...REQUIRED_HERO3D_ACTIONS],
        runtimeHelper: 'updateHeroRuntimePresentation',
      });
      expect(root.userData.runtimeSurface).toMatchObject({
        heroRuntimeSurface: true,
        heroKey: asset.key,
        materialCount: expect.any(Number),
        shaderIntent: expect.any(String),
      });

      const runtimeParts = root.children.filter((child) => child.userData.heroRuntimePart);
      expect(runtimeParts.length).toBeGreaterThanOrEqual(asset.model.parts.length);

      const taggedMaterials = runtimeSurfaceMaterials(root);
      expect(taggedMaterials.length).toBeGreaterThan(asset.model.parts.length);
      expect(taggedMaterials.every((material) => material.userData.heroRuntimeSurfaceMaterial)).toBe(true);
      expect(taggedMaterials.some((material) => material.userData.heroRuntimeGlintLayer)).toBe(true);
    }
  });

  it('animates hero action posture and material pulses without cumulative drift', () => {
    const { root } = createHero3DModel(CLASSIC_HERO3D_ASSETS.find((asset) => asset.key === 'zola')!);
    const emissiveMaterial = runtimeSurfaceMaterials(root).find(
      (material): material is MeshStandardMaterial =>
        material instanceof MeshStandardMaterial &&
        material.userData.runtimeActionReactive &&
        material.userData.baseEmissiveIntensity > 0,
    );

    expect(emissiveMaterial).toBeDefined();
    const baseScaleY = root.scale.y;
    const baseEmissive = emissiveMaterial!.emissiveIntensity;

    updateHeroRuntimePresentation(root, 'cast_r', 480);
    const firstPulse = root.userData.runtimeActionPulse;
    const firstY = root.position.y;
    const firstScaleY = root.scale.y;
    const firstEmissive = emissiveMaterial!.emissiveIntensity;

    updateHeroRuntimePresentation(root, 'cast_r', 480);

    expect(root.userData.runtimeAction.activeAction).toBe('cast_r');
    expect(root.userData.runtimeActionAnimated).toBe(true);
    expect(root.userData.runtimeActionAnimatedParts).toBeGreaterThan(0);
    expect(root.userData.runtimeSurfaceAnimatedMaterials).toBeGreaterThan(0);
    expect(firstPulse).toBeGreaterThan(0.5);
    expect(firstY).toBeGreaterThan(0);
    expect(firstScaleY).toBeGreaterThan(baseScaleY);
    expect(emissiveMaterial!.emissiveIntensity).toBeCloseTo(firstEmissive, 5);
    expect(firstEmissive).toBeGreaterThan(baseEmissive);
  });

  it('combines invisible, stunned, and death states with readable runtime material changes', () => {
    const { root } = createHero3DModel(CLASSIC_HERO3D_ASSETS.find((asset) => asset.key === 'morphis')!);
    const materials = runtimeSurfaceMaterials(root);
    const translucent = materials.find((material) => material.userData.baseOpacity >= 0.85);

    updateHeroRuntimePresentation(root, 'invisible', 720);
    expect(root.userData.runtimeAction.activeAction).toBe('invisible');
    expect(root.userData.runtimeActionState).toBe('status');
    expect(translucent?.opacity).toBeLessThan(translucent?.userData.baseOpacity ?? 1);

    updateHeroRuntimePresentation(root, 'stunned', 360);
    expect(root.userData.runtimeActionState).toBe('status');
    expect(root.userData.runtimeActionStatusJitter).toBeGreaterThan(0);

    updateHeroRuntimePresentation(root, 'death', 1100);
    expect(root.userData.runtimeActionState).toBe('death');
    expect(root.rotation.x).toBeGreaterThan(0.7);
  });

  it('adds V18 gameplay-camera model quality profiles instead of paper-box hero pieces', () => {
    for (const asset of CLASSIC_HERO3D_ASSETS) {
      const { root } = createHero3DModel(asset);
      const runtimeParts = root.children.filter((child) => child.userData.heroRuntimePart);
      const profiledParts = runtimeParts.filter((child) => child.userData.gameplayGeometryProfile);
      const boxyProfiles = profiledParts.filter((child) => child.userData.gameplayGeometryProfile === 'box-placeholder');
      const silhouetteWeights = new Set(profiledParts.map((child) => child.userData.gameplaySilhouetteWeight));

      expect(root.userData.gameplayModelQuality, asset.key).toMatchObject({
        tunedFor: 'play-3d-default-camera',
        cameraFov: 40,
        defaultZoom: 0.62,
        heroModelScale: 1.5,
        runtimeHelper: 'createHero3DModel',
      });
      expect(root.userData.gameplayModelQuality.pitchRadians, asset.key).toBeCloseTo(Math.PI * 0.31, 5);
      expect(root.userData.gameplayModelQuality.roundedReadableParts, asset.key).toBeGreaterThanOrEqual(asset.model.parts.length);
      expect(profiledParts.length, asset.key).toBeGreaterThanOrEqual(asset.model.parts.length);
      expect(boxyProfiles, `${asset.key} should not ship paper-box gameplay pieces`).toHaveLength(0);
      expect(silhouetteWeights.has('primary'), `${asset.key} needs primary gameplay-camera silhouette parts`).toBe(true);
      expect(silhouetteWeights.has('secondary'), `${asset.key} needs secondary gameplay-camera silhouette parts`).toBe(true);
    }
  });

  it('uses rounded or extruded geometry for Rein shield, cape, and body in gameplay camera', () => {
    const { root } = createHero3DModel(CLASSIC_HERO3D_ASSETS.find((asset) => asset.key === 'rein')!);
    const body = root.children.find((child) => child.userData.partName === 'heavy cuirass')!;
    const shield = root.children.find((child) => child.userData.partName === 'tower shield')!;
    const cape = root.children.find((child) => child.userData.partName === 'royal back banner')!;

    expect(body.userData.gameplayGeometryProfile).toBe('tapered-rounded-body');
    expect(shield.userData.gameplayGeometryProfile).toBe('extruded-beveled-plate');
    expect(cape.userData.gameplayGeometryProfile).toBe('curved-cloth-panel');
    expect(firstMeshGeometryType(body)).toMatch(/Capsule|Cylinder|Lathe/);
    expect(firstMeshGeometryType(shield)).toMatch(/Extrude/);
    expect(firstMeshGeometryType(cape)).toMatch(/Cylinder|Lathe/);
  });

  it('exposes V19 gameplay-camera refinement metadata on real hero roots', () => {
    for (const asset of CLASSIC_HERO3D_ASSETS) {
      const { root } = createHero3DModel(asset);
      const v19Parts = root.children.filter((child) => String(child.userData.partName ?? '').startsWith('v19 '));
      const v19Materials = new Set(v19Parts.map((child) => child.userData.partMaterial));

      expect(root.userData.gameplayModelQuality, asset.key).toMatchObject({
        refinementLayer: 'v19-gameplay-camera-detail',
        refinementLayerParts: expect.any(Number),
        coreMaterialContrastBands: expect.any(Number),
      });
      expect(root.userData.gameplayModelQuality.refinementLayerParts, asset.key).toBeGreaterThanOrEqual(6);
      expect(root.userData.gameplayModelQuality.coreMaterialContrastBands, asset.key).toBeGreaterThanOrEqual(3);
      expect(v19Parts.length, `${asset.key} V19 parts should be in createHero3DModel output`).toBeGreaterThanOrEqual(6);
      expect(v19Materials.size, `${asset.key} V19 runtime parts need material contrast`).toBeGreaterThanOrEqual(3);
    }
  });

  it('exposes V22 play-camera anatomy and finish metadata on real hero roots', () => {
    for (const asset of CLASSIC_HERO3D_ASSETS) {
      const { root } = createHero3DModel(asset);
      const v22Parts = root.children.filter((child) => String(child.userData.partName ?? '').startsWith('v22 '));
      const v22Anatomy = v22Parts.filter((child) => child.userData.playCameraAnatomyRead);
      const depthLayers = new Set(v22Parts.map((child) => child.userData.playCameraDepthLayer));

      expect(root.userData.gameplayModelQuality, asset.key).toMatchObject({
        finishingLayer: 'v22-play-camera-anatomy-and-material-depth',
        finishingLayerParts: expect.any(Number),
        anatomyReadableParts: expect.any(Number),
        playCameraDepthLayers: expect.any(Number),
        materialFinishLayers: expect.any(Number),
      });
      expect(root.userData.gameplayModelQuality.finishingLayerParts, asset.key).toBeGreaterThanOrEqual(9);
      expect(root.userData.gameplayModelQuality.anatomyReadableParts, asset.key).toBeGreaterThanOrEqual(5);
      expect(root.userData.gameplayModelQuality.playCameraDepthLayers, asset.key).toBeGreaterThanOrEqual(4);
      expect(root.userData.gameplayModelQuality.materialFinishLayers, asset.key).toBeGreaterThanOrEqual(4);
      expect(v22Parts.length, `${asset.key} V22 parts should be in createHero3DModel output`).toBeGreaterThanOrEqual(9);
      expect(v22Anatomy.length, `${asset.key} V22 anatomy should be tagged for Opus smoke checks`).toBeGreaterThanOrEqual(5);
      expect(depthLayers.size, `${asset.key} V22 runtime parts need foreground/core/rear depth`).toBeGreaterThanOrEqual(4);
    }
  });
});

function runtimeSurfaceMaterials(root: Object3D): (MeshStandardMaterial | MeshBasicMaterial)[] {
  const materials: (MeshStandardMaterial | MeshBasicMaterial)[] = [];
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const material of list) {
      if (
        (material instanceof MeshStandardMaterial || material instanceof MeshBasicMaterial) &&
        material.userData.heroRuntimeSurfaceMaterial
      ) {
        materials.push(material);
      }
    }
  });
  return materials;
}

function firstMeshGeometryType(root: Object3D): string {
  let type = '';
  root.traverse((obj) => {
    if (!type && obj instanceof Mesh) type = obj.geometry.type;
  });
  return type;
}

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
