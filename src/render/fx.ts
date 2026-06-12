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
import { fxStyle, type FxMotion } from './fxStyle';

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
          this.add({ kind: 'beam', pos: e.pos, pos2: e.pos2, r0: 0, r1: 0, color: st.color, glow: st.glow, motion: st.motion, t: 0, life: e.duration && e.duration > 0.5 ? Math.min(e.duration, 3) : 0.35, seed: this.seed() });
        } else if (e.radius && e.duration) {
          this.add({ kind: 'field', pos: e.pos, r0: e.radius, r1: e.radius, color: st.color, glow: st.glow, motion: st.motion, t: 0, life: Math.min(e.duration, 10), seed: this.seed() });
        } else if (e.radius) {
          this.add({ kind: 'ring', pos: e.pos, r0: Math.min(40, e.radius * 0.25), r1: e.radius, color: st.color, glow: st.glow, motion: st.motion, t: 0, life: 0.5, seed: this.seed() });
        } else {
          const size = st.motion === 'crack' ? 250 : st.motion === 'flash' ? 150 : 120;
          this.add({ kind: 'point', pos: e.pos, r0: 0, r1: size, color: st.color, glow: st.glow, motion: st.motion, t: 0, life: st.motion === 'flash' ? 0.3 : 0.55, seed: this.seed() });
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

  private add(p: FxParticle): void {
    this.particles.push(p);
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
        const isJag = p.color === '#ffe23a';
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
    switch (p.motion) {
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
