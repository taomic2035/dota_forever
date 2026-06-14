/**
 * 状态条标签数据:把单位当前生效的 buff/debuff 归类为带文字标签的 chip,供 HUD 与选中信息卡共用(DRY)。
 * 控制态优先按具体状态命名(晕/缚/沉/缴/禁/隐/免),否则按增益▲/减益▼。按到期时间升序,取前 max。
 * 纯数据,无 DOM —— 各处自行渲染(尺寸/布局不同)。
 */
import type { World } from '../sim/world';
import type { Unit } from '../sim/unit';

export interface StatusChip {
  /** 短标签:晕/缚/沉/缴/禁/隐/免/▲/▼ */
  tag: string;
  color: string;
  /** 剩余秒数 */
  remaining: number;
  isBuff: boolean;
  key: string;
}

export function statusChips(world: World, u: Unit, now: number, max = 10): StatusChip[] {
  const active = u.modifiers
    .filter((m) => m.expiresAt !== Infinity && m.expiresAt > now)
    .sort((a, b) => a.expiresAt - b.expiresAt);
  return active.slice(0, max).map((m) => {
    const s = m.def.states;
    let tag: string;
    let color: string;
    let isBuff = false;
    if (s?.stunned) { tag = '晕'; color = '#ff4040'; }
    else if (s?.rooted) { tag = '缚'; color = '#ff7a30'; }
    else if (s?.silenced) { tag = '沉'; color = '#b06bff'; }
    else if (s?.disarmed) { tag = '缴'; color = '#ff7a30'; }
    else if (s?.muted) { tag = '禁'; color = '#b06bff'; }
    else if (s?.invisible) { tag = '隐'; color = '#62c7ff'; }
    else if (s?.magicImmune) { tag = '免'; color = '#ffd54f'; }
    else if (m.def.isBuff) { tag = '▲'; color = '#6fcf5a'; isBuff = true; }
    else { tag = '▼'; color = '#ff9a3d'; }
    return { tag, color, remaining: Math.max(0, m.expiresAt - now), isBuff, key: m.def.key };
  });
}

/** chip 倒计时文案:≥1s 取上整,<1s 保留一位小数。 */
export function statusChipTime(remaining: number): string {
  return remaining >= 1 ? String(Math.ceil(remaining)) : remaining.toFixed(1);
}
