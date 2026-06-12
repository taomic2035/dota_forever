/**
 * HUD v0:顶栏(时间/金币)+ 底部英雄面板(等级/血蓝/属性/战绩)。
 * 纯 DOM overlay,读 sim 不写 sim。
 */
import type { World } from '../sim/world';
import type { Unit } from '../sim/unit';
import { heroAttributes } from '../sim/hero';
import { canLearn, canLearnStatBonus, abilityReady } from '../sim/abilities';
import { itemDef } from '../data/items';

const HOTKEYS = ['Q', 'W', 'E', 'R'];

export class Hud {
  root: HTMLElement;
  private topbar: HTMLElement;
  private bottom: HTMLElement;
  /** 由 main 注入:加点技能 / 加点属性 */
  onLearn?: (index: number) => void;
  onLearnStat?: () => void;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.style.cssText = 'position:fixed;inset:0;pointer-events:none;font-family:inherit;color:#e8e2c8;';
    parent.appendChild(this.root);

    this.topbar = document.createElement('div');
    this.topbar.style.cssText = [
      'position:absolute;top:0;left:50%;transform:translateX(-50%);',
      'background:linear-gradient(#1d2316ee,#10130bee);border:1px solid #3a4428;border-top:none;',
      'border-radius:0 0 8px 8px;padding:4px 18px;font-size:14px;display:flex;gap:18px;align-items:center;',
    ].join('');
    this.root.appendChild(this.topbar);

    this.bottom = document.createElement('div');
    this.bottom.style.cssText = [
      'position:absolute;bottom:0;left:50%;transform:translateX(-50%);pointer-events:auto;',
      'background:linear-gradient(#1d2316f2,#0c0f08f8);border:1px solid #3a4428;border-bottom:none;',
      'border-radius:10px 10px 0 0;padding:8px 14px;min-width:520px;font-size:13px;',
    ].join('');
    this.root.appendChild(this.bottom);

