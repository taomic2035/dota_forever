/**
 * 多态单位模型层(renderer3d 的可插拔接缝)。
 * 按 UnitArt.shape 分派:人形(英雄/小兵)、兽形四足(野怪/Boss)、攻城车、守卫浮空眼。
 * 每种模型自带 applyPose(只做内部关节动画;世界位移/朝向/死亡下沉由 renderer 负责),
 * 与外部 3D 素材将来共用同一 AnimInput 驱动。
 */
import * as THREE from 'three';
import type { UnitArt } from '../render/unitArt';
import { humanoidSpec } from './modelParts';
import { buildHumanoid } from './modelGen';
import { poseFor, type AnimState } from './pose';

export interface AnimInput {
  state: AnimState;
  t: number;        // 渲染时间(秒,连续)
  phase: number;    // 移动相位(累计位移 × 系数)
  progress: number; // 动作进度 0..1(攻击/死亡)
}

/** 可被 renderer 染色的材质(Lambert 程序化 / Standard 英雄素材皆有 emissive/opacity)。 */
export type TintMaterial = THREE.MeshLambertMaterial | THREE.MeshStandardMaterial;

export interface UnitModel {
  root: THREE.Group;
  /** 受击闪白/眩晕泛光/隐身染色用(renderer 统一遍历)。 */
  materials: TintMaterial[];
  /** 内部关节动画——不含世界位移/朝向/下沉。 */
  applyPose(a: AnimInput): void;
}

/** 模型工厂:将来外部英雄素材在此 shape 分派之前按 name 优先返回。 */
export function buildUnitModel(art: UnitArt): UnitModel {
  switch (art.shape) {
    case 'beast': return beastModel(art);
    case 'siege': return siegeModel(art);
    case 'wisp':  return wispModel(art);
    default:      return humanoidModel(art); // bulk/blade/robe/grunt/archer
  }
}

// ---------- 人形(英雄/小兵):包装既有 buildHumanoid + poseFor ----------
function humanoidModel(art: UnitArt): UnitModel {
  const p = buildHumanoid(humanoidSpec(art));
  return {
    root: p.root,
    materials: p.materials,
    applyPose(a) {
      const q = poseFor(a);
      p.legL.rotation.x = q.legL;
      p.legR.rotation.x = q.legR;
      p.armL.rotation.x = q.armL;
      p.armR.rotation.x = q.armR + q.weaponSwing;
      p.hips.position.y = p.hipBaseY + q.torsoBob;
    },
  };
}

// ---------- 共享小工具 ----------
function box(mats: THREE.MeshLambertMaterial[], w: number, h: number, d: number, color: string, emissive?: string): THREE.Mesh {
  const m = new THREE.MeshLambertMaterial({ color });
  if (emissive) m.emissive.set(emissive);
  mats.push(m);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.castShadow = true;
  return mesh;
}
function cone(mats: THREE.MeshLambertMaterial[], r: number, h: number, seg: number, color: string): THREE.Mesh {
  const m = new THREE.MeshLambertMaterial({ color });
  mats.push(m);
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), m);
  mesh.castShadow = true;
  return mesh;
}
function sphere(mats: THREE.MeshLambertMaterial[], r: number, color: string, emissive?: string): THREE.Mesh {
  const m = new THREE.MeshLambertMaterial({ color });
  if (emissive) m.emissive.set(emissive);
  mats.push(m);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), m);
  mesh.castShadow = true;
  return mesh;
}
function cyl(mats: THREE.MeshLambertMaterial[], rt: number, rb: number, h: number, seg: number, color: string): THREE.Mesh {
  const m = new THREE.MeshLambertMaterial({ color });
  mats.push(m);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.castShadow = true;
  return mesh;
}

