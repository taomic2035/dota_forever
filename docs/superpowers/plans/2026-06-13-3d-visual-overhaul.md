# 2.0 Three.js 真 3D 视觉版本 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) or subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** 全部单位从 2D 圆圈造型升级为 Three.js 真 3D 低多边形模型 + 程序化动作,与现有 2D 渲染器并存(`?renderer=3d`),sim/ui/audio 零改动。

**Architecture:** 新增 `src/render3d/`,只读 `World` 状态与事件流。纯数据层(模型部件规格、动作姿态)用 vitest 测试(无 WebGL);Three.js 构建/渲染由 Playwright 冒烟验证。1:1 世界坐标映射(x→x,y→z,高度→y)。

**Tech Stack:** TypeScript · Three.js(MIT,唯一新依赖)· Vite · vitest · Playwright(chromium-headless-shell,已装)。

**关键现有接口(集成锚点,勿臆造):**
- `Camera`(src/render/camera.ts):`pos:{x,y}`、`zoom`、`viewW/viewH`、`centerOn(p)`。
- `Unit`(src/sim/unit.ts)动画字段:`pos`、`prevPos`、`facing`、`level`、`alive`、`diedAt`、`casting`、`channeling`、`windupUntil`、`lastDamagedAt`、`collisionRadius`、`kind`。
- `unitArt(ArtInput): UnitArt`(src/render/unitArt.ts):`{shape, primary, accent, radius, weapon, role, weight, glyph}`;`ArtInput.heroDef={primary,color,glyph,aiRole}`。
- `stateOf(u)`(src/sim/combat.ts):`{stunned,silenced,...,invisible,untargetable}`。
- main.ts:`new Renderer(app, world, camera)` @138;loop `render(alpha)` 设 `renderer.alpha=alpha` 调 `renderer.render(world, hero?.id??-1, ux)`;step 钩子 `renderer.fx.consume(world, viewerTeam)`;`InputManager(renderer.canvas, camera, ...)`;`MiniMap(app, renderer.terrain, camera, ...)`。
- 渲染器对外面:`.canvas`、`.terrain`、`.fx.consume`、`.viewerTeam`、`.alpha`、`render(world, selectedId, ux)`。

---

## 里程碑总览

- **V1 可见原型(本计划详列)**:three 依赖 + 场景/灯光/相机 + 平面地形 + 英雄人形模型 + idle/walk 动作 + 镜头/拾取适配 + `?renderer=3d` 切换。**目标:浏览器里看到 3D 英雄走动。**
- **V2 动作全集**:attack/cast/channel/death/受击/眩晕/隐身 + 朝向/位置插值打磨。
- **V3 全单位**:小兵/野怪/Boss/建筑模型生成器 + 选取环 + 贴屏血条。
- **V4 世界完整**:3D 地形(高台/坡道/河道/树/地标)+ 特效迁移(fx3d)+ 迷雾 + 昼夜光照。
- **V5 收尾**:性能(几何/材质缓存、实例化、静态合并)、112 英雄个性化打磨、切默认 3D、文档与 2.0.0 发布。

---

## V1 文件结构

- Create `src/render3d/scene.ts` — Three 场景、透视相机、定向/环境光、阴影、WebGLRenderer 与 canvas。
- Create `src/render3d/modelParts.ts` — **纯数据**:`humanoidSpec(art): HumanoidSpec`(描述符→部件尺寸/颜色/位置)。可测。
- Create `src/render3d/pose.ts` — **纯数据**:`poseFor(input): Pose`(动作字段+时间→各部件旋转/位移)。可测。
- Create `src/render3d/modelGen.ts` — `buildHumanoid(spec): THREE.Group`(消费 HumanoidSpec 造 Group);几何/材质缓存。
- Create `src/render3d/terrain3d.ts` — V1:平面地面 + 河道色块(占位,V4 升级)。
- Create `src/render3d/renderer3d.ts` — 主 3D 渲染器:world↔scene 同步、插值、raycast 拾取、镜像对外面。
- Modify `src/main.ts` — `?renderer=3d` 选择实例化 Renderer3D 或 Renderer。
- Create `tests/render3d/modelParts.test.ts`、`tests/render3d/pose.test.ts`。
- Modify `package.json` — 加 `three` 依赖。

