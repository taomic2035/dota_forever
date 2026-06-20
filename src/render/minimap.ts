/**
 * 小地图:地形缩略 + 迷雾 + 单位点 + 建筑方块 + 符文/Boss 标记。
 * 左键点击移动镜头;Alt+点击发信号。
 */
import type { World } from '../sim/world';
import type { Unit } from '../sim/unit';
import { Team } from '../sim/map';
import type { Camera } from './camera';
import { isVisibleTo } from '../sim/vision';
import { TEAM_COLOR } from './renderer';
import { OUTPOST_CAPTURE_TIME } from '../sim/outposts';
import { WORLD } from '../data/mapLayout';
import type { UxFeedback } from '../ui/uxFeedback';
import { landmarkVisuals, type LandmarkVisual } from './mapReadability';
import { buildCourierMinimapMarkers, type CourierMinimapMarker } from './minimapCourierMarker';
import { buildCourierRouteModel, type CourierRouteModel } from './courierRouteModel';
import { isMapPingKind, mapPingKindFromModifiers, mapPingVisual, type MapPingKind } from '../ui/mapPingModel';
import { shouldAllowMinimapAction } from '../ui/minimapClickGuard';
import {
  activeMinimapDrawStrokes,
  appendMinimapDrawPoint,
  createMinimapDrawStroke,
  minimapCommunicationGesture,
  type MinimapDrawStroke,
} from '../ui/minimapDrawingModel';
import type { ControlSettings, MinimapBackgroundMode, MinimapHeroDisplayMode, MinimapSide } from '../engine/controlSettings';

const SIZE = 232;

interface MiniMapDisplaySettings {
  heroDisplayMode: MinimapHeroDisplayMode;
  backgroundMode: MinimapBackgroundMode;
  side: MinimapSide;
}

const DEFAULT_MINIMAP_DISPLAY_SETTINGS: MiniMapDisplaySettings = {
  heroDisplayMode: 'dots',
  backgroundMode: 'terrain',
  side: 'right',
};

export class MiniMap {
  root: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private terrainThumb: HTMLCanvasElement;
  private pings: Array<{ x: number; y: number; at: number; kind: MapPingKind }> = [];
  private drawStrokes: MinimapDrawStroke[] = [];
  private drawCandidate: {
    button: number;
    kind: MapPingKind;
    startPx: { x: number; y: number };
    startWorld: { x: number; y: number };
    stroke: MinimapDrawStroke | null;
  } | null = null;
  private nextDrawStrokeId = 1;
  private displaySettings: MiniMapDisplaySettings = { ...DEFAULT_MINIMAP_DISPLAY_SETTINGS };
  private hoverStartedAtMs: number | null = null;
  /** 静态地标缓存(地图不变,只算一次,避免每帧重建+克隆 Vec2)(D5) */
  private landmarks: LandmarkVisual[] | null = null;

