import {
  AdditiveBlending,
  AnimationClip,
  BackSide,
  CapsuleGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  FrontSide,
  Group,
  LoopOnce,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NumberKeyframeTrack,
  Object3D,
  Quaternion,
  QuaternionKeyframeTrack,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  TorusGeometry,
  Vector3,
  VectorKeyframeTrack,
} from 'three';
import type { Hero3DActionName, Hero3DAssetSpec, Hero3DMaterialKind, Hero3DPartSpec, Hero3DTextureChannel, Hero3DTextureSpec } from './hero3dAssets';

export interface Hero3DModel {
  root: Group;
  textures: Record<Hero3DTextureChannel, Texture>;
  clips: AnimationClip[];
}

export interface HeroMaterialSurfaceProfile {
  roughness: number;
  metalness: number;
  emissiveIntensity: number;
  normalIntensity: number;
  rimLightIntensity: number;
  contactShadowOpacity: number;
  wearIntensity: number;
}

export interface HeroRuntimeActionUserData {
  heroRuntimeAction: true;
  heroKey: string;
  actionNames: Hero3DActionName[];
  actionDurations: Record<Hero3DActionName, number>;
  actionStates: Record<Hero3DActionName, HeroRuntimeActionState>;
  activeAction: Hero3DActionName;
  runtimeHelper: 'updateHeroRuntimePresentation';
}

export interface HeroRuntimeSurfaceUserData {
  heroRuntimeSurface: true;
  heroKey: string;
  shaderIntent: HeroRuntimeSurfaceShaderIntent;
  materialCount: number;
  glintLayerCount: number;
  runtimeHelper: 'updateHeroRuntimePresentation';
}

export interface HeroGameplayModelQualityUserData {
  tunedFor: 'play-3d-default-camera';
  cameraFov: 40;
  defaultZoom: 0.62;
  pitchRadians: number;
  heroModelScale: 1.5;
  refinementLayer: 'v19-gameplay-camera-detail';
  refinementLayerParts: number;
  coreMaterialContrastBands: number;
  roundedReadableParts: number;
  primarySilhouetteParts: number;
  secondarySilhouetteParts: number;
  runtimeHelper: 'createHero3DModel';
}

type HeroRuntimeActionState = 'idle' | 'locomotion' | 'attack' | 'cast' | 'channel' | 'status' | 'hit' | 'death';
type HeroRuntimeSurfaceShaderIntent =
  | 'hero-armor-rim-sweep'
  | 'hero-arcane-fresnel'
  | 'hero-cloth-breathe'
  | 'hero-shadow-veil'
  | 'hero-stone-weight';
type HeroGameplayGeometryProfile =
  | 'tapered-rounded-body'
  | 'rounded-head-volume'
  | 'beveled-shoulder-cap'
  | 'curved-cloth-panel'
  | 'rounded-weapon-line'
  | 'extruded-beveled-plate'
  | 'raised-sigil-ring'
  | 'polished-orb-volume'
  | 'soft-ground-aura';
type HeroGameplaySilhouetteWeight = 'primary' | 'secondary' | 'accent';

const geometryCache = {
  'tapered-rounded-body': new CapsuleGeometry(0.48, 0.78, 6, 16),
  'rounded-head-volume': new SphereGeometry(0.5, 16, 12),
  'beveled-shoulder-cap': new ConeGeometry(0.52, 0.42, 12),
  'curved-cloth-panel': new CylinderGeometry(0.58, 0.48, 0.12, 24, 1, true, Math.PI * 0.14, Math.PI * 1.72),
  'rounded-weapon-line': new CylinderGeometry(0.08, 0.11, 1, 14),
  'extruded-beveled-plate': createExtrudedPlateGeometry(),
  'raised-sigil-ring': new TorusGeometry(0.5, 0.055, 12, 48),
  'polished-orb-volume': new SphereGeometry(0.5, 16, 12),
  'soft-ground-aura': new CylinderGeometry(0.5, 0.5, 0.04, 48),
};

const contactShadowGeometry = new CylinderGeometry(1, 1, 0.012, 48);

function createExtrudedPlateGeometry(): ExtrudeGeometry {
  const shape = new Shape();
  const halfWidth = 0.5;
  const halfHeight = 0.64;
  const radius = 0.16;
  shape.moveTo(-halfWidth + radius, -halfHeight);
  shape.lineTo(halfWidth - radius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius);
  shape.lineTo(halfWidth, halfHeight - radius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight);
  shape.lineTo(-halfWidth + radius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius);
  shape.lineTo(-halfWidth, -halfHeight + radius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight);
  return new ExtrudeGeometry(shape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.045,
    bevelSegments: 3,
    curveSegments: 8,
  });
}

