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
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
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
  /** 死亡复活倒计时(秒,向上取整,≥0);存活为 0。 */
  respawnIn: number;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function buildEnemyHeroBar(heroes: EnemyHeroBarInputHero[], now: number): EnemyHeroChip[] {
  return heroes.map((u) => {
    const showBars = u.alive && u.visible;
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
      respawnIn: u.alive ? 0 : Math.max(0, Math.ceil(u.respawnAt - now)),
    };
  });
}
