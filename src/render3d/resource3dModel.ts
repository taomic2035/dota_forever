/**
 * 桥接 Codex resource3d 精细素材(src/render/resource3d*)→ 实战 UnitModel。
 * 兵/野怪/Boss 由 lane_units/neutral_units 样本渲染;无 clip,故按 sim 状态程序化驱动根节点。
 * 性能:按 asset key 缓存原型,逐单位 clone(共享几何/贴图,仅克隆 Standard 材质供染色),
 *       避免每只小兵重画 CanvasTexture。
 */
import * as THREE from 'three';
import { createResource3DModel } from '../render/resource3dFactory';
import { RESOURCE3D_SAMPLE_ASSETS } from '../render/resource3dAssets';
import type { UnitVisualRole } from '../render/unitArt';
import type { BuildingKind } from '../data/mapLayout';
import type { BuildingModel } from './buildingGen';
import type { AnimInput, UnitModel, TintMaterial } from './unitModel';

const ASSET_BY_KEY = new Map(RESOURCE3D_SAMPLE_ASSETS.map((a) => [a.key, a]));
const protoCache = new Map<string, THREE.Group>();

function protoRoot(key: string): THREE.Group {
  let p = protoCache.get(key);
  if (!p) {
    p = createResource3DModel(ASSET_BY_KEY.get(key)!).root;
    protoCache.set(key, p);
  }
  return p;
}

/** sim 单位 → resource3d 资产 key + 世界缩放(无映射则返回 null,由 renderer 程序化兜底)。 */
export function resourceAssetForUnit(
  role: UnitVisualRole,
  team: number,
  name: string,
): { key: string; scale: number } | null {
  const side = team === 0 ? 'dawn' : 'night';
  const isSuper = name.startsWith('超级');
  switch (role) {
    case 'creepMelee': return { key: isSuper ? `${side}_super_guard` : `${side}_melee_creep`, scale: isSuper ? 25 : 21 };
    case 'creepRanged': return { key: isSuper ? `${side}_super_guard` : `${side}_ranged_creep`, scale: isSuper ? 25 : 21 };
    case 'creepSiege': return { key: `${side}_siege_cart`, scale: 27 };
    case 'neutralSmall': return { key: 'neutral_wolf', scale: 25 };
    case 'neutralLarge': return { key: 'neutral_troll', scale: 34 };
    case 'neutralAncient': return { key: 'neutral_ancient_turtle', scale: 44 };
    case 'boss': return { key: 'boss_pitlord_core', scale: 60 };
    default: return null;
  }
}

/** 构建 resource3d 实战单位模型。worldScale 由 renderer 按单位类型给定。 */
export function buildResource3DUnitModel(key: string, worldScale: number): UnitModel {
  const asset = ASSET_BY_KEY.get(key)!;
  const inner = protoRoot(key).clone(true); // 共享几何/贴图/材质引用
  inner.scale.setScalar(1);

  // 逐单位克隆 Standard 材质(共享贴图引用),使受击/眩晕/隐身染色互不影响
  const materials: TintMaterial[] = [];
  inner.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const m = mesh.material as THREE.Material;
    if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
      const c = (m as THREE.MeshStandardMaterial).clone();
      mesh.material = c;
      if (c.emissiveIntensity === 0) materials.push(c);
    }
  });

  const scaler = new THREE.Group();
  scaler.scale.setScalar(worldScale * asset.scale);
  scaler.add(inner);
  const placement = new THREE.Group();
  placement.add(scaler);

  return {
    root: placement,
    materials,
    applyPose(a: AnimInput) {
      // 无骨骼,程序化驱动根节点:走路起伏摇摆 / 攻击前扑 / 待机微浮(局部单位,随缩放放大)
      switch (a.state) {
        case 'walk':
          inner.position.set(0, Math.abs(Math.sin(a.phase)) * 0.16, 0);
          inner.rotation.z = Math.sin(a.phase) * 0.06;
          break;
        case 'attack':
          inner.position.set(0, 0, Math.sin(a.progress * Math.PI) * 0.3);
          inner.rotation.z = 0;
          break;
        case 'cast':
        case 'channel':
          inner.position.set(0, Math.sin(a.t * 5) * 0.06, 0);
          inner.rotation.z = 0;
          break;
        default: // idle
          inner.position.set(0, Math.sin(a.t * 2) * 0.04, 0);
          inner.rotation.z = 0;
      }
    },
  };
}

// ---------- 建筑(静态,无动作;主基地带无敌护盾) ----------
const TEAM_SHIELD = ['#52d869', '#ef5350'];

function resourceBuildingFor(kind: BuildingKind, team: number): { key: string; scale: number } | null {
  const side = team === 0 ? 'dawn' : 'night';
  switch (kind) {
    case 'tower1': case 'tower2': return { key: `tower_t1_${side}`, scale: 95 };
    case 'tower3': case 'tower4': return { key: `tower_t3_${side}`, scale: 108 };
    case 'rax_melee': return { key: 'rax_melee', scale: 78 };
    case 'rax_ranged': return { key: 'rax_ranged', scale: 78 };
    case 'ancient': return { key: `ancient_${side}`, scale: 140 };
    case 'fountain': return { key: 'fountain', scale: 62 };
    default: return null;
  }
}

/** resource3d 建筑模型(命中映射时替换程序化建筑)。主基地返回护盾供无敌显隐。 */
export function buildResource3DBuilding(kind: BuildingKind, team: number): BuildingModel | null {
  const map = resourceBuildingFor(kind, team);
  if (!map) return null;
  const asset = ASSET_BY_KEY.get(map.key);
  if (!asset) return null;
  const inner = protoRoot(map.key).clone(true); // 建筑无逐个染色,材质/几何/贴图全共享
  inner.scale.setScalar(1);
  const scaler = new THREE.Group();
  scaler.scale.setScalar(map.scale * asset.scale);
  scaler.add(inner);
  const group = new THREE.Group();
  group.add(scaler);

  if (kind === 'ancient') {
    const shield = new THREE.Mesh(
      new THREE.SphereGeometry(240, 16, 16),
      new THREE.MeshLambertMaterial({ color: TEAM_SHIELD[team] ?? '#7ec8e3', transparent: true, opacity: 0.16 }),
    );
    shield.position.y = 150;
    shield.visible = false;
    group.add(shield);
    return { group, shield };
  }
  return { group };
}
