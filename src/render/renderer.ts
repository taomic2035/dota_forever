/**
 * Canvas2D 渲染器:地形离屏烘焙 + 实体层。
 * 配色:晨曦=暖金绿,永夜=暗红紫,中立=灰。
 */
import type { World } from '../sim/world';
import { Team } from '../sim/map';
import type { Unit } from '../sim/unit';
import { Camera } from './camera';
import { FogRenderer } from './fog';
import { FxLayer } from './fx';
import { unitArt, darken, type UnitArt, type ArtInput } from './unitArt';
import { isVisibleTo } from '../sim/vision';
import { stateOf } from '../sim/combat';
import { WORLD, CELL, RUNE_SPOTS } from '../data/mapLayout';
import { V, type Vec2 } from '../core/vec2';

export const TEAM_COLOR: Record<number, string> = {
  [Team.Dawn]: '#4caf50',
  [Team.Night]: '#e53935',
  [Team.Neutral]: '#9e9e9e',
};
export const TEAM_COLOR_DARK: Record<number, string> = {
  [Team.Dawn]: '#2e6b31',
  [Team.Night]: '#8e2421',
  [Team.Neutral]: '#616161',
};

const TERRAIN_SCALE = 12; // 离屏像素/格(越大越清晰)

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  terrain: HTMLCanvasElement;
  camera: Camera;
  fog: FogRenderer;
  fx = new FxLayer();
  /** 单位美术描述符缓存(静态属性,按 id 缓存) */
  private artCache = new Map<number, UnitArt>();
  /** 观察者阵营;null = 全图视野(观战) */
  viewerTeam: Team | null = null;
  /** 渲染插值系数(0-1),由主循环每帧设置 */
  alpha = 1;
  showPaths = false;

  constructor(parent: HTMLElement, world: World, camera: Camera) {
    this.camera = camera;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'game-canvas';
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.terrain = this.bakeTerrain(world);
    this.fog = new FogRenderer(world.map.GW, world.map.GH);
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.camera.resize(this.canvas.width, this.canvas.height);
  }

  /** 地形离屏烘焙一次。 */
  private bakeTerrain(world: World): HTMLCanvasElement {
    const map = world.map;
    const c = document.createElement('canvas');
    c.width = map.GW * TERRAIN_SCALE;
    c.height = map.GH * TERRAIN_SCALE;
    const g = c.getContext('2d')!;

    const S = TERRAIN_SCALE;
    // 第一遍:地表底色(平地/高台/河道)
    for (let cy = 0; cy < map.GH; cy++) {
      for (let cx = 0; cx < map.GW; cx++) {
        const i = map.cellIndex(cx, cy);
        const h = map.height[i];
        const n = ((cx * 73856093) ^ (cy * 19349663)) % 11;
        const tint = n - 5;
        let color: string;
        if (h === 0) color = '#2f4651'; // 河道水
        else if (h === 2) color = '#41502f'; // 高台(更亮的草)
        else color = '#2c3a22'; // 平地
        g.fillStyle = shade(color, tint);
        g.fillRect(cx * S, cy * S, S, S);
        if (h === 0) {
          // 水面:细碎高光点(确定性)
          if (n === 0 || n === 7) {
            g.fillStyle = 'rgba(150,195,215,0.20)';
            g.fillRect(cx * S + S * 0.3, cy * S + S * 0.3, S * 0.4, S * 0.22);
          }
        }
      }
    }
    // 第二遍:悬崖阴影(高台与低地交界)+ 树木 + 河岸
    for (let cy = 0; cy < map.GH; cy++) {
      for (let cx = 0; cx < map.GW; cx++) {
        const i = map.cellIndex(cx, cy);
        const h = map.height[i];
        const walk = map.walkable[i];
        const n = ((cx * 73856093) ^ (cy * 19349663)) % 11;
        // 悬崖底缘投影:高台下方一格画暗边
        if (h !== 2 && cy > 0 && map.height[map.cellIndex(cx, cy - 1)] === 2) {
          g.fillStyle = 'rgba(0,0,0,0.28)';
          g.fillRect(cx * S, cy * S, S, S * 0.5);
        }
        if (walk === 0 && h === 2) {
          g.fillStyle = 'rgba(20,26,16,0.6)';
          g.fillRect(cx * S, cy * S, S, S);
        }
        if (map.trees.has(i)) {
          // 树冠:深色底 + 两簇叶 + 顶部高光
          const ox = cx * S + S / 2;
          const oy = cy * S + S / 2;
          g.fillStyle = 'rgba(0,0,0,0.30)';
          g.beginPath();
          g.ellipse(ox, oy + S * 0.32, S * 0.42, S * 0.2, 0, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = shade('#23391a', n - 3);
          g.beginPath();
          g.arc(ox - S * 0.16, oy, S * 0.34, 0, Math.PI * 2);
          g.arc(ox + S * 0.18, oy - S * 0.06, S * 0.36, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = shade('#33531f', n + 2);
          g.beginPath();
          g.arc(ox + S * 0.06, oy - S * 0.16, S * 0.22, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    // 符文点地面标记(淡紫)
    for (const rs of RUNE_SPOTS) {
      const px = (rs.x / CELL) * S;
      const py = (rs.y / CELL) * S;
      g.strokeStyle = 'rgba(170,110,230,0.35)';
      g.lineWidth = Math.max(1, S * 0.18);
      g.beginPath();
      g.arc(px, py, S * 1.4, 0, Math.PI * 2);
      g.stroke();
    }
    return c;
  }

  /** 世界长度→屏幕长度 */
  s(len: number): number {
    return len * this.camera.zoom;
  }

  /** 实体插值位置 */
  lerpPos(u: Unit): Vec2 {
    return V.lerp(u.prevPos, u.pos, this.alpha);
  }

  render(world: World, selectedId: number) {
    const { ctx, camera } = this;
    ctx.fillStyle = '#0a0c08';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 地形
    const topLeft = camera.screenToWorld({ x: 0, y: 0 });
    const scale = camera.zoom * (world.map.CELL / TERRAIN_SCALE);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      this.terrain,
      -topLeft.x / world.map.CELL * TERRAIN_SCALE * scale + 0,
      -topLeft.y / world.map.CELL * TERRAIN_SCALE * scale + 0,
      this.terrain.width * scale,
      this.terrain.height * scale,
    );

    // 边界
    const o = camera.worldToScreen({ x: 0, y: 0 });
    const e = camera.worldToScreen({ x: WORLD, y: WORLD });
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(o.x, o.y, e.x - o.x, e.y - o.y);

    // 单位(按 y 排序近似遮挡;迷雾中的敌人不渲染)
    const units = [...world.units.values()].filter(
      (u) => u.alive && (this.viewerTeam === null || isVisibleTo(world, this.viewerTeam, u)),
    );
    units.sort((a, b) => a.pos.y - b.pos.y);
    for (const u of units) this.drawUnit(world, u, u.id === selectedId);

    // 弹道
    this.drawProjectiles(world);

    // 夜色
    if (world.isNight) {
      ctx.fillStyle = 'rgba(8, 14, 40, 0.28)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // 特效层(技能/战斗/浮动文字)——夜色之上,迷雾之下
    this.fx.render(ctx, this.camera);

    // 迷雾
    if (this.viewerTeam !== null) {
      this.fog.update(world, this.viewerTeam);
      this.fog.draw(ctx, this.camera, world.map.CELL);
    }
  }

  private drawProjectiles(world: World): void {
    const ctx = this.ctx;
    for (const p of world.projectiles) {
      const sp = this.camera.worldToScreen(p.pos);
      if (sp.x < -40 || sp.y < -40 || sp.x > this.canvas.width + 40 || sp.y > this.canvas.height + 40) continue;
      const target = world.getUnit(p.targetId);
      const dir = target ? V.angle(p.pos, target.pos) : 0;
      if (p.kind === 'ability') {
        // 发光法球 + 拖尾
        const col = p.style === 'hammer' ? '#ffd54f' : '#bfe3ff';
        const rad = Math.max(3, this.s(16));
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = col;
        ctx.lineWidth = rad;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(sp.x - Math.cos(dir) * rad * 2.2, sp.y - Math.sin(dir) * rad * 2.2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = rad;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, rad * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      } else {
        // 普攻:定向箭矢/弹丸
        const src = world.getUnit(p.sourceId);
        const col = src?.team === Team.Night ? '#ff9e80' : src?.team === Team.Dawn ? '#cdeebf' : '#e0e0e0';
        const len = Math.max(4, this.s(46));
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(dir);
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(1.5, this.s(5));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-len * 0.5, 0);
        ctx.lineTo(len * 0.5, 0);
        ctx.stroke();
        // 箭头
        ctx.beginPath();
        ctx.moveTo(len * 0.5, 0);
        ctx.lineTo(len * 0.2, -len * 0.18);
        ctx.moveTo(len * 0.5, 0);
        ctx.lineTo(len * 0.2, len * 0.18);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private artFor(u: Unit): UnitArt {
    let a = this.artCache.get(u.id);
    if (!a) {
      const input: ArtInput = {
        kind: u.kind,
        team: u.team,
        name: u.name,
        attackRange: u.base.attackRange,
        collisionRadius: u.base.collisionRadius,
        heroDef: u.heroDef
          ? { primary: u.heroDef.primary, color: u.heroDef.color, glyph: u.heroDef.glyph, aiRole: u.heroDef.aiRole }
          : undefined,
      };
      a = unitArt(input);
      this.artCache.set(u.id, a);
    }
    return a;
  }

  drawUnit(world: World, u: Unit, selected: boolean) {
    const { ctx } = this;
    const p = this.camera.worldToScreen(this.lerpPos(u));
    if (p.x < -80 || p.y < -80 || p.x > this.canvas.width + 80 || p.y > this.canvas.height + 80) return;

    if (u.isBuilding()) {
      this.drawBuilding(u, p, selected);
      return;
    }

    const art = this.artFor(u);
    const r = Math.max(6, this.s(art.radius));
    const t = world.time + this.alpha * world.dt;
    const isIllusion = u.kind === 'illusion';
    const st = stateOf(u);

    // —— 动画状态(全部由 sim 字段推导,不改 sim)——
    const moving = V.distSq(u.pos, u.prevPos) > 0.3;
    const bob = Math.sin(u.id * 1.7 + t * (moving ? 9 : 2.3)) * (moving ? r * 0.09 : r * 0.04);
    const windActive = u.windupTargetId !== 0 && t < u.windupUntil;
    const raise = windActive ? clamp01(1 - (u.windupUntil - t) / 0.35) : 0;
    const casting = !!u.casting;
    const channel = !!u.channeling && t < u.channeling.until;
    const hurt = u.lastDamagedAt > 0 && t - u.lastDamagedAt < 0.14;

    let alpha = 1;
    if (isIllusion) alpha = 0.5;
    else if (st.invisible) alpha = 0.42;
    ctx.globalAlpha = alpha;

    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + r * 0.6, r * 0.95, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // 阵营地环(一眼辨敌我)
    ctx.strokeStyle = u.team === Team.Dawn ? 'rgba(110,220,120,0.6)' : u.team === Team.Night ? 'rgba(235,90,80,0.6)' : 'rgba(180,180,180,0.5)';
    ctx.lineWidth = Math.max(1, this.s(2.5));
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + r * 0.55, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 施法/引导辉光
    if (casting || channel) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 11);
      ctx.globalAlpha = alpha * (0.18 + 0.22 * pulse);
      ctx.fillStyle = art.accent;
      ctx.beginPath();
      ctx.arc(p.x, p.y + bob, r * (1.5 + 0.25 * pulse), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
    }

    // —— 身体(朝向旋转,forward=+x)——
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.rotate(u.facing);
    this.drawSilhouette(art, r, raise, casting, hurt);
    ctx.restore();
    ctx.globalAlpha = alpha;

    // 英雄/幻象环
    if (u.isHero() || isIllusion) {
      ctx.strokeStyle = isIllusion ? '#9e9e9e' : '#e2c25a';
      ctx.lineWidth = Math.max(1, this.s(2.5));
      ctx.beginPath();
      ctx.arc(p.x, p.y + bob, r * 1.22, 0, Math.PI * 2);
      ctx.stroke();
      // 图腾纹章
      if (art.glyph) {
        ctx.font = `700 ${Math.max(9, r * 0.95)}px "Segoe UI Symbol", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = Math.max(1, this.s(2));
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.strokeText(art.glyph, p.x, p.y + bob);
        ctx.fillStyle = '#fdfaf0';
        ctx.fillText(art.glyph, p.x, p.y + bob);
      }
    }
    ctx.globalAlpha = 1;

    // 眩晕星 / 沉默标记
    if (st.stunned) this.drawStunStars(p.x, p.y + bob - r * 1.5, r, t);
    if (st.magicImmune) {
      ctx.strokeStyle = 'rgba(120,160,255,0.7)';
      ctx.lineWidth = Math.max(1, this.s(2));
      ctx.beginPath();
      ctx.arc(p.x, p.y + bob, r * 1.4, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (selected) {
      ctx.strokeStyle = '#8fe07a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + r * 0.55, r * 1.15, r * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    this.drawBars(u, p, r);
    if (u.isHero() && r > 13) this.drawStatusStrip(world, u, p, r);

    if (this.showPaths && u.path.length) {
      ctx.strokeStyle = 'rgba(255,255,0,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const s0 = this.camera.worldToScreen(u.pos);
      ctx.moveTo(s0.x, s0.y);
      for (const wp of u.path) {
        const sp = this.camera.worldToScreen(wp);
        ctx.lineTo(sp.x, sp.y);
      }
      ctx.stroke();
    }
  }

  /** 本地坐标系(已平移到单位中心、已按 facing 旋转,forward=+x)绘制矢量造型 + 武器。 */
  private drawSilhouette(art: UnitArt, r: number, raise: number, casting: boolean, hurt: boolean): void {
    const ctx = this.ctx;
    const body = hurt ? '#ffffff' : art.primary;
    const outline = '#0c0e09';
    ctx.lineJoin = 'round';
    const lw = Math.max(1, r * 0.12);
    ctx.lineWidth = lw;
    ctx.strokeStyle = outline;
    ctx.fillStyle = body;

    switch (art.shape) {
      case 'bulk': {
        ctx.beginPath();
        ctx.ellipse(-0.05 * r, 0, 0.8 * r, 0.92 * r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // 头
        ctx.beginPath();
        ctx.arc(0.52 * r, 0, 0.34 * r, 0, Math.PI * 2);
        ctx.fillStyle = darken3(body, 18);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'blade': {
        ctx.beginPath();
        ctx.moveTo(0.95 * r, 0);
        ctx.lineTo(0.2 * r, 0.6 * r);
        ctx.lineTo(-0.7 * r, 0.42 * r);
        ctx.lineTo(-0.7 * r, -0.42 * r);
        ctx.lineTo(0.2 * r, -0.6 * r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'robe': {
        // 法袍:宽下摆 + 尖兜帽朝前
        ctx.beginPath();
        ctx.moveTo(0.85 * r, 0);
        ctx.lineTo(-0.2 * r, 0.85 * r);
        ctx.quadraticCurveTo(-0.9 * r, 0.4 * r, -0.85 * r, 0);
        ctx.quadraticCurveTo(-0.9 * r, -0.4 * r, -0.2 * r, -0.85 * r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // 兜帽内影
        ctx.fillStyle = darken3(body, 30);
        ctx.beginPath();
        ctx.moveTo(0.75 * r, 0);
        ctx.lineTo(0.1 * r, 0.32 * r);
        ctx.lineTo(0.1 * r, -0.32 * r);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'beast': {
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.88 * r, 0.72 * r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // 背刺
        ctx.fillStyle = art.accent;
        for (let i = 0; i < 5; i++) {
          const a = -0.9 + i * 0.45;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 0.7 * r, Math.sin(a) * 0.6 * r);
          ctx.lineTo(Math.cos(a) * 1.15 * r, Math.sin(a) * 0.95 * r);
          ctx.lineTo(Math.cos(a + 0.18) * 0.7 * r, Math.sin(a + 0.18) * 0.6 * r);
          ctx.closePath();
          ctx.fill();
        }
        // 眼
        ctx.fillStyle = '#ffd23a';
        ctx.beginPath();
        ctx.arc(0.5 * r, -0.18 * r, 0.1 * r, 0, Math.PI * 2);
        ctx.arc(0.5 * r, 0.18 * r, 0.1 * r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'grunt': {
        roundRectPath(ctx, -0.6 * r, -0.62 * r, 1.25 * r, 1.24 * r, 0.28 * r);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'archer': {
        roundRectPath(ctx, -0.5 * r, -0.55 * r, 1.0 * r, 1.1 * r, 0.25 * r);
        ctx.fill();
        ctx.stroke();
        // 背后箭袋
        ctx.strokeStyle = art.accent;
        ctx.lineWidth = Math.max(1, r * 0.16);
        ctx.beginPath();
        ctx.moveTo(-0.55 * r, -0.3 * r);
        ctx.lineTo(-0.85 * r, -0.7 * r);
        ctx.stroke();
        break;
      }
      case 'siege': {
        roundRectPath(ctx, -0.8 * r, -0.6 * r, 1.5 * r, 1.2 * r, 0.12 * r);
        ctx.fillStyle = darken3(body, 10);
        ctx.fill();
        ctx.stroke();
        // 轮
        ctx.fillStyle = '#2a2118';
        for (const wy of [-0.62 * r, 0.62 * r]) {
          ctx.beginPath();
          ctx.arc(-0.35 * r, wy, 0.28 * r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        // 投掷臂
        ctx.strokeStyle = art.accent;
        ctx.lineWidth = Math.max(1.5, r * 0.18);
        ctx.beginPath();
        ctx.moveTo(0.1 * r, 0);
        ctx.lineTo(1.0 * r, -0.5 * r);
        ctx.stroke();
        break;
      }
      case 'wisp': {
        ctx.beginPath();
        ctx.arc(0, 0, 0.7 * r, 0, Math.PI * 2);
        ctx.fillStyle = art.primary;
        ctx.fill();
        ctx.fillStyle = '#fff7c8';
        ctx.beginPath();
        ctx.arc(0, 0, 0.32 * r, 0, Math.PI * 2);
        ctx.fill();
        return; // 守卫无武器
      }
    }

    // —— 武器(右肩支点,随蓄力 raise 后摆 / 施法上扬)——
    const swing = -raise * 0.8 - (casting ? 0.45 : 0);
    ctx.save();
    ctx.translate(0.08 * r, 0.34 * r);
    ctx.rotate(swing);
    ctx.lineCap = 'round';
    ctx.strokeStyle = art.accent;
    switch (art.weapon) {
      case 'sword':
        ctx.lineWidth = Math.max(1.2, r * 0.15);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(1.05 * r, -0.12 * r);
        ctx.stroke();
        ctx.lineWidth = Math.max(1, r * 0.1);
        ctx.beginPath();
        ctx.moveTo(0.22 * r, -0.18 * r);
        ctx.lineTo(0.22 * r, 0.18 * r);
        ctx.stroke();
        break;
      case 'hammer':
        ctx.lineWidth = Math.max(1.5, r * 0.16);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0.85 * r, 0);
        ctx.stroke();
        ctx.fillStyle = darken3(art.accent, 10);
        roundRectPath(ctx, 0.78 * r, -0.26 * r, 0.4 * r, 0.52 * r, 0.08 * r);
        ctx.fill();
        ctx.stroke();
        break;
      case 'bow':
        ctx.lineWidth = Math.max(1.2, r * 0.12);
        ctx.beginPath();
        ctx.arc(0.45 * r, 0, 0.55 * r, -1.15, 1.15);
        ctx.stroke();
        ctx.lineWidth = Math.max(0.8, r * 0.06);
        ctx.beginPath();
        ctx.moveTo(0.45 * r + Math.cos(-1.15) * 0.55 * r, Math.sin(-1.15) * 0.55 * r);
        ctx.lineTo(0.45 * r + Math.cos(1.15) * 0.55 * r, Math.sin(1.15) * 0.55 * r);
        ctx.stroke();
        break;
      case 'staff':
        ctx.strokeStyle = '#6b4f2a';
        ctx.lineWidth = Math.max(1.2, r * 0.12);
        ctx.beginPath();
        ctx.moveTo(0, 0.1 * r);
        ctx.lineTo(0.9 * r, -0.55 * r);
        ctx.stroke();
        ctx.fillStyle = art.accent;
        ctx.shadowColor = art.accent;
        ctx.shadowBlur = r * 0.5;
        ctx.beginPath();
        ctx.arc(0.95 * r, -0.6 * r, 0.22 * r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      case 'spear':
        ctx.lineWidth = Math.max(1, r * 0.1);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(1.25 * r, -0.1 * r);
        ctx.stroke();
        break;
      case 'claw':
        ctx.lineWidth = Math.max(1, r * 0.09);
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(0.45 * r, i * 0.18 * r);
          ctx.lineTo(0.95 * r, i * 0.32 * r);
          ctx.stroke();
        }
        break;
    }
    ctx.restore();
  }

  private drawStunStars(cx: number, cy: number, r: number, t: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#ffe23a';
    for (let i = 0; i < 3; i++) {
      const a = t * 6 + (i / 3) * Math.PI * 2;
      const x = cx + Math.cos(a) * r * 0.6;
      const y = cy + Math.sin(a) * r * 0.25;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.5, r * 0.14), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** 状态条:HP 条上方一排小方块,表示限时 buff/debuff(绿=增益,橙=减益,红=控制),底部细条示剩余。 */
  private drawStatusStrip(world: World, u: Unit, p: Vec2, r: number): void {
    const ctx = this.ctx;
    const now = world.time;
    // 限时、按 key 去重、控制优先
    const seen = new Set<string>();
    const list: { color: string; frac: number; prio: number }[] = [];
    for (const m of u.modifiers) {
      if (m.expiresAt === Infinity || m.expiresAt <= now) continue;
      if (seen.has(m.key)) continue;
      seen.add(m.key);
      const st = m.def.states;
      const control = !!(st && (st.stunned || st.rooted || st.silenced || st.disarmed));
      let color: string;
      let prio: number;
      if (control) { color = '#ff3b3b'; prio = 0; }
      else if (m.def.isBuff === true) { color = '#6fe06f'; prio = 2; }
      else {
        const src = world.getUnit(m.sourceId);
        const fromEnemy = src ? src.team !== u.team : false;
        if (fromEnemy) { color = '#ff9e40'; prio = 1; }
        else { color = '#6fe06f'; prio = 2; }
      }
      const dur = m.def.duration;
      const frac = dur && dur > 0 ? Math.max(0, Math.min(1, (m.expiresAt - now) / dur)) : 1;
      list.push({ color, frac, prio });
    }
    if (!list.length) return;
    list.sort((a, b) => a.prio - b.prio);
    const show = list.slice(0, 6);
    const sz = Math.max(4, this.s(9));
    const gap = Math.max(1, this.s(2));
    const totalW = show.length * sz + (show.length - 1) * gap;
    const hbH = Math.max(2.5, this.s(7));
    const barY = p.y - r - hbH - Math.max(4, this.s(9));
    let x = p.x - totalW / 2;
    const y = barY - sz - 2;
    for (const s of show) {
      ctx.fillStyle = 'rgba(8,8,8,0.85)';
      ctx.fillRect(x - 1, y - 1, sz + 2, sz + 2);
      ctx.fillStyle = s.color;
      ctx.fillRect(x, y, sz, sz);
      // 剩余时间细条(底部)
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x, y + sz - Math.max(1, sz * 0.22), sz, Math.max(1, sz * 0.22));
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y + sz - Math.max(1, sz * 0.22), sz * s.frac, Math.max(1, sz * 0.22));
      x += sz + gap;
    }
  }

  private drawBars(u: Unit, p: Vec2, r: number): void {
    if (u.hp >= u.calc.maxHp && !u.isHero()) return;
    const ctx = this.ctx;
    const w = Math.max(16, r * 2.2);
    const h = Math.max(2.5, this.s(7));
    const y = p.y - r - h - Math.max(4, this.s(9));
    const frac = Math.max(0, u.hp / u.calc.maxHp);
    ctx.fillStyle = 'rgba(8,8,8,0.85)';
    ctx.fillRect(p.x - w / 2 - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = u.team === Team.Dawn ? '#52d869' : u.team === Team.Night ? '#ef5350' : '#bdbdbd';
    ctx.fillRect(p.x - w / 2, y, w * frac, h);
    if (u.isHero() && u.calc.maxMp > 0) {
      const mfrac = u.mp / u.calc.maxMp;
      ctx.fillStyle = '#1565c0';
      ctx.fillRect(p.x - w / 2, y + h + 1, w * mfrac, Math.max(2, h * 0.55));
    }
  }

  /** 建筑分类美术:塔(分级)/兵营/主基地/泉水。 */
  private drawBuilding(u: Unit, p: Vec2, selected: boolean): void {
    const ctx = this.ctx;
    const r = Math.max(8, this.s(u.base.collisionRadius));
    const fill = TEAM_COLOR[u.team];
    const dark = TEAM_COLOR_DARK[u.team];
    const kind = u.buildingKind;

    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + r * 0.5, r * 1.0, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    if (u.kind === 'tower') {
      const tier = kind === 'tower4' ? 4 : kind === 'tower3' ? 3 : kind === 'tower2' ? 2 : 1;
      const bw = r * 1.1;
      // 锥形塔身
      ctx.fillStyle = dark;
      ctx.strokeStyle = fill;
      ctx.lineWidth = Math.max(1, this.s(3));
      ctx.beginPath();
      ctx.moveTo(p.x - bw, p.y + r);
      ctx.lineTo(p.x - bw * 0.6, p.y - r);
      ctx.lineTo(p.x + bw * 0.6, p.y - r);
      ctx.lineTo(p.x + bw, p.y + r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // 城垛
      ctx.fillStyle = fill;
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(p.x + i * bw * 0.5 - bw * 0.14, p.y - r - r * 0.22, bw * 0.28, r * 0.28);
      }
      // 发光核心(等级越高越亮越大)
      const coreR = r * (0.26 + tier * 0.04);
      ctx.fillStyle = fill;
      ctx.shadowColor = fill;
      ctx.shadowBlur = r * 0.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y - r * 0.1, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // 分级点
      ctx.fillStyle = '#fff';
      for (let i = 0; i < tier; i++) {
        ctx.beginPath();
        ctx.arc(p.x - (tier - 1) * r * 0.16 + i * r * 0.32, p.y + r * 0.75, Math.max(1, r * 0.07), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'rax_melee' || kind === 'rax_ranged') {
      // 兵营:双坡顶建筑
      const bw = r * 1.0;
      ctx.fillStyle = dark;
      ctx.strokeStyle = fill;
      ctx.lineWidth = Math.max(1, this.s(3));
      roundRectPath(ctx, p.x - bw, p.y - r * 0.5, bw * 2, r * 1.5, r * 0.12);
      ctx.fill();
      ctx.stroke();
      // 屋顶
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(p.x - bw * 1.1, p.y - r * 0.45);
      ctx.lineTo(p.x, p.y - r * 1.1);
      ctx.lineTo(p.x + bw * 1.1, p.y - r * 0.45);
      ctx.closePath();
      ctx.fill();
      // 标识:近战=剑,远程=箭
      ctx.fillStyle = '#fdfaf0';
      ctx.font = `700 ${Math.max(8, r * 0.6)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(kind === 'rax_melee' ? '⚔' : '➶', p.x, p.y + r * 0.35);
    } else if (kind === 'ancient') {
      // 主基地:多环要塞
      ctx.fillStyle = dark;
      ctx.strokeStyle = fill;
      ctx.lineWidth = Math.max(1.5, this.s(4));
      for (let i = 0; i < 3; i++) {
        const rr = r * (1.0 - i * 0.25);
        ctx.beginPath();
        const sides = 6;
        for (let s = 0; s <= sides; s++) {
          const a = (s / sides) * Math.PI * 2 + Math.PI / 6;
          const fn = s === 0 ? 'moveTo' : 'lineTo';
          ctx[fn](p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
        }
        ctx.closePath();
        if (i === 0) { ctx.fill(); ctx.stroke(); } else ctx.stroke();
      }
      // 核心宝珠
      ctx.fillStyle = fill;
      ctx.shadowColor = fill;
      ctx.shadowBlur = r * 0.9;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // 无敌护盾(T4 存活时 invulnerable)
      if (u.invulnerable) {
        ctx.strokeStyle = 'rgba(120,180,255,0.7)';
        ctx.lineWidth = Math.max(1, this.s(3));
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // 泉水:发光圣池
      ctx.fillStyle = dark;
      ctx.strokeStyle = fill;
      ctx.lineWidth = Math.max(1, this.s(3));
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = u.team === Team.Dawn ? 'rgba(120,220,255,0.8)' : 'rgba(255,150,120,0.8)';
      ctx.shadowColor = fill;
      ctx.shadowBlur = r * 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (selected) {
      ctx.strokeStyle = '#8fe07a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 血条(受损时)
    if (u.hp < u.calc.maxHp) {
      const w = r * 2.4;
      const h = Math.max(3, this.s(8));
      const y = p.y - r - h - Math.max(4, this.s(10));
      const frac = Math.max(0, u.hp / u.calc.maxHp);
      ctx.fillStyle = 'rgba(8,8,8,0.85)';
      ctx.fillRect(p.x - w / 2 - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = u.team === Team.Dawn ? '#52d869' : '#ef5350';
      ctx.fillRect(p.x - w / 2, y, w * frac, h);
    }
  }
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function darken3(col: string, d: number): string {
  if (col[0] === '#' && col.length >= 7) return darken(col, d);
  // rgb(...) 直接近似返回
  return col;
}
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number): void {
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function shade(hex: string, delta: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + delta));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + delta));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + delta));
  return `rgb(${r},${g},${b})`;
}
