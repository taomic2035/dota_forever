import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  FrontSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  RingGeometry,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  TorusGeometry,
} from 'three';
import type {
  Resource3DAssetSpec,
  Resource3DCategory,
  Resource3DMaterialKind,
  Resource3DMotion,
  Resource3DPartKind,
  Resource3DPartSpec,
  Resource3DPlacementLayer,
  Resource3DPlacementSpec,
  Resource3DTextureChannel,
  Resource3DTextureSpec,
  ResourceVfxAudioSpec,
  ResourceVfxParticleLayerSpec,
} from './resource3dAssets';

export interface Resource3DModel {
  root: Group;
  textures: Record<Resource3DTextureChannel, Texture>;
}

export interface ResourceMaterialProfile {
  roughness: number;
  metalness: number;
  emissiveIntensity: number;
  normalIntensity: number;
  rimLightIntensity: number;
  contactShadowOpacity: number;
  wearIntensity: number;
}

export interface ResourcePartAnimationUserData {
  resourcePart: true;
  partName: string;
  partKind: Resource3DPartKind;
  partDetail: Resource3DPartSpec['detail'];
  partMaterial: Resource3DPartSpec['material'];
}

export interface ResourceRuntimeIntegrationUserData {
  resourceRuntime: true;
  placementLayer: Resource3DPlacementLayer;
  walkable: boolean;
  blocker: boolean;
  visionBlocker: boolean;
  river: boolean;
  heightLevel: Resource3DPlacementSpec['heightLevel'];
  footprintRadius: number;
  lodNear: number;
  lodMid: number;
  lodFar: number;
  impostorAfter: number;
  productionModelPath: string;
}

export interface ResourceRuntimeVfxAudioUserData {
  resourceRuntimeVfxAudio: true;
  family: ResourceVfxAudioSpec['family'];
  dangerShape: ResourceVfxAudioSpec['dangerShape'];
  particleLayers: number;
  audioCues: number;
  phaseCount: number;
  firstAudioCue: string;
  firstAudioPath: string;
}

export interface ResourceRuntimeVfxPlaybackUserData {
  resourceRuntimeVfxPlayback: true;
  family: ResourceVfxAudioSpec['family'];
  dangerShape: ResourceVfxAudioSpec['dangerShape'];
  visualLayers: number;
  phaseNames: ResourceVfxAudioSpec['phaseSync'][number]['phase'][];
  phaseTimelineMs: number[];
  hasAudioTimeline: boolean;
  lightColor: string;
  lightRadius: number;
  decalKind: ResourceVfxAudioSpec['decal']['kind'];
  audioCueIds: string[];
  textureAtlases: string[];
}

export interface ResourceRuntimeSurfaceUserData {
  resourceRuntimeSurface: true;
  category: Resource3DCategory;
  shaderIntent:
    | 'energy-fresnel-pulse'
    | 'metal-rim-sweep'
    | 'cloth-dye-breathe'
    | 'water-caustic-flow'
    | 'foliage-leaf-sheen'
    | 'stone-wear-shadow'
    | 'shadow-ink-bloom';
  surfaceIntensity: number;
  materialCount: number;
  reactiveMaterials: number;
  glintLayers: number;
  textureChannels: readonly Resource3DTextureChannel[];
  productionTexturePaths: Record<Resource3DTextureChannel, string>;
}

export interface ResourceRuntimeMotionUserData {
  resourceRuntimeMotion: true;
  category: Resource3DCategory;
  motion: Resource3DMotion;
  motionIntent: 'idle-breathe' | 'pulse-energy' | 'spin-showcase' | 'float-hover' | 'impact-hit' | 'ambient-sway';
  motionIntensity: number;
  affectedParts: number;
  surfaceReactiveParts: number;
  actionSlots: string[];
  baseRootPosition: [number, number, number];
  baseRootRotation: [number, number, number];
  baseRootScale: [number, number, number];
}

export type ResourceRuntimeUnitState = 'idle' | 'move' | 'attack' | 'cast' | 'hit' | 'death' | 'expire';
export type ResourceRuntimeUnitClass =
  | 'lane-melee'
  | 'lane-ranged'
  | 'lane-siege'
  | 'lane-utility'
  | 'wild-fodder'
  | 'wild-leader'
  | 'wild-caster'
  | 'wild-ancient'
  | 'boss-objective'
  | 'support-courier'
  | 'support-summon'
  | 'support-ward'
  | 'support-trap'
  | 'support-illusion'
  | 'support-totem';
export type ResourceRuntimeThreatBand = 'low' | 'medium' | 'high';

export interface ResourceRuntimeUnitPresentationUserData {
  resourceRuntimeUnitPresentation: true;
  key: string;
  category: Resource3DCategory;
  unitClass: ResourceRuntimeUnitClass;
  threatBand: ResourceRuntimeThreatBand;
  visualPriority: number;
  actionStates: ResourceRuntimeUnitState[];
  actionSlots: string[];
  ownerRead?: string;
  attackRead?: string;
  expireCue?: string;
  runtimeHelper: 'updateResourceRuntimeUnitPresentation';
  baseRootPosition: [number, number, number];
  baseRootRotation: [number, number, number];
  baseRootScale: [number, number, number];
}

export type ResourceRuntimeMapClass =
  | 'flat-ground'
  | 'tree-wall'
  | 'grass-flower'
  | 'highground-edge'
  | 'fence-blocker'
  | 'slope-ramp'
  | 'river-corridor'
  | 'sky-atmosphere'
  | 'ambient-fx'
  | 'map-prop';
export type ResourceRuntimeMapBiomeIntent = 'radiant' | 'dire' | 'river' | 'sky' | 'jungle' | 'highground' | 'neutral';
export type ResourceRuntimeMapAmbienceIntent =
  | 'ground-dust'
  | 'canopy-sway'
  | 'grass-bloom'
  | 'highground-shadow'
  | 'fence-depth'
  | 'slope-parallax'
  | 'river-flow'
  | 'sky-haze'
  | 'ambient-particles';

export interface ResourceRuntimeMapPresentationUserData {
  resourceRuntimeMapPresentation: true;
  key: string;
  category: Resource3DCategory;
  mapClass: ResourceRuntimeMapClass;
  biomeIntent: ResourceRuntimeMapBiomeIntent;
  ambienceIntent: ResourceRuntimeMapAmbienceIntent;
  visualPriority: number;
  river: boolean;
  heightLevel: Resource3DPlacementSpec['heightLevel'];
  blocker: boolean;
  visionBlocker: boolean;
  runtimeHelper: 'updateResourceRuntimeMapPresentation';
  baseRootPosition: [number, number, number];
  baseRootRotation: [number, number, number];
  baseRootScale: [number, number, number];
}

export type ResourceRuntimeFxClass =
  | 'spell-burst'
  | 'projectile-path'
  | 'area-telegraph'
  | 'status-aura'
  | 'targeting-reticle';
export type ResourceRuntimeFxTimingIntent =
  | 'windup-impact-linger'
  | 'travel-impact'
  | 'persistent-aura'
  | 'target-confirm';
export type ResourceRuntimeFxDangerRead = 'point' | 'path' | 'radius' | 'unit' | 'self' | 'invalid';

export interface ResourceRuntimeFxReadabilityUserData {
  resourceRuntimeFxReadability: true;
  key: string;
  category: Resource3DCategory;
  fxClass: ResourceRuntimeFxClass;
  timingIntent: ResourceRuntimeFxTimingIntent;
  dangerRead: ResourceRuntimeFxDangerRead;
  readabilityPriority: number;
  runtimeHelper: 'updateResourceRuntimeFxReadability';
  baseRootPosition: [number, number, number];
  baseRootRotation: [number, number, number];
  baseRootScale: [number, number, number];
}

const geometryCache: Record<Resource3DPartKind, BoxGeometry | ConeGeometry | CylinderGeometry | RingGeometry | SphereGeometry | TorusGeometry> = {
  base: new CylinderGeometry(0.5, 0.56, 0.08, 36),
  body: new CylinderGeometry(0.42, 0.56, 1, 8),
  head: new SphereGeometry(0.5, 8, 6),
  weapon: new CylinderGeometry(0.055, 0.075, 1, 8),
  plate: new BoxGeometry(1, 1, 1),
  banner: new BoxGeometry(1, 1, 1),
  ring: new TorusGeometry(0.5, 0.035, 8, 40),
  orb: new SphereGeometry(0.5, 12, 8),
  beam: new CylinderGeometry(0.1, 0.18, 1, 12, 1, true),
  prop: new ConeGeometry(0.48, 1, 7),
};

const contactShadowGeometry = new CylinderGeometry(1, 1, 0.012, 48);
const runtimeFootprintGeometry = new RingGeometry(0.96, 1.08, 56);
const runtimeLodAnchorGeometry = new SphereGeometry(0.055, 8, 6);
const runtimeVfxParticleGeometry = new SphereGeometry(0.14, 10, 6);
const runtimeVfxPathGeometry = new CylinderGeometry(0.035, 0.07, 1.4, 10, 1, true);
const runtimeVfxRadiusGeometry = new RingGeometry(0.48, 0.58, 56);
const runtimeVfxDecalGeometry = new RingGeometry(0.5, 0.68, 64);
const runtimeVfxLightGeometry = new SphereGeometry(0.28, 12, 8);
const runtimeUnitActionCueGeometry = new RingGeometry(0.52, 0.7, 48);
const runtimeMapAmbienceCueGeometry = new RingGeometry(0.7, 0.9, 56);
const runtimeFxReadabilityCueGeometry = new RingGeometry(0.5, 0.72, 56);

export function resourceMaterialProfile(material: Resource3DMaterialKind, hasEmissive: boolean): ResourceMaterialProfile {
  const base: Record<Resource3DMaterialKind, Omit<ResourceMaterialProfile, 'emissiveIntensity'>> = {
    cloth: { roughness: 0.86, metalness: 0.02, normalIntensity: 0.42, rimLightIntensity: 0.16, contactShadowOpacity: 0.28, wearIntensity: 0.14 },
    leather: { roughness: 0.68, metalness: 0.04, normalIntensity: 0.48, rimLightIntensity: 0.2, contactShadowOpacity: 0.32, wearIntensity: 0.26 },
    wood: { roughness: 0.78, metalness: 0.03, normalIntensity: 0.52, rimLightIntensity: 0.18, contactShadowOpacity: 0.34, wearIntensity: 0.32 },
    stone: { roughness: 0.9, metalness: 0.01, normalIntensity: 0.68, rimLightIntensity: 0.12, contactShadowOpacity: 0.42, wearIntensity: 0.44 },
    metal: { roughness: 0.36, metalness: 0.62, normalIntensity: 0.36, rimLightIntensity: 0.62, contactShadowOpacity: 0.3, wearIntensity: 0.34 },
    crystal: { roughness: 0.28, metalness: 0.08, normalIntensity: 0.5, rimLightIntensity: 0.78, contactShadowOpacity: 0.24, wearIntensity: 0.18 },
    energy: { roughness: 0.2, metalness: 0, normalIntensity: 0.28, rimLightIntensity: 0.92, contactShadowOpacity: 0.18, wearIntensity: 0.08 },
    water: { roughness: 0.18, metalness: 0, normalIntensity: 0.4, rimLightIntensity: 0.74, contactShadowOpacity: 0.16, wearIntensity: 0.05 },
    foliage: { roughness: 0.82, metalness: 0.01, normalIntensity: 0.56, rimLightIntensity: 0.18, contactShadowOpacity: 0.22, wearIntensity: 0.12 },
    paper: { roughness: 0.92, metalness: 0, normalIntensity: 0.34, rimLightIntensity: 0.1, contactShadowOpacity: 0.2, wearIntensity: 0.12 },
    shadow: { roughness: 0.74, metalness: 0.04, normalIntensity: 0.5, rimLightIntensity: 0.44, contactShadowOpacity: 0.38, wearIntensity: 0.22 },
  };
  const emissiveBoost: Record<Resource3DMaterialKind, number> = {
    cloth: 0.85,
    leather: 0.8,
    wood: 0.78,
    stone: 0.75,
    metal: 0.96,
    crystal: 1.36,
    energy: 1.68,
    water: 1.24,
    foliage: 0.92,
    paper: 0.82,
    shadow: 1.12,
  };
  return {
    ...base[material],
    emissiveIntensity: hasEmissive ? emissiveBoost[material] : 0,
  };
}

export function createResource3DModel(asset: Resource3DAssetSpec): Resource3DModel {
  const root = new Group();
  root.name = `resource3d:${asset.key}`;
  root.scale.setScalar(asset.scale);
  root.userData = {
    key: asset.key,
    category: asset.category,
    role: asset.role,
    motion: asset.previewMotion,
    silhouette: asset.silhouette,
    laneReadability: asset.laneReadability,
    wildReadability: asset.wildReadability,
    supportReadability: asset.supportReadability,
    placement: asset.placement,
    lod: asset.lod,
    production: asset.production,
    vfxAudio: asset.vfxAudio,
    runtimeIntegration: resourceRuntimeIntegrationUserData(asset),
    runtimeVfxAudio: asset.vfxAudio ? resourceRuntimeVfxAudioUserData(asset.vfxAudio) : undefined,
    runtimeVfxPlayback: asset.vfxAudio ? resourceRuntimeVfxPlaybackUserData(asset.vfxAudio) : undefined,
    runtimeSurface: resourceRuntimeSurfaceUserData(asset),
    runtimeMotion: resourceRuntimeMotionUserData(asset),
    runtimeUnitPresentation: resourceRuntimeUnitPresentationUserData(asset),
    runtimeMapPresentation: resourceRuntimeMapPresentationUserData(asset),
    runtimeFxReadability: resourceRuntimeFxReadabilityUserData(asset),
    surfaceRealism: {
      contactShadow: true,
      contactShadowOpacity: resourceContactShadowOpacity(asset),
      contactShadowRadius: resourceContactShadowRadius(asset),
    },
  };

  const textures = createTextures(asset);
  root.add(createResourceContactShadow(asset));
  if (shouldCreateRuntimeFootprint(asset.placement.placementLayer)) {
    root.add(createRuntimeFootprint(asset));
  }
  root.add(createRuntimeLODAnchor(asset));
  if (asset.vfxAudio) {
    root.add(createRuntimeVfxAudioSyncAnchor(asset));
    root.add(createRuntimeVfxPlaybackGroup(asset));
  }
  if (asset.laneReadability || asset.wildReadability || asset.supportReadability) {
    root.add(createRuntimeUnitActionCue(asset));
  }
  if (asset.category === 'terrain_tiles' || asset.category === 'map_props' || asset.category === 'environment_fx') {
    root.add(createRuntimeMapAmbienceCue(asset));
  }
  if (resourceRuntimeFxReadabilityUserData(asset)) {
    root.add(createRuntimeFxReadabilityCue(asset));
  }
  for (const part of asset.parts) root.add(createPartObject(part, textures));
  return { root, textures };
}

