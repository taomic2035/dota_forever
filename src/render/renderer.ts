/**
 * Canvas2D 渲染器:地形离屏烘焙 + 实体层。
 * 配色:晨曦=暖金绿,永夜=暗红紫,中立=灰。
 */
import type { World } from '../sim/world';
import { Team } from '../sim/map';
import type { Unit } from '../sim/unit';
import { Camera } from './camera';
import { WORLD } from '../data/mapLayout';
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

const TERRAIN_SCALE = 8; // 离屏像素/格

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  terrain: HTMLCanvasElement;
  camera: Camera;
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

    for (let cy = 0; cy < map.GH; cy++) {
      for (let cx = 0; cx < map.GW; cx++) {
        const i = map.cellIndex(cx, cy);
        const h = map.height[i];
        const walk = map.walkable[i];
        // 地表色
        let color: string;
        if (h === 0) color = '#33424a'; // 河道
        else if (h === 2) color = '#3d4a2e'; // 高台
        else color = '#2c3a22'; // 平地
        // 细微噪声纹理(确定性 hash)
        const n = ((cx * 73856093) ^ (cy * 19349663)) % 13;
        const tint = n - 6;
        g.fillStyle = shade(color, tint);
        g.fillRect(cx * TERRAIN_SCALE, cy * TERRAIN_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);
        if (map.trees.has(i)) {
          g.fillStyle = shade('#1c2b14', tint);
          g.fillRect(cx * TERRAIN_SCALE, cy * TERRAIN_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);
          g.fillStyle = shade('#26421a', tint + 3);
          g.beginPath();
          g.arc(cx * TERRAIN_SCALE + TERRAIN_SCALE / 2, cy * TERRAIN_SCALE + TERRAIN_SCALE / 2 - 1, TERRAIN_SCALE * 0.42, 0, Math.PI * 2);
          g.fill();
        } else if (walk === 0 && h === 2) {
          // 高台悬崖描边
          g.fillStyle = '#1f2417';
          g.fillRect(cx * TERRAIN_SCALE, cy * TERRAIN_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);
        }
      }
    }

    // 河道高亮中线
    g.strokeStyle = 'rgba(110,160,180,0.18)';
    g.lineWidth = TERRAIN_SCALE * 4;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(c.width, c.height);
    g.stroke();
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

    // 单位(按 y 排序近似遮挡)
    const units = [...world.units.values()].filter((u) => u.alive);
    units.sort((a, b) => a.pos.y - b.pos.y);
    for (const u of units) this.drawUnit(world, u, u.id === selectedId);
  }

  drawUnit(world: World, u: Unit, selected: boolean) {
    const { ctx } = this;
    const p = this.camera.worldToScreen(this.lerpPos(u));
    const r = Math.max(2.5, this.s(u.base.collisionRadius));
    if (p.x < -60 || p.y < -60 || p.x > this.canvas.width + 60 || p.y > this.canvas.height + 60) return;

    const fill = TEAM_COLOR[u.team];
    const dark = TEAM_COLOR_DARK[u.team];

    if (u.isBuilding()) {
      const size = r * 1.6;
      ctx.fillStyle = dark;
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      ctx.strokeStyle = fill;
      ctx.lineWidth = Math.max(1, this.s(8));
      ctx.strokeRect(p.x - size / 2, p.y - size / 2, size, size);
      if (u.kind === 'tower') {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // 本体
      ctx.fillStyle = fill;
      ctx.strokeStyle = '#0d0f0a';
      ctx.lineWidth = Math.max(1, this.s(4));
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // 朝向
      ctx.strokeStyle = '#e8e2c8';
      ctx.lineWidth = Math.max(1, this.s(5));
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(u.facing) * r * 1.05, p.y + Math.sin(u.facing) * r * 1.05);
      ctx.stroke();
      // 英雄金圈
      if (u.isHero()) {
        ctx.strokeStyle = '#d9b44a';
        ctx.lineWidth = Math.max(1, this.s(3));
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.18, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (selected) {
      const sr = (u.isBuilding() ? r * 1.3 : r * 1.45) + 3;
      this.ctx.strokeStyle = '#8fe07a';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, sr, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // 血条(非满血或英雄常显)
    if (!u.isBuilding() || u.hp < u.calc.maxHp) {
      const showAlways = u.isHero();
      if (showAlways || u.hp < u.calc.maxHp) {
        const w = Math.max(14, r * 2.2);
        const h = Math.max(2.5, this.s(7));
        const y = p.y - r - h - Math.max(3, this.s(8));
        const frac = Math.max(0, u.hp / u.calc.maxHp);
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(p.x - w / 2 - 1, y - 1, w + 2, h + 2);
        this.ctx.fillStyle = u.team === Team.Dawn ? '#52d869' : u.team === Team.Night ? '#ef5350' : '#bdbdbd';
        this.ctx.fillRect(p.x - w / 2, y, w * frac, h);
        if (u.isHero() && u.calc.maxMp > 0) {
          const mfrac = u.mp / u.calc.maxMp;
          this.ctx.fillStyle = '#1565c0';
          this.ctx.fillRect(p.x - w / 2, y + h + 1, w * mfrac, Math.max(2, h * 0.6));
        }
      }
    }

    if (this.showPaths && u.path.length) {
      this.ctx.strokeStyle = 'rgba(255,255,0,0.35)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      const s0 = this.camera.worldToScreen(u.pos);
      this.ctx.moveTo(s0.x, s0.y);
      for (const wp of u.path) {
        const sp = this.camera.worldToScreen(wp);
        this.ctx.lineTo(sp.x, sp.y);
      }
      this.ctx.stroke();
    }
  }
}

function shade(hex: string, delta: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + delta));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + delta));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + delta));
  return `rgb(${r},${g},${b})`;
}