---

### Task 1: 引入 three 依赖

**Files:** Modify `package.json`

- [ ] **Step 1:** 安装 three 与类型:
```bash
npm install three && npm install -D @types/three
```
- [ ] **Step 2:** 验证可导入(不应报错):
```bash
node -e "import('three').then(m=>console.log('three OK', typeof m.Scene))"
```
Expected: `three OK function`
- [ ] **Step 3:** Commit:
```bash
git add package.json package-lock.json && git commit -m "build(3d): 引入 three 依赖(2.0 视觉版本)"
```

---

### Task 2: 人形部件规格(纯数据,可测)

**Files:** Create `src/render3d/modelParts.ts`,Test `tests/render3d/modelParts.test.ts`

**类型契约:**
```ts
export interface PartBox { w: number; h: number; d: number; color: string; }
export interface HumanoidSpec {
  scale: number;            // 整体世界单位高度系数(由 art.radius 推导)
  torso: PartBox;
  head: PartBox;
  arm: PartBox;             // 单臂(左右对称)
  leg: PartBox;             // 单腿
  weapon: { kind: WeaponKind; length: number; color: string };
  hasRobe: boolean;         // 智力法袍裙摆
  accent: string;
  primary: string;
}
```

- [ ] **Step 1: 写失败测试** `tests/render3d/modelParts.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { humanoidSpec } from '../../src/render3d/modelParts';
import { unitArt } from '../../src/render/unitArt';

const strHero = unitArt({ kind: 'hero', team: 0, name: 'A', attackRange: 128, collisionRadius: 24,
  heroDef: { primary: 'str', color: '#c8a23c', glyph: '盾', aiRole: 'tank' } });
const intHero = unitArt({ kind: 'hero', team: 1, name: 'B', attackRange: 600, collisionRadius: 24,
  heroDef: { primary: 'int', color: '#7ec8e3', glyph: '霜', aiRole: 'support' } });

describe('humanoidSpec', () => {
  it('力量英雄躯干比智力英雄更宽', () => {
    expect(humanoidSpec(strHero).torso.w).toBeGreaterThan(humanoidSpec(intHero).torso.w);
  });
  it('智力英雄有法袍,力量英雄无', () => {
    expect(humanoidSpec(intHero).hasRobe).toBe(true);
    expect(humanoidSpec(strHero).hasRobe).toBe(false);
  });
  it('主体色取自描述符 primary', () => {
    expect(humanoidSpec(strHero).primary).toBe(strHero.primary);
  });
  it('武器种类透传', () => {
    expect(humanoidSpec(strHero).weapon.kind).toBe(strHero.weapon);
  });
});
```
- [ ] **Step 2: 运行确认失败**:`npx vitest run tests/render3d/modelParts.test.ts` → FAIL(模块不存在)。
- [ ] **Step 3: 实现** `src/render3d/modelParts.ts`:
```ts
import type { UnitArt, WeaponKind } from '../render/unitArt';

export interface PartBox { w: number; h: number; d: number; color: string; }
export interface HumanoidSpec {
  scale: number; torso: PartBox; head: PartBox; arm: PartBox; leg: PartBox;
  weapon: { kind: WeaponKind; length: number; color: string };
  hasRobe: boolean; accent: string; primary: string;
}

export function humanoidSpec(art: UnitArt): HumanoidSpec {
  const heavy = art.shape === 'bulk' || art.weight === 'heavy' || art.weight === 'boss';
  const slim = art.shape === 'blade' || art.role === 'assassin' || art.role === 'rangedCarry';
  const robe = art.shape === 'robe' || art.role === 'mage' || art.role === 'support';
  const torsoW = heavy ? 26 : slim ? 16 : 20;
  const armW = heavy ? 9 : 6;
  const legW = heavy ? 10 : 7;
  const wlen: Record<WeaponKind, number> = { sword: 34, staff: 44, bow: 30, claw: 18, hammer: 30, spear: 50, none: 0 };
  return {
    scale: Math.max(0.8, art.radius / 24),
    torso: { w: torsoW, h: 34, d: 14, color: art.primary },
    head: { w: 16, h: 16, d: 16, color: art.primary },
    arm: { w: armW, h: 28, d: armW, color: art.primary },
    leg: { w: legW, h: 28, d: legW, color: art.accent },
    weapon: { kind: art.weapon, length: wlen[art.weapon], color: art.accent },
    hasRobe: robe,
    accent: art.accent,
    primary: art.primary,
  };
}
```
- [ ] **Step 4: 运行确认通过**:`npx vitest run tests/render3d/modelParts.test.ts` → 4 passed。
- [ ] **Step 5: Commit**:`git add src/render3d/modelParts.ts tests/render3d/modelParts.test.ts && git commit -m "feat(3d): 人形部件规格(描述符→部件尺寸,纯数据可测)"`

