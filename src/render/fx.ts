/**
 * 特效渲染层:消费 world.events(每 tick 约数十条)→ 生成带寿命的视觉粒子,
 * 在 render 阶段按真实帧时长老化绘制。模拟层只负责 emit,绝不知道渲染。
 *
 * 几何形态由事件载荷决定:pos2→光束 / radius+duration→持续区域 / radius→扩张环 / 仅 pos→点状。
 * 配色与点状运动由 fxStyle(特效名)给出。另含浮动战斗文字(伤害数字 / 击杀赏金 / 连杀播报)。
 */
import { V, type Vec2 } from '../core/vec2';
import type { World, GameEvent } from '../sim/world';
import { Team } from '../sim/map';
import { cellVisible } from '../sim/vision';
import type { Camera } from './camera';
import { fxStyle, type FxMotion, type FxPattern } from './fxStyle';

type FxKind = 'ring' | 'beam' | 'field' | 'point' | 'impact' | 'levelup' | 'death';

interface FxParticle {
  kind: FxKind;
  pos: Vec2;
  pos2?: Vec2;
  r0: number;
  r1: number;
  color: string;
  glow: string;
  motion: FxMotion;
  pattern: FxPattern;
  t: number; // 已存活秒
  life: number; // 总寿命秒
  seed: number; // 程序化抖动用
}

interface FloatText {
  text: string;
  pos: Vec2;
  color: string;
  size: number;
  t: number;
  life: number;
  vy: number; // 世界单位/秒,负为上升
}

const MAX_PARTS = 260;
const MAX_TEXTS = 56;

export class FxLayer {
  particles: FxParticle[] = [];
  texts: FloatText[] = [];
  showDamageNumbers = true;
  /** 跟随玩家英雄;为 null 时全图可见 */
  private viewerTeam: Team | null = null;
  private lastNow = -1;
  private seedCounter = 1;

  /** 在 step 之后调用:抓取本 tick 事件。 */
  consume(world: World, viewerTeam: Team | null): void {
    this.viewerTeam = viewerTeam;
    const gate = (pos: Vec2): boolean => viewerTeam === null || cellVisible(world, viewerTeam, pos);
    for (const e of world.events) this.handle(world, e, gate);
  }

