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
  Resource3DMaterialKind,
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
  Object.assign(object.userData, resourcePartAnimationUserData(part));
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