---

### Task 3: 程序化动作姿态(纯数据,可测)

**Files:** Create `src/render3d/pose.ts`,Test `tests/render3d/pose.test.ts`

**类型契约:**
```ts
export type AnimState = 'idle' | 'walk' | 'attack' | 'cast' | 'channel' | 'death';
export interface Pose {
  legL: number; legR: number;   // 大腿绕 X 旋转(弧度)
  armL: number; armR: number;   // 上臂绕 X 旋转
  torsoBob: number;             // 躯干 Y 微移(世界单位)
  rootSink: number;             // 死亡下沉(0..1)
  weaponSwing: number;          // 武器挥砍角(攻击用)
}
export interface PoseInput { state: AnimState; t: number; phase: number; progress: number; }
```
- `t`=渲染时间(秒,连续);`phase`=走路相位驱动量(=移动距离或时间×移速);`progress`=动作进度 0..1(攻击/死亡)。

- [ ] **Step 1: 写失败测试** `tests/render3d/pose.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { poseFor } from '../../src/render3d/pose';

describe('poseFor', () => {
  it('idle:腿不摆,躯干随时间起伏', () => {
    const a = poseFor({ state: 'idle', t: 0, phase: 0, progress: 0 });
    const b = poseFor({ state: 'idle', t: 1, phase: 0, progress: 0 });
    expect(a.legL).toBeCloseTo(0, 5);
    expect(a.torsoBob).not.toBeCloseTo(b.torsoBob, 5);
  });
  it('walk:双腿反相摆动(符号相反)', () => {
    const p = poseFor({ state: 'walk', t: 0, phase: Math.PI / 2, progress: 0 });
    expect(Math.sign(p.legL)).toBe(-Math.sign(p.legR));
    expect(Math.abs(p.legL)).toBeGreaterThan(0.1);
  });
  it('walk:臂与同侧腿反相(armL 与 legL 符号相反)', () => {
    const p = poseFor({ state: 'walk', t: 0, phase: Math.PI / 2, progress: 0 });
    expect(Math.sign(p.armL)).toBe(-Math.sign(p.legL));
  });
  it('death:progress→1 时 rootSink 趋近 1', () => {
    expect(poseFor({ state: 'death', t: 0, phase: 0, progress: 1 }).rootSink).toBeCloseTo(1, 2);
  });
  it('attack:progress 中段武器挥砍角显著', () => {
    expect(Math.abs(poseFor({ state: 'attack', t: 0, phase: 0, progress: 0.5 }).weaponSwing)).toBeGreaterThan(0.3);
  });
});
```
- [ ] **Step 2: 运行确认失败** → FAIL(模块不存在)。
- [ ] **Step 3: 实现** `src/render3d/pose.ts`:
```ts
export type AnimState = 'idle' | 'walk' | 'attack' | 'cast' | 'channel' | 'death';
export interface Pose { legL: number; legR: number; armL: number; armR: number; torsoBob: number; rootSink: number; weaponSwing: number; }
export interface PoseInput { state: AnimState; t: number; phase: number; progress: number; }

export function poseFor(i: PoseInput): Pose {
  const z: Pose = { legL: 0, legR: 0, armL: 0, armR: 0, torsoBob: Math.sin(i.t * 2.2) * 0.6, rootSink: 0, weaponSwing: 0 };
  switch (i.state) {
    case 'walk': {
      const s = Math.sin(i.phase) * 0.6;
      z.legL = s; z.legR = -s; z.armL = -s * 0.8; z.armR = s * 0.8;
      z.torsoBob = Math.abs(Math.sin(i.phase)) * 1.2;
      return z;
    }
    case 'attack': {
      // 0→举起(-) 0.5→下劈(+) 1→收回
      z.weaponSwing = Math.sin(i.progress * Math.PI) * (i.progress < 0.5 ? -1 : 1) * 1.4 + (i.progress >= 0.5 ? 0 : 0);
      z.armR = -Math.sin(i.progress * Math.PI) * 1.2;
      return z;
    }
    case 'cast': z.armL = -1.2; z.armR = -1.2; z.torsoBob = Math.sin(i.t * 6) * 0.4; return z;
    case 'channel': z.armL = -1.0; z.armR = -1.0; z.torsoBob = Math.sin(i.t * 4) * 0.8; return z;
    case 'death': z.rootSink = Math.min(1, i.progress); z.legL = 0.3; z.legR = 0.3; return z;
    default: return z; // idle
  }
}
```
- [ ] **Step 4: 运行确认通过** → 5 passed。
- [ ] **Step 5: Commit**:`git add src/render3d/pose.ts tests/render3d/pose.test.ts && git commit -m "feat(3d): 程序化动作姿态(sim 字段→部件变换,纯数据可测)"`

