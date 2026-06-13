/**
 * 桥接 Codex 精细英雄素材(src/render/hero3d*)→ 实战 UnitModel 接口。
 * 结构三层:placement(renderer 置世界位姿/挂选取环)→ scaler(×世界缩放)→ Codex root(AnimationMixer 驱动)。
 * sim 动作状态映射到素材 clip(idle/walk/attack/cast_q/cast_r/death),与程序化模型共用 applyPose 契约。
 */
import * as THREE from 'three';
import { createHero3DModel } from '../render/hero3dFactory';
import { CLASSIC_HERO3D_ASSETS } from '../render/hero3dAssets';
import type { AnimState } from './pose';
import type { AnimInput, UnitModel, TintMaterial } from './unitModel';

/** 素材身高约 2.6 局部单位,世界英雄约 90px → 缩放 ~34。 */
const HERO3D_WORLD_SCALE = 34;

const ASSET_BY_KEY = new Map(CLASSIC_HERO3D_ASSETS.map((a) => [a.key, a]));

/** 该英雄 key 是否有精细素材。 */
export function hasHero3DAsset(key: string): boolean {
  return ASSET_BY_KEY.has(key);
}

function actionForState(s: AnimState): string {
  switch (s) {
    case 'walk': return 'walk';
    case 'attack': return 'attack';
    case 'cast': return 'cast_q';
    case 'channel': return 'cast_r';
    case 'death': return 'death';
    default: return 'idle';
  }
}

/** 构建精细英雄实战模型(命中 10 个经典英雄时由 renderer 调用)。 */
export function buildHero3DUnitModel(key: string): UnitModel {
  const asset = ASSET_BY_KEY.get(key)!;
  const built = createHero3DModel(asset);

  // 工厂在 root 上设了 asset.model.scale;clip 会绝对覆写 .scale,故归一到 1,缩放交给 scaler。
  built.root.scale.setScalar(1);
  const scaler = new THREE.Group();
  scaler.scale.setScalar(HERO3D_WORLD_SCALE * asset.model.scale);
  scaler.add(built.root);
  const placement = new THREE.Group();
  placement.add(scaler);

  // 可染色材质:仅取无辉光的结构材质(避免覆盖素材自带的发光部件)
  const materials: TintMaterial[] = [];
  built.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    const m = mesh.material as THREE.Material | undefined;
    if (m && (m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
      const sm = m as THREE.MeshStandardMaterial;
      if (sm.emissiveIntensity === 0) materials.push(sm);
    }
  });

  // 动作:zip clip → AnimationAction,按名归类;非循环动作单次播放并定格
  const mixer = new THREE.AnimationMixer(built.root);
  const actions: Record<string, THREE.AnimationAction> = {};
  for (const clip of built.clips) {
    const name = clip.name.split(':').pop() ?? clip.name;
    const act = mixer.clipAction(clip);
    if (name === 'idle' || name === 'walk') {
      act.setLoop(THREE.LoopRepeat, Infinity);
    } else {
      act.setLoop(THREE.LoopOnce, 1);
      act.clampWhenFinished = true;
    }
    actions[name] = act;
  }

  let prevT = -1;
  let curName = '';
  let cur: THREE.AnimationAction | null = null;

  return {
    root: placement,
    materials,
    applyPose(a: AnimInput) {
      const dt = prevT < 0 ? 0 : Math.min(0.1, Math.max(0, a.t - prevT));
      prevT = a.t;
      const want = actionForState(a.state);
      if (want !== curName) {
        const next = actions[want] ?? actions['idle'];
        if (next) {
          if (cur) cur.fadeOut(0.18);
          next.reset();
          next.fadeIn(0.18);
          next.play();
          cur = next;
          curName = want;
        }
      }
      mixer.update(dt);
    },
  };
}