export function resourceRuntimeIntegrationUserData(asset: Resource3DAssetSpec): ResourceRuntimeIntegrationUserData {
  return {
    resourceRuntime: true,
    placementLayer: asset.placement.placementLayer,
    walkable: asset.placement.walkable,
    blocker: asset.placement.blocker,
    visionBlocker: asset.placement.visionBlocker,
    river: asset.placement.river,
    heightLevel: asset.placement.heightLevel,
    footprintRadius: asset.placement.footprintRadius,
    lodNear: asset.lod.near,
    lodMid: asset.lod.mid,
    lodFar: asset.lod.far,
    impostorAfter: asset.lod.impostorAfter,
    productionModelPath: asset.production.modelPath,
  };
}

export function resourceRuntimeVfxAudioUserData(vfxAudio: ResourceVfxAudioSpec): ResourceRuntimeVfxAudioUserData {
  const firstCue = vfxAudio.audioCues[0];
  return {
    resourceRuntimeVfxAudio: true,
    family: vfxAudio.family,
    dangerShape: vfxAudio.dangerShape,
    particleLayers: vfxAudio.particleLayers.length,
    audioCues: vfxAudio.audioCues.length,
    phaseCount: vfxAudio.phaseSync.length,
    firstAudioCue: firstCue?.cueId ?? '',
    firstAudioPath: firstCue?.assetPath ?? '',
  };
}

export function resourceRuntimeVfxPlaybackUserData(vfxAudio: ResourceVfxAudioSpec): ResourceRuntimeVfxPlaybackUserData {
  return {
    resourceRuntimeVfxPlayback: true,
    family: vfxAudio.family,
    dangerShape: vfxAudio.dangerShape,
    visualLayers: vfxAudio.particleLayers.length,
    phaseNames: vfxAudio.phaseSync.map((phase) => phase.phase),
    phaseTimelineMs: vfxAudio.phaseSync.map((phase) => phase.atMs),
    hasAudioTimeline: vfxAudio.audioCues.length > 0,
    lightColor: vfxAudio.light.color,
    lightRadius: vfxAudio.light.radius,
    decalKind: vfxAudio.decal.kind,
    audioCueIds: vfxAudio.audioCues.map((cue) => cue.cueId),
    textureAtlases: vfxAudio.particleLayers.map((layer) => layer.textureAtlas),
  };
}

export function resourceRuntimeSurfaceUserData(asset: Resource3DAssetSpec): ResourceRuntimeSurfaceUserData {
  const profiles = asset.parts.map((part) => resourceMaterialProfile(part.material, !!part.emissive));
  const glintLayers = asset.parts.filter((part, index) => (
    profiles[index].rimLightIntensity >= 0.58
    || Boolean(part.emissive)
    || part.material === 'metal'
    || part.material === 'crystal'
    || part.material === 'energy'
  )).length;
  return {
    resourceRuntimeSurface: true,
    category: asset.category,
    shaderIntent: surfaceShaderIntentFor(asset),
    surfaceIntensity: resourceSurfaceIntensity(asset),
    materialCount: asset.parts.length + glintLayers,
    reactiveMaterials: Math.max(1, asset.parts.length),
    glintLayers,
    textureChannels: asset.textureChannels,
    productionTexturePaths: asset.production.texturePaths,
  };
}

export function resourceRuntimeMotionUserData(asset: Resource3DAssetSpec): ResourceRuntimeMotionUserData {
  return {
    resourceRuntimeMotion: true,
    category: asset.category,
    motion: asset.previewMotion,
    motionIntent: motionIntentFor(asset.previewMotion),
    motionIntensity: resourceMotionIntensity(asset),
    affectedParts: asset.parts.length,
    surfaceReactiveParts: asset.parts.filter((part) => isSurfaceReactivePart(part)).length,
    actionSlots: [...asset.production.actionSlots],
    baseRootPosition: [0, 0, 0],
    baseRootRotation: [0, 0, 0],
    baseRootScale: [asset.scale, asset.scale, asset.scale],
  };
}

export function resourceRuntimeUnitPresentationUserData(asset: Resource3DAssetSpec): ResourceRuntimeUnitPresentationUserData | undefined {
  if (!asset.laneReadability && !asset.wildReadability && !asset.supportReadability) return undefined;
  return {
    resourceRuntimeUnitPresentation: true,
    key: asset.key,
    category: asset.category,
    unitClass: resourceRuntimeUnitClass(asset),
    threatBand: resourceRuntimeThreatBand(asset),
    visualPriority: resourceRuntimeUnitVisualPriority(asset),
    actionStates: ['idle', 'move', 'attack', 'cast', 'hit', 'death', 'expire'],
    actionSlots: [...asset.production.actionSlots],
    ownerRead: asset.supportReadability?.ownerRead,
    attackRead: asset.laneReadability?.attackRead ?? asset.wildReadability?.threatRead,
    expireCue: asset.supportReadability?.expireCue,
    runtimeHelper: 'updateResourceRuntimeUnitPresentation',
    baseRootPosition: [0, 0, 0],
    baseRootRotation: [0, 0, 0],
    baseRootScale: [asset.scale, asset.scale, asset.scale],
  };
}

export function updateResourceRuntimeUnitPresentation(
  root: Object3D,
  actionState: ResourceRuntimeUnitState = 'idle',
  elapsedMs = 0,
): void {
  const runtime = root.userData.runtimeUnitPresentation as ResourceRuntimeUnitPresentationUserData | undefined;
  if (!runtime?.resourceRuntimeUnitPresentation) return;

  const state = runtime.actionStates.includes(actionState) ? actionState : 'idle';
  const t = elapsedMs / 1000;
  const cycle = Math.sin(t * Math.PI * 2.2);
  const wave = 0.5 + Math.sin(t * Math.PI * 1.4 + runtime.visualPriority) * 0.5;
  const progress = ((elapsedMs % 1000) + 1000) % 1000 / 1000;
  const actionPulse = resourceUnitActionPulse(state, progress, wave);
  const fade = state === 'expire' ? clamp(progress * 0.82 + runtime.visualPriority * 0.12, 0, 0.92) : state === 'death' ? clamp(progress * 0.72, 0, 0.9) : 0;
  const threatPulse = round2(actionPulse * resourceThreatMultiplier(runtime.threatBand) * runtime.visualPriority);
  const baseRootPosition = transformTuple(runtime.baseRootPosition, [0, 0, 0]);
  const baseRootRotation = transformTuple(runtime.baseRootRotation, [0, 0, 0]);
  const baseRootScale = scaleTuple(runtime.baseRootScale);
  const rootLift = state === 'attack' || state === 'cast'
    ? actionPulse * 0.08
    : state === 'hit'
      ? -actionPulse * 0.03
      : state === 'expire'
        ? -fade * 0.05
        : wave * 0.025;
  const rootScale = 1 + actionPulse * runtime.visualPriority * (state === 'attack' || state === 'hit' ? 0.14 : 0.06) - fade * 0.16;

  root.position.set(baseRootPosition[0], baseRootPosition[1] + rootLift, baseRootPosition[2]);
  root.rotation.set(
    baseRootRotation[0] + (state === 'death' ? progress * 0.72 : 0),
    baseRootRotation[1] + (state === 'attack' ? -actionPulse * 0.16 : cycle * runtime.visualPriority * 0.018),
    baseRootRotation[2] + (state === 'hit' ? -actionPulse * 0.12 : 0),
  );
  root.scale.set(
    baseRootScale[0] * rootScale,
    baseRootScale[1] * (rootScale + (state === 'attack' || state === 'cast' ? actionPulse * 0.08 : 0)),
    baseRootScale[2] * rootScale,
  );

  let animatedParts = 0;
  let animatedMaterials = 0;
  let actionCues = 0;
  root.traverse((object) => {
    if (object.userData.resourceRuntimeUnitActionCue) {
      updateRuntimeUnitActionCue(object, runtime, state, actionPulse, fade);
      actionCues += 1;
    } else if (object.userData.resourcePart) {
      updateRuntimeUnitPart(object, runtime, state, actionPulse, wave, fade);
      animatedParts += 1;
    }
    const mesh = object as Mesh;
    forEachRuntimeSurfaceMaterial(mesh.material, (material) => {
      if (updateRuntimeUnitMaterial(material, runtime, state, actionPulse, fade)) animatedMaterials += 1;
    });
  });

  Object.assign(root.userData, {
    runtimeUnitAnimated: true,
    runtimeUnitClockMs: Math.round(elapsedMs),
    runtimeUnitState: state,
    runtimeUnitActionPulse: round2(actionPulse),
    runtimeUnitThreatPulse: threatPulse,
    runtimeUnitFade: round2(fade),
    runtimeUnitAnimatedParts: animatedParts,
    runtimeUnitAnimatedMaterials: animatedMaterials,
    runtimeUnitActionCues: actionCues,
  });
}

export function resourceRuntimeMapPresentationUserData(asset: Resource3DAssetSpec): ResourceRuntimeMapPresentationUserData | undefined {
  if (asset.category !== 'terrain_tiles' && asset.category !== 'map_props' && asset.category !== 'environment_fx') return undefined;
  return {
    resourceRuntimeMapPresentation: true,
    key: asset.key,
    category: asset.category,
    mapClass: resourceRuntimeMapClass(asset),
    biomeIntent: resourceRuntimeMapBiomeIntent(asset),
    ambienceIntent: resourceRuntimeMapAmbienceIntent(asset),
    visualPriority: resourceRuntimeMapVisualPriority(asset),
    river: asset.placement.river,
    heightLevel: asset.placement.heightLevel,
    blocker: asset.placement.blocker,
    visionBlocker: asset.placement.visionBlocker,
    runtimeHelper: 'updateResourceRuntimeMapPresentation',
    baseRootPosition: [0, 0, 0],
    baseRootRotation: [0, 0, 0],
    baseRootScale: [asset.scale, asset.scale, asset.scale],
  };
}

export function updateResourceRuntimeMapPresentation(root: Object3D, elapsedMs = 0): void {
  const runtime = root.userData.runtimeMapPresentation as ResourceRuntimeMapPresentationUserData | undefined;
  if (!runtime?.resourceRuntimeMapPresentation) return;

  const t = elapsedMs / 1000;
  const wave = 0.5 + Math.sin(t * Math.PI * 1.2 + runtime.visualPriority) * 0.5;
  const shimmer = 0.5 + Math.sin(t * Math.PI * 2.8 + resourceMapSeed(runtime.key)) * 0.5;
  const flowPulse = runtime.ambienceIntent === 'river-flow' ? 0.42 + shimmer * 0.58 : 0;
  const depthPulse = runtime.mapClass === 'highground-edge' || runtime.mapClass === 'slope-ramp'
    ? 0.36 + wave * 0.46
    : runtime.mapClass === 'fence-blocker'
      ? 0.26 + wave * 0.32
      : 0.08 + wave * 0.18;
  const occlusionPulse = runtime.mapClass === 'tree-wall'
    ? 0.34 + wave * 0.52
    : runtime.visionBlocker
      ? 0.22 + wave * 0.3
      : 0.06 + wave * 0.12;
  const ambientPulse = clamp((flowPulse || wave) * runtime.visualPriority, 0.04, 1.1);
  const baseRootPosition = transformTuple(runtime.baseRootPosition, [0, 0, 0]);
  const baseRootRotation = transformTuple(runtime.baseRootRotation, [0, 0, 0]);
  const baseRootScale = scaleTuple(runtime.baseRootScale);
  const rootLift = runtime.mapClass === 'sky-atmosphere'
    ? wave * runtime.visualPriority * 0.08
    : runtime.mapClass === 'river-corridor'
      ? shimmer * runtime.visualPriority * 0.035
      : 0;
  const rootScale = 1 + ambientPulse * (runtime.mapClass === 'sky-atmosphere' ? 0.04 : 0.018);

  root.position.set(baseRootPosition[0], baseRootPosition[1] + rootLift, baseRootPosition[2]);
  root.rotation.set(
    baseRootRotation[0],
    baseRootRotation[1] + (runtime.mapClass === 'river-corridor' ? shimmer * 0.035 : 0),
    baseRootRotation[2] + (runtime.mapClass === 'tree-wall' || runtime.mapClass === 'grass-flower' ? Math.sin(t * 1.3) * 0.025 : 0),
  );
  root.scale.set(baseRootScale[0] * rootScale, baseRootScale[1] * rootScale, baseRootScale[2] * rootScale);

  let animatedMaterials = 0;
  let ambienceCues = 0;
  root.traverse((object) => {
    if (object.userData.resourceRuntimeMapAmbienceCue) {
      updateRuntimeMapAmbienceCue(object, runtime, ambientPulse, flowPulse, depthPulse, occlusionPulse);
      ambienceCues += 1;
    }
    const mesh = object as Mesh;
    forEachRuntimeSurfaceMaterial(mesh.material, (material) => {
      if (updateRuntimeMapMaterial(material, runtime, ambientPulse, flowPulse, depthPulse, occlusionPulse)) animatedMaterials += 1;
    });
  });

  Object.assign(root.userData, {
    runtimeMapAnimated: true,
    runtimeMapClockMs: Math.round(elapsedMs),
    runtimeMapFlowPulse: round2(flowPulse),
    runtimeMapDepthPulse: round2(depthPulse),
    runtimeMapOcclusionPulse: round2(occlusionPulse),
    runtimeMapAmbientPulse: round2(ambientPulse),
    runtimeMapAnimatedMaterials: animatedMaterials,
    runtimeMapAmbienceCues: ambienceCues,
  });
}