export function createHero3DModel(asset: Hero3DAssetSpec): Hero3DModel {
  const root = new Group();
  root.name = `hero3d:${asset.key}`;
  root.scale.setScalar(asset.model.scale);
  root.userData = {
    heroKey: asset.key,
    silhouette: asset.model.silhouette,
    actions: asset.actions.map((action) => action.name),
    surfaceRealism: {
      contactShadow: true,
      contactShadowOpacity: heroContactShadowOpacity(asset),
      contactShadowRadius: asset.model.groundRadius,
    },
    basePosition: [0, 0, 0],
    baseRotation: [0, 0, 0],
    baseScale: [asset.model.scale, asset.model.scale, asset.model.scale],
  };

  const textures = createTextures(asset);
  root.add(createHeroContactShadow(asset));
  for (const part of asset.model.parts) root.add(createPartObject(part, textures));
  root.userData.runtimeAction = heroRuntimeActionUserData(asset);
  root.userData.runtimeSurface = heroRuntimeSurfaceUserData(asset, root);
  root.userData.gameplayModelQuality = heroGameplayModelQualityUserData(asset);
  const clips = asset.actions.map((action) => createHeroClip(asset.key, action.name, action.duration, action.motion));
  return { root, textures, clips };
}

export function heroRuntimeActionUserData(asset: Hero3DAssetSpec): HeroRuntimeActionUserData {
  const actionDurations = {} as Record<Hero3DActionName, number>;
  const actionStates = {} as Record<Hero3DActionName, HeroRuntimeActionState>;
  for (const action of asset.actions) {
    actionDurations[action.name] = action.duration;
    actionStates[action.name] = heroRuntimeActionState(action.name);
  }
  return {
    heroRuntimeAction: true,
    heroKey: asset.key,
    actionNames: asset.actions.map((action) => action.name),
    actionDurations,
    actionStates,
    activeAction: 'idle',
    runtimeHelper: 'updateHeroRuntimePresentation',
  };
}

export function heroRuntimeSurfaceUserData(asset: Hero3DAssetSpec, root?: Object3D): HeroRuntimeSurfaceUserData {
  const counts = root ? countRuntimeHeroMaterials(root) : { materialCount: 0, glintLayerCount: 0 };
  return {
    heroRuntimeSurface: true,
    heroKey: asset.key,
    shaderIntent: heroRuntimeSurfaceShaderIntent(asset),
    materialCount: counts.materialCount,
    glintLayerCount: counts.glintLayerCount,
    runtimeHelper: 'updateHeroRuntimePresentation',
  };
}

export function heroGameplayModelQualityUserData(asset: Hero3DAssetSpec): HeroGameplayModelQualityUserData {
  const weights = asset.model.parts.map((part) => heroGameplaySilhouetteWeight(part));
  const refinementParts = asset.model.parts.filter((part) => part.name.startsWith('v19 '));
  const materialBands = new Set(refinementParts.map((part) => part.material ?? 'leather'));
  return {
    tunedFor: 'play-3d-default-camera',
    cameraFov: 40,
    defaultZoom: 0.62,
    pitchRadians: Math.PI * 0.31,
    heroModelScale: 1.5,
    refinementLayer: 'v19-gameplay-camera-detail',
    refinementLayerParts: refinementParts.length,
    coreMaterialContrastBands: materialBands.size,
    roundedReadableParts: asset.model.parts.length,
    primarySilhouetteParts: weights.filter((weight) => weight === 'primary').length,
    secondarySilhouetteParts: weights.filter((weight) => weight === 'secondary').length,
    runtimeHelper: 'createHero3DModel',
  };
}

