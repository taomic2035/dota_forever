/**
 * 音频导演:消费模拟事件 → WebAudio 程序化合成音效。
 * 浏览器自动播放策略:首次用户交互后激活。
 */
import type { World } from '../sim/world';
import type { Unit } from '../sim/unit';

export class AudioDirector {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  volume = 0.5;
  private lastSfx = new Map<string, number>();

  constructor() {
    const unlock = () => {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
      }
      void this.ctx.resume();
    };
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });
  }

  /** 限频:同名音效最短间隔。 */
  private throttled(key: string, minGap: number): boolean {
    const now = performance.now();
    if (now - (this.lastSfx.get(key) ?? -1e9) < minGap) return true;
    this.lastSfx.set(key, now);
    return false;
  }

  consume(world: World, playerHero: Unit | undefined): void {
    if (!this.ctx || !this.master || this.ctx.state !== 'running') return;
    for (const e of world.events) {
      switch (e.kind) {
        case 'unit_damaged':
          // 只给玩家英雄相关的命中做音效,避免噪音墙
          if (playerHero && (e.unitId === playerHero.id || e.sourceId === playerHero.id)) {
            if (!this.throttled('hit', 90)) this.hit();
          }
          break;
        case 'cast_done': {
          const caster = world.getUnit(e.unitId);
          if (caster?.isHero() && (!playerHero || distOk(caster, playerHero))) {
            if (!this.throttled('cast', 150)) this.cast();
          }
          break;
        }
        case 'hero_level':
          if (playerHero && e.unitId === playerHero.id) this.levelUp();
          break;
        case 'hero_kill':
          if (!this.throttled('kill', 400)) this.kill();
          break;
        case 'tower_fell':
          this.towerFall();
          break;
        case 'game_over':
          this.gameOver();
          break;
        case 'boss_killed':
          this.kill();
          break;
      }
    }
  }

  private env(freq: number, type: OscillatorType, dur: number, gain: number, slide = 0): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g).connect(this.master!);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  private noise(dur: number, gain: number, lowpass = 2200): void {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(this.master!);
    src.start();
  }

  hit(): void { this.noise(0.08, 0.25, 1800); }
  cast(): void { this.env(520, 'sine', 0.18, 0.18, 380); }
  levelUp(): void {
    this.env(440, 'triangle', 0.3, 0.25, 220);
    setTimeout(() => this.env(660, 'triangle', 0.35, 0.25, 220), 120);
  }
  kill(): void {
    this.env(180, 'sawtooth', 0.35, 0.3, -90);
    this.noise(0.2, 0.2, 900);
  }
  towerFall(): void {
    this.noise(0.7, 0.4, 500);
    this.env(90, 'square', 0.6, 0.25, -50);
  }
  gameOver(): void {
    this.env(330, 'triangle', 0.8, 0.3, -110);
    setTimeout(() => this.env(220, 'triangle', 1.2, 0.3, -70), 300);
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }
}

function distOk(a: Unit, b: Unit): boolean {
  const dx = a.pos.x - b.pos.x;
  const dy = a.pos.y - b.pos.y;
  return dx * dx + dy * dy < 1600 * 1600;
}
