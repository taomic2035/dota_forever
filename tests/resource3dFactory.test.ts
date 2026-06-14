import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createResource3DModel,
  resourceMaterialProfile,
  resourcePartAnimationUserData,
  updateResourceRuntimeFxReadability,
  updateResourceRuntimeMapPresentation,
  updateResourceRuntimeMotion,
  updateResourceRuntimeSurface,
  updateResourceRuntimeUnitPresentation,
  updateResourceVfxPlayback,
} from '../src/render/resource3dFactory';
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

  it('animates V11 VFX playback layers through windup, impact, linger, and fade phases', () => {
    const asset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'projectile_fireball')!;
    const { root } = createResource3DModel(asset);
    const playback = root.children.find((child) => child.name === `resource3d:v10-vfx-playback:${asset.key}`)!;
    const coreLayer = playback.children.find((child) => child.name === `resource3d:v10-vfx-layer:${asset.key}:core`)!;
    const glowLayer = playback.children.find((child) => child.name === `resource3d:v10-vfx-layer:${asset.key}:glow`)!;

    updateResourceVfxPlayback(root, 0);
    expect(playback.userData).toMatchObject({
      resourceRuntimeVfxPlaybackAnimated: true,
      activePhase: 'windup',
      phaseCursorMs: 0,
    });
    expect(glowLayer.userData.playbackAlpha).toBeGreaterThan(coreLayer.userData.playbackAlpha);

    updateResourceVfxPlayback(root, 260);
    expect(playback.userData.activePhase).toBe('impact');
    expect(coreLayer.userData.playbackAlpha).toBeGreaterThan(glowLayer.userData.playbackAlpha);
    expect(coreLayer.scale.x).toBeGreaterThan(Number(coreLayer.userData.baseScale[0]));

    updateResourceVfxPlayback(root, 840);
    expect(playback.userData.activePhase).toBe('fade');
    expect(coreLayer.userData.playbackAlpha).toBeLessThan(0.5);
  });

  it('animates V11 radius decals and light hints as phase-timed readability cues', () => {
    const asset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'aoe_ground_crack')!;
    const { root } = createResource3DModel(asset);
    const playback = root.children.find((child) => child.name === `resource3d:v10-vfx-playback:${asset.key}`)!;
    const light = playback.children.find((child) => child.name === `resource3d:v10-vfx-light:${asset.key}`)!;
    const decal = playback.children.find((child) => child.name === `resource3d:v10-vfx-decal:${asset.key}`)!;

    updateResourceVfxPlayback(root, 0);
    const windupLightAlpha = Number(light.userData.playbackAlpha);
    const windupDecalAlpha = Number(decal.userData.playbackAlpha);

    updateResourceVfxPlayback(root, 360);
    expect(playback.userData.activePhase).toBe('impact');
    expect(Number(light.userData.playbackAlpha)).toBeGreaterThan(windupLightAlpha);
    expect(Number(decal.userData.playbackAlpha)).toBeGreaterThan(windupDecalAlpha);

    updateResourceVfxPlayback(root, 900);
    expect(playback.userData.activePhase).toBe('fade');
    expect(Number(decal.userData.playbackAlpha)).toBeLessThan(Number(light.userData.playbackAlpha));
  });

  it('creates V12 runtime motion contracts for every resource root', () => {
    for (const asset of RESOURCE3D_SAMPLE_ASSETS) {
      const { root } = createResource3DModel(asset);

      expect(root.userData.runtimeMotion).toMatchObject({
        resourceRuntimeMotion: true,
        motion: asset.previewMotion,
        category: asset.category,
        affectedParts: asset.parts.length,
        actionSlots: asset.production.actionSlots,
      });
      expect(root.userData.runtimeMotion.motionIntensity).toBeGreaterThan(0);
      expect(root.userData.runtimeMotion.motionIntent).toMatch(/idle|pulse|spin|float|impact|ambient/);
    }
  });

  it('animates V12 ambient resource parts without cumulative drift', () => {
    const asset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'prop_tree_green')!;
    const { root } = createResource3DModel(asset);
    const animatedPart = root.children.find((child) => child.userData.resourcePart && child.userData.partKind === 'banner')!;
    const baseY = Number(animatedPart.userData.basePosition[1]);

    updateResourceRuntimeMotion(root, 250);
    const firstSway = Number(animatedPart.userData.runtimeMotionOffsetY);
    expect(root.userData.runtimeMotionAnimated).toBe(true);
    expect(root.userData.runtimeMotionActiveParts).toBeGreaterThan(0);
    expect(animatedPart.userData.runtimeMotionAnimated).toBe(true);
    expect(Math.abs(firstSway)).toBeGreaterThan(0);
    expect(animatedPart.position.y).toBeCloseTo(baseY + firstSway, 2);

    updateResourceRuntimeMotion(root, 250);
    expect(Number(animatedPart.userData.runtimeMotionOffsetY)).toBe(firstSway);
    expect(animatedPart.position.y).toBeCloseTo(baseY + firstSway, 2);
  });

  it('animates V12 impact and spin resources with distinct motion reads', () => {
    const impactAsset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'projectile_basic_melee_arc')!;
    const spinAsset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'item_radiance')!;
    const impact = createResource3DModel(impactAsset).root;
    const spin = createResource3DModel(spinAsset).root;

    updateResourceRuntimeMotion(impact, 320);
    updateResourceRuntimeMotion(spin, 320);

    expect(impact.userData.runtimeMotion.motionIntent).toBe('impact-hit');
    expect(Number(impact.userData.runtimeMotionImpact)).toBeGreaterThan(0);
    expect(impact.scale.x).toBeGreaterThan(Number(impact.userData.runtimeMotion.baseRootScale[0]));
    expect(spin.userData.runtimeMotion.motionIntent).toBe('spin-showcase');
    expect(Math.abs(spin.rotation.y)).toBeGreaterThan(0.05);
  });

  it('creates V13 runtime surface contracts for every resource root', () => {
    for (const asset of RESOURCE3D_SAMPLE_ASSETS) {
      const { root } = createResource3DModel(asset);

      expect(root.userData.runtimeSurface).toMatchObject({
        resourceRuntimeSurface: true,
        category: asset.category,
        textureChannels: asset.textureChannels,
        productionTexturePaths: asset.production.texturePaths,
      });
      expect(root.userData.runtimeSurface.materialCount).toBeGreaterThanOrEqual(asset.parts.length);
      expect(root.userData.runtimeSurface.reactiveMaterials).toBeGreaterThan(0);
      expect(root.userData.runtimeSurface.shaderIntent).toMatch(/rune|metal|cloth|water|stone|shadow|foliage|energy/);
    }
  });

  it('animates V13 resource surface materials without cumulative drift', () => {
    const asset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'item_radiance')!;
    const { root } = createResource3DModel(asset);
    const animatedMaterial = firstRuntimeSurfaceMaterial(root);

    updateResourceRuntimeSurface(root, 420);
    const firstIntensity = Number(animatedMaterial.userData.runtimeSurfaceEmissiveIntensity);
    const firstRoughness = Number(animatedMaterial.userData.runtimeSurfaceRoughness);
    expect(root.userData.runtimeSurfaceAnimated).toBe(true);
    expect(root.userData.runtimeSurfaceAnimatedMaterials).toBeGreaterThan(0);
    expect(root.userData.runtimeSurfaceReactiveMaterials).toBeGreaterThan(0);
    expect(animatedMaterial.userData.runtimeSurfaceAnimated).toBe(true);
    expect(firstIntensity).toBeGreaterThanOrEqual(Number(animatedMaterial.userData.baseEmissiveIntensity));
    expect(firstRoughness).not.toBe(Number(animatedMaterial.userData.baseRoughness));

    updateResourceRuntimeSurface(root, 420);
    expect(Number(animatedMaterial.userData.runtimeSurfaceEmissiveIntensity)).toBe(firstIntensity);
    expect(Number(animatedMaterial.userData.runtimeSurfaceRoughness)).toBe(firstRoughness);
  });

  it('combines V12 motion and V13 surface pulses for Dota-like impact resources', () => {
    const asset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'projectile_fireball')!;
    const { root } = createResource3DModel(asset);

    updateResourceRuntimeMotion(root, 360);
    updateResourceRuntimeSurface(root, 360);

    expect(root.userData.runtimeMotionAnimated).toBe(true);
    expect(root.userData.runtimeSurfaceAnimated).toBe(true);
    expect(Number(root.userData.runtimeSurfacePulse)).toBeGreaterThan(0);
    expect(Number(root.userData.runtimeSurfaceFresnel)).toBeGreaterThan(0);
    expect(root.userData.runtimeSurfaceShaderIntent).toBe('energy-fresnel-pulse');
  });

  it('creates V15 runtime unit presentation contracts for creeps, neutrals, bosses, and support objects', () => {
    const unitAssets = RESOURCE3D_SAMPLE_ASSETS.filter((asset) => asset.laneReadability || asset.wildReadability || asset.supportReadability);

    expect(unitAssets).toHaveLength(50);
    for (const asset of unitAssets) {
      const { root } = createResource3DModel(asset);
      const actionCue = root.children.find((child) => child.name === `resource3d:v15-unit-action-cue:${asset.key}`);

      expect(root.userData.runtimeUnitPresentation).toMatchObject({
        resourceRuntimeUnitPresentation: true,
        key: asset.key,
        category: asset.category,
        unitClass: expect.any(String),
        runtimeHelper: 'updateResourceRuntimeUnitPresentation',
      });
      expect(root.userData.runtimeUnitPresentation.actionStates).toContain('idle');
      expect(root.userData.runtimeUnitPresentation.actionStates).toContain('hit');
      expect(root.userData.runtimeUnitPresentation.actionStates).toContain('death');
      expect(actionCue?.userData).toMatchObject({
        resourceRuntimeUnitActionCue: true,
        unitClass: root.userData.runtimeUnitPresentation.unitClass,
        visualPriority: root.userData.runtimeUnitPresentation.visualPriority,
      });
    }

    const item = createResource3DModel(RESOURCE3D_SAMPLE_ASSETS.find((asset) => asset.key === 'item_radiance')!).root;
    expect(item.userData.runtimeUnitPresentation).toBeUndefined();
  });

  it('animates V15 lane-unit attacks without material or transform drift', () => {
    const asset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'dawn_ranged_creep')!;
    const { root } = createResource3DModel(asset);
    const material = firstRuntimeSurfaceMaterial(root);
    const actionCue = root.children.find((child) => child.name === `resource3d:v15-unit-action-cue:${asset.key}`)!;
    const baseEmissive = Number(material.userData.baseEmissiveIntensity);

    updateResourceRuntimeUnitPresentation(root, 'attack', 360);
    const firstPulse = Number(root.userData.runtimeUnitActionPulse);
    const firstScaleY = root.scale.y;
    const firstCueOpacity = Number(actionCue.userData.unitCueOpacity);
    const firstEmissive = Number(material.userData.runtimeUnitEmissiveIntensity);

    updateResourceRuntimeUnitPresentation(root, 'attack', 360);

    expect(root.userData.runtimeUnitState).toBe('attack');
    expect(root.userData.runtimeUnitAnimated).toBe(true);
    expect(root.userData.runtimeUnitAnimatedParts).toBeGreaterThan(0);
    expect(root.userData.runtimeUnitAnimatedMaterials).toBeGreaterThan(0);
    expect(firstPulse).toBeGreaterThan(0.5);
    expect(firstScaleY).toBeGreaterThan(Number(root.userData.runtimeUnitPresentation.baseRootScale[1]));
    expect(Number(actionCue.userData.unitCueOpacity)).toBe(firstCueOpacity);
    expect(Number(material.userData.runtimeUnitEmissiveIntensity)).toBe(firstEmissive);
    expect(firstEmissive).toBeGreaterThanOrEqual(baseEmissive);
  });

  it('animates V15 support-object expire cues and boss threat pulses distinctly', () => {
    const wardAsset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'ward_observer')!;
    const bossAsset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'boss_pitlord_core')!;
    const ward = createResource3DModel(wardAsset).root;
    const boss = createResource3DModel(bossAsset).root;
    const wardCue = ward.children.find((child) => child.name === `resource3d:v15-unit-action-cue:${wardAsset.key}`)!;
    const bossCue = boss.children.find((child) => child.name === `resource3d:v15-unit-action-cue:${bossAsset.key}`)!;

    updateResourceRuntimeUnitPresentation(ward, 'expire', 900);
    updateResourceRuntimeUnitPresentation(boss, 'hit', 280);

    expect(ward.userData.runtimeUnitState).toBe('expire');
    expect(Number(wardCue.userData.unitCueOpacity)).toBeLessThan(0.55);
    expect(Number(ward.userData.runtimeUnitFade)).toBeGreaterThan(0.2);
    expect(boss.userData.runtimeUnitPresentation.unitClass).toBe('boss-objective');
    expect(boss.userData.runtimeUnitState).toBe('hit');
    expect(Number(boss.userData.runtimeUnitThreatPulse)).toBeGreaterThan(Number(ward.userData.runtimeUnitThreatPulse));
    expect(Number(bossCue.userData.unitCueScale)).toBeGreaterThan(Number(wardCue.userData.unitCueScale));
  });

  it('creates V16 runtime map ambience contracts for terrain, props, and environment FX', () => {
    const mapAssets = RESOURCE3D_SAMPLE_ASSETS.filter((asset) => (
      asset.category === 'terrain_tiles' || asset.category === 'map_props' || asset.category === 'environment_fx'
    ));

    expect(mapAssets).toHaveLength(58);
    for (const asset of mapAssets) {
      const { root } = createResource3DModel(asset);
      const cue = root.children.find((child) => child.name === `resource3d:v16-map-ambience-cue:${asset.key}`);

      expect(root.userData.runtimeMapPresentation).toMatchObject({
        resourceRuntimeMapPresentation: true,
        key: asset.key,
        category: asset.category,
        mapClass: expect.any(String),
        ambienceIntent: expect.any(String),
        runtimeHelper: 'updateResourceRuntimeMapPresentation',
      });
      expect(root.userData.runtimeMapPresentation.biomeIntent).toMatch(/radiant|dire|river|sky|jungle|highground|neutral/);
      expect(cue?.userData).toMatchObject({
        resourceRuntimeMapAmbienceCue: true,
        mapClass: root.userData.runtimeMapPresentation.mapClass,
        ambienceIntent: root.userData.runtimeMapPresentation.ambienceIntent,
      });
    }

    const creep = createResource3DModel(RESOURCE3D_SAMPLE_ASSETS.find((asset) => asset.key === 'dawn_melee_creep')!).root;
    expect(creep.userData.runtimeMapPresentation).toBeUndefined();
  });

  it('animates V16 river and sky ambience without material or cue drift', () => {
    const riverAsset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'terrain_river_water')!;
    const skyAsset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'env_sky_day_dome')!;
    const river = createResource3DModel(riverAsset).root;
    const sky = createResource3DModel(skyAsset).root;
    const riverCue = river.children.find((child) => child.name === `resource3d:v16-map-ambience-cue:${riverAsset.key}`)!;
    const skyCue = sky.children.find((child) => child.name === `resource3d:v16-map-ambience-cue:${skyAsset.key}`)!;
    const riverMaterial = firstRuntimeSurfaceMaterial(river);

    updateResourceRuntimeMapPresentation(river, 640);
    updateResourceRuntimeMapPresentation(sky, 640);
    const firstRiverOpacity = Number(riverCue.userData.mapCueOpacity);
    const firstRiverFlow = Number(river.userData.runtimeMapFlowPulse);
    const firstSkyScale = Number(skyCue.userData.mapCueScale);
    const firstRiverEmissive = Number(riverMaterial.userData.runtimeMapEmissiveIntensity);

    updateResourceRuntimeMapPresentation(river, 640);

    expect(river.userData.runtimeMapPresentation.mapClass).toBe('river-corridor');
    expect(river.userData.runtimeMapAnimated).toBe(true);
    expect(firstRiverFlow).toBeGreaterThan(0);
    expect(Number(riverCue.userData.mapCueOpacity)).toBe(firstRiverOpacity);
    expect(Number(riverMaterial.userData.runtimeMapEmissiveIntensity)).toBe(firstRiverEmissive);
    expect(sky.userData.runtimeMapPresentation.mapClass).toBe('sky-atmosphere');
    expect(firstSkyScale).toBeGreaterThan(1);
  });

  it('animates V16 tree-wall occlusion and highground depth cues distinctly', () => {
    const treeAsset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'prop_tree_green')!;
    const highgroundAsset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'terrain_highground_edge')!;
    const tree = createResource3DModel(treeAsset).root;
    const highground = createResource3DModel(highgroundAsset).root;
    const treeCue = tree.children.find((child) => child.name === `resource3d:v16-map-ambience-cue:${treeAsset.key}`)!;
    const highgroundCue = highground.children.find((child) => child.name === `resource3d:v16-map-ambience-cue:${highgroundAsset.key}`)!;

    updateResourceRuntimeMapPresentation(tree, 820);
    updateResourceRuntimeMapPresentation(highground, 820);

    expect(tree.userData.runtimeMapPresentation.mapClass).toBe('tree-wall');
    expect(Number(tree.userData.runtimeMapOcclusionPulse)).toBeGreaterThan(0);
    expect(Number(treeCue.userData.mapCueOpacity)).toBeGreaterThan(0.05);
    expect(highground.userData.runtimeMapPresentation.mapClass).toBe('highground-edge');
    expect(Number(highground.userData.runtimeMapDepthPulse)).toBeGreaterThan(Number(tree.userData.runtimeMapDepthPulse));
    expect(Number(highgroundCue.userData.mapCueScale)).toBeGreaterThan(Number(treeCue.userData.mapCueScale) * 0.8);
  });

  it('creates V17 combat FX readability contracts for spells, projectiles, AoE, statuses, and targeting reticles', () => {
    const fxAssets = RESOURCE3D_SAMPLE_ASSETS.filter((asset) => (
      asset.category === 'spell_fx'
      || asset.category === 'projectiles'
      || asset.category === 'aoe_indicators'
      || asset.category === 'status_effects'
      || asset.category === 'targeting_reticles'
    ));

    expect(fxAssets).toHaveLength(50);
    for (const asset of fxAssets) {
      const { root } = createResource3DModel(asset);
      const cue = root.children.find((child) => child.name === `resource3d:v17-fx-readability-cue:${asset.key}`);

      expect(root.userData.runtimeFxReadability).toMatchObject({
        resourceRuntimeFxReadability: true,
        key: asset.key,
        category: asset.category,
        fxClass: expect.any(String),
        timingIntent: expect.any(String),
        dangerRead: expect.any(String),
        runtimeHelper: 'updateResourceRuntimeFxReadability',
      });
      expect(root.userData.runtimeFxReadability.readabilityPriority).toBeGreaterThan(0);
      expect(cue?.userData).toMatchObject({
        resourceRuntimeFxReadabilityCue: true,
        fxClass: root.userData.runtimeFxReadability.fxClass,
        dangerRead: root.userData.runtimeFxReadability.dangerRead,
      });
    }

    const tree = createResource3DModel(RESOURCE3D_SAMPLE_ASSETS.find((asset) => asset.key === 'prop_tree_green')!).root;
    expect(tree.userData.runtimeFxReadability).toBeUndefined();
  });

  it('animates V17 projectile paths and AoE warnings without cue or material drift', () => {
    const projectileAsset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'projectile_fireball')!;
    const aoeAsset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'aoe_boss_warning')!;
    const projectile = createResource3DModel(projectileAsset).root;
    const aoe = createResource3DModel(aoeAsset).root;
    const projectileCue = projectile.children.find((child) => child.name === `resource3d:v17-fx-readability-cue:${projectileAsset.key}`)!;
    const aoeCue = aoe.children.find((child) => child.name === `resource3d:v17-fx-readability-cue:${aoeAsset.key}`)!;
    const projectileMaterial = firstRuntimeSurfaceMaterial(projectile);

    updateResourceRuntimeFxReadability(projectile, 520);
    updateResourceRuntimeFxReadability(aoe, 520);
    const projectileOpacity = Number(projectileCue.userData.fxCueOpacity);
    const projectilePathPulse = Number(projectile.userData.runtimeFxPathPulse);
    const projectileEmissive = Number(projectileMaterial.userData.runtimeFxEmissiveIntensity);
    const aoeRadiusPulse = Number(aoe.userData.runtimeFxRadiusPulse);

    updateResourceRuntimeFxReadability(projectile, 520);

    expect(projectile.userData.runtimeFxReadability.fxClass).toBe('projectile-path');
    expect(projectile.userData.runtimeFxAnimated).toBe(true);
    expect(projectilePathPulse).toBeGreaterThan(0);
    expect(Number(projectileCue.userData.fxCueOpacity)).toBe(projectileOpacity);
    expect(Number(projectileMaterial.userData.runtimeFxEmissiveIntensity)).toBe(projectileEmissive);
    expect(aoe.userData.runtimeFxReadability.fxClass).toBe('area-telegraph');
    expect(aoeRadiusPulse).toBeGreaterThan(projectilePathPulse);
    expect(Number(aoeCue.userData.fxCueScale)).toBeGreaterThan(Number(projectileCue.userData.fxCueScale) * 0.8);
  });

  it('animates V17 status and targeting cues with distinct priority reads', () => {
    const statusAsset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'status_stunned')!;
    const targetAsset = RESOURCE3D_SAMPLE_ASSETS.find((item) => item.key === 'target_invalid_cross')!;
    const status = createResource3DModel(statusAsset).root;
    const target = createResource3DModel(targetAsset).root;
    const statusCue = status.children.find((child) => child.name === `resource3d:v17-fx-readability-cue:${statusAsset.key}`)!;
    const targetCue = target.children.find((child) => child.name === `resource3d:v17-fx-readability-cue:${targetAsset.key}`)!;

    updateResourceRuntimeFxReadability(status, 760);
    updateResourceRuntimeFxReadability(target, 760);

    expect(status.userData.runtimeFxReadability.fxClass).toBe('status-aura');
    expect(target.userData.runtimeFxReadability.fxClass).toBe('targeting-reticle');
    expect(target.userData.runtimeFxReadability.dangerRead).toBe('invalid');
    expect(Number(status.userData.runtimeFxStatusPulse)).toBeGreaterThan(0);
    expect(Number(target.userData.runtimeFxTargetPulse)).toBeGreaterThan(0);
    expect(Number(targetCue.userData.fxCueOpacity)).toBeGreaterThan(Number(statusCue.userData.fxCueOpacity) * 0.7);
  });
});

function firstRuntimeSurfaceMaterial(root: ReturnType<typeof createResource3DModel>['root']): { userData: Record<string, unknown> } {
  let material: { userData: Record<string, unknown> } | undefined;
  root.traverse((object) => {
    const candidate = (object as { material?: { userData?: Record<string, unknown> } | Array<{ userData?: Record<string, unknown> }> }).material;
    const first = Array.isArray(candidate) ? candidate[0] : candidate;
    if (!material && first?.userData?.resourceRuntimeSurfaceMaterial) {
      material = first as { userData: Record<string, unknown> };
    }
  });
  if (!material) throw new Error('expected runtime surface material');
  return material;
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