export function updateHeroRuntimePresentation(root: Group, actionName: Hero3DActionName = 'idle', elapsedMs = 0): void {
  const runtime = root.userData.runtimeAction as HeroRuntimeActionUserData | undefined;
  const surface = root.userData.runtimeSurface as HeroRuntimeSurfaceUserData | undefined;
  if (!runtime?.heroRuntimeAction || !surface?.heroRuntimeSurface) return;

  const activeAction = runtime.actionNames.includes(actionName) ? actionName : 'idle';
  const state = runtime.actionStates[activeAction] ?? heroRuntimeActionState(activeAction);
  const duration = Math.max(0.1, runtime.actionDurations[activeAction] ?? 1);
  const t = elapsedMs / 1000;
  const progress = activeAction === 'death' ? clamp(elapsedMs / (duration * 1000), 0, 1) : (elapsedMs % (duration * 1000)) / (duration * 1000);
  const wave = (Math.sin(t * Math.PI * 2.2) + 1) / 2;
  const actionPulse = heroRuntimeActionPulse(state, progress, wave);

  runtime.activeAction = activeAction;
  root.userData.runtimeActionState = state;
  root.userData.runtimeActionPulse = actionPulse;
  root.userData.runtimeActionStatusJitter = state === 'status' ? 0.03 + Math.abs(Math.sin(t * 18)) * 0.08 : 0;

  const basePosition = root.userData.basePosition ?? [0, 0, 0];
  const baseRotation = root.userData.baseRotation ?? [0, 0, 0];
  const baseScale = root.userData.baseScale ?? [root.scale.x, root.scale.y, root.scale.z];
  root.position.set(basePosition[0], basePosition[1] + heroRuntimeYOffset(state, progress, wave), basePosition[2]);
  root.rotation.set(
    baseRotation[0] + (state === 'death' ? progress * 1.28 : 0),
    baseRotation[1] + heroRuntimeYaw(state, progress, wave),
    baseRotation[2] + heroRuntimeRoll(state, progress, wave),
  );
  const squash = heroRuntimeScale(state, progress, wave, actionPulse);
  root.scale.set(baseScale[0] * squash.x, baseScale[1] * squash.y, baseScale[2] * squash.z);

  let animatedParts = 0;
  root.traverse((obj) => {
    if (!obj.userData.heroRuntimePart) return;
    updateHeroRuntimePart(obj, state, progress, wave, actionPulse);
    animatedParts++;
  });

  let animatedMaterials = 0;
  let glintLayers = 0;
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const material of materials) {
      if (material instanceof MeshStandardMaterial || material instanceof MeshBasicMaterial) {
        if (updateHeroRuntimeMaterial(material, surface.shaderIntent, state, actionPulse, wave)) animatedMaterials++;
        if (material.userData.heroRuntimeGlintLayer) glintLayers++;
      }
    }
  });

  root.userData.runtimeActionAnimated = true;
  root.userData.runtimeActionClockMs = elapsedMs;
  root.userData.runtimeActionAnimatedParts = animatedParts;
  root.userData.runtimeSurfaceAnimated = true;
  root.userData.runtimeSurfaceClockMs = elapsedMs;
  root.userData.runtimeSurfaceAnimatedMaterials = animatedMaterials;
  root.userData.runtimeSurfaceGlintLayers = glintLayers;
  root.userData.runtimeSurfaceShaderIntent = surface.shaderIntent;
}