    // 加点按钮事件委托(innerHTML 每帧重建,不能逐元素绑定)
    this.bottom.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest('[data-learn],[data-learnstat]') as HTMLElement | null;
      if (!el) return;
      if (el.hasAttribute('data-learnstat')) this.onLearnStat?.();
      else this.onLearn?.(Number(el.getAttribute('data-learn')));
    });
  }

  update(world: World, hero: Unit | undefined): void {
    const t = world.time;
    const sign = t < 0 ? '-' : '';
    const mm = Math.floor(Math.abs(t) / 60);
    const ss = Math.floor(Math.abs(t) % 60).toString().padStart(2, '0');
    const gold = hero?.heroMeta?.gold ?? 0;
    // 团队击杀比分(对战态势)
    let dawnK = 0, nightK = 0;
    for (const u of world.units.values()) {
      if (!u.isHero() || !u.heroMeta) continue;
      if (u.team === 0) dawnK += u.heroMeta.kills;
      else if (u.team === 1) nightK += u.heroMeta.kills;
    }
    this.topbar.innerHTML =
      `<span style="color:#8fd17a;font-weight:700">${dawnK}</span>` +
      `<span style="color:#8a9">晨曦</span>` +
      `<span>${world.isNight ? '🌙' : '☀️'}</span>` +
      `<span style="color:#cfd8a0">⏱ ${sign}${mm}:${ss}</span>` +
      `<span style="color:#ffd54f">⛁ ${gold}</span>` +
      `<span style="color:#a89">永夜</span>` +
      `<span style="color:#ef9a9a;font-weight:700">${nightK}</span>`;

    if (!hero) { this.bottom.innerHTML = ''; return; }
    const a = heroAttributes(hero);
    const hpFrac = Math.max(0, hero.hp / hero.calc.maxHp);
    const mpFrac = hero.calc.maxMp > 0 ? hero.mp / hero.calc.maxMp : 0;
    const m = hero.heroMeta!;
    const dead = !hero.alive;
    const respawnIn = Math.max(0, Math.ceil(m.respawnAt - world.time));
    this.bottom.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;">
        <div style="position:relative;width:52px;height:52px;border-radius:6px;border:2px solid ${hero.heroDef?.color ?? '#888'};background:${dead ? '#333' : (hero.heroDef?.color ?? '#555') + '33'};display:flex;align-items:center;justify-content:center;font-size:24px;color:${hero.heroDef?.color ?? '#ccc'}">${hero.heroDef?.glyph ?? '?'}${m.skillPoints > 0 ? `<span style="position:absolute;top:-6px;right:-6px;background:#ffd54f;color:#1a1a0a;font-size:11px;font-weight:800;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 6px #ffd54f">+${m.skillPoints}</span>` : ''}</div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <b>${hero.name}<span style="color:#9a8;font-weight:400;font-size:11px"> · ${hero.heroDef?.title ?? ''}</span></b>
            <span style="color:#d9b44a">Lv ${hero.level}</span>
          </div>
          ${dead ? `<div style="color:#ef5350;font-size:15px;padding:6px 0">阵亡 — ${respawnIn}s 后复活</div>` : `
          <div style="background:#111;border-radius:3px;height:13px;margin:3px 0;position:relative">
            <div style="background:linear-gradient(#66bb6a,#338a3e);height:100%;border-radius:3px;width:${hpFrac * 100}%"></div>
            <span style="position:absolute;inset:0;text-align:center;font-size:10px;line-height:13px;text-shadow:0 1px 2px #000">${Math.ceil(hero.hp)} / ${Math.round(hero.calc.maxHp)}</span>
          </div>
          <div style="background:#111;border-radius:3px;height:11px;position:relative">
            <div style="background:linear-gradient(#42a5f5,#1565c0);height:100%;border-radius:3px;width:${mpFrac * 100}%"></div>
            <span style="position:absolute;inset:0;text-align:center;font-size:9px;line-height:11px;text-shadow:0 1px 2px #000">${Math.ceil(hero.mp)} / ${Math.round(hero.calc.maxMp)}</span>
          </div>`}
        </div>
        <div style="font-size:11px;line-height:1.5;color:#cdc">
          <div>力 ${a.str.toFixed(0)} · 敏 ${a.agi.toFixed(0)} · 智 ${a.int.toFixed(0)}</div>
          <div>攻 ${Math.round(hero.calc.dmgMin)}-${Math.round(hero.calc.dmgMax)} · 甲 ${hero.calc.armor.toFixed(1)}</div>
          <div>杀 ${m.kills} / 死 ${m.deaths} / 助 ${m.assists} · 补 ${m.lastHits}/${m.denies}</div>
        </div>
        <div style="display:flex;gap:3px;align-items:flex-end;">
          ${(hero.heroDef?.abilities ?? []).map((_, i) => this.abilitySlot(world, hero, i)).join('')}
          ${this.statBonusSlot(hero)}
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,38px);gap:3px;">
          ${hero.inventory.map((inst, i) => this.itemSlot(world, inst, i)).join('')}
        </div>
      </div>`;
  }

  /** 技能槽:等级点 / 冷却 / 蓝耗 / 热键 / 可学习时显示加点 +。 */
  private abilitySlot(world: World, hero: Unit, i: number): string {
    const def = hero.heroDef?.abilities[i];
    const inst = hero.abilities[i];
    if (!def || !inst) return '';
    const lvl = inst.level;
    const onCd = world.time < inst.cooldownUntil;
    const cdLeft = Math.ceil(inst.cooldownUntil - world.time);
    const manaIdx = Math.max(0, lvl - 1);
    const mana = def.manaCost?.[manaIdx] ?? 0;
    const passive = def.targetMode === 'passive';
    const learnable = canLearn(hero, i);
    const ready = abilityReady(world, hero, i);
    const border = learnable ? '#ffd54f' : lvl > 0 ? (ready || passive ? '#7fae4a' : '#5a6a3a') : '#2c3520';
    const bg = lvl > 0 ? (ready || passive ? '#2a3a18' : '#1d2412') : '#0d100a';
    const pips = Array.from({ length: def.maxLevel }, (_, k) =>
      `<span style="width:5px;height:4px;border-radius:1px;background:${k < lvl ? '#ffd54f' : '#3a4428'}"></span>`).join('');
    return `<div title="${def.name}${def.ultimate ? '(大招)' : ''}:${def.description}"
      style="position:relative;width:46px;height:50px;border:1.5px solid ${border};border-radius:5px;background:${bg};
      display:flex;flex-direction:column;align-items:center;justify-content:center;${lvl === 0 && !learnable ? 'opacity:.55;' : ''}">
      <span style="position:absolute;top:1px;left:3px;font-size:9px;color:#cfd8a0;font-weight:700">${HOTKEYS[i]}</span>
      ${passive ? '<span style="position:absolute;top:1px;right:3px;font-size:8px;color:#9ab">被</span>' : ''}
      <span style="font-size:10px;color:${lvl > 0 ? '#e8e2c8' : '#888'};text-align:center;line-height:1.05;padding:0 2px">${def.name.slice(0, 4)}</span>
      <div style="display:flex;gap:2px;margin-top:3px">${pips}</div>
      ${mana > 0 && lvl > 0 ? `<span style="position:absolute;bottom:1px;right:3px;font-size:8px;color:#5aa2ff">${mana}</span>` : ''}
      ${onCd ? `<span style="position:absolute;inset:0;background:#000a;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff">${cdLeft}</span>` : ''}
      ${learnable ? `<span data-learn="${i}" style="position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);background:#ffd54f;color:#1a1a0a;font-size:11px;font-weight:800;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 0 6px #ffd54f">+</span>` : ''}
    </div>`;
  }

  /** 属性加点槽(技能点剩余且未满时可点)。 */
  private statBonusSlot(hero: Unit): string {
    if (!canLearnStatBonus(hero)) return '';
    return `<div data-learnstat="1" title="属性加点(力/敏/智 各 +2)"
      style="width:30px;height:50px;border:1.5px solid #ffd54f;border-radius:5px;background:#2a3a18;cursor:pointer;
      display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:9px;color:#ffd54f;box-shadow:0 0 6px #ffd54f66">
      <span style="font-size:16px;font-weight:800;line-height:1">+</span><span>属性</span>
    </div>`;
  }

  private itemSlot(world: World, inst: import('../sim/items').ItemInstance | null, i: number): string {
    if (!inst) {
      return `<div style="width:38px;height:30px;border:1px solid #2c3520;border-radius:4px;background:#0d100a;
        font-size:9px;color:#444;display:flex;align-items:center;justify-content:center">${i + 1}</div>`;
    }
    const def = itemDef(inst.itemKey);
    const onCd = world.time < inst.cooldownUntil;
    return `<div title="${def.name}:${def.description}" style="width:38px;height:30px;border:1px solid #5a6a3a;border-radius:4px;
      background:${onCd ? '#1a1a1a' : '#222b18'};font-size:10px;color:#cfd8a0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;overflow:hidden;${onCd ? 'opacity:.5;' : ''}">
      <span style="white-space:nowrap">${def.name.slice(0, 3)}</span>
      ${inst.charges > 0 ? `<span style="font-size:9px;color:#ffd54f">×${inst.charges}</span>` : ''}
    </div>`;
  }
}
