/**
 * 选中信息卡:左键选中"非受控单位"(敌方英雄/小兵/野怪/建筑/友军)时,
 * 在左侧显示其名称/类型/血蓝/核心面板。受控英雄由底部 HUD 展示,这里不重复。
 * 纯展示,读 ux.selectedUnitId;每帧节流(关键数值未变不重绘)。
 */
import type { World } from '../sim/world';
import type { Unit, UnitKind } from '../sim/unit';
import type { UxFeedback } from './uxFeedback';
import { TEAM_COLOR } from '../render/renderer';

const KIND_LABEL: Record<UnitKind, string> = {
  hero: '英雄',
  creep: '小兵',
  neutral: '野怪',
  boss: 'Boss',
  tower: '防御塔',
  building: '建筑',
  ward: '守卫',
  illusion: '幻象',
  courier: '信使',
};

export class InspectPanel {
  root: HTMLElement;
  private sig = '';

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'inspect-panel';
    this.root.style.cssText = [
      'position:absolute;left:12px;top:46%;transform:translateY(-50%);',
      'min-width:188px;max-width:228px;display:none;pointer-events:none;',
      'background:linear-gradient(#1d2316ee,#10130bee);border:1px solid #3a4428;',
      'border-radius:8px;padding:9px 11px;font-size:12px;color:#e8e2c8;',
      'box-shadow:0 4px 14px #0008;font-family:inherit;',
    ].join('');
    parent.appendChild(this.root);
  }

  update(world: World, hero: Unit | undefined, ux: UxFeedback): void {
    const id = ux.selectedUnitId;
    const sel = id ? world.getUnit(id) : undefined;
    // 仅在选中"存活的非受控单位"时显示
    if (!sel || !sel.alive || (hero && sel.id === hero.id)) {
      if (this.root.style.display !== 'none') {
        this.root.style.display = 'none';
        this.sig = '';
      }
      return;
    }
    this.root.style.display = 'block';
    // 节流:同一单位且关键数值未变则跳过 innerHTML 重排
    const next = `${sel.id}|${Math.round(sel.hp)}|${Math.round(sel.mp)}|${sel.level}|${Math.round(sel.calc.armor * 10)}`;
    if (next === this.sig) return;
    this.sig = next;
    this.root.innerHTML = this.markup(hero, sel);
  }

  private markup(hero: Unit | undefined, u: Unit): string {
    const accent = TEAM_COLOR[u.team] ?? '#bdbdbd';
    const rel = hero ? (u.team === hero.team ? '友军' : '敌方') : '';
    const kind = KIND_LABEL[u.kind] ?? '单位';
    const sub = u.kind === 'hero' ? `${rel} ${kind} · Lv.${u.level}` : `${rel} ${kind}`.trim();
    const c = u.calc;
    const hpMax = Math.max(1, c.maxHp);
    const mpMax = c.maxMp;
    const rows = [
      this.stat('攻击', `${Math.round(c.dmgMin)}–${Math.round(c.dmgMax)}`),
      this.stat('护甲', c.armor.toFixed(1)),
      this.stat('魔抗', `${Math.round((c.magicResist ?? 0) * 100)}%`),
      this.stat('移速', String(Math.round(c.moveSpeed))),
      this.stat('攻击距离', String(Math.round(c.attackRange))),
    ].join('');
    return [
      `<div style="font-weight:600;font-size:13px;border-left:3px solid ${accent};padding-left:6px;margin-bottom:2px">${esc(u.name)}</div>`,
      `<div style="color:#9aa07e;font-size:11px;padding-left:9px;margin-bottom:6px">${sub}</div>`,
      this.meter(u.hp, hpMax, '#4caf50', '#1f6b2b', `${Math.round(u.hp)} / ${Math.round(hpMax)}`),
      mpMax > 0 ? this.meter(u.mp, mpMax, '#42a5f5', '#14569a', `${Math.round(u.mp)} / ${Math.round(mpMax)}`) : '',
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px 10px;margin-top:6px">${rows}</div>`,
    ].join('');
  }

  private meter(cur: number, max: number, fg: string, bg: string, label: string): string {
    const pct = Math.max(0, Math.min(100, (cur / max) * 100));
    return [
      `<div style="position:relative;height:14px;background:${bg};border-radius:3px;margin-top:3px;overflow:hidden">`,
      `<div style="position:absolute;inset:0 ${100 - pct}% 0 0;background:${fg}"></div>`,
      `<div style="position:absolute;inset:0;text-align:center;font-size:10px;line-height:14px;color:#fff;text-shadow:0 1px 1px #0009">${label}</div>`,
      `</div>`,
    ].join('');
  }

  private stat(label: string, value: string): string {
    return `<div><span style="color:#9aa07e">${label}</span> <span style="float:right;font-variant-numeric:tabular-nums">${value}</span></div>`;
  }
}

function esc(s: string): string {
  return s.replace(/[&<>]/g, (ch) => (ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : '&gt;'));
}
