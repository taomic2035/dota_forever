/** 由 HumanoidSpec 构建分层人形 THREE.Group;返回可被 animator 操控的部件句柄。 */
import * as THREE from 'three';
import type { HumanoidSpec } from './modelParts';

const matCache = new Map<string, THREE.MeshLambertMaterial>();
function mat(color: string): THREE.MeshLambertMaterial {
  let m = matCache.get(color);
  if (!m) { m = new THREE.MeshLambertMaterial({ color }); matCache.set(color, m); }
  return m;
}
function box(w: number, h: number, d: number, color: string): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.castShadow = true;
  return m;
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
}

export function buildHumanoid(spec: HumanoidSpec): HumanoidParts {
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
  const head = box(spec.head.w, spec.head.h, spec.head.d, spec.head.color);
  head.position.y = spec.torso.h + spec.head.h / 2;
  torso.add(head);
  // 胸前纹章色块
  const crest = box(6, 6, 2, spec.accent);
  crest.position.set(0, spec.torso.h * 0.6, spec.torso.d / 2 + 1);
  torso.add(crest);

  const mkArm = (sign: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(sign * (spec.torso.w / 2 + spec.arm.w / 2), spec.torso.h, 0);
    const b = box(spec.arm.w, spec.arm.h, spec.arm.d, spec.arm.color);
    b.position.y = -spec.arm.h / 2;
    g.add(b);
    torso.add(g);
    return g;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);

  if (spec.weapon.kind !== 'none' && spec.weapon.length > 0) {
    const w = box(3, spec.weapon.length, 3, spec.weapon.color);
    w.position.y = -spec.weapon.length / 2 - spec.arm.h * 0.3;
    if (spec.weapon.kind === 'staff') {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(5, 8, 8), mat(spec.weapon.color));
      orb.position.y = -spec.weapon.length;
      armR.add(orb);
    }
    armR.add(w);
  }

  const mkLeg = (sign: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(sign * spec.leg.w, 0, 0);
    const b = box(spec.leg.w, spec.leg.h, spec.leg.d, spec.leg.color);
    b.position.y = -spec.leg.h / 2;
    g.add(b);
    hips.add(g);
    return g;
  };
  const legL = mkLeg(-1);
  const legR = mkLeg(1);

  if (spec.hasRobe) {
    const robe = box(spec.torso.w + 8, spec.leg.h, spec.torso.d + 6, spec.accent);
    robe.position.y = -spec.leg.h / 2;
    hips.add(robe);
  }

  root.scale.setScalar(spec.scale);
  return { root, hips, torso, legL, legR, armL, armR, hipBaseY };
}
