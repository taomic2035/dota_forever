/**
 * 单位头顶状态条数据:把当前生效的 buff/debuff 归类为色点,供 2D/3D 渲染共用(单一裁决来源,DRY)。
 * 分类:控制(眩晕/缠绕/沉默/缴械)红 → 敌方减益橙 → 增益/友方绿。控制优先,按 key 去重,取前 max。
 */
import type { World } from '../sim/world';
import type { Unit } from '../sim/unit';
import { buildModifierIconTokens } from '../ui/modifierDisplayModel';

export interface StatusPip {
  color: string;
  /** 剩余时长比例 0-1(无固定时长记 1) */
  frac: number;
  prio: number;
  label?: string;
}

export const STATUS_CONTROL_COLOR = '#ff3b3b';
export const STATUS_ENEMY_DEBUFF_COLOR = '#ff9e40';
export const STATUS_BUFF_COLOR = '#6fe06f';

export function unitStatusPips(world: World, u: Unit, now: number, max = 6): StatusPip[] {
  const seen = new Set<string>();
  const list: StatusPip[] = [];
  for (const m of u.modifiers) {
    if (m.expiresAt === Infinity || m.expiresAt <= now) continue;
    if (seen.has(m.key)) continue;
    seen.add(m.key);
    const token = buildModifierIconTokens({ modifiers: [m], now, max: 1 })[0];
    const control = token?.tone === 'disable';
    let color: string;
    let prio: number;
    if (control) {
      color = STATUS_CONTROL_COLOR;
      prio = 0;
    } else if (m.def.isBuff === true) {
      color = STATUS_BUFF_COLOR;
      prio = 2;
    } else {
      const src = world.getUnit(m.sourceId);
      const fromEnemy = src ? src.team !== u.team : false;
      if (fromEnemy) {
        color = STATUS_ENEMY_DEBUFF_COLOR;
        prio = 1;
      } else {
        color = STATUS_BUFF_COLOR;
        prio = 2;
      }
    }
    const dur = m.def.duration;
    const frac = dur && dur > 0 ? Math.max(0, Math.min(1, (m.expiresAt - now) / dur)) : 1;
    list.push({ color, frac, prio, label: token?.label });
  }
  list.sort((a, b) => a.prio - b.prio);
  return list.slice(0, max);
}
