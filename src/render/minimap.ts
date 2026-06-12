/**
 * 小地图:地形缩略 + 迷雾 + 单位点 + 建筑方块 + 符文/Boss 标记。
 * 左键点击移动镜头;Alt+点击发信号。
 */
import type { World } from '../sim/world';
import { Team } from '../sim/map';
import type { Camera } from './camera';
import { isVisibleTo } from '../sim/vision';
import { TEAM_COLOR } from './renderer';
import { WORLD } from '../data/mapLayout';
import type { UxFeedback } from '../ui/uxFeedback';
import { landmarkVisuals } from './mapReadability';

const SIZE = 232;

export class MiniMap {
  root: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private terrainThumb: HTMLCanvasElement;
  private pings: Array<{ x: number; y: number; at: number }> = [];

  constructor(
    parent: HTMLElement,
    terrain: HTMLCanvasElement,
    private camera: Camera,
    private onPing?: (wx: number, wy: number) => void,
  ) {
    this.root = document.createElement('canvas');
    this.root.width = SIZE;
    this.root.height = SIZE;
    this.root.style.cssText =
      'position:fixed;right:8px;bottom:8px;border:1px solid #3a4428;border-radius:8px;z-index:20;cursor:crosshair;';
    parent.appendChild(this.root);
    this.ctx = this.root.getContext('2d')!;

    this.terrainThumb = document.createElement('canvas');
    this.terrainThumb.width = SIZE;
    this.terrainThumb.height = SIZE;
    this.terrainThumb.getContext('2d')!.drawImage(terrain, 0, 0, SIZE, SIZE);

    this.root.addEventListener('mousedown', (e) => {
      const wx = (e.offsetX / SIZE) * WORLD;
      const wy = (e.offsetY / SIZE) * WORLD;
      if (e.altKey) {
        this.ping(wx, wy);
        this.onPing?.(wx, wy);
      } else {
        this.camera.centerOn({ x: wx, y: wy });
      }
      e.preventDefault();
      e.stopPropagation();
    });
  }

  ping(wx: number, wy: number): void {
    this.pings.push({ x: wx, y: wy, at: performance.now() });
  }

  render(world: World, viewerTeam: Team | null, ux?: UxFeedback): void {
    const { ctx } = this;
    ctx.drawImage(this.terrainThumb, 0, 0);
    const k = SIZE / WORLD;

    // 迷雾
    if (viewerTeam !== null && world.vision) {
      const grid = world.vision.grids[viewerTeam as 0 | 1];
      const explored = world.vision.explored[viewerTeam as 0 | 1];
      const gw = world.map.GW;
      const cellPx = SIZE / gw;
      ctx.fillStyle = 'rgba(4,6,3,0.62)';
      for (let cy = 0; cy < gw; cy++) {
        for (let cx = 0; cx < gw; cx++) {
          const i = cy * gw + cx;
          if (!grid[i]) {
            ctx.globalAlpha = explored[i] ? 0.55 : 0.85;
            ctx.fillRect(cx * cellPx, cy * cellPx, cellPx + 0.5, cellPx + 0.5);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // 固定地标(始终可见的地图知识):商店 / 野区 / 符文 / 深渊领主巢穴
    for (const landmark of landmarkVisuals(world.map)) {
      const x = landmark.pos.x * k;
      const y = landmark.pos.y * k;
      if (landmark.kind === 'secretShop') {
        ctx.fillStyle = 'rgba(90,210,255,0.35)';
        ctx.strokeStyle = 'rgba(160,235,255,0.95)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y - 4);
        ctx.lineTo(x + 4, y);
        ctx.lineTo(x, y + 4);
        ctx.lineTo(x - 4, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (landmark.kind === 'pit') {
        ctx.fillStyle = 'rgba(206,147,216,0.45)';
        ctx.strokeStyle = 'rgba(235,170,255,0.95)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x + 4.5, y + 3.5);
        ctx.lineTo(x, y + 1.2);
        ctx.lineTo(x - 4.5, y + 3.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (landmark.kind === 'rune') {
        ctx.strokeStyle = 'rgba(255,215,90,0.95)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (landmark.kind === 'camp') {
        const color =
          landmark.tier === 'ancient' ? '#d7b36a' :
          landmark.tier === 'large' ? '#b99a6b' :
          landmark.tier === 'medium' ? '#8fb06a' :
          '#6f8f5c';
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(x, y, landmark.tier === 'ancient' ? 2.6 : 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // 单位
    for (const u of world.units.values()) {
      if (!u.alive) continue;
      if (viewerTeam !== null && !isVisibleTo(world, viewerTeam, u)) continue;
      const x = u.pos.x * k;
      const y = u.pos.y * k;
      if (u.isBuilding()) {
        ctx.fillStyle = TEAM_COLOR[u.team];
        const s = u.buildingKind === 'ancient' ? 7 : 4;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      } else if (u.isHero()) {
        ctx.fillStyle = u.heroDef?.color ?? TEAM_COLOR[u.team];
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        ctx.arc(x, y, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (u.kind === 'boss') {
        ctx.fillStyle = '#ce93d8';
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = TEAM_COLOR[u.team];
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }

    // 符文
    for (const r of world.runes) {
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.arc(r.pos.x * k, r.pos.y * k, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 信号
    const now = performance.now();
    this.pings = this.pings.filter((p) => now - p.at < 2500);
    for (const p of this.pings) {
      const age = (now - p.at) / 2500;
      ctx.strokeStyle = `rgba(255,235,59,${1 - age})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x * k, p.y * k, 4 + age * 14, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 镜头视野框
    if (ux) {
      for (const pulse of ux.worldPulsesAt(world.time).filter((p) => p.kind === 'ping')) {
        const age = world.time - pulse.time;
        const u = Math.max(0, Math.min(1, age / 0.55));
        ctx.strokeStyle = `rgba(72,216,255,${1 - u})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pulse.pos.x * k, pulse.pos.y * k, 6 + 12 * u, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const tl = this.camera.screenToWorld({ x: 0, y: 0 });
    const br = this.camera.screenToWorld({ x: this.camera.viewW, y: this.camera.viewH });
    ctx.strokeStyle = 'rgba(232,226,200,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(tl.x * k, tl.y * k, (br.x - tl.x) * k, (br.y - tl.y) * k);
  }
}