  private handle(world: World, e: GameEvent, gate: (p: Vec2) => boolean): void {
    switch (e.kind) {
      case 'fx': {
        if (!gate(e.pos)) return;
        const st = fxStyle(e.fx);
        if (e.pos2) {
          this.add({ kind: 'beam', pos: e.pos, pos2: e.pos2, r0: 0, r1: 0, color: st.color, glow: st.glow, motion: st.motion, pattern: st.pattern, t: 0, life: e.duration && e.duration > 0.5 ? Math.min(e.duration, 3) : 0.35, seed: this.seed() });
        } else if (e.radius && e.duration) {
          this.add({ kind: 'field', pos: e.pos, r0: e.radius, r1: e.radius, color: st.color, glow: st.glow, motion: st.motion, pattern: st.pattern, t: 0, life: Math.min(e.duration, 10), seed: this.seed() });
        } else if (e.radius) {
          this.add({ kind: 'ring', pos: e.pos, r0: Math.min(40, e.radius * 0.25), r1: e.radius, color: st.color, glow: st.glow, motion: st.motion, pattern: st.pattern, t: 0, life: 0.5, seed: this.seed() });
        } else {
          const size = st.motion === 'crack' ? 250 : st.motion === 'flash' ? 150 : 120;
          this.add({ kind: 'point', pos: e.pos, r0: 0, r1: size, color: st.color, glow: st.glow, motion: st.motion, pattern: st.pattern, t: 0, life: st.motion === 'flash' ? 0.3 : 0.55, seed: this.seed() });
        }
        return;
      }
      case 'unit_damaged': {
        if (!gate(e.pos)) return;
        const target = world.getUnit(e.unitId);
        const source = world.getUnit(e.sourceId);
        const tHero = !!(target as any)?.isHero?.();
        const sHero = !!(source as any)?.isHero?.();
        if (this.showDamageNumbers && e.amount >= 1 && (tHero || sHero)) {
          const amt = Math.round(e.amount);
          this.texts.push({
            text: String(amt),
            pos: { x: e.pos.x + (this.seed() % 7) - 3, y: e.pos.y - 40 },
            color: tHero ? '#ff8f8f' : '#ffe7b0',
            size: amt >= 200 ? 22 : amt >= 80 ? 18 : 14,
            t: 0,
            life: 0.9,
            vy: -90,
          });
          this.trimTexts();
        }
        return;
      }
      case 'hero_level': {
        const u = world.getUnit(e.unitId);
        if (!u || !gate(u.pos)) return;
        this.add({ kind: 'levelup', pos: V.clone(u.pos), r0: 30, r1: 110, color: '#ffd86b', glow: 'rgba(255,216,107,0.5)', motion: 'rise', t: 0, life: 0.9, seed: this.seed() });
        return;
      }
      case 'hero_kill': {
        const victim = world.getUnit(e.victimId);
        if (victim && gate(victim.pos)) {
          if (e.bounty > 0) {
            this.texts.push({ text: `+${e.bounty}`, pos: { x: victim.pos.x, y: victim.pos.y - 30 }, color: '#ffd24a', size: 18, t: 0, life: 1.3, vy: -60 });
          }
          if (e.streakText) {
            this.texts.push({ text: e.streakText, pos: { x: victim.pos.x, y: victim.pos.y - 70 }, color: '#ff5252', size: 24, t: 0, life: 1.8, vy: -28 });
          }
          this.trimTexts();
        }
        return;
      }
      case 'last_hit': {
        // 仅显示观察方队伍(观战 null 显示全部),避免敌方补刀刷屏
        const killer = world.getUnit(e.unitId);
        if (this.viewerTeam !== null && killer?.team !== this.viewerTeam) return;
        if (!gate(e.pos)) return;
        if (e.deny) {
          this.texts.push({ text: '拒绝', pos: { x: e.pos.x, y: e.pos.y - 20 }, color: '#9fd0ff', size: 13, t: 0, life: 0.9, vy: -55 });
        } else if (e.gold > 0) {
          this.texts.push({ text: `+${e.gold}`, pos: { x: e.pos.x, y: e.pos.y - 20 }, color: '#ffd24a', size: 16, t: 0, life: 1.05, vy: -58 });
        }
        this.trimTexts();
        return;
      }
      case 'unit_died': {
        const u = world.getUnit(e.unitId);
        if (!u || (u as any).isBuilding?.()) return; // 建筑由 tower_fell/rax_fell 处理
        if (!gate(u.pos)) return;
        this.add({ kind: 'death', pos: V.clone(u.pos), r0: 6, r1: 46, color: teamDebris(u.team), glow: 'rgba(0,0,0,0.4)', motion: 'burst', t: 0, life: 0.5, seed: this.seed() });
        return;
      }
      case 'tower_fell':
      case 'rax_fell': {
        const u = world.getUnit(e.unitId);
        if (!u || !gate(u.pos)) return;
        this.add({ kind: 'impact', pos: V.clone(u.pos), r0: 20, r1: 200, color: '#ffb74d', glow: 'rgba(255,140,40,0.5)', motion: 'burst', t: 0, life: 0.8, seed: this.seed() });
        return;
      }
      case 'projectile_hit': {
        if (!gate(e.pos)) return;
        this.add({ kind: 'impact', pos: V.clone(e.pos), r0: 4, r1: 34, color: '#cfe8ff', glow: 'rgba(180,210,255,0.4)', motion: 'burst', t: 0, life: 0.22, seed: this.seed() });
        return;
      }
      case 'rune_spawned': {
        if (!gate(e.pos)) return;
        this.add({ kind: 'ring', pos: V.clone(e.pos), r0: 10, r1: 70, color: '#b06bff', glow: 'rgba(176,107,255,0.4)', motion: 'rise', t: 0, life: 0.7, seed: this.seed() });
        return;
      }
      case 'boss_killed': {
        // Boss 已移除无 pos:在已知深渊领主巢穴位置放大型金光(地图中央偏河)
        this.add({ kind: 'impact', pos: { x: 6300, y: 8400 }, r0: 30, r1: 300, color: '#ffd86b', glow: 'rgba(255,216,107,0.55)', motion: 'burst', t: 0, life: 1.2, seed: this.seed() });
        return;
      }
    }
  }