function createPartObject(part: Hero3DPartSpec, textures: Record<Hero3DTextureChannel, Texture>): Object3D {
  const materialProfile = heroMaterialSurfaceProfile(part.material);
  const material = new MeshStandardMaterial({
    color: new Color(part.color),
    roughness: materialProfile.roughness,
    metalness: materialProfile.metalness,
    map: part.kind === 'aura' ? null : textures.albedo,
    normalMap: part.kind === 'aura' ? null : textures.normal,
    roughnessMap: part.kind === 'aura' ? null : textures.orm,
    emissive: new Color(part.emissive ?? '#000000'),
    emissiveMap: part.emissive ? textures.emissive : null,
    emissiveIntensity: part.emissive ? materialProfile.emissiveIntensity : 0,
    flatShading: false,
    transparent: part.kind === 'aura' || part.material === 'energy',
    opacity: part.kind === 'aura' ? 0.72 : part.material === 'energy' ? 0.88 : 1,
    side: part.kind === 'aura' ? DoubleSide : FrontSide,
  });
  material.normalScale.setScalar(materialProfile.normalIntensity);
  material.envMapIntensity = materialProfile.rimLightIntensity;
  material.userData.surfaceProfile = materialProfile;
  tagHeroRuntimeMaterial(material, part, materialProfile, 'core');
  const mesh = new Mesh(geometryFor(part), material);
  mesh.name = part.name;
  mesh.userData.kind = part.kind;
  mesh.position.set(...part.position);
  mesh.scale.set(...part.scale);
  if (part.rotation) mesh.rotation.set(...part.rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  if (part.kind === 'aura') {
    tagHeroRuntimePart(mesh, part, materialProfile);
    return mesh;
  }

  const group = new Group();
  group.name = `polished:${part.name}`;
  group.add(mesh);

  const outlineMaterial = new MeshBasicMaterial({
    color: '#050607',
    side: BackSide,
    transparent: true,
    opacity: part.kind === 'orb' || part.kind === 'sigil' ? 0.32 : 0.46,
  });
  tagHeroRuntimeMaterial(outlineMaterial, part, materialProfile, 'outline');
  const outline = new Mesh(geometryFor(part), outlineMaterial);
  outline.position.copy(mesh.position);
  outline.rotation.copy(mesh.rotation);
  outline.scale.copy(mesh.scale).multiplyScalar(part.kind === 'weapon' || part.kind === 'offhand' ? 1.08 : 1.045);
  outline.renderOrder = -1;
  group.add(outline);

  if (part.emissive) {
    const glowMaterial = new MeshBasicMaterial({
      color: part.emissive,
      blending: AdditiveBlending,
      transparent: true,
      opacity: part.kind === 'orb' || part.kind === 'sigil' ? 0.34 : 0.18,
      depthWrite: false,
    });
    tagHeroRuntimeMaterial(glowMaterial, part, materialProfile, 'emissive-glow');
    const glow = new Mesh(geometryFor(part), glowMaterial);
    glow.position.copy(mesh.position);
    glow.rotation.copy(mesh.rotation);
    glow.scale.copy(mesh.scale).multiplyScalar(part.kind === 'orb' || part.kind === 'sigil' ? 1.32 : 1.14);
    group.add(glow);
  }
  if (materialProfile.rimLightIntensity >= 0.58) {
    const glintMaterial = new MeshBasicMaterial({
      color: part.emissive ?? part.color,
      blending: AdditiveBlending,
      transparent: true,
      opacity: Math.min(0.28, 0.09 + materialProfile.rimLightIntensity * 0.17),
      depthWrite: false,
    });
    tagHeroRuntimeMaterial(glintMaterial, part, materialProfile, 'rim-glint');
    const glint = new Mesh(geometryFor(part), glintMaterial);
    glint.name = `v6-surface-glint:${part.name}`;
    glint.position.copy(mesh.position);
    glint.rotation.copy(mesh.rotation);
    glint.scale.copy(mesh.scale).multiplyScalar(1.024);
    group.add(glint);
  }

  tagHeroRuntimePart(group, part, materialProfile);
  return group;
}

function heroGameplayGeometryProfile(part: Hero3DPartSpec): HeroGameplayGeometryProfile {
  if (part.kind === 'body') return 'tapered-rounded-body';
  if (part.kind === 'head') return 'rounded-head-volume';
  if (part.kind === 'shoulder') return 'beveled-shoulder-cap';
  if (part.kind === 'cape') return 'curved-cloth-panel';
  if (part.kind === 'weapon') return 'rounded-weapon-line';
  if (part.kind === 'offhand') return 'extruded-beveled-plate';
  if (part.kind === 'sigil') return 'raised-sigil-ring';
  if (part.kind === 'orb') return 'polished-orb-volume';
  return 'soft-ground-aura';
}

function heroGameplaySilhouetteWeight(part: Hero3DPartSpec): HeroGameplaySilhouetteWeight {
  if (part.kind === 'body' || part.kind === 'head') return 'primary';
  if (part.kind === 'shoulder' || part.kind === 'weapon' || part.kind === 'offhand' || part.kind === 'cape') return 'secondary';
  return 'accent';
}

function geometryFor(part: Hero3DPartSpec) {
  return geometryCache[heroGameplayGeometryProfile(part)];
}

function tagHeroRuntimePart(obj: Object3D, part: Hero3DPartSpec, materialProfile: HeroMaterialSurfaceProfile): void {
  const geometryProfile = heroGameplayGeometryProfile(part);
  obj.userData.heroRuntimePart = true;
  obj.userData.partName = part.name;
  obj.userData.partKind = part.kind;
  obj.userData.partMaterial = part.material ?? 'leather';
  obj.userData.partDetail = part.detail ?? 'engraving';
  obj.userData.gameplayGeometryProfile = geometryProfile;
  obj.userData.gameplaySilhouetteWeight = heroGameplaySilhouetteWeight(part);
  obj.userData.gameplayCameraRead = true;
  obj.userData.roundedReadableGameplayPiece = geometryProfile !== 'soft-ground-aura';
  obj.userData.runtimeActionReactive = part.kind !== 'body' || !!part.emissive || materialProfile.rimLightIntensity >= 0.58;
  obj.userData.basePosition = [obj.position.x, obj.position.y, obj.position.z];
  obj.userData.baseRotation = [obj.rotation.x, obj.rotation.y, obj.rotation.z];
  obj.userData.baseScale = [obj.scale.x, obj.scale.y, obj.scale.z];
}

function tagHeroRuntimeMaterial(
  material: MeshStandardMaterial | MeshBasicMaterial,
  part: Hero3DPartSpec,
  materialProfile: HeroMaterialSurfaceProfile,
  surfaceRole: 'core' | 'outline' | 'emissive-glow' | 'rim-glint',
): void {
  material.userData.heroRuntimeSurfaceMaterial = true;
  material.userData.surfaceRole = surfaceRole;
  material.userData.partName = part.name;
  material.userData.partKind = part.kind;
  material.userData.partMaterial = part.material ?? 'leather';
  material.userData.partDetail = part.detail ?? 'engraving';
  material.userData.runtimeActionReactive = part.kind !== 'body' || !!part.emissive || materialProfile.rimLightIntensity >= 0.58;
  material.userData.heroRuntimeGlintLayer = surfaceRole === 'rim-glint' || surfaceRole === 'emissive-glow';
  material.userData.baseOpacity = material.opacity;
  if (material instanceof MeshStandardMaterial) {
    material.userData.baseRoughness = material.roughness;
    material.userData.baseMetalness = material.metalness;
    material.userData.baseEmissiveIntensity = material.emissiveIntensity;
    material.userData.baseEnvMapIntensity = material.envMapIntensity;
    material.userData.baseNormalIntensity = material.normalScale.x;
  }
}

function countRuntimeHeroMaterials(root: Object3D): { materialCount: number; glintLayerCount: number } {
  let materialCount = 0;
  let glintLayerCount = 0;
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const material of materials) {
      if (
        (material instanceof MeshStandardMaterial || material instanceof MeshBasicMaterial) &&
        material.userData.heroRuntimeSurfaceMaterial
      ) {
        materialCount++;
        if (material.userData.heroRuntimeGlintLayer) glintLayerCount++;
      }
    }
  });
  return { materialCount, glintLayerCount };
}

