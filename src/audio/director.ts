/**
 * 音频导演:消费模拟事件 → WebAudio 程序化合成音效。
 * 浏览器自动播放策略:首次用户交互后激活。
 */
import type { World } from '../sim/world';
import type { Unit } from '../sim/unit';
import type { AbilityTag } from '../data/heroes/types';
import { HEROES } from '../data/heroes';

/** 施法音色的代表性标签优先级(大招/控制/爆发优先,听感更贴技能性质)。 */
const TAG_PRIORITY: AbilityTag[] = ['ultimate', 'stun', 'nuke', 'heal', 'aoe', 'slow', 'channel', 'buff', 'escape', 'orb'];

/** 从技能标签集挑选施法音色的代表性标签(纯函数,按 TAG_PRIORITY)。 */
export function representativeCastTag(tags: readonly AbilityTag[] | undefined): AbilityTag | undefined {
  if (!tags) return undefined;
  return TAG_PRIORITY.find((t) => tags.includes(t));
}

export class AudioDirector {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicStarted = false;
  volume = 0.5;
  private lastSfx = new Map<string, number>();
  /** abilityKey → 代表性标签(惰性从 HEROES 构建一次)。 */
  private abilityTag: Map<string, AbilityTag> | null = null;

  constructor() {
    const unlock = () => {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
      }
      void this.ctx.resume();
      this.startMusic();
    };
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });
  }

  /**
   * 原创程序化背景音乐:A 小调持续氛围 pad(失谐三角波和弦 + 低音 drone),
   * 经暖色低通,慢速滤波 LFO 演进 + 呼吸 LFO,渐入低音量。零样本、无版权,循环无缝。
   */
  private startMusic(): void {
    if (this.musicStarted || !this.ctx || !this.master) return;
    this.musicStarted = true;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;

    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, t0);
    bus.gain.linearRampToValueAtTime(0.14, t0 + 5); // 5s 渐入
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 640;
    lp.Q.value = 0.7;
    lp.connect(bus).connect(this.master);

    // 滤波慢速 LFO(~26s 周期,音色缓慢明暗演进)
    const fLfo = ctx.createOscillator();
    const fLfoGain = ctx.createGain();
    fLfo.frequency.value = 0.038;
    fLfoGain.gain.value = 420;
    fLfo.connect(fLfoGain).connect(lp.frequency);
    fLfo.start();
    // 呼吸 LFO(音量缓慢起伏)
    const aLfo = ctx.createOscillator();
    const aLfoGain = ctx.createGain();
    aLfo.frequency.value = 0.06;
    aLfoGain.gain.value = 0.04;
    aLfo.connect(aLfoGain).connect(bus.gain);
    aLfo.start();

    // 和弦 pad:A 小调(A2/C3/E3/A3),每音失谐双振荡器铺厚
    for (const f of [110, 130.81, 164.81, 220]) {
      for (const det of [-4, 4]) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = f;
        osc.detune.value = det;
        const g = ctx.createGain();
        g.gain.value = 0.11;
        osc.connect(g).connect(lp);
        osc.start();
      }
    }
    // 低音 drone(A1)
    const bass = ctx.createOscillator();
    bass.type = 'sine';
    bass.frequency.value = 55;
    const bg = ctx.createGain();
    bg.gain.value = 0.2;
    bass.connect(bg).connect(lp);
    bass.start();
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
          // 只给玩家英雄相关的命中做音效,避免噪音墙;按伤害量分层(重击更有分量)
          if (playerHero && (e.unitId === playerHero.id || e.sourceId === playerHero.id)) {
            if (!this.throttled('hit', 80)) this.hitImpact(e.amount);
          }
          break;
        case 'last_hit':
          // 补刀金币 ding / 反补闷响——DotA 招牌正反馈,仅玩家英雄
          if (playerHero && e.unitId === playerHero.id) {
            if (e.deny) { if (!this.throttled('deny', 80)) this.deny(); }
            else if (!this.throttled('lasthit', 70)) this.lastHit();
          }
          break;
        case 'cast_done': {
          const caster = world.getUnit(e.unitId);
          if (caster?.isHero() && (!playerHero || distOk(caster, playerHero))) {
            if (!this.throttled('cast', 120)) this.castFor(e.abilityKey);
          }
          break;
        }
        case 'rune_taken':
          if (playerHero && e.unitId === playerHero.id) this.runePickup();
          break;
        case 'hero_level':
          if (playerHero && e.unitId === playerHero.id) this.levelUp();
          break;
        case 'hero_kill':
          if (!this.throttled('kill', 400)) this.kill();
          break;
        case 'tower_fell':
          this.towerFall();
          break;
        case 'rax_fell':
          this.raxFall();
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

  /** 命中:按伤害分层——清脆瞬态 + 低频闷击,重击更有分量。 */
  hitImpact(amount: number): void {
    const heavy = Math.min(1, amount / 220); // 0..1 权重
    this.noise(0.07 + 0.03 * heavy, 0.2 + 0.12 * heavy, 1700 + 600 * heavy);
    if (heavy > 0.25) this.env(150 - 40 * heavy, 'square', 0.09 + 0.05 * heavy, 0.12 + 0.1 * heavy, -45);
  }

  /** 补刀金币 ding:两声明亮短促,招牌正反馈。 */
  lastHit(): void {
    this.env(1180, 'sine', 0.06, 0.16, 240);
    setTimeout(() => this.env(1560, 'sine', 0.05, 0.13, 180), 38);
  }

  /** 反补:低沉下行闷响,与补刀区分。 */
  deny(): void { this.env(320, 'square', 0.12, 0.16, -150); }

  /** 神符拾取:轻柔上行微光。 */
  runePickup(): void { this.env(720, 'sine', 0.13, 0.13, 320); }

  /** 指令确认:右键移动/攻击的轻点反馈(短促、低音量、限频防刷,补"操作没反馈不跟手")。 */
  command(isAttack: boolean): void {
    if (!this.ctx || this.throttled('cmd', 80)) return;
    if (isAttack) this.env(520, 'square', 0.06, 0.05, -60);
    else this.env(340, 'sine', 0.05, 0.045, 90);
  }

  /** 指令被拒(无蓝/冷却/非法目标):短促下行错误声,与确认音区分。 */
  reject(): void {
    if (!this.ctx || this.throttled('reject', 130)) return;
    this.env(220, 'sawtooth', 0.1, 0.1, -70);
  }

  /** 物品成功使用:短促上行亮音,与移动/攻击确认区分(补全使用反馈闭环)。 */
  itemUse(): void {
    if (!this.ctx || this.throttled('item', 90)) return;
    this.env(620, 'triangle', 0.06, 0.05, 130);
  }

  /** 按技能代表性标签合成施法音色(控制硬朗 / 治疗温暖 / 爆发明亮 / 大招宏大)。 */
  castFor(abilityKey: string): void {
    switch (this.tagFor(abilityKey)) {
      case 'stun': this.env(170, 'sawtooth', 0.16, 0.2, -70); this.noise(0.06, 0.14, 1400); break;
      case 'nuke': this.env(620, 'square', 0.16, 0.18, 320); break;
      case 'heal': this.env(480, 'sine', 0.22, 0.16, 260); break;
      case 'aoe': this.env(360, 'triangle', 0.26, 0.17, 120); this.noise(0.12, 0.08, 900); break;
      case 'slow': this.env(440, 'sine', 0.2, 0.16, -180); break;
      case 'ultimate': this.env(300, 'triangle', 0.3, 0.22, 180); setTimeout(() => this.env(450, 'triangle', 0.32, 0.2, 160), 110); break;
      default: this.env(520, 'sine', 0.18, 0.18, 380);
    }
  }

  /** abilityKey → 代表性标签(惰性建表;无 tag 走 default)。 */
  private tagFor(key: string): AbilityTag | undefined {
    if (!this.abilityTag) {
      this.abilityTag = new Map();
      for (const h of HEROES) {
        for (const ab of h.abilities ?? []) {
          const rep = representativeCastTag(ab.tags);
          if (rep) this.abilityTag.set(ab.key, rep);
        }
      }
    }
    return this.abilityTag.get(key);
  }
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
  /** 兵营倒塌:比防御塔更沉重,延迟二段轰鸣。 */
  raxFall(): void {
    this.noise(0.9, 0.45, 420);
    this.env(70, 'square', 0.8, 0.3, -30);
    setTimeout(() => this.env(55, 'sawtooth', 0.7, 0.22, -20), 220);
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
