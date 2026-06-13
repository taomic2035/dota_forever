import {
  AdditiveBlending,
  AnimationClip,
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LoopOnce,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NumberKeyframeTrack,
  Object3D,
  Quaternion,
  QuaternionKeyframeTrack,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  TorusGeometry,
  Vector3,
  VectorKeyframeTrack,
} from 'three';
import type { Hero3DActionName, Hero3DAssetSpec, Hero3DPartSpec, Hero3DTextureChannel } from './hero3dAssets';

export interface Hero3DModel {
  root: Group;
  textures: Record<Hero3DTextureChannel, Texture>;
  clips: AnimationClip[];
}

const geometryCache = {
  body: new CylinderGeometry(0.46, 0.66, 1.25, 8, 1),
  head: new SphereGeometry(0.5, 8, 6),
  shoulder: new ConeGeometry(0.5, 0.42, 6),
  cape: new BoxGeometry(1, 1, 1),
  weapon: new CylinderGeometry(0.08, 0.08, 1, 8),
  offhand: new BoxGeometry(1, 1, 1),
  sigil: new TorusGeometry(0.5, 0.055, 8, 32),
  orb: new SphereGeometry(0.5, 10, 8),
  aura: new CylinderGeometry(0.5, 0.5, 0.04, 32),
};

export function createHero3DModel(asset: Hero3DAssetSpec): Hero3DModel {
  const root = new Group();
  root.name = `hero3d:${asset.key}`;
  root.scale.setScalar(asset.model.scale);
  root.userData = {
    heroKey: asset.key,
    silhouette: asset.model.silhouette,
    actions: asset.actions.map((action) => action.name),
  };

  const textures = createTextures(asset);
  for (const part of asset.model.parts) root.add(createPartObject(part, textures));
  const clips = asset.actions.map((action) => createHeroClip(asset.key, action.name, action.duration, action.motion));
  return { root, textures, clips };
}

function createPartObject(part: Hero3DPartSpec, textures: Record<Hero3DTextureChannel, Texture>): Object3D {
  const material = new MeshStandardMaterial({
    color: new Color(part.color),
    roughness: part.kind === 'cape' || part.kind === 'body' ? 0.76 : 0.48,
    metalness: part.kind === 'weapon' || part.kind === 'offhand' || part.kind === 'shoulder' ? 0.42 : 0.06,
    map: textures.albedo,
    normalMap: textures.normal,
    roughnessMap: textures.orm,
    emissive: new Color(part.emissive ?? '#000000'),
    emissiveMap: part.emissive ? textures.emissive : null,
    emissiveIntensity: part.emissive ? 1.35 : 0,
    flatShading: true,
    transparent: part.kind === 'aura',
    opacity: part.kind === 'aura' ? 0.72 : 1,
    side: part.kind === 'aura' ? DoubleSide : undefined,
  });
  const mesh = new Mesh(geometryFor(part), material);
  mesh.name = part.name;
  mesh.userData.kind = part.kind;
  mesh.position.set(...part.position);
  mesh.scale.set(...part.scale);
  if (part.rotation) mesh.rotation.set(...part.rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  if (part.kind === 'aura') return mesh;

  const group = new Group();
  group.name = `polished:${part.name}`;
  group.add(mesh);

  const outline = new Mesh(geometryFor(part), new MeshBasicMaterial({
    color: '#050607',
    side: BackSide,
    transparent: true,
    opacity: part.kind === 'orb' || part.kind === 'sigil' ? 0.32 : 0.46,
  }));
  outline.position.copy(mesh.position);
  outline.rotation.copy(mesh.rotation);
  outline.scale.copy(mesh.scale).multiplyScalar(part.kind === 'weapon' || part.kind === 'offhand' ? 1.08 : 1.045);
  outline.renderOrder = -1;
  group.add(outline);

  if (part.emissive) {
    const glow = new Mesh(geometryFor(part), new MeshBasicMaterial({
      color: part.emissive,
      blending: AdditiveBlending,
      transparent: true,
      opacity: part.kind === 'orb' || part.kind === 'sigil' ? 0.34 : 0.18,
      depthWrite: false,
    }));
    glow.position.copy(mesh.position);
    glow.rotation.copy(mesh.rotation);
    glow.scale.copy(mesh.scale).multiplyScalar(part.kind === 'orb' || part.kind === 'sigil' ? 1.32 : 1.14);
    group.add(glow);
  }

  return group;
}

function geometryFor(part: Hero3DPartSpec) {
  return geometryCache[part.kind];
}

function createTextures(asset: Hero3DAssetSpec): Record<Hero3DTextureChannel, Texture> {
  const out = {} as Record<Hero3DTextureChannel, Texture>;
  for (const spec of asset.textures) {
    const texture = new CanvasTexture(drawTexture(spec.palette, spec.motif));
    texture.name = `${asset.key}:${spec.channel}:${spec.motif}`;
    texture.userData = { channel: spec.channel, motif: spec.motif };
    if (spec.channel === 'albedo' || spec.channel === 'emissive') texture.colorSpace = SRGBColorSpace;
    out[spec.channel] = texture;
  }
  return out;
}

function drawTexture(palette: string[], motif: string): HTMLCanvasElement {
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
  ctx.fillStyle = palette[1] ?? '#ddd';
  ctx.globalAlpha = 0.28;
  for (let y = 0; y < 128; y += 16) {
    ctx.fillRect((y * 3) % 40, y + 3, 128, 4);
  }
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = palette[2] ?? '#fff';
  for (let x = -128; x < 128; x += 22) {
    ctx.save();
    ctx.translate(x, 0);
    ctx.rotate(-0.42);
    ctx.fillRect(0, 0, 8, 190);
    ctx.restore();
  }
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

function createHeroClip(
  key: string,
  name: Hero3DActionName,
  duration: number,
  motion: 'loop' | 'strike' | 'cast' | 'flinch' | 'fall',
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
  } else if (motion === 'flinch') {
    tracks.push(new VectorKeyframeTrack('.position', [0, duration * 0.35, duration], [0, 0, 0, -0.12, 0, 0.08, 0, 0, 0]));
  } else {
    const q0 = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0);
    const q1 = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
    tracks.push(new QuaternionKeyframeTrack('.quaternion', [0, duration], [...q0.toArray(), ...q1.toArray()]));
    tracks.push(new VectorKeyframeTrack('.position', [0, duration], [0, 0, 0, 0, -0.55, 0]));
  }
  const clip = new AnimationClip(`${key}:${name}`, duration, tracks);
  if (motion !== 'loop') clip.userData = { loop: LoopOnce };
  return clip;
}