function heroRuntimeSurfaceShaderIntent(asset: Hero3DAssetSpec): HeroRuntimeSurfaceShaderIntent {
  const read = `${asset.classicArchetype} ${asset.model.silhouette} ${asset.readability.primaryRead}`.toLowerCase();
  if (read.includes('shadow') || read.includes('stealth') || read.includes('warlock')) return 'hero-shadow-veil';
  if (read.includes('stone') || read.includes('earthquake') || read.includes('totem')) return 'hero-stone-weight';
  if (read.includes('shield') || read.includes('tank') || read.includes('hook') || read.includes('blade')) return 'hero-armor-rim-sweep';
  if (read.includes('ice') || read.includes('lightning') || read.includes('mage') || read.includes('holy') || read.includes('healer')) return 'hero-arcane-fresnel';
  return 'hero-cloth-breathe';
}

function heroRuntimeActionState(actionName: Hero3DActionName): HeroRuntimeActionState {
  if (actionName === 'walk') return 'locomotion';
  if (actionName === 'attack') return 'attack';
  if (actionName === 'channel') return 'channel';
  if (actionName === 'hit') return 'hit';
  if (actionName === 'death') return 'death';
  if (actionName === 'stunned' || actionName === 'invisible') return 'status';
  if (actionName.startsWith('cast_')) return 'cast';
  return 'idle';
}

function heroRuntimeActionPulse(state: HeroRuntimeActionState, progress: number, wave: number): number {
  if (state === 'attack') return Math.sin(Math.PI * clamp(progress, 0, 1));
  if (state === 'cast') return 0.58 + Math.sin(Math.PI * clamp(progress, 0, 1)) * 0.58;
  if (state === 'channel') return 0.44 + wave * 0.52;
  if (state === 'hit') return 0.72 + (1 - progress) * 0.4;
  if (state === 'status') return 0.34 + wave * 0.36;
  if (state === 'death') return 1 - progress * 0.45;
  if (state === 'locomotion') return 0.28 + wave * 0.24;
  return 0.16 + wave * 0.16;
}

function heroRuntimeYOffset(state: HeroRuntimeActionState, progress: number, wave: number): number {
  if (state === 'cast') return 0.08 + Math.sin(Math.PI * progress) * 0.2;
  if (state === 'channel') return 0.05 + wave * 0.12;
  if (state === 'locomotion') return wave * 0.08;
  if (state === 'hit') return -0.04 * (1 - progress);
  if (state === 'death') return -0.55 * progress;
  return wave * 0.035;
}

function heroRuntimeYaw(state: HeroRuntimeActionState, progress: number, wave: number): number {
  if (state === 'cast') return Math.sin(Math.PI * progress) * 0.36;
  if (state === 'attack') return -Math.sin(Math.PI * progress) * 0.24;
  if (state === 'channel') return Math.sin(wave * Math.PI * 2) * 0.08;
  if (state === 'status') return Math.sin(wave * Math.PI * 2) * 0.12;
  return 0;
}

function heroRuntimeRoll(state: HeroRuntimeActionState, progress: number, wave: number): number {
  if (state === 'hit') return -0.16 * (1 - progress);
  if (state === 'attack') return -Math.sin(Math.PI * progress) * 0.18;
  if (state === 'status') return Math.sin(wave * Math.PI * 2) * 0.045;
  return 0;
}

function heroRuntimeScale(
  state: HeroRuntimeActionState,
  progress: number,
  wave: number,
  actionPulse: number,
): { x: number; y: number; z: number } {
  if (state === 'death') return { x: 1 + progress * 0.08, y: 1 - progress * 0.24, z: 1 + progress * 0.08 };
  if (state === 'hit') return { x: 1.04, y: 0.96, z: 1.04 };
  if (state === 'attack') return { x: 1 + actionPulse * 0.06, y: 1 - actionPulse * 0.035, z: 1 + actionPulse * 0.06 };
  if (state === 'cast' || state === 'channel') return { x: 1 + actionPulse * 0.035, y: 1 + actionPulse * 0.07, z: 1 + actionPulse * 0.035 };
  if (state === 'locomotion') return { x: 1 + wave * 0.02, y: 1 + wave * 0.04, z: 1 - wave * 0.015 };
  return { x: 1, y: 1 + wave * 0.018, z: 1 };
}

