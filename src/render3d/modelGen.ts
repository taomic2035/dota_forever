/** 由 HumanoidSpec 构建分层人形 THREE.Group。几何按尺寸缓存(共享),材质每单位独立(支持受击/眩晕/隐身染色)。 */
import * as THREE from 'three';
import type { HumanoidSpec } from './modelParts';

const geoCache = new Map<string, THREE.BoxGeometry>();
function geo(w: number, h: number, d: number): THREE.BoxGeometry {
  const k = `${w.toFixed(1)}x${h.toFixed(1)}x${d.toFixed(1)}`;
  let g = geoCache.get(k);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); geoCache.set(k, g); }
  return g;
}

const roundedCache = new Map<string, THREE.CapsuleGeometry>();
function roundedGeo(w: number, h: number, d: number): THREE.CapsuleGeometry {
  const k = `${w.toFixed(1)}x${h.toFixed(1)}x${d.toFixed(1)}`;
  let g = roundedCache.get(k);
  if (!g) {
    const radius = Math.max(1, Math.min(w, d) * 0.5);
    const length = Math.max(1, h - radius * 2);
    g = new THREE.CapsuleGeometry(radius, length, 5, 12);
    g.scale(w / (radius * 2), 1, d / (radius * 2));
    roundedCache.set(k, g);
  }
  return g;
}

const sphereCache = new Map<string, THREE.SphereGeometry>();
function sphereGeo(w: number, h: number, d: number): THREE.SphereGeometry {
  const k = `${w.toFixed(1)}x${h.toFixed(1)}x${d.toFixed(1)}`;
  let g = sphereCache.get(k);
  if (!g) {
    const radius = Math.max(1, Math.min(w, h, d) * 0.5);
    g = new THREE.SphereGeometry(radius, 14, 10);
    g.scale(w / (radius * 2), h / (radius * 2), d / (radius * 2));
    sphereCache.set(k, g);
  }
  return g;
}

const cylCache = new Map<string, THREE.CylinderGeometry>();
function cylGeo(w: number, h: number, d: number, seg = 16): THREE.CylinderGeometry {
  const k = `${w.toFixed(1)}x${h.toFixed(1)}x${d.toFixed(1)}x${seg}`;
  let g = cylCache.get(k);
  if (!g) {
    const radius = Math.max(1, Math.min(w, d) * 0.5);
    g = new THREE.CylinderGeometry(radius, radius, h, seg);
    g.scale(w / (radius * 2), 1, d / (radius * 2));
    cylCache.set(k, g);
  }
  return g;
}

const coneCache = new Map<string, THREE.ConeGeometry>();
function coneGeo(r: number, h: number, seg = 6): THREE.ConeGeometry {
  const k = `${r.toFixed(1)}x${h.toFixed(1)}x${seg}`;
  let g = coneCache.get(k);
  if (!g) { g = new THREE.ConeGeometry(r, h, seg); coneCache.set(k, g); }
  return g;
}

export interface HumanoidParts {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  hipBaseY: number;
  /** 本单位所有材质(供 renderer 做受击闪白/眩晕/隐身染色)。 */
  materials: THREE.MeshStandardMaterial[];
}