export function resourceRuntimeFxReadabilityUserData(asset: Resource3DAssetSpec): ResourceRuntimeFxReadabilityUserData | undefined {
  if (!isRuntimeFxReadabilityCategory(asset.category)) return undefined;
  return {
    resourceRuntimeFxReadability: true,
    key: asset.key,
    category: asset.category,
    fxClass: resourceRuntimeFxClass(asset),
    timingIntent: resourceRuntimeFxTimingIntent(asset),
    dangerRead: resourceRuntimeFxDangerRead(asset),
    readabilityPriority: resourceRuntimeFxPriority(asset),
    runtimeHelper: 'updateResourceRuntimeFxReadability',
    baseRootPosition: [0, 0, 0],
    baseRootRotation: [0, 0, 0],
    baseRootScale: [asset.scale, asset.scale, asset.scale],
  };
}

export function updateResourceRuntimeFxReadability(root: Object3D, elapsedMs = 0): void {
  const runtime = root.userData.runtimeFxReadability as ResourceRuntimeFxReadabilityUserData | undefined;
  if (!runtime?.resourceRuntimeFxReadability) return;

  const t = elapsedMs / 1000;
  const seed = seededPhase(runtime.key);
  const wave = 0.5 + Math.sin(t * Math.PI * 2.4 + seed) * 0.5;
  const fast = 0.5 + Math.sin(t * Math.PI * 5.1 + seed * 0.7) * 0.5;
  const pathPulse = runtime.fxClass === 'projectile-path' ? 0.38 + fast * 0.62 : runtime.dangerRead === 'path' ? 0.24 + wave * 0.38 : 0;
  const radiusPulse = runtime.fxClass === 'area-telegraph' ? 0.62 + wave * 0.72 : runtime.dangerRead === 'radius' ? 0.36 + wave * 0.44 : 0;
  const statusPulse = runtime.fxClass === 'status-aura' ? 0.34 + fast * 0.52 : 0;
  const targetPulse = runtime.fxClass === 'targeting-reticle' ? 0.42 + wave * 0.58 : 0;
  const burstPulse = runtime.fxClass === 'spell-burst' ? 0.42 + Math.max(wave, fast) * 0.62 : 0;
  const readabilityPulse = clamp((pathPulse || radiusPulse || statusPulse || targetPulse || burstPulse || wave) * runtime.readabilityPriority, 0.05, 1.34);
  const baseRootPosition = transformTuple(runtime.baseRootPosition, [0, 0, 0]);
  const baseRootRotation = transformTuple(runtime.baseRootRotation, [0, 0, 0]);
  const baseRootScale = scaleTuple(runtime.baseRootScale);
  const rootLift = (burstPulse + statusPulse + targetPulse) * 0.035 + pathPulse * 0.02;
  const rootScale = 1 + readabilityPulse * (runtime.fxClass === 'area-telegraph' ? 0.035 : 0.022);

  root.position.set(baseRootPosition[0], baseRootPosition[1] + rootLift, baseRootPosition[2]);
  root.rotation.set(
    baseRootRotation[0],
    baseRootRotation[1] + pathPulse * 0.08 + targetPulse * 0.04,
    baseRootRotation[2] + (runtime.dangerRead === 'invalid' ? Math.sin(t * Math.PI * 7.2) * 0.04 : 0),
  );
  root.scale.set(baseRootScale[0] * rootScale, baseRootScale[1] * rootScale, baseRootScale[2] * rootScale);

  let animatedMaterials = 0;
  let readabilityCues = 0;
  root.traverse((object) => {
    if (object.userData.resourceRuntimeFxReadabilityCue) {
      updateRuntimeFxReadabilityCue(object, runtime, readabilityPulse, pathPulse, radiusPulse, statusPulse, targetPulse, burstPulse);
      readabilityCues += 1;
    }
    const mesh = object as Mesh;
    forEachRuntimeSurfaceMaterial(mesh.material, (material) => {
      if (updateRuntimeFxReadabilityMaterial(material, runtime, readabilityPulse, pathPulse, radiusPulse, statusPulse, targetPulse, burstPulse)) {
        animatedMaterials += 1;
      }
    });
  });

  Object.assign(root.userData, {
    runtimeFxAnimated: true,
    runtimeFxClockMs: Math.round(elapsedMs),
    runtimeFxPathPulse: round2(pathPulse),
    runtimeFxRadiusPulse: round2(radiusPulse),
    runtimeFxStatusPulse: round2(statusPulse),
    runtimeFxTargetPulse: round2(targetPulse),
    runtimeFxBurstPulse: round2(burstPulse),
    runtimeFxReadabilityPulse: round2(readabilityPulse),
    runtimeFxAnimatedMaterials: animatedMaterials,
    runtimeFxReadabilityCues: readabilityCues,
  });
}

export function updateResourceRuntimeSurface(root: Object3D, elapsedMs: number): void {
  const surface = root.userData.runtimeSurface as ResourceRuntimeSurfaceUserData | undefined;
  if (!surface?.resourceRuntimeSurface) return;

  const t = elapsedMs / 1000;
  const motionPulse = Number(root.userData.runtimeMotionSurfacePulse ?? 0.5);
  const impactPulse = Number(root.userData.runtimeMotionImpact ?? 0);
  const surfacePulse = runtimeSurfacePulse(surface.shaderIntent, t, motionPulse, impactPulse);
  const fresnel = clamp(0.12 + surfacePulse * surface.surfaceIntensity * 0.88, 0.08, 1.25);
  let animatedMaterials = 0;
  let reactiveMaterials = 0;
  let glintLayers = 0;

  root.traverse((object) => {
    const mesh = object as Mesh;
    forEachRuntimeSurfaceMaterial(mesh.material, (material) => {
      animatedMaterials += 1;
      if (updateRuntimeSurfaceMaterial(material, surface, surfacePulse, fresnel, t)) reactiveMaterials += 1;
      if (material.userData.runtimeSurfaceGlintLayer) glintLayers += 1;
    });
  });

  Object.assign(root.userData, {
    runtimeSurfaceAnimated: true,
    runtimeSurfaceClockMs: Math.round(elapsedMs),
    runtimeSurfaceAnimatedMaterials: animatedMaterials,
    runtimeSurfaceReactiveMaterials: reactiveMaterials,
    runtimeSurfaceGlintLayers: glintLayers,
    runtimeSurfacePulse: round2(surfacePulse),
    runtimeSurfaceFresnel: round2(fresnel),
    runtimeSurfaceShaderIntent: surface.shaderIntent,
  });
}

export function updateResourceRuntimeMotion(root: Object3D, elapsedMs: number): void {
  const runtime = root.userData.runtimeMotion as ResourceRuntimeMotionUserData | undefined;
  if (!runtime?.resourceRuntimeMotion) return;

  const t = elapsedMs / 1000;
  const intensity = Number(runtime.motionIntensity || 0.1);
  const baseRootPosition = transformTuple(runtime.baseRootPosition, [0, 0, 0]);
  const baseRootRotation = transformTuple(runtime.baseRootRotation, [0, 0, 0]);
  const baseRootScale = scaleTuple(runtime.baseRootScale);
  const cycle = Math.sin(t * Math.PI * 2);
  const slow = Math.sin(t * Math.PI * 1.25);
  const impact = runtime.motionIntent === 'impact-hit' ? Math.max(0, Math.sin(t * Math.PI * 2.7)) : 0;
  const surfacePulse = runtime.motionIntent === 'pulse-energy'
    ? 0.5 + Math.sin(t * Math.PI * 3.2) * 0.5
    : runtime.motionIntent === 'impact-hit'
      ? impact
      : 0.5 + slow * 0.5;

  root.position.set(baseRootPosition[0], baseRootPosition[1], baseRootPosition[2]);
  root.rotation.set(baseRootRotation[0], baseRootRotation[1], baseRootRotation[2]);
  root.scale.set(baseRootScale[0], baseRootScale[1], baseRootScale[2]);

  switch (runtime.motionIntent) {
    case 'pulse-energy': {
      const scale = 1 + surfacePulse * intensity * 0.34;
      root.scale.set(baseRootScale[0] * scale, baseRootScale[1] * scale, baseRootScale[2] * scale);
      break;
    }
    case 'spin-showcase':
      root.rotation.y = baseRootRotation[1] + t * (0.72 + intensity * 1.2);
      root.position.y = baseRootPosition[1] + slow * intensity * 0.08;
      break;
    case 'float-hover':
      root.position.y = baseRootPosition[1] + slow * intensity * 0.42;
      root.rotation.z = baseRootRotation[2] + cycle * intensity * 0.08;
      break;
    case 'impact-hit': {
      root.scale.set(
        baseRootScale[0] * (1 + impact * intensity * 0.42),
        baseRootScale[1] * (1 - impact * intensity * 0.24),
        baseRootScale[2] * (1 + impact * intensity * 0.42),
      );
      break;
    }
    case 'ambient-sway':
      root.position.y = baseRootPosition[1] + slow * intensity * 0.12;
      root.rotation.y = baseRootRotation[1] + cycle * intensity * 0.12;
      break;
    case 'idle-breathe':
    default:
      root.scale.set(
        baseRootScale[0] * (1 + slow * intensity * 0.08),
        baseRootScale[1] * (1 + slow * intensity * 0.12),
        baseRootScale[2] * (1 + slow * intensity * 0.08),
      );
      break;
  }

  let activeParts = 0;
  let reactiveParts = 0;
  root.traverse((object) => {
    if (object.userData.resourcePart) {
      activeParts += 1;
      if (updateRuntimeMotionPart(object, runtime, t, surfacePulse)) reactiveParts += 1;
    } else if (object.name.startsWith('v6-surface-glint:')) {
      reactiveParts += 1;
      updateRuntimeSurfaceGlint(object, surfacePulse);
    }
  });
  Object.assign(root.userData, {
    runtimeMotionAnimated: true,
    runtimeMotionClockMs: Math.round(elapsedMs),
    runtimeMotionActiveParts: activeParts,
    runtimeMotionSurfaceReactiveParts: reactiveParts,
    runtimeMotionImpact: round2(impact),
    runtimeMotionSurfacePulse: round2(surfacePulse),
  });
}

export function updateResourceVfxPlayback(root: Object3D, elapsedMs: number): void {
  const playbackGroups = findVfxPlaybackGroups(root);
  for (const playback of playbackGroups) {
    const timeline = playback.userData.phaseTimelineMs as number[] | undefined;
    const phaseNames = playback.userData.phaseNames as string[] | undefined;
    if (!timeline?.length || !phaseNames?.length) continue;

    const cycleMs = Math.max(1, (timeline[timeline.length - 1] ?? 0) + 420);
    const cursor = ((elapsedMs % cycleMs) + cycleMs) % cycleMs;
    const phaseIndex = activePhaseIndex(timeline, cursor);
    const activePhase = phaseNames[phaseIndex] ?? phaseNames[0] ?? 'windup';
    const nextAt = timeline[phaseIndex + 1] ?? cycleMs;
    const phaseStart = timeline[phaseIndex] ?? 0;
    const phaseProgress = clamp01((cursor - phaseStart) / Math.max(1, nextAt - phaseStart));

    Object.assign(playback.userData, {
      resourceRuntimeVfxPlaybackAnimated: true,
      phaseCursorMs: Math.round(cursor),
      activePhase,
      phaseProgress: round2(phaseProgress),
    });
    for (const child of playback.children) {
      if (child.name.startsWith('resource3d:v10-vfx-layer:')) {
        updateRuntimeVfxLayer(child, activePhase, phaseProgress, cursor);
      } else if (child.name.startsWith('resource3d:v10-vfx-light:')) {
        updateRuntimeVfxLight(child, activePhase, phaseProgress, cursor);
      } else if (child.name.startsWith('resource3d:v10-vfx-decal:')) {
        updateRuntimeVfxDecal(child, activePhase, phaseProgress);
      }
    }
  }
}

function findVfxPlaybackGroups(root: Object3D): Object3D[] {
  const groups: Object3D[] = [];
  root.traverse((object) => {
    if (object.name.startsWith('resource3d:v10-vfx-playback:')) groups.push(object);
  });
  return groups;
}

function activePhaseIndex(timeline: number[], cursor: number): number {
  let active = 0;
  for (let i = 0; i < timeline.length; i++) {
    if (cursor >= timeline[i]) active = i;
  }
  return active;
}

function updateRuntimeVfxLayer(object: Object3D, activePhase: string, phaseProgress: number, cursor: number): void {
  const phaseNames = object.userData.phaseNames as string[] | undefined;
  const active = phaseNames?.includes(activePhase) ?? false;
  const baseOpacity = Number(object.userData.baseOpacity ?? 0.45);
  const role = String(object.userData.role ?? '');
  const sustain = activePhase === 'fade' ? 0.12 : role === 'trail' || role === 'smoke' || role === 'ambient' ? 0.34 : 0.22;
  const alpha = active
    ? baseOpacity * (0.72 + (1 - Math.abs(phaseProgress - 0.45)) * 0.34)
    : baseOpacity * sustain;
  setMeshOpacity(object, clamp(alpha, 0.06, 0.96));

  const baseScale = scaleTuple(object.userData.baseScale);
  const pulse = active ? 1 + 0.2 * Math.sin((cursor / 1000) * Math.PI * 2 + baseScale[0]) + 0.12 * (1 - phaseProgress) : 0.94;
  object.scale.set(baseScale[0] * pulse, baseScale[1] * pulse, baseScale[2] * pulse);
  Object.assign(object.userData, {
    activePhase,
    playbackAlpha: round2(clamp(alpha, 0.06, 0.96)),
    playbackScale: round2(pulse),
  });
}

function updateRuntimeVfxLight(object: Object3D, activePhase: string, phaseProgress: number, cursor: number): void {
  const baseOpacity = Number(object.userData.baseOpacity ?? 0.22);
  const baseScale = scaleTuple(object.userData.baseScale);
  const pulseHz = Number(object.userData.pulseHz ?? 1);
  const phaseBoost = activePhase === 'impact' ? 1 : activePhase === 'linger' ? 0.72 : activePhase === 'windup' ? 0.38 : 0.24;
  const pulse = 0.5 + Math.sin((cursor / 1000) * Math.PI * 2 * pulseHz) * 0.5;
  const alpha = baseOpacity * (phaseBoost + pulse * 0.3) * (activePhase === 'fade' ? 1 - phaseProgress * 0.55 : 1);
  const scale = 1 + phaseBoost * 0.16 + pulse * 0.08;
  setMeshOpacity(object, clamp(alpha, 0.04, 0.58));
  object.scale.set(baseScale[0] * scale, baseScale[1] * scale, baseScale[2] * scale);
  Object.assign(object.userData, {
    activePhase,
    playbackAlpha: round2(clamp(alpha, 0.04, 0.58)),
    playbackScale: round2(scale),
  });
}