function updateHeroRuntimePart(
  obj: Object3D,
  state: HeroRuntimeActionState,
  progress: number,
  wave: number,
  actionPulse: number,
): void {
  const basePosition = obj.userData.basePosition ?? [obj.position.x, obj.position.y, obj.position.z];
  const baseRotation = obj.userData.baseRotation ?? [obj.rotation.x, obj.rotation.y, obj.rotation.z];
  const baseScale = obj.userData.baseScale ?? [obj.scale.x, obj.scale.y, obj.scale.z];
  const kind = obj.userData.partKind as Hero3DPartSpec['kind'] | undefined;
  const reactive = !!obj.userData.runtimeActionReactive;

  obj.position.set(basePosition[0], basePosition[1], basePosition[2]);
  obj.rotation.set(baseRotation[0], baseRotation[1], baseRotation[2]);
  obj.scale.set(baseScale[0], baseScale[1], baseScale[2]);
  if (!reactive) return;

  if (state === 'attack' && (kind === 'weapon' || kind === 'offhand')) {
    obj.rotation.z += -0.34 * actionPulse;
    obj.position.x += (kind === 'weapon' ? 0.06 : -0.04) * actionPulse;
  } else if ((state === 'cast' || state === 'channel') && (kind === 'orb' || kind === 'sigil' || kind === 'aura')) {
    const lift = state === 'channel' ? 0.08 + wave * 0.08 : actionPulse * 0.12;
    obj.position.y += lift;
    obj.rotation.y += (0.16 + actionPulse * 0.22) * (kind === 'sigil' ? 1 : -1);
    obj.scale.multiplyScalar(1 + actionPulse * 0.08);
  } else if (state === 'status') {
    obj.rotation.y += Math.sin(wave * Math.PI * 2) * 0.05;
    if (kind === 'orb' || kind === 'sigil') obj.scale.multiplyScalar(1 + wave * 0.08);
  } else if (state === 'death') {
    obj.position.y -= progress * 0.08;
    obj.rotation.x += progress * 0.12;
  }
}

function updateHeroRuntimeMaterial(
  material: MeshStandardMaterial | MeshBasicMaterial,
  shaderIntent: HeroRuntimeSurfaceShaderIntent,
  state: HeroRuntimeActionState,
  actionPulse: number,
  wave: number,
): boolean {
  if (!material.userData.heroRuntimeSurfaceMaterial) return false;
  const baseOpacity = material.userData.baseOpacity ?? material.opacity;
  const invisibleFactor = state === 'status' && material.userData.surfaceRole !== 'outline' ? 0.44 : 1;
  const deathFactor = state === 'death' ? 0.72 : 1;
  const glintBoost = material.userData.heroRuntimeGlintLayer ? 0.2 + wave * 0.22 + actionPulse * 0.16 : 0;
  material.transparent = material.transparent || invisibleFactor < 1 || deathFactor < 1 || material.userData.heroRuntimeGlintLayer;
  material.opacity = clamp(baseOpacity * invisibleFactor * deathFactor + glintBoost, 0.05, material.userData.heroRuntimeGlintLayer ? 0.86 : 1);

  if (material instanceof MeshStandardMaterial) {
    const baseRoughness = material.userData.baseRoughness ?? material.roughness;
    const baseEmissive = material.userData.baseEmissiveIntensity ?? material.emissiveIntensity;
    const baseEnv = material.userData.baseEnvMapIntensity ?? material.envMapIntensity;
    const baseNormal = material.userData.baseNormalIntensity ?? material.normalScale.x;
    const intentBoost = shaderIntent === 'hero-arcane-fresnel' ? 0.18 : shaderIntent === 'hero-armor-rim-sweep' ? 0.12 : 0.08;
    material.roughness = clamp(baseRoughness - actionPulse * 0.08 - intentBoost * 0.12, 0.08, 0.95);
    material.emissiveIntensity = baseEmissive * (1 + actionPulse * 0.62 + intentBoost + wave * 0.08);
    material.envMapIntensity = baseEnv * (1 + actionPulse * 0.42 + intentBoost);
    material.normalScale.setScalar(baseNormal * (1 + wave * 0.08 + actionPulse * 0.06));
  }
  material.userData.runtimeHeroSurfacePulse = actionPulse;
  material.userData.runtimeHeroSurfaceShaderIntent = shaderIntent;
  return true;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createTextures(asset: Hero3DAssetSpec): Record<Hero3DTextureChannel, Texture> {
  const out = {} as Record<Hero3DTextureChannel, Texture>;
  for (const spec of asset.textures) {
    const texture = new CanvasTexture(drawTexture(spec));
    texture.name = `${asset.key}:${spec.channel}:${spec.motif}`;
    texture.userData = { channel: spec.channel, motif: spec.motif };
    if (spec.channel === 'albedo' || spec.channel === 'emissive') texture.colorSpace = SRGBColorSpace;
    out[spec.channel] = texture;
  }
  return out;
}

function drawTexture(spec: Hero3DTextureSpec): HTMLCanvasElement {
  const { palette, motif, overlays, detailLevel, channel } = spec;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 128, 128);
  grad.addColorStop(0, palette[1] ?? '#aaa');
  grad.addColorStop(0.42, palette[0] ?? '#888');
  grad.addColorStop(1, '#10130f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  drawOverlays(ctx, palette, overlays, detailLevel, channel);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = palette[2] ?? '#fff';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (motif.includes('lightning')) {
    ctx.moveTo(36, 14); ctx.lineTo(62, 55); ctx.lineTo(46, 55); ctx.lineTo(82, 116);
  } else if (motif.includes('snow')) {
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      ctx.moveTo(64, 64);
      ctx.lineTo(64 + Math.cos(a) * 48, 64 + Math.sin(a) * 48);
    }
  } else if (motif.includes('chain')) {
    for (let i = 0; i < 4; i++) ctx.ellipse(32 + i * 20, 64, 14, 8, i % 2 ? 0.7 : -0.7, 0, Math.PI * 2);
  } else if (motif.includes('blade')) {
    ctx.moveTo(20, 106); ctx.lineTo(108, 20); ctx.moveTo(34, 112); ctx.lineTo(116, 46);
  } else if (motif.includes('sun') || motif.includes('shield')) {
    ctx.arc(64, 64, 34, 0, Math.PI * 2);
    ctx.moveTo(64, 22); ctx.lineTo(64, 106); ctx.moveTo(22, 64); ctx.lineTo(106, 64);
  } else {
    ctx.moveTo(24, 88); ctx.quadraticCurveTo(64, 28, 104, 88);
  }
  ctx.stroke();
  return canvas;
}