---

### Task 4: Three 场景/相机/灯光(scene.ts)

**Files:** Create `src/render3d/scene.ts`(Three 对象封装;不单测,Task 9 冒烟)

- [ ] **Step 1: 实现** `src/render3d/scene.ts`:
```ts
import * as THREE from 'three';
import type { Camera } from '../render/camera';

const WORLD = 15040;
export class Scene3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly cam: THREE.PerspectiveCamera;
  readonly sun: THREE.DirectionalLight;
  readonly ambient: THREE.AmbientLight;
  readonly canvas: HTMLCanvasElement;

  constructor(parent: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.canvas = this.renderer.domElement;
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    parent.appendChild(this.canvas);
    this.scene.background = new THREE.Color('#0a0c08');
    this.cam = new THREE.PerspectiveCamera(40, 16 / 9, 10, 60000);
    this.sun = new THREE.DirectionalLight('#fff6e0', 1.1);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 100; this.sun.shadow.camera.far = 6000;
    const sc = this.sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = -2200; sc.right = 2200; sc.top = 2200; sc.bottom = -2200;
    this.scene.add(this.sun, this.sun.target);
    this.ambient = new THREE.AmbientLight('#6a7a8a', 0.7);
    this.scene.add(this.ambient);
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
  }

  /** 由 2D Camera(pos=世界中心,zoom)推导透视相机位姿:固定俯角约 55°。 */
  syncCamera(c: Camera) {
    const dist = 1400 / Math.max(0.12, c.zoom); // zoom 越大越近
    const pitch = Math.PI * 0.31; // ~55° 俯角
    const cx = c.pos.x, cz = c.pos.y;
    this.cam.position.set(cx, Math.sin(pitch) * dist, cz + Math.cos(pitch) * dist);
    this.cam.lookAt(cx, 0, cz);
    // 太阳跟随中心,保证阴影覆盖视野
    this.sun.position.set(cx - 800, 1800, cz - 600);
    this.sun.target.position.set(cx, 0, cz);
    this.sun.target.updateMatrixWorld();
  }

  /** 昼夜光照过渡。 */
  setNight(night: boolean) {
    this.sun.color.set(night ? '#5878b0' : '#fff6e0');
    this.sun.intensity = night ? 0.5 : 1.1;
    this.ambient.color.set(night ? '#2a3550' : '#6a7a8a');
    this.scene.background = new THREE.Color(night ? '#05060a' : '#0a0c08');
  }

  render() { this.renderer.render(this.scene, this.cam); }
}
```
- [ ] **Step 2: tsc 通过**:`npx tsc --noEmit`(2>&1 | head)。
- [ ] **Step 3: Commit**:`git add src/render3d/scene.ts && git commit -m "feat(3d): Three 场景/俯视相机/定向光阴影/昼夜光照"`