// ---------- 兽形四足(野怪 / Boss) ----------
function beastModel(art: UnitArt): UnitModel {
  const mats: THREE.MeshLambertMaterial[] = [];
  const root = new THREE.Group();
  const big = art.role === 'boss' || art.role === 'neutralAncient';
  const mid = big || art.role === 'neutralLarge';
  const legH = mid ? 26 : 20;
  const bodyW = mid ? 30 : 22;
  const bodyL = mid ? 50 : 38;
  const bodyH = mid ? 24 : 18;
  const eyeGlow = big ? art.accent : undefined; // Boss/远古发光眼

  // 躯体核心组(攻击前冲 / 施法后仰用)
  const core = new THREE.Group();
  core.position.y = legH;
  root.add(core);

  const body = box(mats, bodyW, bodyH, bodyL, art.primary);
  body.position.y = bodyH / 2;
  core.add(body);
  // 隆起背脊
  const hump = box(mats, bodyW * 0.7, bodyH * 0.5, bodyL * 0.45, art.primary);
  hump.position.set(0, bodyH * 0.9, -bodyL * 0.1);
  core.add(hump);

  // 头(前伸略低)
  const headG = new THREE.Group();
  headG.position.set(0, bodyH * 0.7, bodyL / 2 + 4);
  core.add(headG);
  const head = box(mats, bodyW * 0.7, bodyH * 0.7, 20, art.primary);
  headG.add(head);
  const snout = box(mats, bodyW * 0.4, bodyH * 0.35, 12, art.accent);
  snout.position.set(0, -bodyH * 0.12, 14);
  headG.add(snout);
  // 双眼
  for (const sx of [-1, 1]) {
    const eye = box(mats, 4, 4, 3, eyeGlow ?? '#ffe08a', eyeGlow);
    eye.position.set(sx * bodyW * 0.22, bodyH * 0.12, 11);
    headG.add(eye);
  }
  // 角(中大型 / Boss)
  if (mid) {
    for (const sx of [-1, 1]) {
      const horn = cone(mats, big ? 8 : 5, big ? 34 : 22, 6, art.accent);
      horn.position.set(sx * bodyW * 0.28, bodyH * 0.5, 2);
      horn.rotation.z = sx * -0.4;
      horn.rotation.x = -0.3;
      headG.add(horn);
    }
  }

  // 尾
  const tail = box(mats, 6, 6, bodyL * 0.5, art.accent);
  tail.position.set(0, bodyH * 0.5, -bodyL / 2 - bodyL * 0.2);
  tail.rotation.x = 0.5;
  core.add(tail);

  // 四腿:前(z+)后(z-),左右(x±)
  const legW = mid ? 9 : 7;
  const mkLeg = (sx: number, sz: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(sx * bodyW * 0.38, legH, sz * bodyL * 0.32);
    const seg = box(mats, legW, legH, legW, art.accent);
    seg.position.y = -legH / 2;
    g.add(seg);
    const foot = box(mats, legW + 2, 5, legW + 4, art.primary);
    foot.position.set(0, -legH, sz * 2);
    g.add(foot);
    root.add(g);
    return g;
  };
  const legFL = mkLeg(-1, 1), legFR = mkLeg(1, 1), legBL = mkLeg(-1, -1), legBR = mkLeg(1, -1);

  const s = Math.max(0.85, art.radius / 22);
  root.scale.setScalar(s);

  return {
    root, materials: mats,
    applyPose(a) {
      let gait = 0, bob = Math.sin(a.t * 2.4) * 0.5, lunge = 0, rear = 0;
      if (a.state === 'walk') {
        gait = Math.sin(a.phase) * 0.5;
        bob = Math.abs(Math.sin(a.phase)) * 1.4;
      } else if (a.state === 'attack') {
        lunge = Math.sin(a.progress * Math.PI) * 7;       // 前扑
        headG.rotation.x = Math.sin(a.progress * Math.PI) * 0.5; // 低头咬
      } else if (a.state === 'cast' || a.state === 'channel') {
        rear = -0.35; // 后仰嚎叫
      }
      if (a.state !== 'attack') headG.rotation.x = 0;
      // 对角步态:FL+BR 同相,FR+BL 反相
      legFL.rotation.x = gait; legBR.rotation.x = gait;
      legFR.rotation.x = -gait; legBL.rotation.x = -gait;
      core.position.z = lunge;
      core.position.y = legH + bob;
      core.rotation.x = rear;
    },
  };
}

// ---------- 攻城器械(投石车) ----------
function siegeModel(art: UnitArt): UnitModel {
  const mats: THREE.MeshLambertMaterial[] = [];
  const root = new THREE.Group();
  const wheelR = 13;

  // 底盘
  const chassis = box(mats, 34, 14, 46, art.primary);
  chassis.position.y = wheelR + 8;
  root.add(chassis);

  // 四轮(沿 X 轴的圆柱,绕 X 滚动)
  const wheels: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const w = cyl(mats, wheelR, wheelR, 6, 12, art.accent);
    w.rotation.z = Math.PI / 2; // 轴朝 X
    w.position.set(sx * 20, wheelR, sz * 16);
    root.add(w);
    wheels.push(w);
  }

  // 投石臂(后部枢轴,可挥)
  const arm = new THREE.Group();
  arm.position.set(0, wheelR + 16, -14);
  root.add(arm);
  const beam = box(mats, 5, 5, 40, art.accent);
  beam.position.z = 16;
  arm.add(beam);
  const bucket = box(mats, 12, 8, 12, art.primary);
  bucket.position.set(0, 4, 34);
  arm.add(bucket);
  const ammo = sphere(mats, 6, '#5a5048');
  ammo.position.set(0, 9, 34);
  arm.add(ammo);
  arm.rotation.x = -1.0; // 装填静止角

  const s = Math.max(0.9, art.radius / 22);
  root.scale.setScalar(s);

  return {
    root, materials: mats,
    applyPose(a) {
      // 轮滚动:相位驱动(仅移动时累加)
      const roll = a.phase;
      for (const w of wheels) w.rotation.x = roll;
      // 攻击:投石臂前甩
      arm.rotation.x = a.state === 'attack'
        ? -1.0 + Math.sin(a.progress * Math.PI) * 2.2
        : -1.0;
    },
  };
}

// ---------- 守卫(浮空眼) ----------
function wispModel(art: UnitArt): UnitModel {
  const mats: THREE.MeshLambertMaterial[] = [];
  const root = new THREE.Group();

  const stake = box(mats, 3, 16, 3, '#6b5436');
  stake.position.y = 8;
  root.add(stake);

  const eyeG = new THREE.Group();
  eyeG.position.y = 24;
  root.add(eyeG);
  const eye = sphere(mats, 9, art.primary, art.primary);
  eyeG.add(eye);
  const iris = box(mats, 4, 6, 2, art.accent, art.accent);
  iris.position.z = 8;
  eyeG.add(iris);

  return {
    root, materials: mats,
    applyPose(a) {
      eyeG.position.y = 24 + Math.sin(a.t * 2) * 2; // 悬浮起伏
      eyeG.rotation.y = Math.sin(a.t * 0.6) * 0.5;   // 缓慢张望
    },
  };
}
