/**
 * 3D 主渲染器:只读 World 状态,同步到 Three 场景,插值/动作/拾取。
 * 与 2D Renderer 并存(?renderer=3d)。sim/ui/audio 零改动。
 * 模型层可插拔:ensureModel 是接缝——将来外部 3D 素材在此按英雄优先加载,程序化兜底。
 */
import * as THREE from 'three';
import type { World } from '../sim/world';
import type { Unit } from '../sim/unit';
import type { Camera } from '../render/camera';
import { unitArt, type ArtInput } from '../render/unitArt';
import { humanoidSpec } from './modelParts';
import { buildHumanoid, type HumanoidParts } from './modelGen';
import { poseFor, type AnimState } from './pose';
import { Scene3D } from './scene';
import { buildTerrain3D } from './terrain3d';

interface ModelEntry { parts: HumanoidParts; phase: number; lastX: number; lastZ: number; }

export class Renderer3D {
  readonly s3d: Scene3D;
  readonly canvas: HTMLCanvasElement;
  alpha = 0;
  viewerTeam: number | null = null;
  /** fx 在 V4 实现;V1 空消费,保持与 2D 接口兼容。 */
  readonly fx = { consume(_w: World, _team: number | null): void {} };

  private models = new Map<number, ModelEntry>();
  private ray = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  constructor(parent: HTMLElement, _world: World, private camera: Camera) {
    this.s3d = new Scene3D(parent);
    this.canvas = this.s3d.canvas;
    // 3D 透视下默认拉近一档(2D 俯视的 0.55 在 3D 里偏远)
    if (camera.zoom < 1.0) camera.zoom = 1.4;
    this.s3d.scene.add(buildTerrain3D());
    const fit = () => this.s3d.resize(parent.clientWidth || window.innerWidth, parent.clientHeight || window.innerHeight);
    fit();
    window.addEventListener('resize', fit);
  }

  /** minimap 在 3D 下 V1 不接入;提供占位 world 尺寸。 */
  get terrain() { return { width: 15040, height: 15040 }; }

  private artInput(u: Unit): ArtInput {
    return {
      kind: u.kind,
      team: u.team,
      name: u.name,
      attackRange: u.base.attackRange,
      collisionRadius: u.base.collisionRadius,
      heroDef: u.heroDef
        ? { primary: u.heroDef.primary, color: u.heroDef.color, glyph: u.heroDef.glyph, aiRole: u.heroDef.aiRole }
        : undefined,
    };
  }

  private ensureModel(u: Unit): ModelEntry {
    let e = this.models.get(u.id);
    if (!e) {
      const parts = buildHumanoid(humanoidSpec(unitArt(this.artInput(u))));
      this.s3d.scene.add(parts.root);
      e = { parts, phase: 0, lastX: u.pos.x, lastZ: u.pos.y };
      this.models.set(u.id, e);
    }
    return e;
  }

  private animState(u: Unit, now: number, moved: boolean): AnimState {
    if (!u.alive) return 'death';
    if (u.channeling) return 'channel';
    if (u.casting) return 'cast';
    if (u.windupUntil > now) return 'attack';
    return moved ? 'walk' : 'idle';
  }

  render(world: World, _selectedId: number, _ux?: unknown): void {
    const now = world.time;
    const t = performance.now() / 1000;
    const seen = new Set<number>();

    for (const u of world.units.values()) {
      // V1 仅人形/可动单位;建筑/守卫在 V3
      if (u.kind === 'tower' || u.kind === 'building' || u.kind === 'ward') continue;
      seen.add(u.id);
      const e = this.ensureModel(u);
      const m = e.parts;

      // 插值位置
      const ax = u.prevPos.x + (u.pos.x - u.prevPos.x) * this.alpha;
      const az = u.prevPos.y + (u.pos.y - u.prevPos.y) * this.alpha;

      // 走路相位:按本帧实际位移累加
      const dist = Math.hypot(ax - e.lastX, az - e.lastZ);
      const moved = dist > 0.3;
      e.phase += dist * 0.05;
      e.lastX = ax; e.lastZ = az;

      const st = this.animState(u, now, moved);
      const progress = st === 'attack'
        ? 1 - Math.max(0, u.windupUntil - now) / 0.4
        : st === 'death'
          ? Math.min(1, (now - u.diedAt) / 0.4)
          : 0;
      const p = poseFor({ state: st, t, phase: e.phase, progress });

      m.legL.rotation.x = p.legL;
      m.legR.rotation.x = p.legR;
      m.armL.rotation.x = p.armL;
      m.armR.rotation.x = p.armR + p.weaponSwing;
      m.hips.position.y = m.hipBaseY + p.torsoBob;
      m.root.position.set(ax, -p.rootSink * 22, az);
      m.root.rotation.y = -u.facing + Math.PI / 2;
      m.root.visible = u.alive || (now - u.diedAt) < 2;
    }

    // 回收消失单位的模型
    for (const [id, e] of this.models) {
      if (!seen.has(id)) {
        this.s3d.scene.remove(e.parts.root);
        this.models.delete(id);
      }
    }

    this.s3d.setNight(world.isNight);
    this.s3d.syncCamera(this.camera);
    this.s3d.render();
  }

  /** 屏幕坐标 → 世界坐标(raycast 到地面)。供 InputManager(play 模式 3D 在 V2 完整接入)。 */
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const ndc = new THREE.Vector2(
      (sx / this.canvas.clientWidth) * 2 - 1,
      -(sy / this.canvas.clientHeight) * 2 + 1,
    );
    this.ray.setFromCamera(ndc, this.s3d.cam);
    const hit = new THREE.Vector3();
    const ok = this.ray.ray.intersectPlane(this.ground, hit);
    return ok ? { x: hit.x, y: hit.z } : { x: this.camera.pos.x, y: this.camera.pos.y };
  }
}
