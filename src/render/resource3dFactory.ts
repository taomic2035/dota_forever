import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
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
import type { Resource3DAssetSpec, Resource3DPartKind, Resource3DPartSpec, Resource3DTextureChannel } from './resource3dAssets';

export interface Resource3DModel {
  root: Group;
  textures: Record<Resource3DTextureChannel, Texture>;
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
  };

  const textures = createTextures(asset);
  for (const part of asset.parts) root.add(createPartObject(part, textures));
  return { root, textures };
}

function createPartObject(part: Resource3DPartSpec, textures: Record<Resource3DTextureChannel, Texture>): Object3D {
  const additive = part.kind === 'beam' || part.kind === 'ring';
  const material = new MeshStandardMaterial({
    color: new Color(part.color),
    map: textures.albedo,
    normalMap: textures.normal,
    roughnessMap: textures.orm,
    roughness: part.kind === 'banner' || part.kind === 'prop' ? 0.78 : 0.5,
    metalness: part.kind === 'weapon' || part.kind === 'plate' ? 0.34 : 0.08,
    emissive: new Color(part.emissive ?? '#000000'),
    emissiveMap: part.emissive ? textures.emissive : null,
    emissiveIntensity: part.emissive ? 1.1 : 0,
    flatShading: true,
    transparent: additive,
    opacity: additive ? 0.58 : 1,
    side: additive ? DoubleSide : undefined,
  });

  const mesh = new Mesh(geometryCache[part.kind], material);
  mesh.name = part.name;
  mesh.userData.kind = part.kind;
  mesh.position.set(...part.position);
  mesh.scale.set(...part.scale);
  if (part.rotation) mesh.rotation.set(...part.rotation);
  mesh.castShadow = part.kind !== 'beam' && part.kind !== 'ring';
  mesh.receiveShadow = part.kind !== 'beam';

  if (part.kind === 'base' || part.kind === 'ring' || part.kind === 'beam') return mesh;

  const group = new Group();
  group.name = `resource-polished:${part.name}`;
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

  return group;
}

function createTextures(asset: Resource3DAssetSpec): Record<Resource3DTextureChannel, Texture> {
  const out = {} as Record<Resource3DTextureChannel, Texture>;
  for (const channel of asset.textureChannels) {
    const texture = new CanvasTexture(drawTexture(asset.palette, asset.motif, channel));
    texture.name = `${asset.key}:${channel}:${asset.motif}`;
    texture.userData = { channel, motif: asset.motif };
    if (channel === 'albedo' || channel === 'emissive') texture.colorSpace = SRGBColorSpace;
    out[channel] = texture;
  }
  return out;
}

function drawTexture(palette: [string, string, string, string], motif: string, channel: Resource3DTextureChannel): HTMLCanvasElement {
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
  return canvas;
}