function updateRuntimeVfxDecal(object: Object3D, activePhase: string, phaseProgress: number): void {
  const baseOpacity = Number(object.userData.baseOpacity ?? 0.22);
  const baseScale = scaleTuple(object.userData.baseScale);
  const phaseBoost = activePhase === 'impact' ? 1 : activePhase === 'linger' ? 0.78 : activePhase === 'fade' ? 0.24 * (1 - phaseProgress) : 0.18;
  const alpha = baseOpacity * phaseBoost;
  const scale = activePhase === 'impact' ? 1.06 + phaseProgress * 0.18 : activePhase === 'linger' ? 1.16 : 1;
  setMeshOpacity(object, clamp(alpha, 0.02, 0.32));
  object.scale.set(baseScale[0] * scale, baseScale[1] * scale, baseScale[2] * scale);
  Object.assign(object.userData, {
    activePhase,
    playbackAlpha: round2(clamp(alpha, 0.02, 0.32)),
    playbackScale: round2(scale),
  });
}

function updateRuntimeMotionPart(
  object: Object3D,
  runtime: ResourceRuntimeMotionUserData,
  t: number,
  surfacePulse: number,
): boolean {
  const basePosition = transformTuple(object.userData.basePosition, [object.position.x, object.position.y, object.position.z]);
  const baseRotation = transformTuple(object.userData.baseRotation, [object.rotation.x, object.rotation.y, object.rotation.z]);
  const baseScale = scaleTuple(object.userData.baseScale);
  const weight = Number(object.userData.runtimeMotionWeight ?? 0.4);
  const phase = seededPhase(String(object.userData.partName ?? object.name));
  const sway = Math.sin(t * Math.PI * 2 * (0.52 + weight * 0.36) + phase);
  const flutter = Math.sin(t * Math.PI * 2 * (1.25 + weight * 0.72) + phase * 0.7);
  const intentBoost = runtime.motionIntent === 'ambient-sway'
    ? 1.25
    : runtime.motionIntent === 'float-hover'
      ? 1.12
      : runtime.motionIntent === 'impact-hit'
        ? 1.42
        : runtime.motionIntent === 'pulse-energy'
          ? 1.18
          : 1;
  const intensity = runtime.motionIntensity * weight * intentBoost;
  const impactPulse = runtime.motionIntent === 'impact-hit' ? Number(surfacePulse) : 0;
  const surfaceReactive = Boolean(object.userData.runtimeMotionSurfaceReactive);
  const offsetX = sway * intensity * 0.035;
  const offsetY = (flutter * intensity * 0.1) + (runtime.motionIntent === 'float-hover' ? intensity * 0.06 : 0);
  const offsetZ = Math.cos(t * Math.PI * 2 * 0.4 + phase) * intensity * 0.028;
  const twist = sway * intensity * (object.userData.partKind === 'banner' || object.userData.partKind === 'beam' ? 0.24 : 0.12);
  const scalePulse = 1 + surfacePulse * intensity * (surfaceReactive ? 0.18 : 0.06) + impactPulse * 0.08;

  object.position.set(basePosition[0] + offsetX, basePosition[1] + offsetY, basePosition[2] + offsetZ);
  object.rotation.set(baseRotation[0], baseRotation[1] + twist * 0.45, baseRotation[2] + twist);
  object.scale.set(baseScale[0] * scalePulse, baseScale[1] * scalePulse, baseScale[2] * scalePulse);
  Object.assign(object.userData, {
    runtimeMotionAnimated: true,
    runtimeMotionOffsetY: round2(offsetY),
    runtimeMotionRotationZ: round2(twist),
    runtimeMotionScale: round2(scalePulse),
    runtimeMotionIntent: runtime.motionIntent,
  });
  return surfaceReactive;
}

function updateRuntimeSurfaceGlint(object: Object3D, surfacePulse: number): void {
  const baseScale = scaleTuple(object.userData.baseScale);
  const baseOpacity = Number(object.userData.baseOpacity ?? meshOpacity(object) ?? 0.16);
  const scale = 1 + surfacePulse * 0.16;
  object.scale.set(baseScale[0] * scale, baseScale[1] * scale, baseScale[2] * scale);
  setMeshOpacity(object, clamp(baseOpacity * (0.68 + surfacePulse * 0.64), 0.04, 0.38));
  Object.assign(object.userData, {
    runtimeSurfacePulse: round2(surfacePulse),
    runtimeMotionSurfaceReactive: true,
    baseOpacity,
    baseScale: [baseScale[0], baseScale[1], baseScale[2]],
  });
}

function setMeshOpacity(object: Object3D, opacity: number): void {
  const mesh = object as Mesh;
  const material = mesh.material;
  if (Array.isArray(material)) {
    material.forEach((item) => {
      item.transparent = true;
      item.opacity = opacity;
    });
  } else if (material) {
    material.transparent = true;
    material.opacity = opacity;
  }
}

function meshOpacity(object: Object3D): number | undefined {
  const mesh = object as Mesh;
  const material = mesh.material;
  if (Array.isArray(material)) return material[0]?.opacity;
  return material?.opacity;
}

function transformTuple(value: unknown, fallback: [number, number, number]): [number, number, number] {
  if (Array.isArray(value) && value.length === 3) {
    return [
      Number.isFinite(Number(value[0])) ? Number(value[0]) : fallback[0],
      Number.isFinite(Number(value[1])) ? Number(value[1]) : fallback[1],
      Number.isFinite(Number(value[2])) ? Number(value[2]) : fallback[2],
    ];
  }
  return fallback;
}

