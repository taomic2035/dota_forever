/**
 * 血条刻度线:每 250 HP 一细线、每 1000 HP 一粗线(经典 DotA)。
 * 凭条形几何即可估算绝对剩余血量与击杀线,而不必读数字。2D 与 3D 渲染器共用。
 */
export interface HealthTick {
  /** 沿血条的归一化位置 0..1 */
  at: number;
  /** true = 千位粗线,false = 250 细线 */
  major: boolean;
}

/**
 * 返回血条内部刻度位置。高血量单位(> minorBelowMaxHp)只保留千位粗线,避免细线糊成一片。
 */
export function healthBarTicks(maxHp: number, minorBelowMaxHp = 4000): HealthTick[] {
  const ticks: HealthTick[] = [];
  if (!(maxHp > 250)) return ticks;
  for (let hp = 250; hp < maxHp; hp += 250) {
    const major = hp % 1000 === 0;
    if (!major && maxHp > minorBelowMaxHp) continue;
    ticks.push({ at: hp / maxHp, major });
  }
  return ticks;
}