export function buildHumanoid(spec: HumanoidSpec): HumanoidParts {
  const mats: THREE.MeshStandardMaterial[] = [];
  const mat = (color: string): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.68, metalness: 0.05, flatShading: false });
    mats.push(m);
    return m;
  };
  const box = (w: number, h: number, d: number, color: string): THREE.Mesh => {
    const m = new THREE.Mesh(geo(w, h, d), mat(color));
    m.castShadow = true;
    return m;
  };
  const rounded = (w: number, h: number, d: number, color: string, layer?: string): THREE.Mesh => {
    const m = new THREE.Mesh(roundedGeo(w, h, d), mat(color));
    m.castShadow = true;
    if (layer) m.userData.playCameraReadabilityLayer = layer;
    return m;
  };
  const sphere = (w: number, h: number, d: number, color: string, layer?: string): THREE.Mesh => {
    const m = new THREE.Mesh(sphereGeo(w, h, d), mat(color));
    m.castShadow = true;
    if (layer) m.userData.playCameraReadabilityLayer = layer;
    return m;
  };
  const cyl = (w: number, h: number, d: number, color: string, layer?: string): THREE.Mesh => {
    const m = new THREE.Mesh(cylGeo(w, h, d), mat(color));
    m.castShadow = true;
    if (layer) m.userData.playCameraReadabilityLayer = layer;
    return m;
  };
  const cone = (r: number, h: number, seg: number, color: string): THREE.Mesh => {
    const m = new THREE.Mesh(coneGeo(r, h, seg), mat(color));
    m.castShadow = true;
    return m;
  };

  const root = new THREE.Group();
  root.userData.gameplayUnitModelQuality = gameplayUnitModelQuality(spec);
  const hipBaseY = spec.leg.h;
  const hips = new THREE.Group();
  hips.position.y = hipBaseY;
  root.add(hips);

  const torso = new THREE.Group();
  hips.add(torso);
  const tBox = rounded(spec.torso.w, spec.torso.h, spec.torso.d, spec.torso.color, 'core-volume');
  tBox.position.y = spec.torso.h / 2;
  torso.add(tBox);
  // 颈 + 头(头略抬,脱离躯干)
  const neck = cyl(spec.head.w * 0.5, 4, spec.head.d * 0.5, spec.torso.color);
  neck.position.y = spec.torso.h + 2;
  torso.add(neck);
  const head = sphere(spec.head.w, spec.head.h, spec.head.d, spec.head.color, 'head-read');
  head.position.y = spec.torso.h + 4 + spec.head.h / 2;
  torso.add(head);
  // 胸前纹章
  const crest = box(7, 7, 2, spec.accent);
  crest.position.set(0, spec.torso.h * 0.62, spec.torso.d / 2 + 1);
  crest.userData.playCameraReadabilityLayer = 'team-band';
  torso.add(crest);
  if (spec.visualRole === 'illusion') {
    const cloneGlint = cyl(spec.torso.w + 5, 1.8, spec.torso.d + 5, spec.accent, 'clone-glint');
    cloneGlint.position.y = spec.torso.h * 0.5;
    cloneGlint.rotation.x = Math.PI / 2;
    torso.add(cloneGlint);
  }

  // 头饰(角色化剪影:角/冠/法帽/兜帽/头盔)
  const headTop = spec.torso.h + 4 + spec.head.h;
  const hw = spec.head.w;
  if (spec.headGear === 'horns') {
    for (const sx of [-1, 1]) {
      const horn = cone(3.5, 12, 5, spec.accent);
      horn.position.set(sx * hw * 0.4, headTop - 2, 0);
      horn.rotation.z = sx * -0.5;
      torso.add(horn);
    }
  } else if (spec.headGear === 'crown') {
    const band = box(hw + 3, 3, hw + 3, spec.accent);
    band.position.y = headTop - 1; torso.add(band);
    for (const a of [-1, 0, 1]) {
      const spike = cone(2, 7, 4, spec.accent);
      spike.position.set(a * hw * 0.34, headTop + 3, 0);
      torso.add(spike);
    }
  } else if (spec.headGear === 'hat') {
    const hat = cone(hw * 0.7, 20, 6, spec.accent);
    hat.position.y = headTop + 8; torso.add(hat);
  } else if (spec.headGear === 'hood') {
    const hood = box(hw + 4, spec.head.h + 4, spec.head.d + 4, spec.accent);
    hood.position.set(0, spec.torso.h + 4 + spec.head.h / 2 + 1, -1);
    torso.add(hood);
  } else if (spec.headGear === 'helm') {
    const helm = box(hw + 3, spec.head.h * 0.7, spec.head.d + 3, spec.accent);
    helm.position.y = headTop - spec.head.h * 0.3; torso.add(helm);
    const fin = box(2, 7, spec.head.d + 5, spec.accent);
    fin.position.y = headTop + 2; torso.add(fin);
  }

  const mkArm = (sign: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(sign * (spec.torso.w / 2 + spec.arm.w / 2), spec.torso.h, 0);
    const upper = rounded(spec.arm.w, spec.arm.h, spec.arm.d, spec.arm.color);
    upper.position.y = -spec.arm.h / 2;
    g.add(upper);
    const hand = sphere(spec.arm.w + 1.5, spec.arm.w + 1.5, spec.arm.d + 1.5, spec.accent);
    hand.position.y = -spec.arm.h - 1;
    g.add(hand);
    torso.add(g);
    return g;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);

  // 肩甲(魁梧/部分英雄)
  if (spec.hasShoulders) {
    for (const sx of [-1, 1]) {
      const pad = box(spec.arm.w + 6, 6, spec.torso.d + 4, spec.accent);
      pad.position.set(sx * (spec.torso.w / 2 + 1), spec.torso.h - 2, 0);
      torso.add(pad);
    }
  }
  // 背披风(法系/辅助/刺客/部分英雄)
  if (spec.hasCape) {
    const cape = box(spec.torso.w + 2, spec.torso.h + spec.leg.h * 0.6, 2.5, spec.accent);
    cape.position.set(0, spec.torso.h * 0.4, -spec.torso.d / 2 - 2);
    cape.rotation.x = -0.08;
    torso.add(cape);
  }

  if (spec.weapon.kind !== 'none' && spec.weapon.length > 0) {
    const w = box(3.5, spec.weapon.length, 3.5, spec.weapon.color);
    w.position.y = -spec.arm.h - spec.weapon.length / 2;
    if (spec.weapon.kind === 'staff') {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(6, 8, 8), mat(spec.weapon.color));
      orb.position.y = -spec.arm.h - spec.weapon.length;
      orb.castShadow = true;
      armR.add(orb);
    }
    armR.add(w);
  }

  const mkLeg = (sign: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(sign * spec.leg.w, 0, 0);
    const thigh = rounded(spec.leg.w, spec.leg.h, spec.leg.d, spec.leg.color);
    thigh.position.y = -spec.leg.h / 2;
    g.add(thigh);
    const foot = cyl(spec.leg.w + 1, 4, spec.leg.d + 4, spec.accent);
    foot.position.set(0, -spec.leg.h, spec.leg.d * 0.4);
    g.add(foot);
    hips.add(g);
    return g;
  };
  const legL = mkLeg(-1);
  const legR = mkLeg(1);

  if (spec.hasRobe) {
    const robe = box(spec.torso.w + 10, spec.leg.h, spec.torso.d + 8, spec.accent);
    robe.position.y = -spec.leg.h / 2;
    hips.add(robe);
  }

  root.scale.setScalar(spec.scale);
  return { root, hips, torso, legL, legR, armL, armR, hipBaseY, materials: mats };
}

function gameplayUnitModelQuality(spec: HumanoidSpec): Record<string, string> {
  const lane = spec.visualRole === 'creepMelee' || spec.visualRole === 'creepRanged' || spec.visualRole === 'creepSiege';
  const family = spec.visualRole === 'illusion' ? 'illusion' : lane ? 'lane' : 'hero';
  return {
    pass: 'v26-nonhero-play-camera-model-quality',
    family,
    teamRead: spec.teamRead,
    priority: spec.visualRole === 'illusion' || lane ? 'low' : 'medium',
  };
}