---

### Task 5: 人形模型构建(modelGen.ts)

**Files:** Create `src/render3d/modelGen.ts`(消费 HumanoidSpec 造 THREE.Group;几何/材质缓存)

- [ ] **Step 1: 实现** `src/render3d/modelGen.ts`:
```ts
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
  m.castShadow = true; return m;
}

export interface HumanoidParts {
  root: THREE.Group; hips: THREE.Group; torso: THREE.Group;
  legL: THREE.Group; legR: THREE.Group; armL: THREE.Group; armR: THREE.Group;
}

/** 由部件规格构建分层人形;返回可被 animator 操控的部件句柄。 */
export function buildHumanoid(spec: HumanoidSpec): HumanoidParts {
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = spec.leg.h; root.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  const tBox = box(spec.torso.w, spec.torso.h, spec.torso.d, spec.torso.color);
  tBox.position.y = spec.torso.h / 2; torso.add(tBox);
  const head = box(spec.head.w, spec.head.h, spec.head.d, spec.head.color);
  head.position.y = spec.torso.h + spec.head.h / 2; torso.add(head);
  // 臂:绕肩部 pivot
  const mkArm = (sign: number) => {
    const g = new THREE.Group();
    g.position.set(sign * (spec.torso.w / 2 + spec.arm.w / 2), spec.torso.h, 0);
    const b = box(spec.arm.w, spec.arm.h, spec.arm.d, spec.arm.color);
    b.position.y = -spec.arm.h / 2; g.add(b); torso.add(g); return g;
  };
  const armL = mkArm(-1), armR = mkArm(1);
  // 武器挂右手
  if (spec.weapon.kind !== 'none') {
    const w = box(3, spec.weapon.length, 3, spec.weapon.color);
    w.position.y = -spec.weapon.length / 2; armR.add(w);
  }
  // 腿:绕髋 pivot
  const mkLeg = (sign: number) => {
    const g = new THREE.Group();
    g.position.set(sign * spec.leg.w, 0, 0);
    const b = box(spec.leg.w, spec.leg.h, spec.leg.d, spec.leg.color);
    b.position.y = -spec.leg.h / 2; g.add(b); hips.add(g); return g;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);
  if (spec.hasRobe) {
    const robe = box(spec.torso.w + 8, spec.leg.h, spec.torso.d + 6, spec.accent);
    robe.position.y = -spec.leg.h / 2; hips.add(robe);
  }
  root.scale.setScalar(spec.scale);
  return { root, hips, torso, legL, legR, armL, armR };
}
```
- [ ] **Step 2: tsc 通过**。
- [ ] **Step 3: Commit**:`git add src/render3d/modelGen.ts && git commit -m "feat(3d): 人形模型构建(分层部件 Group + 材质缓存)"`

---

### Task 6: 平面地形占位(terrain3d.ts)