export function heroMaterialSurfaceProfile(kind: Hero3DMaterialKind | undefined): HeroMaterialSurfaceProfile {
  switch (kind) {
    case 'metal': return { roughness: 0.32, metalness: 0.62, emissiveIntensity: 1.15, normalIntensity: 0.36, rimLightIntensity: 0.64, contactShadowOpacity: 0.34, wearIntensity: 0.34 };
    case 'crystal': return { roughness: 0.18, metalness: 0.08, emissiveIntensity: 1.75, normalIntensity: 0.5, rimLightIntensity: 0.8, contactShadowOpacity: 0.26, wearIntensity: 0.16 };
    case 'energy': return { roughness: 0.22, metalness: 0.02, emissiveIntensity: 1.95, normalIntensity: 0.28, rimLightIntensity: 0.94, contactShadowOpacity: 0.18, wearIntensity: 0.08 };
    case 'stone': return { roughness: 0.86, metalness: 0.02, emissiveIntensity: 0.9, normalIntensity: 0.66, rimLightIntensity: 0.14, contactShadowOpacity: 0.44, wearIntensity: 0.42 };
    case 'cloth': return { roughness: 0.82, metalness: 0.02, emissiveIntensity: 1.05, normalIntensity: 0.42, rimLightIntensity: 0.18, contactShadowOpacity: 0.3, wearIntensity: 0.14 };
    case 'shadow': return { roughness: 0.64, metalness: 0.12, emissiveIntensity: 1.5, normalIntensity: 0.5, rimLightIntensity: 0.48, contactShadowOpacity: 0.46, wearIntensity: 0.24 };
    case 'leather':
    default: return { roughness: 0.68, metalness: 0.08, emissiveIntensity: 1.1, normalIntensity: 0.48, rimLightIntensity: 0.22, contactShadowOpacity: 0.34, wearIntensity: 0.26 };
  }
}

function createHeroContactShadow(asset: Hero3DAssetSpec): Mesh {
  const shadow = new Mesh(contactShadowGeometry, new MeshBasicMaterial({
    color: '#020403',
    transparent: true,
    opacity: heroContactShadowOpacity(asset),
    depthWrite: false,
  }));
  shadow.name = `hero3d:v6-contact-shadow:${asset.key}`;
  shadow.position.y = 0.018;
  shadow.scale.set(asset.model.groundRadius, 1, asset.model.groundRadius * 0.84);
  shadow.receiveShadow = false;
  shadow.castShadow = false;
  shadow.renderOrder = -10;
  return shadow;
}

function heroContactShadowOpacity(asset: Hero3DAssetSpec): number {
  const strongest = Math.max(...asset.model.parts.map((part) => heroMaterialSurfaceProfile(part.material).contactShadowOpacity));
  return Math.min(0.46, Math.max(0.18, strongest));
}