  constructor(
    parent: HTMLElement,
    terrain: HTMLCanvasElement,
    private camera: Camera,
    private onPing?: (wx: number, wy: number, kind: MapPingKind) => void,
    private onMoveCommand?: (wx: number, wy: number) => void,
    private onTargetCommand?: (wx: number, wy: number, shiftKey: boolean) => boolean,
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
      const { wx, wy, px, py } = this.eventWorld(e);
      const pingKind = mapPingKindFromModifiers({ altKey: e.altKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey });
      if (!shouldAllowMinimapAction({ nowMs: performance.now(), hoverStartedAtMs: this.hoverStartedAtMs, isPing: !!pingKind })) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (pingKind) {
        this.drawCandidate = {
          button: e.button,
          kind: pingKind,
          startPx: { x: px, y: py },
          startWorld: { x: wx, y: wy },
          stroke: null,
        };
      } else if (e.button === 0 && this.onTargetCommand?.(wx, wy, e.shiftKey)) {
        // A pending ground-target spell/item owns the click; avoid recentering the camera.
      } else if (e.button === 2) {
        this.onMoveCommand?.(wx, wy); // 右键:命令英雄移动到此(MOBA 标配)
      } else {
        this.camera.follow = false; // 暂停跟随,让小地图平移生效(否则下一帧又锁回英雄)
        this.camera.centerOn({ x: wx, y: wy });
      }
      e.preventDefault();
      e.stopPropagation();
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.drawCandidate) return;
      this.updateDrawCandidate(e);
      if (this.drawCandidate.stroke) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (!this.drawCandidate) return;
      const candidate = this.updateDrawCandidate(e);
      const gesture = minimapCommunicationGesture({
        altKey: true,
        button: candidate.button,
        dragDistancePx: this.dragDistancePx(candidate.startPx, this.eventWorld(e)),
      });
      if (gesture === 'draw' && candidate.stroke) {
        this.drawStrokes.push(candidate.stroke);
      } else {
        this.ping(candidate.startWorld.x, candidate.startWorld.y, candidate.kind);
        this.onPing?.(candidate.startWorld.x, candidate.startWorld.y, candidate.kind);
      }
      this.drawCandidate = null;
      e.preventDefault();
      e.stopPropagation();
    });
    this.root.addEventListener('mouseenter', () => {
      this.hoverStartedAtMs = performance.now();
    });
    this.root.addEventListener('mouseleave', () => {
      this.hoverStartedAtMs = null;
    });
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  ping(wx: number, wy: number, kind: MapPingKind = 'ping'): void {
    this.pings.push({ x: wx, y: wy, at: performance.now(), kind });
  }

  setControlSettings(settings: ControlSettings): void {
    this.displaySettings = {
      heroDisplayMode: settings.minimapHeroDisplayMode,
      backgroundMode: settings.minimapBackgroundMode,
      side: settings.minimapSide,
    };
    this.applyLayout();
  }

  render(world: World, viewerTeam: Team | null, ux?: UxFeedback, selfHeroId?: number): void {
    const { ctx } = this;
    if (this.displaySettings.backgroundMode === 'simple') this.drawSimpleBackground();
    else ctx.drawImage(this.terrainThumb, 0, 0);
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
      } else if (landmark.kind === 'sideShop') {
        ctx.fillStyle = 'rgba(255,198,95,0.34)';
        ctx.strokeStyle = 'rgba(255,226,145,0.95)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.rect(x - 3.6, y - 2.5, 7.2, 5);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 2.3, y + 2.6);
        ctx.lineTo(x + 2.3, y + 2.6);
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
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.stroke();
        this.drawTinyLabel(x, y, 'R', '#fff0a8');
      } else if (landmark.kind === 'camp') {
        const color =
          landmark.tier === 'ancient' ? '#d7b36a' :
          landmark.tier === 'large' ? '#b99a6b' :
          landmark.tier === 'medium' ? '#8fb06a' :
          '#6f8f5c';
        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(5,8,4,0.95)';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(x, y, landmark.tier === 'ancient' ? 4 : 3.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1;
        this.drawTinyLabel(x, y, campLabel(landmark.tier), '#f4ead0');
      } else if (landmark.kind === 'forestPocket') {
        ctx.strokeStyle = 'rgba(144,220,108,0.92)';
        ctx.fillStyle = 'rgba(34,82,32,0.38)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(x, y, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        this.drawTinyLabel(x, y, 'F', '#c9ff9a');
      } else if (landmark.kind === 'highgroundPlateau') {
        ctx.fillStyle = 'rgba(228,196,106,0.38)';
        ctx.strokeStyle = 'rgba(255,224,138,0.96)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(x, y - 4.2);
        ctx.lineTo(x + 4, y + 3.4);
        ctx.lineTo(x - 4, y + 3.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        this.drawTinyLabel(x, y, 'H', '#fff1a8');
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
        this.drawHeroMarker(x, y, u, viewerTeam, u.id === selfHeroId);
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

    // Courier routes + markers
    for (const route of this.courierRoutes(world, viewerTeam)) this.drawCourierRoute(route, k);
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
      ctx.fillStyle = runeColor(r.type);
      ctx.strokeStyle = '#fff6c8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(r.pos.x * k, r.pos.y * k, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      this.drawTinyLabel(r.pos.x * k, r.pos.y * k, 'R', '#171107');
    }

    // 前哨(◆ 队色标记;占领中显进度环)
    for (const op of world.outposts) {
      const ox = op.pos.x * k;
      const oy = op.pos.y * k;
      ctx.beginPath();
      ctx.moveTo(ox, oy - 4.5);
      ctx.lineTo(ox + 4.5, oy);
      ctx.lineTo(ox, oy + 4.5);
      ctx.lineTo(ox - 4.5, oy);
      ctx.closePath();
      ctx.fillStyle = op.team === 0 ? '#5dd35d' : op.team === 1 ? '#e0564f' : '#cfcfcf';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#0a0c08';
      ctx.stroke();
      if (op.progress > 0 && op.capturingTeam !== 2) {
        const frac = Math.max(0, Math.min(1, op.progress / OUTPOST_CAPTURE_TIME));
        ctx.beginPath();
        ctx.strokeStyle = op.capturingTeam === 0 ? '#5dd35d' : '#e0564f';
        ctx.lineWidth = 1.5;
        ctx.arc(ox, oy, 6.5, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
        ctx.stroke();
      }
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

    const drawViews = activeMinimapDrawStrokes([
      ...this.drawStrokes,
      ...(this.drawCandidate?.stroke ? [this.drawCandidate.stroke] : []),
    ], { nowMs: now });
    this.drawStrokes = drawViews
      .map((view) => view.stroke)
      .filter((stroke) => stroke.id !== this.drawCandidate?.stroke?.id);
    for (const { stroke, alpha } of drawViews) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = `rgba(${stroke.colorRgb},${alpha * 0.92})`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      stroke.points.forEach((point, index) => {
        const x = point.x * k;
        const y = point.y * k;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
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

  private applyLayout(): void {
    if (this.displaySettings.side === 'left') {
      this.root.style.left = '8px';
      this.root.style.right = 'auto';
    } else {
      this.root.style.right = '8px';
      this.root.style.left = 'auto';
    }
  }

  private drawSimpleBackground(): void {
    const { ctx } = this;
    ctx.fillStyle = '#090d08';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = 'rgba(98,126,78,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(18, SIZE - 22);
    ctx.bezierCurveTo(76, SIZE - 64, 110, SIZE - 105, SIZE - 22, 18);
    ctx.moveTo(18, 18);
    ctx.bezierCurveTo(68, 58, 118, 103, SIZE - 18, SIZE - 18);
    ctx.moveTo(36, SIZE - 34);
    ctx.lineTo(SIZE - 34, 36);
    ctx.stroke();
  }

  private drawHeroMarker(
    x: number,
    y: number,
    u: Unit,
    viewerTeam: Team | null,
    isSelfHero: boolean,
  ): void {
    const ally = viewerTeam === null ? u.team === 0 : u.team === viewerTeam;
    const fill = u.heroDef?.color ?? TEAM_COLOR[u.team];
    const ring = ally ? '#6fe06f' : '#ff5a5a';
    const { ctx } = this;

    ctx.beginPath();
    ctx.arc(x, y, this.displaySettings.heroDisplayMode === 'names' ? 5 : 4, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = ring;
    ctx.stroke();

    if (this.displaySettings.heroDisplayMode !== 'dots') {
      const label = this.displaySettings.heroDisplayMode === 'icons'
        ? (u.heroDef?.glyph ?? 'H')
        : (u.heroDef?.name ?? 'Hero').slice(0, 2);
      ctx.save();
      ctx.font = this.displaySettings.heroDisplayMode === 'icons' ? 'bold 7px sans-serif' : 'bold 6px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = 'rgba(5,7,4,0.92)';
      ctx.strokeText(label, x, y + 0.2);
      ctx.fillStyle = '#f6f1d7';
      ctx.fillText(label, x, y + 0.2);
      ctx.restore();
    }

    if (isSelfHero) {
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 6.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  private drawTinyLabel(x: number, y: number, label: string, color: string): void {
    const { ctx } = this;
    ctx.save();
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = 'rgba(4,6,3,0.92)';
    ctx.strokeText(label, x, y + 0.2);
    ctx.fillStyle = color;
    ctx.fillText(label, x, y + 0.2);
    ctx.restore();
  }

  private eventWorld(e: MouseEvent): { wx: number; wy: number; px: number; py: number } {
    const rect = this.root.getBoundingClientRect();
    const px = Math.max(0, Math.min(SIZE, e.clientX - rect.left));
    const py = Math.max(0, Math.min(SIZE, e.clientY - rect.top));
    return {
      wx: (px / SIZE) * WORLD,
      wy: (py / SIZE) * WORLD,
      px,
      py,
    };
  }

  private dragDistancePx(startPx: { x: number; y: number }, current: { px: number; py: number }): number {
    return Math.hypot(current.px - startPx.x, current.py - startPx.y);
  }

  private updateDrawCandidate(e: MouseEvent): NonNullable<MiniMap['drawCandidate']> {
    const candidate = this.drawCandidate!;
    const current = this.eventWorld(e);
    const gesture = minimapCommunicationGesture({
      altKey: true,
      button: candidate.button,
      dragDistancePx: this.dragDistancePx(candidate.startPx, current),
    });
    if (gesture === 'draw') {
      const point = { x: current.wx, y: current.wy, timeMs: performance.now() };
      candidate.stroke = candidate.stroke
        ? appendMinimapDrawPoint(candidate.stroke, { point })
        : createMinimapDrawStroke({
            id: this.nextDrawStrokeId++,
            kind: candidate.kind,
            point: { ...candidate.startWorld, timeMs: point.timeMs },
          });
      candidate.stroke = appendMinimapDrawPoint(candidate.stroke, { point });
    }
    return candidate;
  }

  private courierRoutes(world: World, viewerTeam: Team | null): CourierRouteModel[] {
    const routes: CourierRouteModel[] = [];
    for (const courier of world.units.values()) {
      if (courier.kind !== 'courier') continue;
      if (viewerTeam !== null && courier.team !== viewerTeam) continue;
      const route = buildCourierRouteModel({
        courier: {
          id: courier.id,
          alive: courier.alive,
          pos: courier.pos,
          hp: courier.hp,
          maxHp: courier.calc.maxHp,
          order: courier.order,
        },
        stashItems: teamStashItems(world, courier.team),
      });
      if (route.visible) routes.push(route);
    }
    return routes;
  }

  private drawCourierRoute(route: CourierRouteModel, scale: number): void {
    if (!route.visible || !route.from || !route.to) return;
    const { ctx } = this;
    const from = { x: route.from.x * scale, y: route.from.y * scale };
    const to = { x: route.to.x * scale, y: route.to.y * scale };
    const color = courierRouteColor(route.tone);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 3) return;
    const ux = dx / len;
    const uy = dy / len;

    ctx.save();
    ctx.globalAlpha = route.tone === 'danger' ? 0.86 : 0.66;
    ctx.strokeStyle = color;
    ctx.lineWidth = route.kind === 'delivering' ? 1.8 : 1.35;
    ctx.setLineDash(route.kind === 'returning' ? [4, 4] : [6, 3]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - ux * 5 - uy * 3, to.y - uy * 5 + ux * 3);
    ctx.lineTo(to.x - ux * 5 + uy * 3, to.y - uy * 5 - ux * 3);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = route.tone === 'danger' ? 0.92 : 0.72;
    ctx.beginPath();
    ctx.arc(to.x, to.y, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
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

function campLabel(tier?: string): string {
  if (tier === 'ancient') return 'A';
  if (tier === 'large') return 'L';
  if (tier === 'medium') return 'M';
  return 'S';
}

function runeColor(type: string): string {
  switch (type) {
    case 'haste': return '#62c8ff';
    case 'doubledamage': return '#ff7a58';
    case 'regen': return '#8effa9';
    case 'invis': return '#b896ff';
    case 'illusion': return '#8ff6ff';
    case 'bounty': return '#ffd46b';
    default: return '#ffd54f';
  }
}

function teamStashItems(world: World, team: Team): number {
  let count = 0;
  for (const unit of world.units.values()) {
    if (unit.kind !== 'hero' || unit.team !== team || !unit.alive) continue;
    count += unit.stash.filter((item) => item !== null).length;
  }
  return count;
}

function courierRouteColor(tone: CourierRouteModel['tone']): string {
  if (tone === 'danger') return '#ff9f45';
  if (tone === 'busy') return '#ffd76a';
  if (tone === 'ready') return '#9cff74';
  return '#9a9277';
}