function scaleTuple(value: unknown): [number, number, number] {
  if (Array.isArray(value) && value.length === 3) {
    return [
      Number(value[0]) || 1,
      Number(value[1]) || 1,
      Number(value[2]) || 1,
    ];
  }
  return [1, 1, 1];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function motionIntentFor(motion: Resource3DMotion): ResourceRuntimeMotionUserData['motionIntent'] {
  switch (motion) {
    case 'pulse': return 'pulse-energy';
    case 'spin': return 'spin-showcase';
    case 'float': return 'float-hover';
    case 'impact': return 'impact-hit';
    case 'ambient': return 'ambient-sway';
    case 'idle':
    default: return 'idle-breathe';
  }
}

function resourceMotionIntensity(asset: Resource3DAssetSpec): number {
  const byMotion: Record<Resource3DMotion, number> = {
    idle: 0.16,
    pulse: 0.28,
    spin: 0.24,
    float: 0.26,
    impact: 0.34,
    ambient: 0.2,
  };
  const layerBoost: Record<Resource3DPlacementLayer, number> = {
    unit: 1.08,
    building: 0.74,
    prop: 0.88,
    terrain: 0.62,
    fx: 1.28,
    projectile: 1.34,
    ui: 0.76,
    marker: 0.94,
  };
  const surfaceBoost = asset.parts.some((part) => isSurfaceReactivePart(part)) ? 1.08 : 1;
  return round2(byMotion[asset.previewMotion] * layerBoost[asset.placement.placementLayer] * surfaceBoost);
}

function motionWeightForPart(part: Resource3DPartSpec): number {
  const byKind: Record<Resource3DPartKind, number> = {
    base: 0.14,
    body: 0.48,
    head: 0.5,
    weapon: 0.72,
    plate: 0.34,
    banner: 0.82,
    ring: 0.66,
    orb: 0.74,
    beam: 0.8,
    prop: 0.58,
  };
  const materialBoost = isSurfaceReactivePart(part) ? 0.14 : part.material === 'cloth' || part.material === 'wood' ? 0.08 : 0;
  return round2(clamp(byKind[part.kind] + materialBoost, 0.12, 0.96));
}

function isSurfaceReactivePart(part: Resource3DPartSpec): boolean {
  return Boolean(part.emissive)
    || part.material === 'energy'
    || part.material === 'crystal'
    || part.material === 'water'
    || part.material === 'metal'
    || part.kind === 'orb'
    || part.kind === 'ring'
    || part.kind === 'beam';
}

function seededPhase(value: string): number {
  let seed = 0;
  for (let i = 0; i < value.length; i++) seed += value.charCodeAt(i) * (i + 1);
  return (seed % 628) / 100;
}

function surfaceShaderIntentFor(asset: Resource3DAssetSpec): ResourceRuntimeSurfaceUserData['shaderIntent'] {
  if (
    asset.placement.placementLayer === 'fx'
    || asset.placement.placementLayer === 'projectile'
    || asset.category === 'spell_fx'
    || asset.category === 'aoe_indicators'
    || asset.category === 'environment_fx'
  ) return 'energy-fresnel-pulse';
  if (asset.parts.some((part) => part.material === 'water') || asset.placement.river) return 'water-caustic-flow';
  if (asset.parts.some((part) => part.material === 'shadow')) return 'shadow-ink-bloom';
  if (asset.category === 'lane_units' || asset.category === 'team_banners' || asset.parts.some((part) => part.kind === 'banner')) return 'cloth-dye-breathe';
  if (asset.category === 'items' || asset.category === 'item_components' || asset.category === 'consumables' || asset.parts.some((part) => part.material === 'metal')) return 'metal-rim-sweep';
  if (asset.parts.some((part) => part.material === 'foliage')) return 'foliage-leaf-sheen';
  if (asset.category === 'buildings' || asset.category === 'terrain_tiles' || asset.parts.some((part) => part.material === 'stone')) return 'stone-wear-shadow';
  if (asset.parts.some((part) => part.material === 'energy' || part.material === 'crystal')) return 'energy-fresnel-pulse';
  return 'stone-wear-shadow';
}

function resourceSurfaceIntensity(asset: Resource3DAssetSpec): number {
  const byIntent: Record<ResourceRuntimeSurfaceUserData['shaderIntent'], number> = {
    'energy-fresnel-pulse': 0.74,
    'metal-rim-sweep': 0.52,
    'cloth-dye-breathe': 0.34,
    'water-caustic-flow': 0.58,
    'foliage-leaf-sheen': 0.3,
    'stone-wear-shadow': 0.26,
    'shadow-ink-bloom': 0.46,
  };
  const intent = surfaceShaderIntentFor(asset);
  const motionBoost = asset.previewMotion === 'pulse' || asset.previewMotion === 'impact'
    ? 1.18
    : asset.previewMotion === 'ambient'
      ? 0.84
      : 1;
  return round2(byIntent[intent] * motionBoost);
}

function resourceRuntimeUnitClass(asset: Resource3DAssetSpec): ResourceRuntimeUnitClass {
  const laneRole = asset.laneReadability?.roleClass;
  if (laneRole === 'melee') return 'lane-melee';
  if (laneRole === 'ranged' || laneRole === 'scout') return 'lane-ranged';
  if (laneRole === 'siege' || laneRole === 'super') return 'lane-siege';
  if (laneRole === 'utility') return 'lane-utility';

  const wild = asset.wildReadability;
  if (wild?.tier === 'boss' || wild?.tier === 'objective') return 'boss-objective';
  if (wild?.tier === 'ancient' || wild?.packRole === 'ancient') return 'wild-ancient';
  if (wild?.packRole === 'leader') return 'wild-leader';
  if (wild?.packRole === 'caster' || wild?.packRole === 'flying') return 'wild-caster';
  if (wild) return 'wild-fodder';

  const supportRole = asset.supportReadability?.roleClass;
  if (supportRole === 'courier') return 'support-courier';
  if (supportRole === 'ward') return 'support-ward';
  if (supportRole === 'trap') return 'support-trap';
  if (supportRole === 'illusion') return 'support-illusion';
  if (supportRole === 'totem') return 'support-totem';
  return 'support-summon';
}

function resourceRuntimeThreatBand(asset: Resource3DAssetSpec): ResourceRuntimeThreatBand {
  const unitClass = resourceRuntimeUnitClass(asset);
  if (unitClass === 'boss-objective' || unitClass === 'wild-ancient' || unitClass === 'lane-siege') return 'high';
  if (unitClass.startsWith('support-') || unitClass === 'lane-melee' || unitClass === 'wild-fodder') return 'low';
  return 'medium';
}

function resourceRuntimeUnitVisualPriority(asset: Resource3DAssetSpec): number {
  if (asset.supportReadability) return round2(clamp(asset.supportReadability.visualPriority, 0.22, 0.62));
  const threat = resourceRuntimeThreatBand(asset);
  if (threat === 'high') return asset.wildReadability?.tier === 'boss' || asset.wildReadability?.tier === 'objective' ? 0.86 : 0.72;
  if (threat === 'medium') return 0.58;
  return 0.42;
}

function resourceThreatMultiplier(threatBand: ResourceRuntimeThreatBand): number {
  if (threatBand === 'high') return 1.36;
  if (threatBand === 'medium') return 0.94;
  return 0.58;
}

function resourceUnitActionPulse(state: ResourceRuntimeUnitState, progress: number, wave: number): number {
  if (state === 'attack') return 0.42 + Math.sin(Math.PI * progress) * 0.72;
  if (state === 'cast') return 0.38 + wave * 0.66;
  if (state === 'hit') return 0.72 + (1 - progress) * 0.34;
  if (state === 'death') return 0.5 + (1 - progress) * 0.28;
  if (state === 'expire') return 0.24 + (1 - progress) * 0.32;
  if (state === 'move') return 0.22 + wave * 0.3;
  return 0.12 + wave * 0.16;
}

function resourceRuntimeMapClass(asset: Resource3DAssetSpec): ResourceRuntimeMapClass {
  const read = resourceMapSearchText(asset);
  if (asset.placement.river || /river|water|reed|bridge|河|水|芦苇|河岸|河道|浅水/.test(read)) return 'river-corridor';
  if (asset.placement.heightLevel === 'sky' || /sky|cloud|sun|dome|天|云|日光|天空/.test(read)) return 'sky-atmosphere';
  if (/tree|pine|broadleaf|stump|canopy|forest|jungle|树|松|木|林/.test(read)) return 'tree-wall';
  if (/highground|cliff|stairs|plateau|ward-cliff|高地|峭壁|视野点|台阶/.test(read)) return 'highground-edge';
  if (/slope|ramp|坡|坡道/.test(read)) return 'slope-ramp';
  if (/fence|栅栏/.test(read)) return 'fence-blocker';
  if (/grass|flower|pollen|meadow|草|花|花粉/.test(read)) return 'grass-flower';
  if (asset.category === 'environment_fx') return 'ambient-fx';
  if (asset.category === 'terrain_tiles') return 'flat-ground';
  return 'map-prop';
}

function resourceRuntimeMapBiomeIntent(asset: Resource3DAssetSpec): ResourceRuntimeMapBiomeIntent {
  const mapClass = resourceRuntimeMapClass(asset);
  const read = resourceMapSearchText(asset);
  if (asset.placement.river || mapClass === 'river-corridor') return 'river';
  if (asset.placement.heightLevel === 'sky' || mapClass === 'sky-atmosphere') return 'sky';
  if (asset.placement.heightLevel === 'highground' || mapClass === 'highground-edge' || mapClass === 'slope-ramp') return 'highground';
  if (/dire|night|dead|scorch|dark|roshan|pit|lava|ember|夜|暗|枯|深渊|熔岩/.test(read)) return 'dire';
  if (/dawn|sun|flower|green|grass|bloom|radiant|ancient|fountain|晨|阳|花|绿|泉水|基地/.test(read)) return 'radiant';
  if (mapClass === 'tree-wall' || mapClass === 'grass-flower' || /jungle|forest|reed|pollen|野区|林|草|花/.test(read)) return 'jungle';
  return 'neutral';
}

function resourceRuntimeMapAmbienceIntent(asset: Resource3DAssetSpec): ResourceRuntimeMapAmbienceIntent {
  switch (resourceRuntimeMapClass(asset)) {
    case 'river-corridor': return 'river-flow';
    case 'sky-atmosphere': return 'sky-haze';
    case 'tree-wall': return 'canopy-sway';
    case 'grass-flower': return 'grass-bloom';
    case 'highground-edge': return 'highground-shadow';
    case 'fence-blocker': return 'fence-depth';
    case 'slope-ramp': return 'slope-parallax';
    case 'ambient-fx': return 'ambient-particles';
    case 'flat-ground':
    case 'map-prop':
    default: return 'ground-dust';
  }
}

function resourceRuntimeMapVisualPriority(asset: Resource3DAssetSpec): number {
  const mapClass = resourceRuntimeMapClass(asset);
  const base = {
    'river-corridor': 0.86,
    'sky-atmosphere': 0.9,
    'tree-wall': 0.78,
    'grass-flower': 0.58,
    'highground-edge': 0.84,
    'fence-blocker': 0.68,
    'slope-ramp': 0.74,
    'ambient-fx': 0.72,
    'flat-ground': 0.46,
    'map-prop': 0.56,
  } satisfies Record<ResourceRuntimeMapClass, number>;
  const blockerBoost = asset.placement.visionBlocker ? 0.08 : asset.placement.blocker ? 0.05 : 0;
  const scaleBoost = clamp((asset.scale - 0.78) * 0.12, -0.04, 0.08);
  return round2(clamp(base[mapClass] + blockerBoost + scaleBoost, 0.34, 1));
}

function resourceMapSearchText(asset: Resource3DAssetSpec): string {
  return [
    asset.key,
    asset.name,
    asset.role,
    asset.silhouette,
    asset.motif,
    asset.category,
    asset.placement.heightLevel,
    asset.placement.placementLayer,
    ...asset.parts.map((part) => `${part.name} ${part.material} ${part.detail} ${part.kind}`),
    ...asset.production.notes,
  ].join(' ').toLowerCase();
}

function resourceMapSeed(value: string): number {
  return seededPhase(value) + value.length * 0.013;
}

function isRuntimeFxReadabilityCategory(category: Resource3DCategory): boolean {
  return category === 'spell_fx'
    || category === 'projectiles'
    || category === 'aoe_indicators'
    || category === 'status_effects'
    || category === 'targeting_reticles';
}

function resourceRuntimeFxClass(asset: Resource3DAssetSpec): ResourceRuntimeFxClass {
  if (asset.category === 'projectiles') return 'projectile-path';
  if (asset.category === 'aoe_indicators') return 'area-telegraph';
  if (asset.category === 'status_effects') return 'status-aura';
  if (asset.category === 'targeting_reticles') return 'targeting-reticle';
  return 'spell-burst';
}

function resourceRuntimeFxTimingIntent(asset: Resource3DAssetSpec): ResourceRuntimeFxTimingIntent {
  if (asset.category === 'projectiles') return 'travel-impact';
  if (asset.category === 'status_effects') return 'persistent-aura';
  if (asset.category === 'targeting_reticles') return 'target-confirm';
  return 'windup-impact-linger';
}

function resourceRuntimeFxDangerRead(asset: Resource3DAssetSpec): ResourceRuntimeFxDangerRead {
  const text = resourceFxSearchText(asset);
  if (/invalid|无效|错误/.test(text)) return 'invalid';
  if (/self|自身|自我/.test(text)) return 'self';
  if (asset.category === 'projectiles' || /line|arrow|missile|bolt|hook|spear|path|dash|直线|弹道|箭|钩|矛/.test(text)) return 'path';
  if (asset.category === 'aoe_indicators' || /aoe|circle|ring|field|radius|cone|wall|范围|区域|圆|扇形|墙/.test(text)) return 'radius';
  if (asset.category === 'status_effects' || /status|unit|enemy|ally|单位|敌方|友方|状态/.test(text)) return 'unit';
  return 'point';
}

function resourceRuntimeFxPriority(asset: Resource3DAssetSpec): number {
  const danger = resourceRuntimeFxDangerRead(asset);
  const classBoost = {
    'spell-burst': 0.74,
    'projectile-path': 0.78,
    'area-telegraph': 0.92,
    'status-aura': 0.66,
    'targeting-reticle': 0.86,
  } satisfies Record<ResourceRuntimeFxClass, number>;
  const dangerBoost = danger === 'invalid' ? 0.12 : danger === 'radius' ? 0.08 : danger === 'path' ? 0.05 : 0;
  return round2(clamp(classBoost[resourceRuntimeFxClass(asset)] + dangerBoost + (asset.vfxAudio ? 0.03 : 0), 0.52, 1.08));
}

function resourceFxSearchText(asset: Resource3DAssetSpec): string {
  return [
    asset.key,
    asset.name,
    asset.role,
    asset.silhouette,
    asset.motif,
    asset.category,
    asset.vfxAudio?.dangerShape ?? '',
    asset.vfxAudio?.family ?? '',
  ].join(' ').toLowerCase();
}

function updateRuntimeUnitPart(
  object: Object3D,
  runtime: ResourceRuntimeUnitPresentationUserData,
  state: ResourceRuntimeUnitState,
  actionPulse: number,
  wave: number,
  fade: number,
): void {
  const basePosition = transformTuple(object.userData.basePosition, [object.position.x, object.position.y, object.position.z]);
  const baseRotation = transformTuple(object.userData.baseRotation, [object.rotation.x, object.rotation.y, object.rotation.z]);
  const baseScale = scaleTuple(object.userData.baseScale);
  const kind = String(object.userData.partKind ?? '');
  const priority = runtime.visualPriority;
  const weaponBias = kind === 'weapon' || kind === 'beam' ? 1.24 : kind === 'banner' || kind === 'ring' || kind === 'orb' ? 0.92 : 0.48;
  const attackLean = state === 'attack' ? actionPulse * priority * weaponBias : 0;
  const hitLean = state === 'hit' ? -actionPulse * priority * 0.18 : 0;
  const expireSink = state === 'expire' || state === 'death' ? fade * 0.08 : 0;

  object.position.set(
    basePosition[0] + attackLean * 0.04,
    basePosition[1] + (state === 'cast' ? actionPulse * 0.08 : wave * priority * 0.018) - expireSink,
    basePosition[2] - attackLean * 0.035,
  );
  object.rotation.set(
    baseRotation[0] + (state === 'death' ? fade * 0.42 : 0),
    baseRotation[1] + attackLean * 0.18,
    baseRotation[2] - attackLean * 0.28 + hitLean,
  );
  const scale = 1 + actionPulse * priority * (kind === 'orb' || kind === 'ring' ? 0.1 : 0.04) - fade * 0.12;
  object.scale.set(baseScale[0] * scale, baseScale[1] * scale, baseScale[2] * scale);
  Object.assign(object.userData, {
    runtimeUnitAnimated: true,
    runtimeUnitState: state,
    runtimeUnitActionOffsetY: round2(object.position.y - basePosition[1]),
    runtimeUnitActionScale: round2(scale),
  });
}

function updateRuntimeUnitActionCue(
  object: Object3D,
  runtime: ResourceRuntimeUnitPresentationUserData,
  state: ResourceRuntimeUnitState,
  actionPulse: number,
  fade: number,
): void {
  const baseScale = scaleTuple(object.userData.baseScale);
  const baseOpacity = Number(object.userData.baseOpacity ?? meshOpacity(object) ?? 0.18);
  const threat = resourceThreatMultiplier(runtime.threatBand);
  const scale = 1 + actionPulse * runtime.visualPriority * threat * 0.28 - fade * 0.1;
  const stateAlpha = state === 'expire'
    ? 0.34 * (1 - fade)
    : state === 'death'
      ? 0.24 * (1 - fade)
      : state === 'attack' || state === 'hit'
        ? 0.72
        : 0.46;
  const opacity = clamp(baseOpacity * (stateAlpha + actionPulse * 0.32), 0.03, runtime.threatBand === 'high' ? 0.74 : 0.52);
  object.scale.set(baseScale[0] * scale, baseScale[1] * scale, baseScale[2] * scale);
  setMeshOpacity(object, opacity);
  Object.assign(object.userData, {
    runtimeUnitAnimated: true,
    runtimeUnitState: state,
    unitCueOpacity: round2(opacity),
    unitCueScale: round2(scale),
  });
}

function updateRuntimeUnitMaterial(
  material: MeshStandardMaterial | MeshBasicMaterial,
  runtime: ResourceRuntimeUnitPresentationUserData,
  state: ResourceRuntimeUnitState,
  actionPulse: number,
  fade: number,
): boolean {
  if (!material.userData.resourceRuntimeSurfaceMaterial) return false;
  const baseOpacity = Number(material.userData.baseOpacity ?? material.opacity ?? 1);
  const reactive = Boolean(material.userData.runtimeSurfaceReactive);
  const threatBoost = resourceThreatMultiplier(runtime.threatBand) * runtime.visualPriority;
  const fadeFactor = 1 - fade * (state === 'expire' ? 0.72 : 0.5);
  material.transparent = material.transparent || fade > 0;
  material.opacity = clamp(baseOpacity * fadeFactor * (1 + actionPulse * 0.05), 0.04, material.userData.runtimeSurfaceGlintLayer ? 0.9 : 1);

  if (material instanceof MeshStandardMaterial) {
    const baseEmissive = Number(material.userData.baseEmissiveIntensity ?? material.emissiveIntensity);
    const baseRoughness = Number(material.userData.baseRoughness ?? material.roughness);
    const baseEnv = Number(material.userData.baseEnvMapIntensity ?? material.envMapIntensity ?? 0);
    material.emissiveIntensity = round2(baseEmissive + actionPulse * threatBoost * (reactive ? 0.58 : 0.18));
    material.roughness = clamp(baseRoughness - actionPulse * threatBoost * 0.06 + fade * 0.04, 0.1, 0.96);
    material.envMapIntensity = round2(baseEnv + actionPulse * threatBoost * 0.24);
    Object.assign(material.userData, {
      runtimeUnitEmissiveIntensity: round2(material.emissiveIntensity),
      runtimeUnitRoughness: round2(material.roughness),
      runtimeUnitEnvMapIntensity: round2(material.envMapIntensity),
    });
  } else {
    Object.assign(material.userData, {
      runtimeUnitEmissiveIntensity: round2(actionPulse * threatBoost),
      runtimeUnitRoughness: 0,
      runtimeUnitEnvMapIntensity: round2(actionPulse * threatBoost * 0.24),
    });
  }
  Object.assign(material.userData, {
    runtimeUnitAnimated: true,
    runtimeUnitState: state,
    runtimeUnitOpacity: round2(material.opacity),
  });
  return true;
}

function updateRuntimeMapAmbienceCue(
  object: Object3D,
  runtime: ResourceRuntimeMapPresentationUserData,
  ambientPulse: number,
  flowPulse: number,
  depthPulse: number,
  occlusionPulse: number,
): void {
  const baseScale = scaleTuple(object.userData.baseScale);
  const baseOpacity = Number(object.userData.baseOpacity ?? meshOpacity(object) ?? 0.14);
  const classBoost = runtime.mapClass === 'sky-atmosphere'
    ? 0.44
    : runtime.mapClass === 'river-corridor'
      ? 0.34
      : runtime.mapClass === 'highground-edge'
        ? 0.28
        : runtime.mapClass === 'tree-wall'
          ? 0.24
          : 0.18;
  const pulse = flowPulse || depthPulse || occlusionPulse || ambientPulse;
  const scale = 1 + ambientPulse * classBoost + flowPulse * 0.18 + depthPulse * 0.12 + occlusionPulse * 0.08;
  const opacity = clamp(baseOpacity * (0.74 + pulse * 0.86 + runtime.visualPriority * 0.16), 0.035, 0.58);
  object.scale.set(baseScale[0] * scale, baseScale[1] * scale, baseScale[2] * scale);
  setMeshOpacity(object, opacity);
  Object.assign(object.userData, {
    runtimeMapAnimated: true,
    mapCueOpacity: round2(opacity),
    mapCueScale: round2(scale),
    runtimeMapFlowPulse: round2(flowPulse),
    runtimeMapDepthPulse: round2(depthPulse),
    runtimeMapOcclusionPulse: round2(occlusionPulse),
    runtimeMapAmbientPulse: round2(ambientPulse),
  });
}

function updateRuntimeMapMaterial(
  material: MeshStandardMaterial | MeshBasicMaterial,
  runtime: ResourceRuntimeMapPresentationUserData,
  ambientPulse: number,
  flowPulse: number,
  depthPulse: number,
  occlusionPulse: number,
): boolean {
  if (!material.userData.resourceRuntimeSurfaceMaterial) return false;
  const baseOpacity = Number(material.userData.baseOpacity ?? material.opacity ?? 1);
  const role = String(material.userData.surfaceRole ?? 'surface');
  const roleBoost = role === 'glow' || role === 'glint' ? 1.22 : role === 'outline' ? 0.38 : 1;
  const pulse = (ambientPulse + flowPulse * 0.5 + depthPulse * 0.28 + occlusionPulse * 0.22) * roleBoost;
  material.opacity = clamp(baseOpacity * (1 + pulse * 0.06), role === 'outline' ? 0.04 : 0.16, role === 'outline' ? 0.5 : 1);
  material.transparent = material.transparent || role !== 'surface' || runtime.mapClass === 'sky-atmosphere';

  if (material instanceof MeshStandardMaterial) {
    const baseEmissive = Number(material.userData.baseEmissiveIntensity ?? material.emissiveIntensity);
    const baseRoughness = Number(material.userData.baseRoughness ?? material.roughness);
    const baseEnv = Number(material.userData.baseEnvMapIntensity ?? material.envMapIntensity ?? 0);
    const baseNormal = Number(material.userData.baseNormalIntensity ?? material.normalScale.x ?? 0.4);
    const waterBoost = runtime.ambienceIntent === 'river-flow' ? flowPulse * 0.44 : 0;
    const skyBoost = runtime.ambienceIntent === 'sky-haze' ? ambientPulse * 0.38 : 0;
    const canopyBoost = runtime.ambienceIntent === 'canopy-sway' || runtime.ambienceIntent === 'grass-bloom'
      ? occlusionPulse * 0.24 + ambientPulse * 0.16
      : 0;
    material.emissiveIntensity = round2(baseEmissive + waterBoost + skyBoost + canopyBoost + depthPulse * 0.08);
    material.roughness = clamp(baseRoughness - flowPulse * 0.12 + depthPulse * 0.08 + occlusionPulse * 0.04, 0.12, 0.98);
    material.envMapIntensity = round2(baseEnv + ambientPulse * 0.18 + flowPulse * 0.36 + skyBoost * 0.42);
    material.normalScale.setScalar(clamp(baseNormal + flowPulse * 0.12 + depthPulse * 0.08, 0.16, 1.12));
    Object.assign(material.userData, {
      runtimeMapEmissiveIntensity: round2(material.emissiveIntensity),
      runtimeMapRoughness: round2(material.roughness),
      runtimeMapEnvMapIntensity: round2(material.envMapIntensity),
      runtimeMapNormalIntensity: round2(material.normalScale.x),
    });
  } else {
    Object.assign(material.userData, {
      runtimeMapEmissiveIntensity: round2(pulse),
      runtimeMapRoughness: 0,
      runtimeMapEnvMapIntensity: round2(ambientPulse + flowPulse),
      runtimeMapNormalIntensity: 0,
    });
  }
  Object.assign(material.userData, {
    runtimeMapAnimated: true,
    runtimeMapOpacity: round2(material.opacity),
    runtimeMapClass: runtime.mapClass,
    runtimeMapAmbienceIntent: runtime.ambienceIntent,
  });
  return true;
}

function updateRuntimeFxReadabilityCue(
  object: Object3D,
  runtime: ResourceRuntimeFxReadabilityUserData,
  readabilityPulse: number,
  pathPulse: number,
  radiusPulse: number,
  statusPulse: number,
  targetPulse: number,
  burstPulse: number,
): void {
  const baseScale = scaleTuple(object.userData.baseScale);
  const baseOpacity = Number(object.userData.baseOpacity ?? meshOpacity(object) ?? 0.16);
  const pulse = pathPulse || radiusPulse || statusPulse || targetPulse || burstPulse || readabilityPulse;
  const classScale = runtime.fxClass === 'area-telegraph'
    ? 0.32
    : runtime.fxClass === 'projectile-path'
      ? 0.22
      : runtime.fxClass === 'targeting-reticle'
        ? 0.2
        : 0.16;
  const scale = 1 + readabilityPulse * classScale + radiusPulse * 0.18 + pathPulse * 0.08;
  const invalidBoost = runtime.dangerRead === 'invalid' ? 0.16 : 0;
  const opacity = clamp(baseOpacity * (0.78 + pulse * 0.9 + invalidBoost), 0.04, 0.68);
  object.scale.set(baseScale[0] * scale, baseScale[1] * scale, baseScale[2] * scale);
  setMeshOpacity(object, opacity);
  Object.assign(object.userData, {
    runtimeFxAnimated: true,
    fxCueOpacity: round2(opacity),
    fxCueScale: round2(scale),
    runtimeFxPathPulse: round2(pathPulse),
    runtimeFxRadiusPulse: round2(radiusPulse),
    runtimeFxStatusPulse: round2(statusPulse),
    runtimeFxTargetPulse: round2(targetPulse),
    runtimeFxBurstPulse: round2(burstPulse),
  });
}

function updateRuntimeFxReadabilityMaterial(
  material: MeshStandardMaterial | MeshBasicMaterial,
  runtime: ResourceRuntimeFxReadabilityUserData,
  readabilityPulse: number,
  pathPulse: number,
  radiusPulse: number,
  statusPulse: number,
  targetPulse: number,
  burstPulse: number,
): boolean {
  if (!material.userData.resourceRuntimeSurfaceMaterial) return false;
  const baseOpacity = Number(material.userData.baseOpacity ?? material.opacity ?? 1);
  const role = String(material.userData.surfaceRole ?? 'surface');
  const roleBoost = role === 'glow' || role === 'glint' ? 1.32 : role === 'outline' ? 0.45 : 1;
  const pulse = (readabilityPulse + pathPulse * 0.36 + radiusPulse * 0.42 + statusPulse * 0.24 + targetPulse * 0.3 + burstPulse * 0.44) * roleBoost;
  material.transparent = material.transparent || role !== 'surface' || runtime.fxClass === 'targeting-reticle';
  material.opacity = clamp(baseOpacity * (1 + pulse * 0.08), role === 'outline' ? 0.04 : 0.14, role === 'outline' ? 0.52 : 1);

  if (material instanceof MeshStandardMaterial) {
    const baseEmissive = Number(material.userData.baseEmissiveIntensity ?? material.emissiveIntensity);
    const baseRoughness = Number(material.userData.baseRoughness ?? material.roughness);
    const baseEnv = Number(material.userData.baseEnvMapIntensity ?? material.envMapIntensity ?? 0);
    const baseNormal = Number(material.userData.baseNormalIntensity ?? material.normalScale.x ?? 0.4);
    material.emissiveIntensity = round2(baseEmissive + pulse * runtime.readabilityPriority * 0.54);
    material.roughness = clamp(baseRoughness - pulse * 0.1 + statusPulse * 0.04, 0.1, 0.96);
    material.envMapIntensity = round2(baseEnv + pulse * 0.28);
    material.normalScale.setScalar(clamp(baseNormal + radiusPulse * 0.1 + burstPulse * 0.08, 0.16, 1.1));
    Object.assign(material.userData, {
      runtimeFxEmissiveIntensity: round2(material.emissiveIntensity),
      runtimeFxRoughness: round2(material.roughness),
      runtimeFxEnvMapIntensity: round2(material.envMapIntensity),
      runtimeFxNormalIntensity: round2(material.normalScale.x),
    });
  } else {
    Object.assign(material.userData, {
      runtimeFxEmissiveIntensity: round2(pulse * runtime.readabilityPriority),
      runtimeFxRoughness: 0,
      runtimeFxEnvMapIntensity: round2(pulse * 0.28),
      runtimeFxNormalIntensity: 0,
    });
  }
  Object.assign(material.userData, {
    runtimeFxAnimated: true,
    runtimeFxOpacity: round2(material.opacity),
    runtimeFxClass: runtime.fxClass,
    runtimeFxDangerRead: runtime.dangerRead,
  });
  return true;
}

function runtimeSurfacePulse(
  intent: ResourceRuntimeSurfaceUserData['shaderIntent'],
  t: number,
  motionPulse: number,
  impactPulse: number,
): number {
  const wave = 0.5 + Math.sin(t * Math.PI * 2) * 0.5;
  const slow = 0.5 + Math.sin(t * Math.PI * 0.92 + 0.7) * 0.5;
  const fast = 0.5 + Math.sin(t * Math.PI * 3.1 + 0.34) * 0.5;
  const blended = {
    'energy-fresnel-pulse': fast * 0.52 + motionPulse * 0.28 + impactPulse * 0.2,
    'metal-rim-sweep': wave * 0.58 + slow * 0.24 + impactPulse * 0.18,
    'cloth-dye-breathe': slow * 0.74 + wave * 0.16 + motionPulse * 0.1,
    'water-caustic-flow': fast * 0.36 + slow * 0.38 + motionPulse * 0.26,
    'foliage-leaf-sheen': slow * 0.62 + wave * 0.26 + motionPulse * 0.12,
    'stone-wear-shadow': slow * 0.5 + wave * 0.18 + impactPulse * 0.12,
    'shadow-ink-bloom': fast * 0.44 + slow * 0.34 + impactPulse * 0.22,
  }[intent];
  return clamp(blended, 0.04, 1);
}

function forEachRuntimeSurfaceMaterial(
  material: unknown,
  visit: (material: MeshStandardMaterial | MeshBasicMaterial) => void,
): void {
  if (Array.isArray(material)) {
    material.forEach((item) => forEachRuntimeSurfaceMaterial(item, visit));
    return;
  }
  if ((material instanceof MeshStandardMaterial || material instanceof MeshBasicMaterial) && material.userData.resourceRuntimeSurfaceMaterial) {
    visit(material);
  }
}

function updateRuntimeSurfaceMaterial(
  material: MeshStandardMaterial | MeshBasicMaterial,
  surface: ResourceRuntimeSurfaceUserData,
  surfacePulse: number,
  fresnel: number,
  t: number,
): boolean {
  const baseOpacity = Number(material.userData.baseOpacity ?? material.opacity ?? 1);
  const reactive = Boolean(material.userData.runtimeSurfaceReactive);
  const glintLayer = Boolean(material.userData.runtimeSurfaceGlintLayer);
  const phase = seededPhase(String(material.userData.partName ?? material.name ?? 'surface'));
  const sweep = 0.5 + Math.sin(t * Math.PI * 2.2 + phase) * 0.5;
  const role = String(material.userData.surfaceRole ?? 'surface');
  const roleBoost = role === 'glow' || role === 'glint' ? 1.28 : role === 'outline' ? 0.32 : 1;
  const materialPulse = surfacePulse * roleBoost + sweep * surface.surfaceIntensity * 0.12;

  if (material instanceof MeshStandardMaterial) {
    const baseRoughness = Number(material.userData.baseRoughness ?? material.roughness);
    const baseEmissiveIntensity = Number(material.userData.baseEmissiveIntensity ?? material.emissiveIntensity);
    const baseEnvMapIntensity = Number(material.userData.baseEnvMapIntensity ?? material.envMapIntensity ?? 0);
    const baseNormalIntensity = Number(material.userData.baseNormalIntensity ?? material.normalScale.x ?? 0.4);
    const roughnessShift = surface.shaderIntent === 'stone-wear-shadow'
      ? materialPulse * 0.05
      : -materialPulse * 0.18;
    const emissiveBoost = (reactive ? materialPulse * surface.surfaceIntensity * 1.2 : materialPulse * 0.08) + (glintLayer ? fresnel * 0.16 : 0);
    material.roughness = clamp(baseRoughness + roughnessShift, 0.12, 0.96);
    material.emissiveIntensity = round2(baseEmissiveIntensity + emissiveBoost);
    material.envMapIntensity = round2(baseEnvMapIntensity + fresnel * (glintLayer ? 0.72 : 0.28));
    material.normalScale.setScalar(clamp(baseNormalIntensity + surfacePulse * surface.surfaceIntensity * 0.16, 0.18, 1.08));
    material.opacity = clamp(baseOpacity * (1 + materialPulse * 0.08), 0.18, 1);
    Object.assign(material.userData, {
      runtimeSurfaceRoughness: round2(material.roughness),
      runtimeSurfaceEmissiveIntensity: round2(material.emissiveIntensity),
      runtimeSurfaceEnvMapIntensity: round2(material.envMapIntensity),
      runtimeSurfaceNormalIntensity: round2(material.normalScale.x),
    });
  } else {
    const opacityBoost = role === 'outline'
      ? 0.82 + surfacePulse * 0.08
      : role === 'glow' || role === 'glint'
        ? 0.64 + materialPulse * 0.72
        : 0.88 + materialPulse * 0.18;
    material.opacity = clamp(baseOpacity * opacityBoost, 0.04, role === 'outline' ? 0.5 : 0.86);
    Object.assign(material.userData, {
      runtimeSurfaceRoughness: 0,
      runtimeSurfaceEmissiveIntensity: round2(materialPulse * surface.surfaceIntensity),
      runtimeSurfaceEnvMapIntensity: round2(fresnel),
      runtimeSurfaceNormalIntensity: 0,
    });
  }

  material.userData.runtimeSurfaceAnimated = true;
  material.userData.runtimeSurfacePulse = round2(surfacePulse);
  material.userData.runtimeSurfaceFresnel = round2(fresnel);
  material.userData.runtimeSurfaceOpacity = round2(material.opacity);
  material.userData.runtimeSurfaceShaderIntent = surface.shaderIntent;
  return reactive || glintLayer;
}

function tagRuntimeSurfaceMaterial(
  material: MeshStandardMaterial | MeshBasicMaterial,
  part: Resource3DPartSpec,
  profile: ResourceMaterialProfile,
  role: 'surface' | 'outline' | 'glow' | 'glint',
): void {
  const glintLayer = profile.rimLightIntensity >= 0.58
    || Boolean(part.emissive)
    || part.material === 'metal'
    || part.material === 'crystal'
    || part.material === 'energy'
    || role === 'glow'
    || role === 'glint';
  Object.assign(material.userData, {
    resourceRuntimeSurfaceMaterial: true,
    surfaceRole: role,
    partName: part.name,
    partKind: part.kind,
    partMaterial: part.material,
    partDetail: part.detail,
    runtimeSurfaceReactive: true,
    runtimeSurfaceGlintLayer: glintLayer,
    baseOpacity: material.opacity,
    baseRoughness: material instanceof MeshStandardMaterial ? material.roughness : 0,
    baseMetalness: material instanceof MeshStandardMaterial ? material.metalness : 0,
    baseEmissiveIntensity: material instanceof MeshStandardMaterial ? material.emissiveIntensity : 0,
    baseEnvMapIntensity: material instanceof MeshStandardMaterial ? material.envMapIntensity : 0,
    baseNormalIntensity: material instanceof MeshStandardMaterial ? material.normalScale.x : 0,
  });
}

function createPartObject(part: Resource3DPartSpec, textures: Record<Resource3DTextureChannel, Texture>): Object3D {
  const additive = part.kind === 'beam' || part.kind === 'ring';
  const profile = resourceMaterialProfile(part.material, !!part.emissive);
  const material = new MeshStandardMaterial({
    color: new Color(part.color),
    map: textures.albedo,
    normalMap: textures.normal,
    roughnessMap: textures.orm,
    roughness: profile.roughness,
    metalness: profile.metalness,
    emissive: new Color(part.emissive ?? '#000000'),
    emissiveMap: part.emissive ? textures.emissive : null,
    emissiveIntensity: profile.emissiveIntensity,
    flatShading: true,
    transparent: additive,
    opacity: additive ? 0.58 : 1,
    side: additive ? DoubleSide : FrontSide,
  });
  material.normalScale.setScalar(profile.normalIntensity);
  material.envMapIntensity = profile.rimLightIntensity;
  material.userData.surfaceProfile = profile;
  tagRuntimeSurfaceMaterial(material, part, profile, 'surface');

  const mesh = new Mesh(geometryCache[part.kind], material);
  mesh.name = part.name;
  mesh.userData.kind = part.kind;
  mesh.position.set(...part.position);
  mesh.scale.set(...part.scale);
  if (part.rotation) mesh.rotation.set(...part.rotation);
  mesh.castShadow = part.kind !== 'beam' && part.kind !== 'ring';
  mesh.receiveShadow = part.kind !== 'beam';

  if (part.kind === 'base' || part.kind === 'ring' || part.kind === 'beam') {
    tagMotionPart(mesh, part);
    return mesh;
  }

  const group = new Group();
  group.name = `resource-polished:${part.name}`;
  tagMotionPart(group, part);
  group.add(mesh);

  const outline = new Mesh(geometryCache[part.kind], new MeshBasicMaterial({
    color: '#050706',
    side: BackSide,
    transparent: true,
    opacity: 0.38,
  }));
  tagRuntimeSurfaceMaterial(outline.material, part, profile, 'outline');
  outline.position.copy(mesh.position);
  outline.rotation.copy(mesh.rotation);
  outline.scale.copy(mesh.scale).multiplyScalar(1.055);
  group.add(outline);

  if (part.emissive) {
    const glow = new Mesh(geometryCache[part.kind], new MeshBasicMaterial({
      color: part.emissive,
      blending: AdditiveBlending,
      transparent: true,
      opacity: part.kind === 'orb' ? 0.32 : 0.14,
      depthWrite: false,
    }));
    tagRuntimeSurfaceMaterial(glow.material, part, profile, 'glow');
    glow.position.copy(mesh.position);
    glow.rotation.copy(mesh.rotation);
    glow.scale.copy(mesh.scale).multiplyScalar(part.kind === 'orb' ? 1.35 : 1.16);
    group.add(glow);
  }
  if (profile.rimLightIntensity >= 0.58) {
    const glint = new Mesh(geometryCache[part.kind], new MeshBasicMaterial({
      color: part.emissive ?? part.color,
      blending: AdditiveBlending,
      transparent: true,
      opacity: Math.min(0.26, 0.08 + profile.rimLightIntensity * 0.16),
      depthWrite: false,
    }));
    glint.name = `v6-surface-glint:${part.name}`;
    tagRuntimeSurfaceMaterial(glint.material, part, profile, 'glint');
    glint.position.copy(mesh.position);
    glint.rotation.copy(mesh.rotation);
    glint.scale.copy(mesh.scale).multiplyScalar(1.025);
    group.add(glint);
  }

  return group;
}

function createResourceContactShadow(asset: Resource3DAssetSpec): Mesh {
  const shadow = new Mesh(contactShadowGeometry, new MeshBasicMaterial({
    color: '#020403',
    transparent: true,
    opacity: resourceContactShadowOpacity(asset),
    depthWrite: false,
  }));
  const radius = resourceContactShadowRadius(asset);
  shadow.name = `resource3d:v6-contact-shadow:${asset.key}`;
  shadow.position.y = 0.018;
  shadow.scale.set(radius, 1, radius * 0.82);
  shadow.receiveShadow = false;
  shadow.castShadow = false;
  shadow.renderOrder = -10;
  return shadow;
}

function createRuntimeFootprint(asset: Resource3DAssetSpec): Mesh {
  const color = asset.placement.blocker
    ? '#ff8a5a'
    : asset.placement.river
      ? '#78dfff'
      : asset.placement.walkable
        ? '#9fd66f'
        : '#d8bd7e';
  const footprint = new Mesh(runtimeFootprintGeometry, new MeshBasicMaterial({
    color,
    transparent: true,
    opacity: asset.placement.blocker ? 0.18 : 0.11,
    depthWrite: false,
    side: DoubleSide,
  }));
  footprint.name = `resource3d:v8-footprint:${asset.key}`;
  footprint.rotation.x = -Math.PI / 2;
  footprint.position.y = 0.032;
  footprint.scale.set(asset.placement.footprintRadius, asset.placement.footprintRadius, 1);
  footprint.renderOrder = -8;
  footprint.userData = {
    resourceRuntimeFootprint: true,
    ...asset.placement,
    lodNear: asset.lod.near,
    productionModelPath: asset.production.modelPath,
  };
  return footprint;
}

function createRuntimeLODAnchor(asset: Resource3DAssetSpec): Mesh {
  const anchor = new Mesh(runtimeLodAnchorGeometry, new MeshBasicMaterial({
    color: lodAnchorColor(asset.placement.placementLayer),
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  }));
  const radius = Math.max(0.28, asset.placement.footprintRadius);
  anchor.name = `resource3d:v8-lod-anchor:${asset.key}`;
  anchor.position.set(radius * 0.62, 0.11, radius * 0.62);
  anchor.renderOrder = 12;
  anchor.userData = {
    resourceRuntimeLOD: true,
    lodNear: asset.lod.near,
    lodMid: asset.lod.mid,
    lodFar: asset.lod.far,
    impostorAfter: asset.lod.impostorAfter,
    shadow: asset.lod.shadow,
    productionModelPath: asset.production.modelPath,
    productionTexturePaths: asset.production.texturePaths,
    actionSlots: asset.production.actionSlots,
  };
  return anchor;
}

function createRuntimeUnitActionCue(asset: Resource3DAssetSpec): Mesh {
  const runtime = resourceRuntimeUnitPresentationUserData(asset)!;
  const color = runtime.threatBand === 'high'
    ? '#ffb45f'
    : runtime.unitClass.startsWith('support-')
      ? '#91d9ff'
      : asset.palette[3];
  const cue = new Mesh(runtimeUnitActionCueGeometry, new MeshBasicMaterial({
    color,
    blending: AdditiveBlending,
    transparent: true,
    opacity: runtime.threatBand === 'high' ? 0.22 : 0.16,
    depthWrite: false,
    side: DoubleSide,
  }));
  cue.name = `resource3d:v15-unit-action-cue:${asset.key}`;
  cue.rotation.x = -Math.PI / 2;
  cue.position.y = 0.075;
  cue.scale.setScalar(Math.max(0.72, asset.placement.footprintRadius * 0.88));
  cue.renderOrder = 18;
  cue.userData = {
    resourceRuntimeUnitActionCue: true,
    key: asset.key,
    category: asset.category,
    unitClass: runtime.unitClass,
    threatBand: runtime.threatBand,
    visualPriority: runtime.visualPriority,
    actionStates: runtime.actionStates,
    baseOpacity: cue.material.opacity,
    baseScale: [cue.scale.x, cue.scale.y, cue.scale.z],
  };
  return cue;
}

function createRuntimeMapAmbienceCue(asset: Resource3DAssetSpec): Mesh {
  const runtime = resourceRuntimeMapPresentationUserData(asset)!;
  const cue = new Mesh(runtimeMapAmbienceCueGeometry, new MeshBasicMaterial({
    color: runtimeMapCueColor(runtime, asset),
    blending: AdditiveBlending,
    transparent: true,
    opacity: runtime.mapClass === 'sky-atmosphere' ? 0.13 : runtime.mapClass === 'river-corridor' ? 0.18 : 0.1,
    depthWrite: false,
    side: DoubleSide,
  }));
  const radius = Math.max(0.72, asset.placement.footprintRadius * runtimeMapCueRadiusMultiplier(runtime.mapClass));
  cue.name = `resource3d:v16-map-ambience-cue:${asset.key}`;
  cue.rotation.x = -Math.PI / 2;
  cue.position.y = runtime.mapClass === 'sky-atmosphere' ? 0.28 : runtime.mapClass === 'tree-wall' ? 0.12 : 0.052;
  cue.scale.setScalar(radius);
  cue.renderOrder = runtime.mapClass === 'sky-atmosphere' ? 26 : runtime.mapClass === 'river-corridor' ? -4 : 14;
  cue.userData = {
    resourceRuntimeMapAmbienceCue: true,
    key: asset.key,
    category: asset.category,
    mapClass: runtime.mapClass,
    biomeIntent: runtime.biomeIntent,
    ambienceIntent: runtime.ambienceIntent,
    visualPriority: runtime.visualPriority,
    river: runtime.river,
    heightLevel: runtime.heightLevel,
    baseOpacity: cue.material.opacity,
    baseScale: [cue.scale.x, cue.scale.y, cue.scale.z],
  };
  return cue;
}

function runtimeMapCueRadiusMultiplier(mapClass: ResourceRuntimeMapClass): number {
  switch (mapClass) {
    case 'sky-atmosphere': return 2.2;
    case 'river-corridor': return 1.72;
    case 'highground-edge': return 1.48;
    case 'slope-ramp': return 1.36;
    case 'tree-wall': return 1.28;
    case 'grass-flower': return 1.16;
    case 'fence-blocker': return 1.1;
    case 'ambient-fx': return 1.42;
    case 'map-prop': return 1.08;
    case 'flat-ground':
    default: return 1.22;
  }
}

function runtimeMapCueColor(runtime: ResourceRuntimeMapPresentationUserData, asset: Resource3DAssetSpec): string {
  if (runtime.mapClass === 'river-corridor') return '#8defff';
  if (runtime.mapClass === 'sky-atmosphere') return '#bdeaff';
  if (runtime.mapClass === 'tree-wall') return '#9cff82';
  if (runtime.mapClass === 'grass-flower') return '#ffe78a';
  if (runtime.mapClass === 'highground-edge' || runtime.mapClass === 'slope-ramp') return '#d9bd7e';
  if (runtime.mapClass === 'fence-blocker') return '#ffb36d';
  if (runtime.biomeIntent === 'dire') return '#ff7750';
  return asset.palette[3];
}

function createRuntimeFxReadabilityCue(asset: Resource3DAssetSpec): Mesh {
  const runtime = resourceRuntimeFxReadabilityUserData(asset)!;
  const cue = new Mesh(runtimeFxReadabilityCueGeometry, new MeshBasicMaterial({
    color: runtimeFxCueColor(runtime, asset),
    blending: AdditiveBlending,
    transparent: true,
    opacity: runtime.fxClass === 'area-telegraph' ? 0.2 : runtime.fxClass === 'targeting-reticle' ? 0.18 : 0.14,
    depthWrite: false,
    side: DoubleSide,
  }));
  const radius = Math.max(0.62, asset.placement.footprintRadius * runtimeFxCueRadiusMultiplier(runtime.fxClass));
  cue.name = `resource3d:v17-fx-readability-cue:${asset.key}`;
  cue.rotation.x = -Math.PI / 2;
  cue.position.y = runtime.fxClass === 'status-aura' ? 0.16 : runtime.fxClass === 'projectile-path' ? 0.09 : 0.058;
  cue.scale.setScalar(radius);
  cue.renderOrder = runtime.fxClass === 'area-telegraph' || runtime.fxClass === 'targeting-reticle' ? 28 : 22;
  cue.userData = {
    resourceRuntimeFxReadabilityCue: true,
    key: asset.key,
    category: asset.category,
    fxClass: runtime.fxClass,
    timingIntent: runtime.timingIntent,
    dangerRead: runtime.dangerRead,
    readabilityPriority: runtime.readabilityPriority,
    baseOpacity: cue.material.opacity,
    baseScale: [cue.scale.x, cue.scale.y, cue.scale.z],
  };
  return cue;
}

function runtimeFxCueRadiusMultiplier(fxClass: ResourceRuntimeFxClass): number {
  switch (fxClass) {
    case 'area-telegraph': return 1.78;
    case 'targeting-reticle': return 1.42;
    case 'projectile-path': return 1.18;
    case 'status-aura': return 1.24;
    case 'spell-burst':
    default: return 1.32;
  }
}

function runtimeFxCueColor(runtime: ResourceRuntimeFxReadabilityUserData, asset: Resource3DAssetSpec): string {
  if (runtime.dangerRead === 'invalid') return '#ff7058';
  if (runtime.fxClass === 'area-telegraph') return '#ffb35d';
  if (runtime.fxClass === 'projectile-path') return asset.vfxAudio?.light.color ?? asset.palette[3];
  if (runtime.fxClass === 'status-aura') return asset.palette[1];
  if (runtime.fxClass === 'targeting-reticle') return asset.palette[3];
  return asset.palette[3];
}

function createRuntimeVfxAudioSyncAnchor(asset: Resource3DAssetSpec): Mesh {
  const vfxAudio = asset.vfxAudio!;
  const anchor = new Mesh(runtimeLodAnchorGeometry, new MeshBasicMaterial({
    color: asset.palette[3],
    blending: AdditiveBlending,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  }));
  const radius = Math.max(0.36, asset.placement.footprintRadius);
  anchor.name = `resource3d:v9-vfx-audio-sync:${asset.key}`;
  anchor.position.set(-radius * 0.54, 0.16, radius * 0.54);
  anchor.scale.setScalar(vfxAudio.dangerShape === 'radius' ? 1.25 : vfxAudio.dangerShape === 'ambient' ? 0.92 : 1);
  anchor.renderOrder = 16;
  anchor.userData = {
    resourceRuntimeVfxAudioAnchor: true,
    family: vfxAudio.family,
    dangerShape: vfxAudio.dangerShape,
    phaseCount: vfxAudio.phaseSync.length,
    particleLayers: vfxAudio.particleLayers.length,
    audioCues: vfxAudio.audioCues.length,
    firstAudioCue: vfxAudio.audioCues[0]?.cueId ?? '',
    productionAudioPath: vfxAudio.audioCues[0]?.assetPath ?? '',
    particleAtlases: vfxAudio.particleLayers.map((layer) => layer.textureAtlas),
  };
  return anchor;
}

function createRuntimeVfxPlaybackGroup(asset: Resource3DAssetSpec): Group {
  const vfxAudio = asset.vfxAudio!;
  const playback = new Group();
  playback.name = `resource3d:v10-vfx-playback:${asset.key}`;
  playback.position.y = 0.08;
  playback.userData = {
    resourceRuntimeVfxPlaybackRoot: true,
    ...resourceRuntimeVfxPlaybackUserData(vfxAudio),
  };

  vfxAudio.particleLayers.forEach((layer, index) => {
    playback.add(createRuntimeVfxLayer(asset, layer, index));
  });
  playback.add(createRuntimeVfxLightHint(asset));
  if (vfxAudio.decal.kind !== 'none') {
    playback.add(createRuntimeVfxDecal(asset));
  }
  return playback;
}

function createRuntimeVfxLayer(asset: Resource3DAssetSpec, layer: ResourceVfxParticleLayerSpec, index: number): Mesh {
  const vfxAudio = asset.vfxAudio!;
  const geometry = layer.role === 'trail' || vfxAudio.dangerShape === 'path'
    ? runtimeVfxPathGeometry
    : layer.role === 'shockwave' || vfxAudio.dangerShape === 'radius'
      ? runtimeVfxRadiusGeometry
      : runtimeVfxParticleGeometry;
  const material = new MeshBasicMaterial({
    color: layer.role === 'smoke' ? asset.palette[1] : asset.palette[3],
    transparent: true,
    opacity: Math.min(0.82, Math.max(0.16, layer.opacity)),
    depthWrite: false,
    side: DoubleSide,
  });
  if (layer.blendMode === 'additive') material.blending = AdditiveBlending;

  const mesh = new Mesh(geometry, material);
  mesh.name = `resource3d:v10-vfx-layer:${asset.key}:${layer.role}`;
  const spread = (index - (vfxAudio.particleLayers.length - 1) / 2) * 0.18;
  if (vfxAudio.dangerShape === 'path') {
    mesh.rotation.z = Math.PI / 2;
    mesh.position.set(0, 0.42 + index * 0.045, spread);
    mesh.scale.set(layer.scale * 1.28, layer.scale, layer.scale);
  } else if (vfxAudio.dangerShape === 'radius') {
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 0.038 + index * 0.012, 0);
    mesh.scale.setScalar(layer.scale * Math.max(1.1, asset.placement.footprintRadius * 1.35));
  } else if (vfxAudio.dangerShape === 'ambient') {
    mesh.position.set(spread * 1.5, 0.52 + index * 0.06, -spread);
    mesh.scale.setScalar(layer.scale * 0.82);
  } else {
    mesh.position.set(spread, 0.5 + index * 0.05, 0);
    mesh.scale.setScalar(layer.scale);
  }
  mesh.renderOrder = 24 + index;
  mesh.userData = {
    resourceRuntimeVfxLayer: true,
    role: layer.role,
    sprite: layer.sprite,
    textureAtlas: layer.textureAtlas,
    count: layer.count,
    blendMode: layer.blendMode,
    lifetimeMs: layer.lifetimeMs,
    gravity: layer.gravity,
    baseOpacity: Math.min(0.82, Math.max(0.16, layer.opacity)),
    baseScale: [mesh.scale.x, mesh.scale.y, mesh.scale.z],
    phaseNames: vfxAudio.phaseSync
      .filter((phase) => phase.particleRoles.includes(layer.role))
      .map((phase) => phase.phase),
  };
  return mesh;
}