function drawOverlays(
  ctx: CanvasRenderingContext2D,
  palette: string[],
  overlays: string[],
  detailLevel: number,
  channel: Hero3DTextureChannel,
): void {
  const [primary, accent, dark, glow] = palette;
  const density = Math.max(1, detailLevel);
  if (overlays.includes('paint-strokes') || overlays.includes('cloth-grain')) {
    ctx.fillStyle = accent ?? '#ddd';
    ctx.globalAlpha = channel === 'normal' ? 0.16 : 0.28;
    for (let y = 0; y < 128; y += Math.max(8, 18 - density * 3)) {
      ctx.fillRect((y * 3) % 40, y + 3, 128, 3 + density);
    }
  }
  if (overlays.includes('rim-trim') || overlays.includes('beveled-edges') || overlays.includes('worn-edges')) {
    ctx.globalAlpha = channel === 'orm' ? 0.42 : 0.24;
    ctx.strokeStyle = glow ?? accent ?? '#fff';
    ctx.lineWidth = 2 + density;
    ctx.strokeRect(7, 7, 114, 114);
    ctx.strokeRect(17, 17, 94, 94);
  }
  if (overlays.includes('micro-speckles') || overlays.includes('roughness-noise')) {
    ctx.globalAlpha = channel === 'orm' ? 0.34 : 0.18;
    ctx.fillStyle = dark ?? primary ?? '#fff';
    for (let i = 0; i < 80 * density; i++) {
      const x = (i * 37) % 128;
      const y = (i * 53) % 128;
      ctx.fillRect(x, y, 1 + (i % 2), 1 + ((i >> 1) % 2));
    }
  }
  if (overlays.includes('raised-runes') || overlays.includes('pulse-veins') || overlays.includes('sigil-hotspots')) {
    ctx.globalAlpha = channel === 'emissive' ? 0.76 : 0.24;
    ctx.strokeStyle = glow ?? accent ?? '#fff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const r = 14 + i * 10;
      ctx.beginPath();
      ctx.arc(64, 64, r, i * 0.28, Math.PI * 1.55 + i * 0.28);
      ctx.stroke();
    }
  }
  if (overlays.includes('metal-mask')) {
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = accent ?? '#aaa';
    for (let x = -128; x < 128; x += 22) {
      ctx.save();
      ctx.translate(x, 0);
      ctx.rotate(-0.42);
      ctx.fillRect(0, 0, 8, 190);
      ctx.restore();
    }
  }
}

function createHeroClip(
  key: string,
  name: Hero3DActionName,
  duration: number,
  motion: 'loop' | 'strike' | 'cast' | 'channel' | 'flinch' | 'status' | 'fall',
): AnimationClip {
  const tracks = [];
  if (motion === 'loop') {
    const amp = name === 'walk' ? 0.18 : 0.06;
    tracks.push(new VectorKeyframeTrack('.position', [0, duration / 2, duration], [0, 0, 0, 0, amp, 0, 0, 0, 0]));
    tracks.push(new NumberKeyframeTrack('.rotation[y]', [0, duration / 2, duration], [0, name === 'walk' ? 0.18 : 0.05, 0]));
  } else if (motion === 'strike') {
    tracks.push(new NumberKeyframeTrack('.rotation[z]', [0, duration * 0.42, duration], [0, -0.32, 0]));
    tracks.push(new VectorKeyframeTrack('.scale', [0, duration * 0.42, duration], [1, 1, 1, 1.06, 0.96, 1.06, 1, 1, 1]));
  } else if (motion === 'cast') {
    tracks.push(new VectorKeyframeTrack('.position', [0, duration * 0.45, duration], [0, 0, 0, 0, 0.22, 0, 0, 0, 0]));
    tracks.push(new NumberKeyframeTrack('.rotation[y]', [0, duration * 0.45, duration], [0, 0.42, 0]));
  } else if (motion === 'channel') {
    tracks.push(new VectorKeyframeTrack('.position', [0, duration * 0.33, duration * 0.66, duration], [0, 0, 0, 0, 0.18, 0, 0, 0.02, 0, 0, 0, 0]));
    tracks.push(new NumberKeyframeTrack('.rotation[y]', [0, duration * 0.5, duration], [0, 0.16, 0]));
    tracks.push(new VectorKeyframeTrack('.scale', [0, duration * 0.5, duration], [1, 1, 1, 1.04, 1.08, 1.04, 1, 1, 1]));
  } else if (motion === 'flinch') {
    tracks.push(new VectorKeyframeTrack('.position', [0, duration * 0.35, duration], [0, 0, 0, -0.12, 0, 0.08, 0, 0, 0]));
  } else if (motion === 'status') {
    tracks.push(new VectorKeyframeTrack('.position', [0, duration * 0.5, duration], [0, 0, 0, 0, 0.1, 0, 0, 0, 0]));
    tracks.push(new NumberKeyframeTrack('.rotation[y]', [0, duration * 0.5, duration], [0, 0.28, 0]));
  } else {
    const q0 = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0);
    const q1 = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
    tracks.push(new QuaternionKeyframeTrack('.quaternion', [0, duration], [...q0.toArray(), ...q1.toArray()]));
    tracks.push(new VectorKeyframeTrack('.position', [0, duration], [0, 0, 0, 0, -0.55, 0]));
  }
  const clip = new AnimationClip(`${key}:${name}`, duration, tracks);
  if (motion !== 'loop' && motion !== 'channel' && motion !== 'status') clip.userData = { loop: LoopOnce };
  return clip;
}