**Files:** Create `src/render3d/terrain3d.ts`(V1 仅平面 + 河道色块;V4 升级高台/树)

- [ ] **Step 1: 实现** `src/render3d/terrain3d.ts`:
```ts
import * as THREE from 'three';
const WORLD = 15040;
export function buildTerrain3D(): THREE.Group {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD, WORLD),
    new THREE.MeshLambertMaterial({ color: '#3a4a2a' }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(WORLD / 2, 0, WORLD / 2);
  ground.receiveShadow = true;
  g.add(ground);
  // 河道占位:中央对角带(V4 替换为真实河道几何)
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD * 1.4, 1400),
    new THREE.MeshLambertMaterial({ color: '#2c4a66', transparent: true, opacity: 0.85 }),
  );
  river.rotation.x = -Math.PI / 2; river.rotation.z = Math.PI / 4;
  river.position.set(WORLD / 2, 2, WORLD / 2);
  g.add(river);
  return g;
}
```
- [ ] **Step 2: tsc 通过**。
- [ ] **Step 3: Commit**:`git add src/render3d/terrain3d.ts && git commit -m "feat(3d): 平面地形占位(地面+河道色块,V4 升级)"`

---

### Task 7: 3D 主渲染器(renderer3d.ts)

**Files:** Create `src/render3d/renderer3d.ts`(同步 world→scene、插值、raycast 拾取、镜像 main.ts 所需对外面)

**对外面(与 2D Renderer 兼容子集):** `canvas`、`terrain`(给 minimap,复用 2D 的 `new Renderer().terrain`?——见 Step 注)、`fx`(含 `consume(world, team)`,V1 空实现)、`viewerTeam`、`alpha`、`render(world, selectedId, ux?)`、`screenToWorld(sx,sy)`(供 input)。

