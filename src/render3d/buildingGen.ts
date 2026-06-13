/** 3D 建筑模型:防御塔(锥塔+发光核心+分级)、兵营(堡垒)、主基地(六棱柱+护盾)、泉水(圣池)。 */
import * as THREE from 'three';
import type { BuildingKind } from '../data/mapLayout';

const TEAM_COLOR = ['#52d869', '#ef5350']; // Dawn 绿 / Night 红
const STONE = '#6b6450';
const DARK = '#3a382e';

export interface BuildingModel {
  group: THREE.Group;
  /** 主基地护盾(随无敌状态显隐);其他建筑为 undefined。 */
  shield?: THREE.Mesh;
}

function lambert(color: string, opts?: { emissive?: string }): THREE.MeshLambertMaterial {
  const m = new THREE.MeshLambertMaterial({ color });
  if (opts?.emissive) m.emissive.set(opts.emissive);
  return m;
}

export function buildBuilding(kind: BuildingKind, team: number): BuildingModel {
  const group = new THREE.Group();
  const accent = TEAM_COLOR[team] ?? STONE;

  if (kind === 'tower1' || kind === 'tower2' || kind === 'tower3' || kind === 'tower4') {
    const tier = kind === 'tower4' ? 4 : kind === 'tower3' ? 3 : kind === 'tower2' ? 2 : 1;
    const h = 220 + tier * 30;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(48, 70, h, 8), lambert(STONE));
    body.position.y = h / 2; body.castShadow = true; group.add(body);
    // 城垛环
    const cren = new THREE.Mesh(new THREE.CylinderGeometry(58, 58, 24, 8), lambert(DARK));
    cren.position.y = h; cren.castShadow = true; group.add(cren);
    // 发光核心(队色,等级越高越大越亮)
    const core = new THREE.Mesh(new THREE.SphereGeometry(16 + tier * 3, 10, 10), lambert(accent, { emissive: accent }));
    core.position.y = h + 24; group.add(core);
    return { group };
  }

  if (kind === 'rax_melee' || kind === 'rax_ranged') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(170, 130, 170), lambert(STONE));
    base.position.y = 65; base.castShadow = true; group.add(base);
    // 双坡顶
    const roof = new THREE.Mesh(new THREE.ConeGeometry(135, 70, 4), lambert(accent));
    roof.position.y = 130 + 35; roof.rotation.y = Math.PI / 4; roof.castShadow = true; group.add(roof);
    return { group };
  }

  if (kind === 'ancient') {
    // 六棱柱多层
    for (let i = 0; i < 3; i++) {
      const r = 150 - i * 36, h = 80;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 10, h, 6), lambert(i === 2 ? accent : STONE));
      seg.position.y = h / 2 + i * h; seg.castShadow = true; group.add(seg);
    }
    const core = new THREE.Mesh(new THREE.SphereGeometry(40, 12, 12), lambert(accent, { emissive: accent }));
    core.position.y = 280; group.add(core);
    // 无敌护盾半透球(默认隐藏,renderer 按 u.invulnerable 显隐)
    const shieldMat = new THREE.MeshLambertMaterial({ color: accent, transparent: true, opacity: 0.18 });
    const shield = new THREE.Mesh(new THREE.SphereGeometry(220, 16, 16), shieldMat);
    shield.position.y = 140; shield.visible = false; group.add(shield);
    return { group, shield };
  }

  // fountain
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(110, 120, 40, 16), lambert('#2c6688'));
  pool.position.y = 20; pool.receiveShadow = true; group.add(pool);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(50, 12, 12), lambert('#7ec8e3', { emissive: '#7ec8e3' }));
  glow.position.y = 50; group.add(glow);
  return { group };
}