  private add(p: Omit<FxParticle, 'pattern'> & { pattern?: FxPattern }): void {
    this.particles.push({ pattern: 'spark', ...p });
    if (this.particles.length > MAX_PARTS) this.particles.splice(0, this.particles.length - MAX_PARTS);
  }
  private trimTexts(): void {
    if (this.texts.length > MAX_TEXTS) this.texts.splice(0, this.texts.length - MAX_TEXTS);
  }
  private seed(): number {
    this.seedCounter = (this.seedCounter * 1103515245 + 12345) & 0x7fffffff;
    return this.seedCounter;
  }

  /** 老化并剔除过期(秒)。render 内部按真实帧时长调用,测试可直接调用。 */
  advance(dt: number): void {
    for (const p of this.particles) p.t += dt;
    this.particles = this.particles.filter((p) => p.t < p.life);
    for (const t of this.texts) {
      t.t += dt;
      t.pos.y += t.vy * dt;
    }
    this.texts = this.texts.filter((t) => t.t < t.life);
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const now = performance.now();
    const dt = this.lastNow < 0 ? 0 : Math.min(0.1, (now - this.lastNow) / 1000);
    this.lastNow = now;
    this.advance(dt);

    ctx.save();
    ctx.lineCap = 'round';
    for (const p of this.particles) this.draw(ctx, camera, p);
    ctx.restore();

    // 浮动文字(屏幕空间)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const sp = camera.worldToScreen(t.pos);
      const u = t.t / t.life;
      ctx.globalAlpha = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85;
      const fs = Math.max(11, t.size * (0.85 + 0.15 * camera.zoom * 2));
      ctx.font = `800 ${fs}px "Segoe UI", Arial, sans-serif`;
      ctx.lineWidth = Math.max(3, fs * 0.18);
      ctx.strokeStyle = 'rgba(0,0,0,0.92)';
      ctx.strokeText(t.text, sp.x, sp.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, sp.x, sp.y);
    }
    ctx.restore();
  }

  private draw(ctx: CanvasRenderingContext2D, camera: Camera, p: FxParticle): void {
    const u = p.t / p.life; // 0..1
    const sp = camera.worldToScreen(p.pos);
    const z = camera.zoom;
    switch (p.kind) {
      case 'ring':
      case 'levelup': {
        const rad = (p.r0 + (p.r1 - p.r0) * easeOut(u)) * z;
        ctx.globalAlpha = (1 - u) * 0.9;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.5, 6 * z);
        ctx.shadowColor = p.glow;
        ctx.shadowBlur = 16 * z;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, rad, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        if (p.kind === 'ring') this.drawRingPattern(ctx, sp, rad, z, p, u);
        if (p.kind === 'levelup') {
          // 升级:向上的金色光柱细线
          ctx.globalAlpha = (1 - u) * 0.8;
          ctx.lineWidth = Math.max(1, 3 * z);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + p.seed;
            const r2 = rad * 0.7;
            ctx.beginPath();
            ctx.moveTo(sp.x + Math.cos(a) * r2, sp.y + Math.sin(a) * r2);
            ctx.lineTo(sp.x + Math.cos(a) * r2, sp.y + Math.sin(a) * r2 - 26 * z * (1 - u));
            ctx.stroke();
          }
        }
        break;
      }
      case 'beam': {
        if (!p.pos2) break;
        const a = camera.worldToScreen(p.pos);
        const b = camera.worldToScreen(p.pos2);
        ctx.globalAlpha = 1 - u;
        ctx.strokeStyle = p.color;
        ctx.shadowColor = p.glow;
        ctx.shadowBlur = 14 * z;
        ctx.lineWidth = Math.max(2, 7 * z) * (1 - u * 0.5);
        ctx.beginPath();
        // 闪电系折线抖动
        const isJag = p.pattern === 'jagged';
        if (isJag) {
          const segs = 6;
          ctx.moveTo(a.x, a.y);
          for (let i = 1; i < segs; i++) {
            const tt = i / segs;
            const jx = (((p.seed >> i) & 7) - 3.5) * 8 * z;
            const jy = (((p.seed >> (i + 3)) & 7) - 3.5) * 8 * z;
            ctx.lineTo(a.x + (b.x - a.x) * tt + jx, a.y + (b.y - a.y) * tt + jy);
          }
          ctx.lineTo(b.x, b.y);
        } else {
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
        this.drawBeamPattern(ctx, a, b, z, p, u);
        ctx.shadowBlur = 0;
        break;
      }
      case 'field': {
        const rad = p.r1 * z;
        // 淡入淡出
        const fade = u < 0.1 ? u / 0.1 : u > 0.85 ? (1 - u) / 0.15 : 1;
        ctx.globalAlpha = 0.16 * fade;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, rad, 0, Math.PI * 2);
        ctx.fill();
        // 脉动边缘
        ctx.globalAlpha = 0.4 * fade;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, 2 * z);
        const pulse = rad * (0.92 + 0.06 * Math.sin(p.t * 6 + p.seed));
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, pulse, 0, Math.PI * 2);
        ctx.stroke();
        // 漂浮微粒
        ctx.globalAlpha = 0.5 * fade;
        ctx.fillStyle = p.color;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + p.t * 1.5 + p.seed;
          const rr = rad * (0.3 + 0.6 * frac((p.seed >> i) * 0.37 + p.t * 0.2));
          ctx.beginPath();
          ctx.arc(sp.x + Math.cos(a) * rr, sp.y + Math.sin(a) * rr, Math.max(1, 2.5 * z), 0, Math.PI * 2);
          ctx.fill();
        }
        this.drawFieldPattern(ctx, sp, rad, z, p, u, fade);
        break;
      }
      case 'impact':
      case 'death': {
        const rad = (p.r0 + (p.r1 - p.r0) * easeOut(u)) * z;
        ctx.globalAlpha = (1 - u) * (p.kind === 'impact' ? 0.85 : 0.7);
        // 亮核
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.glow;
        ctx.shadowBlur = 18 * z;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, rad * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // 碎片
        const n = p.kind === 'impact' ? 10 : 6;
        ctx.lineWidth = Math.max(1, 2.5 * z);
        ctx.strokeStyle = p.color;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + p.seed;
          ctx.beginPath();
          ctx.moveTo(sp.x + Math.cos(a) * rad * 0.4, sp.y + Math.sin(a) * rad * 0.4);
          ctx.lineTo(sp.x + Math.cos(a) * rad, sp.y + Math.sin(a) * rad);
          ctx.stroke();
        }
        break;
      }
      case 'point': {
        this.drawPoint(ctx, sp, z, p, u);
        break;
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private drawPoint(ctx: CanvasRenderingContext2D, sp: Vec2, z: number, p: FxParticle, u: number): void {
    const rad = p.r1 * z;
    ctx.strokeStyle = p.color;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.glow;
    if (p.motion !== 'flash' && p.motion !== 'rise' && p.motion !== 'fall') {
      this.drawImpactPattern(ctx, sp, z, p, u);
      return;
    }
    switch (p.motion as FxMotion) {
      case 'flash': {
        ctx.globalAlpha = (1 - u) * 0.95;
        ctx.shadowBlur = 22 * z;
        const r = rad * (0.4 + 0.6 * easeOut(u));
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = (1 - u) * 0.6;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'rise':
      case 'fall': {
        const dir = p.motion === 'rise' ? -1 : 1;
        ctx.globalAlpha = 1 - u;
        ctx.shadowBlur = 10 * z;
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + p.seed;
          const spread = rad * 0.45;
          const x = sp.x + Math.cos(a) * spread * (0.4 + frac(p.seed * 0.13 + i));
          const y = sp.y + Math.sin(a) * spread * 0.3 + dir * rad * easeOut(u) * (0.6 + 0.4 * frac(i * 0.7));
          ctx.beginPath();
          ctx.arc(x, y, Math.max(1.5, 3.5 * z), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'crack': {
        // 地裂:由中心向外的折线
        ctx.globalAlpha = (1 - u) * 0.9;
        ctx.lineWidth = Math.max(1.5, 4 * z) * (1 - u * 0.5);
        const reach = rad * easeOut(u);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + p.seed * 0.01;
          const mx = sp.x + Math.cos(a) * reach * 0.55 + (((p.seed >> i) & 3) - 1.5) * 6 * z;
          const my = sp.y + Math.sin(a) * reach * 0.55 + (((p.seed >> (i + 2)) & 3) - 1.5) * 6 * z;
          ctx.beginPath();
          ctx.moveTo(sp.x, sp.y);
          ctx.lineTo(mx, my);
          ctx.lineTo(sp.x + Math.cos(a) * reach, sp.y + Math.sin(a) * reach);
          ctx.stroke();
        }
        break;
      }
      default: {
        // burst:向外迸射的火花环 + 亮核
        ctx.globalAlpha = (1 - u) * 0.9;
        ctx.shadowBlur = 14 * z;
        const r = rad * easeOut(u);
        ctx.lineWidth = Math.max(1.5, 3 * z);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + p.seed;
          ctx.beginPath();
          ctx.moveTo(sp.x + Math.cos(a) * r * 0.35, sp.y + Math.sin(a) * r * 0.35);
          ctx.lineTo(sp.x + Math.cos(a) * r, sp.y + Math.sin(a) * r);
          ctx.stroke();
        }
        ctx.globalAlpha = (1 - u) * 0.7;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r * 0.25 + 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  }

  private drawRingPattern(ctx: CanvasRenderingContext2D, sp: Vec2, rad: number, z: number, p: FxParticle, u: number): void {
    const fade = Math.max(0, 1 - u);
    ctx.strokeStyle = p.color;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.glow;
    ctx.shadowBlur = 8 * z;
    ctx.lineWidth = Math.max(1, 2.5 * z);
    const count = p.pattern === 'runes' ? 10 : p.pattern === 'shards' || p.pattern === 'jagged' ? 12 : 8;
    ctx.globalAlpha = fade * 0.62;

    if (p.pattern === 'halo') {
      for (const k of [0.78, 1.18]) {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, rad * k, 0, Math.PI * 2);
        ctx.stroke();
      }
      return;
    }

    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + p.seed * 0.01 + u * 0.8;
      const nx = Math.cos(a);
      const ny = Math.sin(a);
      const tx = -ny;
      const ty = nx;
      const wobble = 1 + 0.04 * Math.sin(p.t * 8 + i + p.seed);
      const base = rad * wobble;
      const x = sp.x + nx * base;
      const y = sp.y + ny * base;
      switch (p.pattern) {
        case 'shards': {
          const len = Math.max(8, 18 * z);
          ctx.beginPath();
          ctx.moveTo(x - tx * 4 * z, y - ty * 4 * z);
          ctx.lineTo(x + nx * len, y + ny * len);
          ctx.lineTo(x + tx * 4 * z, y + ty * 4 * z);
          ctx.stroke();
          break;
        }
        case 'jagged': {
          ctx.beginPath();
          ctx.moveTo(x - tx * 10 * z, y - ty * 10 * z);
          ctx.lineTo(x + nx * 7 * z, y + ny * 7 * z);
          ctx.lineTo(x + tx * 10 * z, y + ty * 10 * z);
          ctx.stroke();
          break;
        }
        case 'cloud': {
          ctx.globalAlpha = fade * 0.32;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(4, 9 * z), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = fade * 0.62;
          break;
        }
        case 'cracks': {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(sp.x + nx * rad * 0.68 + tx * 7 * z, sp.y + ny * rad * 0.68 + ty * 7 * z);
          ctx.lineTo(sp.x + nx * rad * 0.46 - tx * 5 * z, sp.y + ny * rad * 0.46 - ty * 5 * z);
          ctx.stroke();
          break;
        }
        case 'runes': {
          const s = Math.max(3, 7 * z);
          ctx.strokeRect(x - s * 0.5, y - s * 0.5, s, s);
          break;
        }
        case 'splatter': {
          ctx.beginPath();
          ctx.arc(x + nx * 4 * z, y + ny * 4 * z, Math.max(2, 5 * z), 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'embers':
        case 'spark':
        default: {
          ctx.beginPath();
          ctx.moveTo(x - nx * 6 * z, y - ny * 6 * z);
          ctx.lineTo(x + nx * 12 * z, y + ny * 12 * z);
          ctx.stroke();
          break;
        }
      }
    }
    ctx.shadowBlur = 0;
  }

  private drawFieldPattern(ctx: CanvasRenderingContext2D, sp: Vec2, rad: number, z: number, p: FxParticle, u: number, fade: number): void {
    ctx.strokeStyle = p.color;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.glow;
    ctx.shadowBlur = 6 * z;
    ctx.lineWidth = Math.max(1, 2 * z);
    const count = p.pattern === 'cloud' ? 14 : p.pattern === 'runes' ? 9 : 7;
    ctx.globalAlpha = fade * 0.34;

    if (p.pattern === 'halo') {
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, rad * (i / 4), 0, Math.PI * 2);
        ctx.stroke();
      }
      return;
    }

    for (let i = 0; i < count; i++) {
      const orbit = frac(p.seed * 0.002 + i * 0.41 + p.t * 0.08);
      const a = (i / count) * Math.PI * 2 + p.t * 0.9 + p.seed * 0.01;
      const rr = rad * (0.18 + 0.68 * orbit);
      const x = sp.x + Math.cos(a) * rr;
      const y = sp.y + Math.sin(a) * rr * 0.82;
      switch (p.pattern) {
        case 'shards': {
          ctx.beginPath();
          ctx.moveTo(x - 7 * z, y + 5 * z);
          ctx.lineTo(x, y - 12 * z);
          ctx.lineTo(x + 7 * z, y + 5 * z);
          ctx.stroke();
          break;
        }
        case 'jagged': {
          ctx.beginPath();
          ctx.moveTo(x - 12 * z, y);
          ctx.lineTo(x - 2 * z, y - 8 * z);
          ctx.lineTo(x + 4 * z, y + 6 * z);
          ctx.lineTo(x + 14 * z, y - 3 * z);
          ctx.stroke();
          break;
        }
        case 'cloud': {
          ctx.globalAlpha = fade * 0.22;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(6, 14 * z) * (0.75 + 0.4 * orbit), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = fade * 0.34;
          break;
        }
        case 'cracks': {
          const a2 = a + Math.PI * 0.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a2) * 16 * z, y + Math.sin(a2) * 16 * z);
          ctx.lineTo(x + Math.cos(a2 + 0.6) * 26 * z, y + Math.sin(a2 + 0.6) * 26 * z);
          ctx.stroke();
          break;
        }
        case 'runes': {
          const s = Math.max(4, 8 * z);
          ctx.strokeRect(x - s * 0.5, y - s * 0.5, s, s);
          break;
        }
        case 'splatter': {
          ctx.beginPath();
          ctx.arc(x, y, Math.max(2, 5 * z) * (1 + orbit), 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'embers':
        case 'spark':
        default: {
          ctx.beginPath();
          ctx.moveTo(x - 8 * z, y);
          ctx.lineTo(x + 8 * z, y);
          ctx.moveTo(x, y - 8 * z);
          ctx.lineTo(x, y + 8 * z);
          ctx.stroke();
          break;
        }
      }
    }
    ctx.shadowBlur = 0;
  }

  private drawBeamPattern(ctx: CanvasRenderingContext2D, a: Vec2, b: Vec2, z: number, p: FxParticle, u: number): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;
    const tx = dx / len;
    const ty = dy / len;
    const fade = Math.max(0, 1 - u);
    ctx.strokeStyle = p.color;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.glow;
    ctx.shadowBlur = 8 * z;
    ctx.lineWidth = Math.max(1, 2.5 * z);
    ctx.globalAlpha = fade * 0.62;

    const count = p.pattern === 'jagged' ? 6 : 5;
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const x = a.x + dx * t;
      const y = a.y + dy * t;
      const wobble = (((p.seed >> i) & 7) - 3) * z;
      switch (p.pattern) {
        case 'shards': {
          ctx.beginPath();
          ctx.moveTo(x - nx * 11 * z + tx * 5 * z, y - ny * 11 * z + ty * 5 * z);
          ctx.lineTo(x + nx * 15 * z, y + ny * 15 * z);
          ctx.lineTo(x - nx * 11 * z - tx * 5 * z, y - ny * 11 * z - ty * 5 * z);
          ctx.stroke();
          break;
        }
        case 'jagged': {
          ctx.beginPath();
          ctx.moveTo(x - tx * 18 * z, y - ty * 18 * z);
          ctx.lineTo(x + nx * (12 * z + wobble), y + ny * (12 * z + wobble));
          ctx.lineTo(x + tx * 18 * z, y + ty * 18 * z);
          ctx.stroke();
          break;
        }
        case 'cloud': {
          ctx.globalAlpha = fade * 0.24;
          ctx.beginPath();
          ctx.arc(x + nx * wobble, y + ny * wobble, Math.max(5, 12 * z), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = fade * 0.62;
          break;
        }
        case 'cracks': {
          ctx.beginPath();
          ctx.moveTo(x - nx * 18 * z, y - ny * 18 * z);
          ctx.lineTo(x + nx * 2 * z, y + ny * 2 * z);
          ctx.lineTo(x + nx * 18 * z + tx * 10 * z, y + ny * 18 * z + ty * 10 * z);
          ctx.stroke();
          break;
        }
        case 'halo': {
          ctx.beginPath();
          ctx.arc(x, y, Math.max(5, 12 * z), 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'runes': {
          const s = Math.max(4, 8 * z);
          ctx.strokeRect(x - s * 0.5, y - s * 0.5, s, s);
          break;
        }
        case 'splatter': {
          ctx.beginPath();
          ctx.arc(x + nx * wobble, y + ny * wobble, Math.max(2, 5 * z), 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'embers':
        case 'spark':
        default: {
          ctx.beginPath();
          ctx.moveTo(x - nx * 10 * z, y - ny * 10 * z);
          ctx.lineTo(x + nx * 10 * z, y + ny * 10 * z);
          ctx.stroke();
          break;
        }
      }
    }
    ctx.shadowBlur = 0;
  }

  private drawImpactPattern(ctx: CanvasRenderingContext2D, sp: Vec2, z: number, p: FxParticle, u: number): void {
    const rad = p.r1 * z;
    const r = rad * easeOut(u);
    const fade = Math.max(0, 1 - u);
    const pattern = p.motion === 'crack' ? 'cracks' : p.pattern;

    ctx.strokeStyle = p.color;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.glow;
    ctx.shadowBlur = 14 * z;
    ctx.lineWidth = Math.max(1.5, 3 * z) * (1 - u * 0.35);

    switch (pattern) {
      case 'embers': {
        ctx.globalAlpha = fade * 0.92;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + p.seed * 0.01;
          const bend = (frac(p.seed * 0.001 + i * 0.37) - 0.5) * 0.45;
          const inner = r * 0.18;
          const outer = r * (0.65 + 0.28 * frac(i * 1.7 + p.seed));
          ctx.beginPath();
          ctx.moveTo(sp.x + Math.cos(a) * inner, sp.y + Math.sin(a) * inner);
          ctx.quadraticCurveTo(
            sp.x + Math.cos(a + bend) * r * 0.55,
            sp.y + Math.sin(a + bend) * r * 0.55,
            sp.x + Math.cos(a) * outer,
            sp.y + Math.sin(a) * outer,
          );
          ctx.stroke();
        }
        ctx.globalAlpha = fade * 0.72;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r * 0.26 + 3 * z, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'shards': {
        ctx.globalAlpha = fade * 0.86;
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + p.seed * 0.011;
          const len = r * (0.46 + 0.4 * frac(p.seed * 0.002 + i * 0.61));
          const base = r * 0.18;
          const width = Math.max(3, 8 * z) * (1 - u * 0.25);
          const tx = -Math.sin(a) * width;
          const ty = Math.cos(a) * width;
          const bx = sp.x + Math.cos(a) * base;
          const by = sp.y + Math.sin(a) * base;
          const tipx = sp.x + Math.cos(a) * len;
          const tipy = sp.y + Math.sin(a) * len;
          ctx.beginPath();
          ctx.moveTo(bx + tx * 0.35, by + ty * 0.35);
          ctx.lineTo(tipx, tipy);
          ctx.lineTo(bx - tx * 0.35, by - ty * 0.35);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        break;
      }
      case 'jagged': {
        ctx.globalAlpha = fade * 0.95;
        ctx.lineWidth = Math.max(1.5, 4 * z) * (1 - u * 0.45);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + p.seed * 0.017;
          ctx.beginPath();
          ctx.moveTo(sp.x, sp.y);
          for (let j = 1; j <= 4; j++) {
            const t = j / 4;
            const side = (j % 2 === 0 ? 1 : -1) * (8 + ((p.seed >> (i + j)) & 7)) * z;
            const dist = r * t;
            const x = sp.x + Math.cos(a) * dist + Math.cos(a + Math.PI / 2) * side;
            const y = sp.y + Math.sin(a) * dist + Math.sin(a + Math.PI / 2) * side;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = fade * 0.35;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'cloud': {
        ctx.globalAlpha = fade * 0.3;
        for (let i = 0; i < 11; i++) {
          const a = (i / 11) * Math.PI * 2 + p.seed * 0.013 + u * 0.8;
          const dist = r * (0.18 + 0.62 * frac(p.seed * 0.003 + i * 0.47 + u));
          const blob = Math.max(5, rad * (0.05 + 0.04 * frac(i * 0.33 + p.seed)));
          ctx.beginPath();
          ctx.arc(sp.x + Math.cos(a) * dist, sp.y + Math.sin(a) * dist * 0.72, blob, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = fade * 0.36;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r * 0.52, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'cracks': {
        ctx.globalAlpha = fade * 0.9;
        ctx.lineWidth = Math.max(1.5, 4 * z) * (1 - u * 0.5);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + p.seed * 0.01;
          const mx = sp.x + Math.cos(a) * r * 0.55 + (((p.seed >> i) & 3) - 1.5) * 6 * z;
          const my = sp.y + Math.sin(a) * r * 0.55 + (((p.seed >> (i + 2)) & 3) - 1.5) * 6 * z;
          ctx.beginPath();
          ctx.moveTo(sp.x, sp.y);
          ctx.lineTo(mx, my);
          ctx.lineTo(sp.x + Math.cos(a) * r, sp.y + Math.sin(a) * r);
          ctx.stroke();
        }
        break;
      }
      case 'halo': {
        ctx.globalAlpha = fade * 0.8;
        ctx.lineWidth = Math.max(1, 2.5 * z);
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, r * (0.22 + i * 0.2), 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = fade * 0.7;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + p.seed * 0.01;
          ctx.beginPath();
          ctx.moveTo(sp.x + Math.cos(a) * r * 0.15, sp.y + Math.sin(a) * r * 0.15);
          ctx.lineTo(sp.x + Math.cos(a) * r * 0.74, sp.y + Math.sin(a) * r * 0.74);
          ctx.stroke();
        }
        break;
      }
      case 'runes': {
        ctx.globalAlpha = fade * 0.82;
        ctx.lineWidth = Math.max(1, 2.5 * z);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + p.seed * 0.012 + u * 1.8;
          const x = sp.x + Math.cos(a) * r * 0.58;
          const y = sp.y + Math.sin(a) * r * 0.58;
          const s = Math.max(3, 7 * z) * (1 - u * 0.25);
          ctx.strokeRect(x - s * 0.5, y - s * 0.5, s, s);
        }
        ctx.globalAlpha = fade * 0.55;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r * 0.18 + 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'splatter': {
        ctx.globalAlpha = fade * 0.82;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + p.seed * 0.02;
          const dist = r * (0.26 + 0.64 * frac(p.seed * 0.004 + i * 0.53));
          const size = Math.max(2, 5 * z) * (1 + frac(i * 0.73 + p.seed));
          ctx.beginPath();
          ctx.arc(sp.x + Math.cos(a) * dist, sp.y + Math.sin(a) * dist, size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.lineWidth = Math.max(1.5, 4 * z);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + p.seed * 0.015;
          ctx.beginPath();
          ctx.moveTo(sp.x + Math.cos(a) * r * 0.18, sp.y + Math.sin(a) * r * 0.18);
          ctx.lineTo(sp.x + Math.cos(a) * r * 0.74, sp.y + Math.sin(a) * r * 0.74);
          ctx.stroke();
        }
        break;
      }
      case 'spark':
      default: {
        ctx.globalAlpha = fade * 0.9;
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + p.seed;
          ctx.beginPath();
          ctx.moveTo(sp.x + Math.cos(a) * r * 0.35, sp.y + Math.sin(a) * r * 0.35);
          ctx.lineTo(sp.x + Math.cos(a) * r, sp.y + Math.sin(a) * r);
          ctx.stroke();
        }
        ctx.globalAlpha = fade * 0.7;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r * 0.25 + 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  }
}

function teamDebris(team: number): string {
  return team === Team.Dawn ? '#7cc47f' : team === Team.Night ? '#e57373' : '#bdbdbd';
}
function easeOut(u: number): number {
  return 1 - (1 - u) * (1 - u);
}
function frac(x: number): number {
  return x - Math.floor(x);
}
