/**
 * 3D 主渲染器:只读 World 状态,同步到 Three 场景,插值/动作/拾取。
 * 与 2D Renderer 并存(?renderer=3d)。sim/ui/audio 零改动。
 * 模型层可插拔:ensureModel 是接缝——将来外部 3D 素材在此按英雄优先加载,程序化兜底。
 */
import * as THREE from 'three';
import type { World } from '../sim/world';
import type { GameMap } from '../sim/map';
import type { Unit } from '../sim/unit';
import type { Camera } from '../render/camera';
import { stateOf } from '../sim/combat';
import { unitArt, type ArtInput } from '../render/unitArt';
import { buildUnitModel, type UnitModel } from './unitModel';
import { hasHero3DAsset, buildHero3DUnitModel } from './hero3dModel';
import { resourceAssetForUnit, buildResource3DUnitModel, buildResource3DBuilding } from './resource3dModel';
import { poseFor, type AnimState } from './pose';
import { buildBuilding, type BuildingModel } from './buildingGen';
import { Fx3D } from './fx3d';
import { Scene3D } from './scene';
import { buildTerrain3D, terrainElevation, updateTerrainRuntimeMotion } from './terrain3d';
import { Fog3D } from './fog3d';
import { isVisibleTo } from '../sim/vision';
import type { UxFeedback } from '../ui/uxFeedback';
import { resolveCastStatus, castStatusHex } from '../engine/castValidity';
import { buildCommandQueuePath } from '../render/commandQueuePath';
import { unitStatusPips } from '../render/statusPips';
import { castBarInfo, type CastTrackEntry } from '../render/castBar';
import { healthBarTicks } from '../render/healthBar';
import { visualStateFor3D } from './visualState';
import { applyHeroStatusFx, createHeroStatusFxObjects, heroStatusFxState, type HeroStatusFxObjects } from './statusFx';
import { stackedUnitVisualOffset } from './stackOffset';
import { applyCommandQueue3D, commandQueue3DState, createCommandQueue3DObjects, type CommandQueue3DObjects } from './commandQueue3d';
import { selection3DMarkerIds } from './selection3d';
import { isMapPingKind, mapPingVisual } from '../ui/mapPingModel';

interface Gameplay3DReadabilityInput {
  isHero: boolean;
  isBuilding: boolean;
  collisionRadius: number;
}

export interface Gameplay3DReadabilityProfile {
  modelScale: number;
  teamRingInnerRadius: number;
  teamRingOuterRadius: number;
  teamRingOpacity: number;
  teamDiscRadius: number;
  teamDiscOpacity: number;
  selectedRingBaseRadius: number;
  selectedRingOpacityMin: number;
  selectedRingOpacityMax: number;
  healthAnchorY: number;
  healthBarWidth: number;
  healthBarHeight: number;
}

/** V23:真实对局镜头下的单位可读性参数。英雄更大,地面光效更克制,血条上移避免压住模型。 */
export function gameplay3DUnitReadabilityProfile(input: Gameplay3DReadabilityInput): Gameplay3DReadabilityProfile {
  const rr = Math.max(14, input.collisionRadius);
  if (input.isBuilding) {
    return {
      modelScale: 1,
      teamRingInnerRadius: rr * 0.9,
      teamRingOuterRadius: rr * 1.25,
      teamRingOpacity: 0.45,
      teamDiscRadius: 0,
      teamDiscOpacity: 0,
      selectedRingBaseRadius: Math.max(26, rr * 1.7),
      selectedRingOpacityMin: 0.5,
      selectedRingOpacityMax: 0.7,
      healthAnchorY: 320,
      healthBarWidth: 40,
      healthBarHeight: 5,
    };
  }
  if (input.isHero) {
    return {
      modelScale: 1.68,
      teamRingInnerRadius: rr * 1.18,
      teamRingOuterRadius: rr * 1.42,
      teamRingOpacity: 0.54,
      teamDiscRadius: rr * 1.48,
      teamDiscOpacity: 0.08,
      selectedRingBaseRadius: Math.max(34, rr * 1.72),
      selectedRingOpacityMin: 0.52,
      selectedRingOpacityMax: 0.68,
      healthAnchorY: 152,
      healthBarWidth: 50,
      healthBarHeight: 6,
    };
  }
  return {
    modelScale: 1,
    teamRingInnerRadius: rr * 0.9,
    teamRingOuterRadius: rr * 1.25,
    teamRingOpacity: 0.45,
    teamDiscRadius: 0,
    teamDiscOpacity: 0,
    selectedRingBaseRadius: Math.max(26, rr * 1.7),
    selectedRingOpacityMin: 0.5,
    selectedRingOpacityMax: 0.7,
    healthAnchorY: 112,
    healthBarWidth: 28,
    healthBarHeight: 5,
  };
}

