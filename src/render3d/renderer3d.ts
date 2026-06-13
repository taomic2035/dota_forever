/**
 * 3D 主渲染器:只读 World 状态,同步到 Three 场景,插值/动作/拾取。
 * 与 2D Renderer 并存(?renderer=3d)。sim/ui/audio 零改动。
 * 模型层可插拔:ensureModel 是接缝——将来外部 3D 素材在此按英雄优先加载,程序化兜底。
 */
import * as THREE from 'three';
import type { World } from '../sim/world';
import type { Unit } from '../sim/unit';
import type { Camera } from '../render/camera';
import { stateOf } from '../sim/combat';
import { unitArt, type ArtInput } from '../render/unitArt';
import { humanoidSpec } from './modelParts';
import { buildHumanoid, type HumanoidParts } from './modelGen';
import { poseFor, type AnimState } from './pose';
import { buildBuilding, type BuildingModel } from './buildingGen';
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
  private buildings = new Map<number, BuildingModel>();
  private ray = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  /** 血条/蓝条叠加层(2D canvas 投影绘制)。 */
  private overlay: HTMLCanvasElement;
  private octx: CanvasRenderingContext2D;
  private proj = new THREE.Vector3();

  constructor(parent: HTMLElement, _world: World, private camera: Camera) {
    this.s3d = new Scene3D(parent);
    this.canvas = this.s3d.canvas;
    // 3D 透视下默认拉近一档(2D 俯视的 0.55 在 3D 里偏远)
    if (camera.zoom < 1.0) camera.zoom = 1.4;
    this.s3d.scene.add(buildTerrain3D());

    this.overlay = document.createElement('canvas');
    this.overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;';
    parent.appendChild(this.overlay);
    this.octx = this.overlay.getContext('2d')!;

    const fit = () => {
      const w = parent.clientWidth || window.innerWidth, h = parent.clientHeight || window.innerHeight;
      this.s3d.resize(w, h);
      this.overlay.width = w; this.overlay.height = h;
    };
    fit();
    window.addEventListener('resize', fit);
  }

  private readonly TEAM = ['#52d869', '#ef5350'];

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
      // 贴地队色选取环
      const ringColor = this.TEAM[u.team] ?? '#bdbdbd';
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(u.base.collisionRadius * 0.9, u.base.collisionRadius * 1.25, 20),
        new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 1.5;
      parts.root.add(ring);
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
      if (u.kind === 'ward') continue; // 守卫 V3 后续
      // 建筑:静态模型,置位一次;主基地护盾随无敌显隐
      if (u.kind === 'tower' || u.kind === 'building') {
        seen.add(u.id);
        let b = this.buildings.get(u.id);
        if (!b && u.buildingKind) {
          b = buildBuilding(u.buildingKind, u.team);
          b.group.position.set(u.pos.x, 0, u.pos.y);
          this.s3d.scene.add(b.group);
          this.buildings.set(u.id, b);
        }
        if (b) {
          b.group.visible = u.alive;
          if (b.shield) b.shield.visible = u.invulnerable;
        }
        continue;
      }
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

      // 状态视觉:受击闪白 / 眩晕泛光 / 隐身半透(每单位独立材质)
      const s = stateOf(u);
      const hit = now - u.lastDamagedAt < 0.12;
      const lvl = hit ? 0.7 : s.stunned ? 0.3 + 0.15 * Math.sin(t * 12) : 0;
      const op = s.invisible ? 0.4 : 1;
      for (const mm of m.materials) {
        if (hit) mm.emissive.setRGB(lvl, lvl, lvl);
        else if (s.stunned) mm.emissive.setRGB(lvl, lvl * 0.7, 0);
        else mm.emissive.setRGB(0, 0, 0);
        if (op < 1) { mm.transparent = true; mm.opacity = op; }
        else if (mm.transparent) { mm.transparent = false; mm.opacity = 1; }
      }
    }

    // 回收消失单位的模型
    for (const [id, e] of this.models) {
      if (!seen.has(id)) {
        this.s3d.scene.remove(e.parts.root);
        this.models.delete(id);
      }
    }
    for (const [id, b] of this.buildings) {
      if (!seen.has(id)) {
        this.s3d.scene.remove(b.group);
        this.buildings.delete(id);
      }
    }

    this.s3d.setNight(world.isNight);
    this.s3d.syncCamera(this.camera);
    this.s3d.render();
    this.drawBars(world);
  }

  /** 血条/蓝条:投影单位顶部到屏幕,2D 叠加层绘制(队色血条,英雄含蓝条)。 */
  private drawBars(world: World): void {
    const ctx = this.octx, W = this.overlay.width, H = this.overlay.height;
    ctx.clearRect(0, 0, W, H);
    const cam = this.s3d.cam;
    for (const u of world.units.values()) {
      if (!u.alive || u.kind === 'ward') continue;
      const isHero = u.isHero();
      const isBuild = u.kind === 'tower' || u.kind === 'building';
      if (!isHero && !isBuild && u.hp >= u.calc.maxHp) continue; // 满血小兵/野怪不画,减杂乱
      const topY = isBuild ? 320 : 112;
      this.proj.set(u.pos.x, topY, u.pos.y).project(cam);
      if (this.proj.z > 1) continue; // 相机背后
      const sx = (this.proj.x * 0.5 + 0.5) * W;
      const sy = (-this.proj.y * 0.5 + 0.5) * H;
      if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
      const bw = isHero ? 44 : isBuild ? 40 : 28;
      const bh = 5;
      const frac = Math.max(0, Math.min(1, u.hp / u.calc.maxHp));
      ctx.fillStyle = 'rgba(8,8,8,0.82)';
      ctx.fillRect(sx - bw / 2 - 1, sy - 1, bw + 2, bh + 2);
      ctx.fillStyle = this.TEAM[u.team] ?? '#bdbdbd';
      ctx.fillRect(sx - bw / 2, sy, bw * frac, bh);
      if (isHero && u.calc.maxMp > 0) {
        const mf = Math.max(0, Math.min(1, u.mp / u.calc.maxMp));
        ctx.fillStyle = '#1565c0';
        ctx.fillRect(sx - bw / 2, sy + bh + 1, bw * mf, 3);
      }
    }
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
