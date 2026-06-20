/**
 * 敌方英雄顶栏的纯 UX 模型。
 *
 * 迷雾原则:等级与复活倒计时是公开信息(常显),但**血/蓝只在玩家视野内显示**
 * (showBars),避免透雾偷看敌方实时血量。视野判断(isVisibleTo)由调用方(HUD)
 * 预先算好填入 `visible`,本模型保持纯函数、可测。
 */
export interface EnemyHeroBarInputHero {
  id: number;
  name: string;
  glyph: string;
  color: string;
  level: number;
  alive: boolean;
  /** 当前是否在玩家视野(由 HUD 用 isVisibleTo 预先判定)。 */
  visible: boolean;
  /** 是否为己方英雄。己方资源可安全广播,敌方资源必须受 visible 门控。 */
  ally?: boolean;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  /** 友方公开信息:当前可用 TP 数量。敌方广播不会使用该字段。 */
  tpScrolls?: number;
  /** 友方公开信息:大招就绪状态。敌方广播不会使用该字段。 */
  ultimate?: {
    name: string;
    learned: boolean;
    ready: boolean;
    cooldownRemaining?: number;
  };
  /** 友方公开沟通信息:买活金币/冷却。敌方广播不会使用该字段。 */
  buyback?: {
    gold: number;
    cost: number;
    cooldownRemaining: number;
  };
  /** 死亡时的复活时间(world.time 同尺度);存活时忽略。 */
  respawnAt: number;
}

export interface EnemyHeroChip {
  id: number;
  name: string;
  glyph: string;
  color: string;
  level: number;
  alive: boolean;
  /** 是否显示血蓝条(存活 且 在视野内)。 */
  showBars: boolean;
  hpFrac: number;
  mpFrac: number;
  /** 当前血/蓝整数值(showBars 时供 Alt 显精确数值;DotA 击杀计算)。 */
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  /** 死亡复活倒计时(秒,向上取整,≥0);存活为 0。 */
  respawnIn: number;
  /** Alt+点击顶栏 hero chip 的本地战术广播文案。 */
  statusBroadcast: string;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function buildEnemyHeroBar(heroes: EnemyHeroBarInputHero[], now: number): EnemyHeroChip[] {
  return heroes.map((u) => {
    const showBars = u.alive && u.visible;
    const respawnIn = u.alive ? 0 : Math.max(0, Math.ceil(u.respawnAt - now));
    const hp = Math.max(0, Math.round(u.hp));
    const maxHp = Math.max(0, Math.round(u.maxHp));
    const mp = Math.max(0, Math.round(u.mp));
    const maxMp = Math.max(0, Math.round(u.maxMp));
    return {
      id: u.id,
      name: u.name,
      glyph: u.glyph,
      color: u.color,
      level: u.level,
      alive: u.alive,
      showBars,
      hpFrac: clamp01(u.hp / Math.max(1, u.maxHp)),
      mpFrac: clamp01(u.mp / Math.max(1, u.maxMp)),
      hp,
      maxHp,
      mp,
      maxMp,
      respawnIn,
      statusBroadcast: heroStatusBroadcast({
        name: u.name,
        ally: u.ally === true,
        alive: u.alive,
        visible: u.visible,
        hp,
        maxHp,
        mp,
        maxMp,
        respawnIn,
        tpScrolls: u.tpScrolls,
        ultimate: u.ultimate,
        buyback: u.buyback,
      }),
    };
  });
}

interface HeroStatusBroadcastInput {
  name: string;
  ally: boolean;
  alive: boolean;
  visible: boolean;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  respawnIn: number;
  tpScrolls?: number;
  ultimate?: {
    name: string;
    learned: boolean;
    ready: boolean;
    cooldownRemaining?: number;
  };
  buyback?: {
    gold: number;
    cost: number;
    cooldownRemaining: number;
  };
}

function heroStatusBroadcast(input: HeroStatusBroadcastInput): string {
  if (!input.alive) {
    return `${input.name}: 已死亡 · 复活 ${input.respawnIn}s${input.ally ? buybackSuffix(input.buyback) : ''}`;
  }
  const resources = `${resourcePart('生命', input.hp, input.maxHp)} · ${resourcePart('法力', input.mp, input.maxMp)}`;
  if (input.ally) return `${input.name}: ${[resources, tpPart(input.tpScrolls), ultimatePart(input.ultimate), buybackPart(input.buyback)].filter(Boolean).join(' · ')}`;
  if (input.visible) return `${input.name}: 已露面 · ${resources}`;
  return `${input.name}: missing / 迷雾中`;
}

function resourcePart(label: string, value: number, max: number): string {
  const safeMax = Math.max(1, Math.round(max));
  const safeValue = Math.max(0, Math.round(value));
  const pct = Math.max(0, Math.min(100, Math.round((safeValue / safeMax) * 100)));
  return `${label} ${safeValue}/${safeMax} (${pct}%)`;
}

function tpPart(tpScrolls: number | undefined): string {
  if (tpScrolls === undefined) return '';
  const count = Math.max(0, Math.floor(tpScrolls));
  return count > 0 ? `TP x${count}` : 'TP none';
}

function ultimatePart(ultimate: HeroStatusBroadcastInput['ultimate']): string {
  if (!ultimate) return '';
  if (!ultimate.learned) return `大招 ${ultimate.name} 未学习`;
  if (ultimate.ready) return `大招 ${ultimate.name} ready`;
  const seconds = Math.max(0, Math.ceil(ultimate.cooldownRemaining ?? 0));
  return seconds > 0 ? `大招 ${ultimate.name} ${seconds}s` : `大招 ${ultimate.name} not ready`;
}

function buybackPart(buyback: HeroStatusBroadcastInput['buyback']): string {
  if (!buyback) return '';
  const cooldown = Math.max(0, Math.ceil(buyback.cooldownRemaining));
  if (cooldown > 0) return `买活 ${cooldown}s`;
  const missingGold = Math.max(0, Math.ceil(buyback.cost - buyback.gold));
  if (missingGold > 0) return `买活差 ${missingGold}金`;
  return '买活 ready';
}

function buybackSuffix(buyback: HeroStatusBroadcastInput['buyback']): string {
  const part = buybackPart(buyback);
  return part ? ` · ${part}` : '';
}
