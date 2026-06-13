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
  materials: THREE.MeshLambertMaterial[];
}

export function buildHumanoid(spec: HumanoidSpec): HumanoidParts {
  const mats: THREE.MeshLambertMaterial[] = [];
  const mat = (color: string): THREE.MeshLambertMaterial => {
    const m = new THREE.MeshLambertMaterial({ color });
    mats.push(m);
    return m;
  };
  const box = (w: number, h: number, d: number, color: string): THREE.Mesh => {
    const m = new THREE.Mesh(geo(w, h, d), mat(color));
    m.castShadow = true;
    return m;
  };

  const root = new THREE.Group();
  const hipBaseY = spec.leg.h;
  const hips = new THREE.Group();
  hips.position.y = hipBaseY;
  root.add(hips);

  const torso = new THREE.Group();
  hips.add(torso);
  const tBox = box(spec.torso.w, spec.torso.h, spec.torso.d, spec.torso.color);
  tBox.position.y = spec.torso.h / 2;
  torso.add(tBox);
  // 颈 + 头(头略抬,脱离躯干)
  const neck = box(spec.head.w * 0.5, 4, spec.head.d * 0.5, spec.torso.color);
  neck.position.y = spec.torso.h + 2;
  torso.add(neck);
  const head = box(spec.head.w, spec.head.h, spec.head.d, spec.head.color);
  head.position.y = spec.torso.h + 4 + spec.head.h / 2;
  torso.add(head);
  // 胸前纹章
  const crest = box(7, 7, 2, spec.accent);
  crest.position.set(0, spec.torso.h * 0.62, spec.torso.d / 2 + 1);
  torso.add(crest);

  const mkArm = (sign: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(sign * (spec.torso.w / 2 + spec.arm.w / 2), spec.torso.h, 0);
    const upper = box(spec.arm.w, spec.arm.h, spec.arm.d, spec.arm.color);
    upper.position.y = -spec.arm.h / 2;
    g.add(upper);
    const hand = box(spec.arm.w + 1.5, spec.arm.w + 1.5, spec.arm.d + 1.5, spec.accent);
    hand.position.y = -spec.arm.h - 1;
    g.add(hand);
    torso.add(g);
    return g;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);

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
    const thigh = box(spec.leg.w, spec.leg.h, spec.leg.d, spec.leg.color);
    thigh.position.y = -spec.leg.h / 2;
    g.add(thigh);
    const foot = box(spec.leg.w + 1, 4, spec.leg.d + 4, spec.accent);
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