function createRuntimeVfxLightHint(asset: Resource3DAssetSpec): Mesh {
  const vfxAudio = asset.vfxAudio!;
  const light = new Mesh(runtimeVfxLightGeometry, new MeshBasicMaterial({
    color: vfxAudio.light.color,
    blending: AdditiveBlending,
    transparent: true,
    opacity: Math.min(0.34, 0.1 + vfxAudio.light.intensity * 0.12),
    depthWrite: false,
  }));
  light.name = `resource3d:v10-vfx-light:${asset.key}`;
  light.position.y = vfxAudio.dangerShape === 'radius' ? 0.16 : 0.62;
  light.scale.setScalar(Math.max(0.42, vfxAudio.light.radius * 0.18));
  light.renderOrder = 32;
  light.userData = {
    resourceRuntimeVfxLight: true,
    color: vfxAudio.light.color,
    intensity: vfxAudio.light.intensity,
    radius: vfxAudio.light.radius,
    pulseHz: vfxAudio.light.pulseHz,
    baseOpacity: Math.min(0.34, 0.1 + vfxAudio.light.intensity * 0.12),
    baseScale: [light.scale.x, light.scale.y, light.scale.z],
  };
  return light;
}

function createRuntimeVfxDecal(asset: Resource3DAssetSpec): Mesh {
  const vfxAudio = asset.vfxAudio!;
  const decal = new Mesh(runtimeVfxDecalGeometry, new MeshBasicMaterial({
    color: decalColor(vfxAudio.decal.kind, asset.palette[3]),
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: DoubleSide,
  }));
  decal.name = `resource3d:v10-vfx-decal:${asset.key}`;
  decal.rotation.x = -Math.PI / 2;
  decal.position.y = 0.024;
  decal.scale.setScalar(Math.max(0.82, asset.placement.footprintRadius * 1.6));
  decal.renderOrder = -6;
  decal.userData = {
    resourceRuntimeVfxDecal: true,
    decalKind: vfxAudio.decal.kind,
    lifetimeMs: vfxAudio.decal.lifetimeMs,
    dangerShape: vfxAudio.dangerShape,
    baseOpacity: 0.22,
    baseScale: [decal.scale.x, decal.scale.y, decal.scale.z],
  };
  return decal;
}