- [ ] **Step 1: 实现** `src/render3d/renderer3d.ts`:
```ts
import * as THREE from 'three';
import type { World } from '../sim/world';
import type { Unit } from '../sim/unit';
import type { Camera } from '../render/camera';
import { unitArt } from '../render/unitArt';
import { humanoidSpec } from './modelParts';
import { buildHumanoid, type HumanoidParts } from './modelGen';
import { poseFor, type AnimState } from './pose';
import { Scene3D } from './scene';
import { buildTerrain3D } from './terrain3d';

const RAD = Math.PI / 180;
export class Renderer3D {
  readonly s3d: Scene3D;
  readonly canvas: HTMLCanvasElement;
  alpha = 0;
  viewerTeam: number | null = null;
  fx = { consume(_w: World, _team: number | null) {} }; // V4 实现
  private models = new Map<number, HumanoidParts>();
  private ray = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  constructor(parent: HTMLElement, _world: World, private camera: Camera) {
    this.s3d = new Scene3D(parent);
    this.canvas = this.s3d.canvas;
    this.s3d.scene.add(buildTerrain3D());
    const fit = () => this.s3d.resize(parent.clientWidth, parent.clientHeight);
    fit(); window.addEventListener('resize', fit);
  }
  // minimap 仍用 2D 地形数据;此处复用现有 terrain 烘焙不可行 → minimap 改用 world.map(V3 处理),V1 提供占位
  get terrain() { return { width: 15040, height: 15040 }; }

  private ensureModel(u: Unit): HumanoidParts {
    let m = this.models.get(u.id);
    if (!m) {
      const art = unitArt({ kind: u.kind as any, team: u.team, name: u.name, attackRange: u.base.attackRange,
        collisionRadius: u.base.collisionRadius, heroDef: u.heroDef as any });
      m = buildHumanoid(humanoidSpec(art));
      this.s3d.scene.add(m.root);
      this.models.set(u.id, m);
    }
    return m;
  }

  private animState(u: Unit, now: number): AnimState {
    if (!u.alive) return 'death';
    if (u.channeling) return 'channel';
    if (u.casting) return 'cast';
    if (u.windupUntil > now) return 'attack';
    const moved = Math.hypot(u.pos.x - u.prevPos.x, u.pos.y - u.prevPos.y) > 0.5;
    return moved ? 'walk' : 'idle';
  }

  render(world: World, _selectedId: number, _ux?: unknown) {
    const now = world.time;
    const t = performance.now() / 1000;
    const seen = new Set<number>();
    for (const u of world.units.values()) {
      if (u.kind === 'tower' || u.kind === 'building' || u.kind === 'ward') continue; // V1 仅人形单位
      seen.add(u.id);
      const m = this.ensureModel(u);
      // 插值位置/朝向
      const ax = u.prevPos.x + (u.pos.x - u.prevPos.x) * this.alpha;
      const az = u.prevPos.y + (u.pos.y - u.prevPos.y) * this.alpha;
      m.root.position.set(ax, 0, az);
      m.root.rotation.y = -u.facing + Math.PI / 2;
      m.root.visible = u.alive || (now - u.diedAt) < 2;
      // 动作
      const st = this.animState(u, now);
      const phase = (u.pos.x + u.pos.y) * 0.02; // 走路相位由位移驱动(占位:用坐标;V2 用累计距离)
      const prog = st === 'attack' ? 1 - Math.max(0, (u.windupUntil - now)) / 0.4
        : st === 'death' ? Math.min(1, (now - u.diedAt) / 0.4) : 0;
      const p = poseFor({ state: st, t, phase, progress: prog });
      m.legL.rotation.x = p.legL; m.legR.rotation.x = p.legR;
      m.armL.rotation.x = p.armL; m.armR.rotation.x = p.armR + p.weaponSwing;
      m.hips.position.y = (m.legL.children.length ? 28 : 28) + p.torsoBob;
      m.root.position.y = -p.rootSink * 20;
    }
    // 清理已死亡移除的模型
    for (const [id, m] of this.models) {
      if (!seen.has(id)) { this.s3d.scene.remove(m.root); this.models.delete(id); }
    }
    this.s3d.setNight(world.isNight);
    this.s3d.syncCamera(this.camera);
    this.s3d.render();
  }

  /** 屏幕坐标 → 世界坐标(raycast 到地面),供 InputManager。 */
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const ndc = new THREE.Vector2((sx / this.canvas.clientWidth) * 2 - 1, -(sy / this.canvas.clientHeight) * 2 + 1);
    this.ray.setFromCamera(ndc, this.s3d.cam);
    const hit = new THREE.Vector3();
    this.ray.ray.intersectPlane(this.ground, hit);
    return { x: hit?.x ?? this.camera.pos.x, y: hit?.z ?? this.camera.pos.y };
  }
}
```
- [ ] **Step 2: tsc 通过**(修任何类型不匹配,如 `u.kind as any` 的窄化)。
- [ ] **Step 3: Commit**:`git add src/render3d/renderer3d.ts && git commit -m "feat(3d): 3D 主渲染器(world→scene 同步/插值/raycast 拾取)"`

---

### Task 8: main.ts 切换 `?renderer=3d`

**Files:** Modify `src/main.ts`(@138 渲染器实例化处 + input/minimap 依赖)

- [ ] **Step 1:** 在 main.ts 顶部 import:`import { Renderer3D } from './render3d/renderer3d';`
- [ ] **Step 2:** 替换 @138 实例化为按参数选择;input 用 `screenToWorld` 适配。读取 `params.get('renderer')`:
```ts
const use3d = params.get('renderer') === '3d';
const renderer = use3d ? new Renderer3D(app, world, camera) : new Renderer(app, world, camera);
renderer.viewerTeam = mode === 'play' ? Team.Dawn : null;
```
（若 InputManager 依赖 2D 专有方法,3D 分支用 `renderer.screenToWorld` 提供等价;minimap 在 3D 下用 `world.map` 尺寸——V1 允许 minimap 退化为不渲染或用占位 terrain。)
- [ ] **Step 3:** tsc 通过;`npm run build` 通过。
- [ ] **Step 4: 手动验证**:`npm run dev`,浏览器开 `http://localhost:5180/?mode=spectate&renderer=3d` → 应见 3D 地面 + 走动的人形英雄。
- [ ] **Step 5: Commit**:`git add src/main.ts && git commit -m "feat(3d): ?renderer=3d 切换(2D/3D 渲染器并存)"`