interface ModelEntry { model: UnitModel; phase: number; lastX: number; lastZ: number; statusFx: HeroStatusFxObjects; }

export class Renderer3D {
  readonly s3d: Scene3D;
  readonly canvas: HTMLCanvasElement;
  alpha = 0;
  viewerTeam: number | null = null;
  /** 3D 特效:消费事件流 + 弹道(与 2D fx 接口一致:consume(world, team))。 */
  readonly fx: Fx3D;

  private models = new Map<number, ModelEntry>();
  private buildings = new Map<number, BuildingModel>();
  private ray = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  /** 血条/蓝条叠加层(2D canvas 投影绘制)。 */
  private overlay: HTMLCanvasElement;
  private octx: CanvasRenderingContext2D;
  private proj = new THREE.Vector3();
  /** 施法指示器:贴地距离环 / AoE 范围 / 线形(透视正确,跟随 ux.targeting)。 */
  private tGroup = new THREE.Group();
  private tRing!: THREE.Mesh;
  private tAoe!: THREE.Mesh;
  private tAoeRing!: THREE.Mesh;
  private tLine!: THREE.Mesh;
  /** 选中高亮:跟随左键选中单位的贴地脉冲环(区别于每单位常驻队色环)。 */
  private selRing!: THREE.Mesh;
  private secondarySelRings: THREE.Mesh[] = [];
  /** 悬停轮廓:跟随鼠标悬停单位的贴地环,敌红/友绿/中立黄(右键预期反馈)。 */
  private hovRing!: THREE.Mesh;
  /** 施法/引导进度条:渲染侧捕获每单位本次施法的起始时刻(sim 只存结束时刻),算进度。 */
  private castTrack = new Map<number, CastTrackEntry>();
  /** 小地图地形缩略图(从 map 烘焙,供 MiniMap 在 3D 下使用)。 */
  private terrainThumb: HTMLCanvasElement;
  private readonly queueFx: CommandQueue3DObjects;
  /** 3D 战争迷雾纱罩(贴地半透明层,补「地面永远全亮」漏洞)。 */
  private readonly fog3d: Fog3D;