function decalColor(kind: ResourceVfxAudioSpec['decal']['kind'], fallback: string): string {
  switch (kind) {
    case 'scorch': return '#ff6a3d';
    case 'frost': return '#a8f4ff';
    case 'rune': return '#d8c8ff';
    case 'crack': return '#ffb35d';
    case 'mist': return '#8defff';
    case 'none':
    default: return fallback;
  }
}

function shouldCreateRuntimeFootprint(layer: Resource3DPlacementLayer): boolean {
  return layer === 'unit' || layer === 'building' || layer === 'prop' || layer === 'terrain';
}

function lodAnchorColor(layer: Resource3DPlacementLayer): string {
  switch (layer) {
    case 'terrain': return '#9fd66f';
    case 'prop': return '#d8bd7e';
    case 'building': return '#ffcf75';
    case 'unit': return '#b6d9ff';
    case 'projectile': return '#ff8a5a';
    case 'ui': return '#d4c8ff';
    case 'marker': return '#8defff';
    case 'fx':
    default: return '#f4e8c2';
  }
}

function resourceContactShadowOpacity(asset: Resource3DAssetSpec): number {
  const strongest = Math.max(...asset.parts.map((part) => resourceMaterialProfile(part.material, !!part.emissive).contactShadowOpacity));
  return Math.min(0.42, Math.max(0.16, strongest));
}