---

### Task 9: Playwright 冒烟(`?renderer=3d`)

**Files:** Create `tests/render3d/smoke3d.cjs`(临时脚本,验证后删除,不提交;或纳入 scripts/)

- [ ] **Step 1:** dev server 运行;脚本 `chromium.launch` → `?mode=spectate&renderer=3d&speed=4` → 等 2s → 断言 `window.__game` 存在、`document.querySelector('canvas')` 存在、收集 `pageerror`/`console.error` 为 0、截图。
- [ ] **Step 2: 运行**:`node tests/render3d/smoke3d.cjs` → 期望 `errors:0` + 截图显示 3D 英雄。
- [ ] **Step 3:** 查看截图确认视觉;清理临时脚本。
- [ ] **Step 4: Commit**(若纳入 scripts):否则 V1 完成,准备给用户预览。

---

## V1 完成后

`npm test`(原 722 + 新 modelParts/pose 测试)全绿 + `npm run build` 干净 + Playwright 冒烟零错误截图。**给用户浏览器预览 `?renderer=3d`**(用 `open` 打开实时观战 3D)。据反馈进入 V2。

---

## V2–V5 任务大纲(到达时按 V1 同粒度展开)

**V2 动作全集**
- pose.ts 扩展:attack 命中弧细化、cast 手部发光强度、channel 脉动、受击 emissive 闪白(材质)、眩晕转星(头顶星网格环)、隐身半透(material.opacity)。
- renderer3d 走路相位改用**累计移动距离**(新增每单位 phase 累加,避免坐标驱动的瑕疵);朝向 yaw 插值。
- 测试:pose 新状态纯函数断言;冒烟截各动作。

**V3 全单位**
- modelGen 扩展生成器:`buildCreep`(grunt/archer/siege 带轮)、`buildBeast`(四足兽形)、`buildBoss`(放大+角)、`buildBuilding`(塔锥台/兵营/主基地六棱柱+护盾球/泉水)。各有 *Spec 纯数据函数 + 测试。
- 选取环(贴地圆环按队色)、贴屏血/蓝条(投影 worldToScreen 到 DOM/2D 叠加层)。
- renderer3d 取消 V1 的「仅人形」过滤,按 kind 分派生成器。

**V4 世界完整**
- terrain3d 升级:从 GameMap 高度/可走数据烘焙高台(y 抬升)+ 坡道斜面 + 悬崖侧面 + 河道真实几何 + low-poly 树簇(按现有树数据)+ 地标(符文/商店/Boss 巢)。静态合并控 draw call。
- fx3d:实现 `fx.consume` → 消费事件流,复用 fxStyle 颜色/类型推断 → 3D 粒子/光柱/冲击环/弹道;浮动文字投影叠加。
- 迷雾:贴地遮罩网格按可见格更新;敌方可见性裁剪复用 isVisibleTo。
- 昼夜光照已在 scene(V1),此处加点光/雾密度过渡。

**V5 收尾**
- 性能:共享 BufferGeometry、`InstancedMesh`(小兵/树)、地形合并、阴影预算、视锥剔除;60fps@~120 单位基准脚本。
- 112 英雄个性化打磨:纹章片、披风、武器变体、配色衍生;heroArtUnique 式唯一性测试(3D 部件参数)。
- 切默认 3D(`?renderer=2d` 回退);README/CHANGELOG 更新;`npm version` → 2.0.0 + tag v2.0.0 推送。
