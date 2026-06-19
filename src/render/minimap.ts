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
import { landmarkVisuals, type LandmarkVisual } from './mapReadability';
import { buildCourierMinimapMarkers, type CourierMinimapMarker } from './minimapCourierMarker';
import { isMapPingKind, mapPingKindFromModifiers, mapPingVisual, type MapPingKind } from '../ui/mapPingModel';

const SIZE = 232;

export class MiniMap {
  root: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private terrainThumb: HTMLCanvasElement;
  private pings: Array<{ x: number; y: number; at: number; kind: MapPingKind }> = [];
  /** 静态地标缓存(地图不变,只算一次,避免每帧重建+克隆 Vec2)(D5) */
  private landmarks: LandmarkVisual[] | null = null;

  constructor(
    parent: HTMLElement,
    terrain: HTMLCanvasElement,
    private camera: Camera,
    private onPing?: (wx: number, wy: number, kind: MapPingKind) => void,
    private onMoveCommand?: (wx: number, wy: number) => void,
  ) {
    this.root = document.createElement('canvas');
    this.root.width = SIZE;
    this.root.height = SIZE;
    // 抬到底部 HUD 栏之上(右下角),避免与背包/技能栏重叠(HUD 栏高 172px)
    this.root.style.cssText =
      'position:fixed;right:8px;bottom:180px;border:1px solid #3a4428;border-radius:8px;z-index:20;cursor:crosshair;';
    parent.appendChild(this.root);
    this.ctx = this.root.getContext('2d')!;

    this.terrainThumb = document.createElement('canvas');
    this.terrainThumb.width = SIZE;
    this.terrainThumb.height = SIZE;
    this.terrainThumb.getContext('2d')!.drawImage(terrain, 0, 0, SIZE, SIZE);

    this.root.addEventListener('mousedown', (e) => {
      const wx = (e.offsetX / SIZE) * WORLD;
      const wy = (e.offsetY / SIZE) * WORLD;
      const pingKind = mapPingKindFromModifiers({ altKey: e.altKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey });
      if (pingKind) {
        this.ping(wx, wy, pingKind);
        this.onPing?.(wx, wy, pingKind);
      } else if (e.button === 2) {
        this.onMoveCommand?.(wx, wy); // 右键:命令英雄移动到此(MOBA 标配)
      } else {
        this.camera.follow = false; // 暂停跟随,让小地图平移生效(否则下一帧又锁回英雄)
        this.camera.centerOn({ x: wx, y: wy });
      }
      e.preventDefault();
      e.stopPropagation();
    });
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  ping(wx: number, wy: number, kind: MapPingKind = 'ping'): void {
    this.pings.push({ x: wx, y: wy, at: performance.now(), kind });
  }

  render(world: World, viewerTeam: Team | null, ux?: UxFeedback, selfHeroId?: number): void {
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

    // 固定地标(始终可见的地图知识):商店 / 野区 / 符文 / 深渊领主巢穴。静态,缓存一次。
    if (!this.landmarks) this.landmarks = landmarkVisuals(world.map);
    for (const landmark of this.landmarks) {
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
        // 英雄:英雄色填充 + 队色环(友绿/敌红,一眼辨敌我)+ 略大于小兵,醒目突出
        const ally = viewerTeam === null ? u.team === 0 : u.team === viewerTeam;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = u.heroDef?.color ?? TEAM_COLOR[u.team];
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = ally ? '#6fe06f' : '#ff5a5a';
        ctx.stroke();
        // 自身英雄:额外白环,一眼在小地图找到自己
        if (u.id === selfHeroId) {
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.lineWidth = 1;
      } else if (u.kind === 'boss') {
        ctx.fillStyle = '#ce93d8';
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (u.kind === 'ward') {
        // 守卫:眼形图标(视域守卫金 / 岗哨真视青),追踪视野/反隐覆盖。迷雾门控天然正确(上面 isVisibleTo)。
        const sentry = (u.calc.trueSight ?? 0) > 0;
        ctx.fillStyle = sentry ? '#5fd0d0' : '#ffd54f';
        ctx.strokeStyle = '#0a0c08';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0a0c08'; // 瞳孔
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1;
      } else if (u.kind === 'courier') {
        continue;
      } else {
        ctx.fillStyle = TEAM_COLOR[u.team];
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }

    // Courier markers
    const courierMarkers = buildCourierMinimapMarkers({
      viewerTeam,
      worldSize: WORLD,
      minimapSize: SIZE,
      units: [...world.units.values()].map((unit) => ({
        id: unit.id,
        kind: unit.kind,
        team: unit.team,
        alive: unit.alive,
        pos: unit.pos,
        hp: unit.hp,
        maxHp: unit.calc.maxHp,
        orderType: unit.order?.type,
      })),
      isVisible: (unit) => {
        const liveUnit = world.getUnit(unit.id);
        return !!liveUnit && viewerTeam !== null && isVisibleTo(world, viewerTeam, liveUnit);
      },
    });
    for (const marker of courierMarkers) this.drawCourierMarker(marker);

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
      const visual = mapPingVisual(p.kind);
      ctx.strokeStyle = `rgba(${visual.minimapRgb},${1 - age})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x * k, p.y * k, 4 + age * visual.minimapRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 镜头视野框
    if (ux) {
      for (const pulse of ux.worldPulsesAt(world.time)) {
        if (!isMapPingKind(pulse.kind)) continue;
        const age = world.time - pulse.time;
        const u = Math.max(0, Math.min(1, age / 0.55));
        const visual = mapPingVisual(pulse.kind);
        ctx.strokeStyle = `rgba(${visual.minimapRgb},${1 - u})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pulse.pos.x * k, pulse.pos.y * k, 6 + visual.minimapRadius * u, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const tl = this.camera.screenToWorld({ x: 0, y: 0 });
    const br = this.camera.screenToWorld({ x: this.camera.viewW, y: this.camera.viewH });
    ctx.strokeStyle = 'rgba(232,226,200,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(tl.x * k, tl.y * k, (br.x - tl.x) * k, (br.y - tl.y) * k);
  }

  private drawCourierMarker(marker: CourierMinimapMarker): void {
    const palette: Record<CourierMinimapMarker['tone'], { fill: string; stroke: string; glow: string }> = {
      ally: { fill: '#f0d782', stroke: '#17210f', glow: 'rgba(240,215,130,0.35)' },
      enemy: { fill: '#f06d5f', stroke: '#2c0f0d', glow: 'rgba(240,109,95,0.3)' },
      busy: { fill: '#70d6ff', stroke: '#0d2631', glow: 'rgba(112,214,255,0.4)' },
      danger: { fill: '#ff5a4f', stroke: '#3a0e0a', glow: 'rgba(255,90,79,0.55)' },
    };
    const p = palette[marker.tone];
    const { ctx } = this;

    ctx.save();
    ctx.fillStyle = p.glow;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = p.fill;
    ctx.strokeStyle = p.stroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(marker.x, marker.y - 5);
    ctx.lineTo(marker.x + 5, marker.y);
    ctx.lineTo(marker.x, marker.y + 5);
    ctx.lineTo(marker.x - 5, marker.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (marker.tone === 'busy' || marker.tone === 'danger') {
      ctx.strokeStyle = p.fill;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 7.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