function resourceContactShadowRadius(asset: Resource3DAssetSpec): number {
  return Math.max(0.62, ...asset.parts.map((part) => {
    const x = Math.abs(part.position[0]) + part.scale[0] * 0.55;
    const z = Math.abs(part.position[2]) + part.scale[2] * 0.55;
    return Math.max(x, z);
  }));
}

function tagMotionPart(object: Object3D, part: Resource3DPartSpec): void {
  Object.assign(object.userData, resourcePartAnimationUserData(part), {
    basePosition: [object.position.x, object.position.y, object.position.z],
    baseRotation: [object.rotation.x, object.rotation.y, object.rotation.z],
    baseScale: [object.scale.x, object.scale.y, object.scale.z],
    runtimeMotionWeight: motionWeightForPart(part),
    runtimeMotionSurfaceReactive: isSurfaceReactivePart(part),
  });
}

export function resourcePartAnimationUserData(part: Resource3DPartSpec): ResourcePartAnimationUserData {
  return {
    resourcePart: true,
    partName: part.name,
    partKind: part.kind,
    partDetail: part.detail,
    partMaterial: part.material,
  };
}

function createTextures(asset: Resource3DAssetSpec): Record<Resource3DTextureChannel, Texture> {
  const out = {} as Record<Resource3DTextureChannel, Texture>;
  for (const channel of asset.textureChannels) {
    const texture = new CanvasTexture(drawTexture(asset.palette, asset.motif, channel, asset.texture));
    texture.name = `${asset.key}:${channel}:${asset.motif}`;
    texture.userData = { channel, motif: asset.motif, detailLevel: asset.texture.detailLevel, overlays: asset.texture.overlays };
    if (channel === 'albedo' || channel === 'emissive') texture.colorSpace = SRGBColorSpace;
    out[channel] = texture;
  }
  return out;
}

function drawTexture(
  palette: [string, string, string, string],
  motif: string,
  channel: Resource3DTextureChannel,
  spec: Resource3DTextureSpec,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const [primary, accent, dark, glow] = palette;

  const grad = ctx.createLinearGradient(0, 0, 128, 128);
  grad.addColorStop(0, channel === 'emissive' ? glow : accent);
  grad.addColorStop(0.5, channel === 'normal' ? '#8080ff' : primary);
  grad.addColorStop(1, channel === 'orm' ? '#5a4a34' : dark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  ctx.globalAlpha = channel === 'emissive' ? 0.7 : 0.32;
  ctx.strokeStyle = channel === 'normal' ? '#b8c2ff' : glow;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (motif.includes('ring') || motif.includes('rune') || motif.includes('portal')) {
    ctx.arc(64, 64, 34, 0, Math.PI * 2);
    ctx.moveTo(64, 18);
    ctx.lineTo(64, 110);
  } else if (motif.includes('blade') || motif.includes('arrow') || motif.includes('fang')) {
    ctx.moveTo(24, 104);
    ctx.lineTo(102, 26);
    ctx.moveTo(44, 112);
    ctx.lineTo(112, 54);
  } else if (motif.includes('tree') || motif.includes('needle') || motif.includes('forest')) {
    ctx.moveTo(64, 18);
    ctx.lineTo(34, 76);
    ctx.lineTo(52, 72);
    ctx.lineTo(26, 112);
    ctx.moveTo(64, 18);
    ctx.lineTo(96, 76);
    ctx.lineTo(78, 72);
    ctx.lineTo(104, 112);
  } else if (motif.includes('lightning')) {
    ctx.moveTo(38, 16);
    ctx.lineTo(64, 54);
    ctx.lineTo(50, 54);
    ctx.lineTo(86, 112);
  } else {
    ctx.moveTo(22, 86);
    ctx.quadraticCurveTo(64, 22, 106, 86);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#ffffff';
  for (let y = 10; y < 128; y += 22) ctx.fillRect((y * 5) % 50, y, 112, 3);
  drawTextureOverlays(ctx, palette, motif, channel, spec);
  return canvas;
}

function drawTextureOverlays(
  ctx: CanvasRenderingContext2D,
  palette: [string, string, string, string],
  motif: string,
  channel: Resource3DTextureChannel,
  spec: Resource3DTextureSpec,
): void {
  const [, accent, dark, glow] = palette;
  if (spec.overlays.includes('microGrain')) {
    ctx.globalAlpha = channel === 'normal' ? 0.08 : 0.12;
    ctx.fillStyle = channel === 'orm' ? '#ffffff' : dark;
    const step = Math.max(4, 13 - spec.detailLevel * 2);
    for (let y = 4; y < 128; y += step) {
      for (let x = (y * 7) % step; x < 128; x += step) {
        ctx.fillRect(x, y, 1.2, 1.2);
      }
    }
  }
  if (spec.overlays.includes('rimTrim')) {
    ctx.globalAlpha = channel === 'emissive' ? 0.38 : 0.22;
    ctx.strokeStyle = channel === 'normal' ? '#9aa8ff' : accent;
    ctx.lineWidth = 5;
    ctx.strokeRect(9, 9, 110, 110);
    ctx.globalAlpha *= 0.8;
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, 92, 92);
  }
  if (spec.overlays.includes('motifInk')) {
    ctx.globalAlpha = channel === 'emissive' ? 0.5 : 0.24;
    ctx.strokeStyle = channel === 'orm' ? '#c8c8c8' : glow;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (motif.includes('shield') || motif.includes('tower') || motif.includes('defense')) {
      ctx.moveTo(64, 22);
      ctx.lineTo(98, 42);
      ctx.lineTo(88, 94);
      ctx.lineTo(64, 110);
      ctx.lineTo(40, 94);
      ctx.lineTo(30, 42);
      ctx.closePath();
    } else if (motif.includes('water') || motif.includes('river') || motif.includes('pool')) {
      for (let y = 40; y <= 88; y += 16) {
        ctx.moveTo(26, y);
        ctx.bezierCurveTo(45, y - 11, 61, y + 11, 82, y);
        ctx.bezierCurveTo(96, y - 7, 105, y - 4, 114, y);
      }
    } else {
      ctx.moveTo(32, 64);
      ctx.lineTo(64, 28);
      ctx.lineTo(96, 64);
      ctx.lineTo(64, 100);
      ctx.closePath();
    }
    ctx.stroke();
  }
  if (spec.overlays.includes('edgeWear')) {
    ctx.globalAlpha = channel === 'normal' ? 0.12 : 0.18;
    ctx.strokeStyle = channel === 'orm' ? '#303030' : '#ffffff';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < spec.detailLevel + 4; i++) {
      const x = 12 + ((i * 23) % 96);
      const y = 12 + ((i * 31) % 96);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 10, y + ((i % 2) * 2 - 1) * 5);
      ctx.stroke();
    }
  }
  if (spec.overlays.includes('emissiveHotspots')) {
    ctx.globalAlpha = channel === 'emissive' ? 0.78 : 0.1;
    ctx.fillStyle = glow;
    for (let i = 0; i < Math.max(3, spec.detailLevel); i++) {
      const x = 26 + ((i * 29) % 76);
      const y = 28 + ((i * 37) % 72);
      ctx.beginPath();
      ctx.arc(x, y, 4 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (spec.overlays.includes('materialMask')) {
    ctx.globalAlpha = channel === 'orm' ? 0.2 : 0.06;
    ctx.fillStyle = channel === 'orm' ? '#101010' : '#ffffff';
    ctx.fillRect(0, 0, 128, 8);
    ctx.fillRect(0, 120, 128, 8);
  }
  ctx.globalAlpha = 1;
}