  constructor(parent: HTMLElement, world: World, private camera: Camera) {
    this.s3d = new Scene3D(parent);
    this.canvas = this.s3d.canvas;
    this.fx = new Fx3D(this.s3d.scene);
    this.queueFx = createCommandQueue3DObjects(12);
    // 3D 默认视野:拉远到可看清英雄 + 周边战场(MOBA 可玩视野 ~1100 世界单位宽)。
    // 旧值 1.4 过近(仅 ~470 宽,英雄占满屏看不到战场);改 0.62 配合更俯的视角与放大的模型。
    if (camera.zoom < 1.0) camera.zoom = 0.62;
    this.s3d.scene.add(buildTerrain3D(world.map));
    this.fog3d = new Fog3D(world.map);
    this.s3d.scene.add(this.fog3d.mesh);
    this.s3d.scene.add(this.queueFx.root);
    this.buildTargeting();
    this.terrainThumb = bakeMiniTerrain(world.map);

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

  /** 供 MiniMap 烘缩略图(canvas;与 2D Renderer.terrain 接口一致)。 */
  get terrain(): HTMLCanvasElement { return this.terrainThumb; }

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
      // 模型优先级:英雄精细素材 → 兵/野怪/Boss resource3d 素材 → 程序化兜底
      const heroKey = u.heroDef?.key;
      let model: UnitModel;
      if (heroKey && hasHero3DAsset(heroKey)) {
        model = buildHero3DUnitModel(heroKey);
      } else {
        const art = unitArt(this.artInput(u));
        const res = resourceAssetForUnit(art.role, u.team, u.name);
        model = res ? buildResource3DUnitModel(res.key, res.scale) : buildUnitModel(art);
      }
      // 英雄整体放大,明确高于小兵/野怪(DotA 英雄体型显著);死亡下沉/位姿由 renderer 另置,不受影响
      const isHero = u.isHero();
      const readability = gameplay3DUnitReadabilityProfile({ isHero, isBuilding: false, collisionRadius: u.base.collisionRadius });
      if (isHero) model.root.scale.multiplyScalar(readability.modelScale);
      model.root.userData.gameplay3DReadabilityProfile = readability;
      // 贴地队色选取环:英雄更大更亮 + 内圈实心盘,与小兵区分(守卫等极小半径给可见下限)
      const ringColor = this.TEAM[u.team] ?? '#bdbdbd';
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(readability.teamRingInnerRadius, readability.teamRingOuterRadius, 28),
        new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: readability.teamRingOpacity, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 1.5;
      model.root.add(ring);
      if (readability.teamDiscOpacity > 0) {
        // 英雄脚下柔光盘,进一步突出主控单位
        const disc = new THREE.Mesh(
          new THREE.CircleGeometry(readability.teamDiscRadius, 28),
          new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: readability.teamDiscOpacity, side: THREE.DoubleSide, depthWrite: false }),
        );
        disc.rotation.x = -Math.PI / 2;
        disc.position.y = 1.2;
        model.root.add(disc);
      }
      const statusFx = createHeroStatusFxObjects();
      model.root.add(statusFx.root);
      this.s3d.scene.add(model.root);
      e = { model, phase: 0, lastX: u.pos.x, lastZ: u.pos.y, statusFx };
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

  render(world: World, selectedId: number, ux?: UxFeedback): void {
    const now = world.time;
    const t = performance.now() / 1000;
    const seen = new Set<number>();
    const stackGroups = this.stackGroups(world);

    for (const u of world.units.values()) {
      // 建筑:静态模型,置位一次;主基地护盾随无敌显隐
      if (u.kind === 'tower' || u.kind === 'building') {
        seen.add(u.id);
        let b = this.buildings.get(u.id);
        if (!b && u.buildingKind) {
          // 优先 resource3d 精细建筑,未映射则程序化兜底
          b = buildResource3DBuilding(u.buildingKind, u.team) ?? buildBuilding(u.buildingKind, u.team);
          b.group.position.set(u.pos.x, terrainElevation(world.map, u.pos.x, u.pos.y), u.pos.y);
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
      const m = e.model;

      // 插值位置
      const ax = u.prevPos.x + (u.pos.x - u.prevPos.x) * this.alpha;
      const az = u.prevPos.y + (u.pos.y - u.prevPos.y) * this.alpha;
      const stack = stackGroups.get(this.stackKey(u.pos.x, u.pos.y));
      const stackIndex = stack ? stack.indexOf(u.id) : -1;
      const stackOffset = stack && stackIndex >= 0
        ? stackedUnitVisualOffset(stackIndex, stack.length, Math.max(18, u.base.collisionRadius * 1.35))
        : { x: 0, z: 0 };
      const vx = ax + stackOffset.x;
      const vz = az + stackOffset.z;

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

      const sink = st === 'death' ? progress : 0;
      const ey = terrainElevation(world.map, vx, vz);
      m.root.position.set(vx, ey - sink * 26, vz);
      m.root.rotation.y = -u.facing + Math.PI / 2;
      // 战争迷雾门控:敌方单位仅在视野内可见(对齐 2D;否则雾中敌人/眼全透明可见=作弊级泄露)
      const visible = this.viewerTeam === null || u.team === this.viewerTeam || isVisibleTo(world, this.viewerTeam, u);
      m.root.visible = visible && (u.alive || (now - u.diedAt) < 2);
      if (!visible) continue; // 雾中:不渲染、不耗动画/染色 CPU

      // 视锥外:跳过动画/染色(纯 CPU 省,画面不变;渲染剔除由 three 自动处理)
      this.proj.set(vx, ey + 70, vz).project(this.s3d.cam);
      const onScreen = this.proj.z < 1
        && this.proj.x > -1.25 && this.proj.x < 1.25
        && this.proj.y > -1.25 && this.proj.y < 1.25;
      if (!onScreen) continue;

      const s = stateOf(u);
      const visual = visualStateFor3D({
        now,
        lastDamagedAt: u.lastDamagedAt,
        stunned: !!s.stunned,
        invisible: !!s.invisible,
        t,
      });
      const poseInput = {
        state: st,
        t,
        phase: e.phase,
        progress,
        status: {
          hit: visual.hitFlash > 0,
          stunned: visual.stunStars > 0,
          invisible: visual.opacity < 1,
        },
      };
      m.applyPose(poseInput);
      const pose = poseFor(poseInput);
      applyHeroStatusFx(e.statusFx, heroStatusFxState({
        castGlow: pose.castGlow,
        channelPulse: pose.channelPulse,
        stunStars: visual.stunStars,
        invisibilityAlpha: pose.invisibilityAlpha,
        t,
      }));

      // 状态视觉:受击闪白 / 眩晕泛光 / 隐身半透(每单位独立材质)
      for (const mm of m.materials) {
        mm.emissive.setRGB(...visual.emissive);
        if (visual.opacity < 1) { mm.transparent = true; mm.opacity = visual.opacity; }
        else if (mm.transparent) { mm.transparent = false; mm.opacity = 1; }
      }
    }

    // 回收消失单位的模型
    for (const [id, e] of this.models) {
      if (!seen.has(id)) {
        this.s3d.scene.remove(e.model.root);
        this.models.delete(id);
      }
    }
    for (const [id, b] of this.buildings) {
      if (!seen.has(id)) {
        this.s3d.scene.remove(b.group);
        this.buildings.delete(id);
      }
    }

    this.fx.update(world, performance.now() / 1000);
    this.updateTargeting(world, ux);
    this.updateSelectionRing(world, selectedId, t, ux);
    this.updateHoverRing(world, ux?.hoverUnitId ?? 0, selectedId);
    this.updateCommandQueue(world, selectedId, t);
    updateTerrainRuntimeMotion(this.s3d.scene, t); // V4:河流漂移/浪花脉冲/芦苇摆动等纯渲染动效
    this.s3d.setNight(world.isNight);
    this.s3d.syncCamera(this.camera);
    this.fog3d.update(world, this.viewerTeam, world.time);
    this.s3d.render();
    this.drawBars(world);
    if (ux?.altInfo) this.drawTowerRanges3D(world);
    this.drawUxPulses3D(world, ux);
    this.drawFloatTexts3D(world);
  }

  /** Alt 信息层:防御塔攻击范围圈(采样地面圆投影到 overlay;敌红=危险/友绿=安全)。塔位固定,不做迷雾门控。 */
  private drawTowerRanges3D(world: World): void {
    const ctx = this.octx, W = this.overlay.width, H = this.overlay.height;
    const cam = this.s3d.cam;
    const N = 48;
    for (const u of world.units.values()) {
      if (u.kind !== 'tower' || !u.alive) continue;
      const range = u.calc.attackRange;
      if (range <= 0) continue;
      const enemy = this.viewerTeam !== null && u.team !== this.viewerTeam;
      let allFront = true;
      const pts: ({ x: number; y: number } | null)[] = [];
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        const wx = u.pos.x + Math.cos(a) * range;
        const wz = u.pos.y + Math.sin(a) * range;
        this.proj.set(wx, terrainElevation(world.map, wx, wz) + 4, wz).project(cam);
        if (this.proj.z > 1) { allFront = false; pts.push(null); continue; }
        pts.push({ x: (this.proj.x * 0.5 + 0.5) * W, y: (-this.proj.y * 0.5 + 0.5) * H });
      }
      if (pts.every((p) => p === null)) continue;
      ctx.beginPath();
      let started = false;
      for (const p of pts) {
        if (!p) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = enemy ? 'rgba(255,80,72,0.6)' : 'rgba(120,210,120,0.5)';
      if (allFront) {
        ctx.fillStyle = enemy ? 'rgba(255,80,72,0.08)' : 'rgba(120,210,120,0.06)';
        ctx.fill();
      }
      ctx.stroke();
    }
  }

  /** 浮动战斗文字(伤害数字/赏金):投影世界锚点到 overlay,上浮淡出 + 描边(3D 战斗反馈,对齐 2D)。 */
  private drawFloatTexts3D(world: World): void {
    const texts = this.fx.floatTexts;
    if (!texts.length) return;
    const ctx = this.octx, W = this.overlay.width, H = this.overlay.height;
    const cam = this.s3d.cam;
    const now = performance.now();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = texts.length - 1; i >= 0; i--) {
      const ft = texts[i];
      const k = (now - ft.bornMs) / 1000 / ft.life;
      if (k >= 1) { texts.splice(i, 1); continue; }
      this.proj.set(ft.x, terrainElevation(world.map, ft.x, ft.y) + 95, ft.y).project(cam);
      if (this.proj.z > 1) continue; // 相机背后
      const sx = (this.proj.x * 0.5 + 0.5) * W;
      const sy = (-this.proj.y * 0.5 + 0.5) * H - k * 34; // 上浮
      if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue; // 屏外不画(队友远处补刀等)
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `700 ${ft.size}px system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(ft.text, sx, sy);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, sx, sy);
    }
    ctx.restore();
  }

  /** 移动/攻击/施法落点脉冲:投影到 overlay 画透视正确的地面扩散环(3D 操作反馈,对齐 2D)。 */
  private drawUxPulses3D(world: World, ux?: UxFeedback): void {
    if (!ux) return;
    const ctx = this.octx, W = this.overlay.width, H = this.overlay.height;
    const cam = this.s3d.cam;
    for (const pulse of ux.worldPulsesAt(world.time)) {
      const age = world.time - pulse.time;
      const u = Math.max(0, Math.min(1, age / 0.55));
      const elev = terrainElevation(world.map, pulse.pos.x, pulse.pos.y) + 6;
      this.proj.set(pulse.pos.x, elev, pulse.pos.y).project(cam);
      if (this.proj.z > 1) continue; // 相机背后
      const sx = (this.proj.x * 0.5 + 0.5) * W;
      const sy = (-this.proj.y * 0.5 + 0.5) * H;
      const baseR = 34 + 78 * u; // 世界单位,随时间扩散
      this.proj.set(pulse.pos.x + baseR, elev, pulse.pos.y).project(cam);
      const r = Math.max(6, Math.hypot((this.proj.x * 0.5 + 0.5) * W - sx, (-this.proj.y * 0.5 + 0.5) * H - sy));
      const color =
        pulse.kind === 'move' ? '#7cff6b' :
        pulse.kind === 'attack' ? '#ff4c42' :
        pulse.kind === 'attackmove' ? '#ffd45a' :
        pulse.kind === 'queued' ? '#8dff7a' :
        pulse.kind === 'reject' ? '#ff3040' :
        isMapPingKind(pulse.kind) ? mapPingVisual(pulse.kind).worldColor : '#cfe8ff';
      ctx.save();
      ctx.globalAlpha = 1 - u;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, 4.5 * (1 - u * 0.35));
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.stroke();
      if (pulse.kind === 'attack' || pulse.kind === 'attackmove' || pulse.kind === 'queued') {
        const c = r * 0.5;
        ctx.beginPath();
        ctx.moveTo(sx - c, sy); ctx.lineTo(sx + c, sy);
        ctx.moveTo(sx, sy - c); ctx.lineTo(sx, sy + c);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private stackGroups(world: World): Map<string, number[]> {
    const groups = new Map<string, number[]>();
    for (const u of world.units.values()) {
      if (!u.alive || u.kind === 'tower' || u.kind === 'building') continue;
      const key = this.stackKey(u.pos.x, u.pos.y);
      let list = groups.get(key);
      if (!list) {
        list = [];
        groups.set(key, list);
      }
      list.push(u.id);
    }
    for (const [key, list] of groups) {
      if (list.length <= 1) groups.delete(key);
      else list.sort((a, b) => a - b);
    }
    return groups;
  }

  private stackKey(x: number, y: number): string {
    return `${Math.round(x / 32)}:${Math.round(y / 32)}`;
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
      // 迷雾门控(建筑为已知地标不门控):雾中敌方单位不画血条/状态点
      if (!isBuild && this.viewerTeam !== null && u.team !== this.viewerTeam && !isVisibleTo(world, this.viewerTeam, u)) continue;
      const readability = gameplay3DUnitReadabilityProfile({ isHero, isBuilding: isBuild, collisionRadius: u.base.collisionRadius });
      if (!isHero && !isBuild && u.hp >= u.calc.maxHp) continue; // 满血小兵/野怪不画,减杂乱
      const topY = readability.healthAnchorY;
      this.proj.set(u.pos.x, topY + terrainElevation(world.map, u.pos.x, u.pos.y), u.pos.y).project(cam);
      if (this.proj.z > 1) continue; // 相机背后
      const sx = (this.proj.x * 0.5 + 0.5) * W;
      const sy = (-this.proj.y * 0.5 + 0.5) * H;
      if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
      const bw = readability.healthBarWidth;
      const bh = readability.healthBarHeight;
      const frac = Math.max(0, Math.min(1, u.hp / u.calc.maxHp));
      ctx.fillStyle = 'rgba(8,8,8,0.82)';
      ctx.fillRect(sx - bw / 2 - 1, sy - 1, bw + 2, bh + 2);
      ctx.fillStyle = this.TEAM[u.team] ?? '#bdbdbd';
      ctx.fillRect(sx - bw / 2, sy, bw * frac, bh);
      // 血条 250/1000 刻度(英雄/Boss),与 2D 共用 healthBarTicks
      if (isHero || u.kind === 'boss') {
        for (const tk of healthBarTicks(u.calc.maxHp)) {
          ctx.fillStyle = tk.major ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.45)';
          ctx.fillRect(sx - bw / 2 + bw * tk.at, sy, tk.major ? 1.5 : 1, bh);
        }
      }
      if (isHero && u.calc.maxMp > 0) {
        const mf = Math.max(0, Math.min(1, u.mp / u.calc.maxMp));
        ctx.fillStyle = '#1565c0';
        ctx.fillRect(sx - bw / 2, sy + bh + 1, bw * mf, 3);
      }
      // 状态色点(控制红/敌方减益橙/增益绿):所有单位头顶(与 2D drawStatusStrip 一致,补 3D 非英雄缺口)
      {
        const pips = unitStatusPips(world, u, world.time, 6);
        if (pips.length) {
          const psz = 7, pgap = 2;
          const totalW = pips.length * psz + (pips.length - 1) * pgap;
          let px = sx - totalW / 2;
          const py = sy - psz - 3;
          for (const pip of pips) {
            ctx.fillStyle = 'rgba(8,8,8,0.85)';
            ctx.fillRect(px - 1, py - 1, psz + 2, psz + 2);
            ctx.fillStyle = pip.color;
            ctx.fillRect(px, py, psz, psz);
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(px, py + psz - 2, psz, 2);
            ctx.fillStyle = '#fff';
            ctx.fillRect(px, py + psz - 2, psz * pip.frac, 2);
            px += psz + pgap;
          }
        }
      }
      // 施法/引导进度条(自己/敌方均显示,可读条打断;与 2D 渲染器共用 castBarInfo)
      const cb = castBarInfo(this.castTrack, u, world.time);
      if (cb) {
        const cby = sy + bh + (isHero && u.calc.maxMp > 0 ? 5 : 2);
        ctx.fillStyle = 'rgba(8,8,8,0.85)';
        ctx.fillRect(sx - bw / 2 - 1, cby - 1, bw + 2, 5);
        ctx.fillStyle = cb.color;
        ctx.fillRect(sx - bw / 2, cby, bw * cb.frac, 3);
      }
    }
  }

  private buildTargeting(): void {
    const ringMat = () => new THREE.MeshBasicMaterial({ color: 0x50aaff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
    this.tRing = new THREE.Mesh(new THREE.RingGeometry(0.975, 1.0, 64), ringMat());
    this.tAoe = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x50aaff, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }));
    this.tAoeRing = new THREE.Mesh(new THREE.RingGeometry(0.93, 1.0, 48), ringMat());
    for (const m of [this.tRing, this.tAoe, this.tAoeRing]) { m.rotation.x = -Math.PI / 2; m.renderOrder = 3; m.visible = false; }
    this.tLine = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 1), new THREE.MeshBasicMaterial({ color: 0x50aaff, transparent: true, opacity: 0.32, depthWrite: false }));
    this.tLine.renderOrder = 3; this.tLine.visible = false;
    this.tGroup.add(this.tRing, this.tAoe, this.tAoeRing, this.tLine);
    this.tGroup.visible = false;
    this.s3d.scene.add(this.tGroup);

    // 选中高亮环:亮黄,贴地,渲染于模型之上,render() 中跟随选中单位并轻微脉冲。
    this.selRing = new THREE.Mesh(
      new THREE.RingGeometry(0.82, 1.0, 40),
      new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, depthTest: false }),
    );
    this.selRing.rotation.x = -Math.PI / 2;
    this.selRing.renderOrder = 4;
    this.selRing.visible = false;
    this.s3d.scene.add(this.selRing);

    // 悬停轮廓环:细环,颜色按关系在 update 时设置(敌红/友绿/中立黄)。
    this.hovRing = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.0, 36),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, depthTest: false }),
    );
    this.hovRing.rotation.x = -Math.PI / 2;
    this.hovRing.renderOrder = 4;
    this.hovRing.visible = false;
    this.s3d.scene.add(this.hovRing);
  }

  /** 悬停轮廓:贴地环跟随鼠标悬停单位,按与观察者的关系着色;选中单位/无悬停则隐藏。 */
  private updateHoverRing(world: World, hoverId: number, selectedId: number): void {
    const u = hoverId && hoverId !== selectedId ? world.getUnit(hoverId) : undefined;
    if (!u || !u.alive) { this.hovRing.visible = false; return; }
    const rel = this.viewerTeam === null ? 'n'
      : u.team === this.viewerTeam ? 'a'
        : u.team === 2 ? 'n' : 'e'; // Team.Neutral === 2
    const color = rel === 'e' ? 0xff5648 : rel === 'a' ? 0x7ce47c : 0xe2d678;
    const vx = u.prevPos.x + (u.pos.x - u.prevPos.x) * this.alpha;
    const vz = u.prevPos.y + (u.pos.y - u.prevPos.y) * this.alpha;
    const ey = terrainElevation(world.map, vx, vz);
    const ringR = Math.max(24, u.base.collisionRadius * 1.55);
    (this.hovRing.material as THREE.MeshBasicMaterial).color.setHex(color);
    this.hovRing.position.set(vx, ey + 1.5, vz);
    this.hovRing.scale.set(ringR, ringR, ringR);
    this.hovRing.visible = true;
  }

  /** 选中高亮:贴地环跟随选中单位(插值位置),轻微脉冲;无有效选中则隐藏。 */
  private updateSelectionRing(world: World, selectedId: number, t: number, ux?: UxFeedback): void {
    const markers = selection3DMarkerIds(selectedId, ux);
    this.updatePrimarySelectionRing(world, markers.primaryId, t);
    this.updateSecondarySelectionRings(world, markers.secondaryIds, t);
  }

  private updatePrimarySelectionRing(world: World, selectedId: number, t: number): void {
    const u = selectedId ? world.getUnit(selectedId) : undefined;
    if (!u || !u.alive) { this.selRing.visible = false; return; }
    const vx = u.prevPos.x + (u.pos.x - u.prevPos.x) * this.alpha;
    const vz = u.prevPos.y + (u.pos.y - u.prevPos.y) * this.alpha;
    const ey = terrainElevation(world.map, vx, vz);
    const readability = gameplay3DUnitReadabilityProfile({ isHero: u.isHero(), isBuilding: u.kind === 'tower' || u.kind === 'building', collisionRadius: u.base.collisionRadius });
    const baseR = readability.selectedRingBaseRadius;
    const pulse = baseR * (1 + 0.06 * Math.sin(t * 5));
    this.selRing.position.set(vx, ey + 2, vz);
    this.selRing.scale.set(pulse, pulse, pulse);
    const wave = 0.5 + 0.5 * Math.sin(t * 5);
    (this.selRing.material as THREE.MeshBasicMaterial).opacity = readability.selectedRingOpacityMin + (readability.selectedRingOpacityMax - readability.selectedRingOpacityMin) * wave;
    this.selRing.visible = true;
  }

  private updateSecondarySelectionRings(world: World, selectedIds: number[], t: number): void {
    let visibleCount = 0;
    for (const id of selectedIds) {
      const u = world.getUnit(id);
      if (!u || !u.alive) continue;
      const ring = this.secondarySelectionRingAt(visibleCount);
      const vx = u.prevPos.x + (u.pos.x - u.prevPos.x) * this.alpha;
      const vz = u.prevPos.y + (u.pos.y - u.prevPos.y) * this.alpha;
      const ey = terrainElevation(world.map, vx, vz);
      const readability = gameplay3DUnitReadabilityProfile({ isHero: u.isHero(), isBuilding: u.kind === 'tower' || u.kind === 'building', collisionRadius: u.base.collisionRadius });
      const baseR = readability.selectedRingBaseRadius * 0.86;
      const pulse = baseR * (1 + 0.035 * Math.sin(t * 4 + id));
      ring.position.set(vx, ey + 1.8, vz);
      ring.scale.set(pulse, pulse, pulse);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.32 + 0.1 * (0.5 + 0.5 * Math.sin(t * 4 + id));
      ring.visible = true;
      visibleCount++;
    }
    for (let i = visibleCount; i < this.secondarySelRings.length; i++) {
      this.secondarySelRings[i].visible = false;
    }
  }

  private secondarySelectionRingAt(index: number): THREE.Mesh {
    let ring = this.secondarySelRings[index];
    if (!ring) {
      ring = new THREE.Mesh(
        new THREE.RingGeometry(0.86, 1.0, 36),
        new THREE.MeshBasicMaterial({ color: 0x9cff74, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false, depthTest: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 4;
      ring.visible = false;
      this.s3d.scene.add(ring);
      this.secondarySelRings[index] = ring;
    }
    return ring;
  }

  /** 施法指示器:读 ux.targeting,贴地绘制距离环 / AoE 范围 / 线形(队色合法蓝、非法红)。 */
  private updateTargeting(world: World, ux?: UxFeedback): void {
    const t = ux?.targeting;
    if (!t) { this.tGroup.visible = false; return; }
    this.tGroup.visible = true;
    const color = castStatusHex(resolveCastStatus(t.status, t.valid));
    const ox = t.origin.x, oz = t.origin.y;
    const oy = terrainElevation(world.map, ox, oz) + 4;
    const cur = t.cursor ?? t.origin;
    const cx = cur.x, cz = cur.y;
    const cy = terrainElevation(world.map, cx, cz) + 4;

    (this.tRing.material as THREE.MeshBasicMaterial).color.setHex(color);
    this.tRing.position.set(ox, oy, oz);
    this.tRing.scale.set(t.range, t.range, t.range);

    const aoeR = t.radius ?? (t.mode === 'unit' ? 70 : 0);
    const showAoe = aoeR > 0;
    this.tAoe.visible = showAoe; this.tAoeRing.visible = showAoe;
    if (showAoe) {
      for (const m of [this.tAoe, this.tAoeRing]) (m.material as THREE.MeshBasicMaterial).color.setHex(color);
      this.tAoe.position.set(cx, cy, cz); this.tAoe.scale.setScalar(aoeR);
      this.tAoeRing.position.set(cx, cy + 0.5, cz); this.tAoeRing.scale.setScalar(aoeR);
    }

    const showLine = t.mode === 'line';
    this.tLine.visible = showLine;
    if (showLine) {
      const dx = cx - ox, dz = cz - oz; const len = Math.hypot(dx, dz) || 1;
      (this.tLine.material as THREE.MeshBasicMaterial).color.setHex(color);
      this.tLine.position.set((ox + cx) / 2, oy, (oz + cz) / 2);
      this.tLine.scale.set(len, 1, t.width ?? 80);
      this.tLine.rotation.y = -Math.atan2(dz, dx);
    }
  }

  private updateCommandQueue(world: World, selectedId: number, t: number): void {
    const unit = world.getUnit(selectedId);
    if (!unit?.alive || unit.orderQueue.length === 0) {
      applyCommandQueue3D(this.queueFx, commandQueue3DState([], { t, elevationAt: () => 0 }));
      return;
    }
    const legs = buildCommandQueuePath(world, unit);
    applyCommandQueue3D(this.queueFx, commandQueue3DState(legs, {
      t,
      elevationAt: (x, z) => terrainElevation(world.map, x, z),
    }));
  }

  /** 屏幕坐标 → 世界坐标(raycast 到地面)。供 InputManager(3D play 模式点击/施法换算)。 */
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

/** 烘焙小地图地形缩略图(俯视:河/平地/高台 + 树),供 MiniMap 在 3D 下绘制背景。 */
function bakeMiniTerrain(map: GameMap): HTMLCanvasElement {
  const N = 256;
  const c = document.createElement('canvas');
  c.width = N; c.height = N;
  const ctx = c.getContext('2d')!;
  const cw = N / map.GW;
  for (let cy = 0; cy < map.GH; cy++) {
    for (let cx = 0; cx < map.GW; cx++) {
      const h = map.height[map.cellIndex(cx, cy)];
      let col = h === 0 ? '#244a58' : h === 2 ? '#47592c' : '#33421f';
      if (map.trees.has(map.cellIndex(cx, cy))) col = '#1e3015';
      ctx.fillStyle = col;
      ctx.fillRect(cx * cw, cy * cw, cw + 1, cw + 1);
    }
  }
  return c;
}
