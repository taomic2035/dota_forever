import type { World } from '../sim/world';
import type { Unit } from '../sim/unit';
import type { ItemInstance } from '../sim/items';
import { heroAttributes } from '../sim/hero';
import { canLearn, canLearnStatBonus, abilityReady, hasScepter } from '../sim/abilities';
import { itemDef } from '../data/items';
import type { UxFeedback } from './uxFeedback';
import { fxStyle } from '../render/fxStyle';

const HOTKEYS = ['Q', 'W', 'E', 'R'];

export class Hud {
  root: HTMLElement;
  private topbar: HTMLElement;
  private bottom: HTMLElement;
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
      'width:min(920px,calc(100vw - 260px));height:172px;box-sizing:border-box;',
      'background:linear-gradient(#182015f6,#070a06fb);border:1px solid #5a4a25;border-bottom:none;',
      'box-shadow:0 -8px 24px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,230,150,.08);',
      'border-radius:8px 8px 0 0;padding:8px 10px;font-size:12px;',
    ].join('');
    this.root.appendChild(this.bottom);

    this.bottom.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest('[data-learn],[data-learnstat]') as HTMLElement | null;
      if (!el) return;
      if (el.hasAttribute('data-learnstat')) this.onLearnStat?.();
      else this.onLearn?.(Number(el.getAttribute('data-learn')));
    });
  }

  update(world: World, hero: Unit | undefined, ux?: UxFeedback): void {
    this.renderTopbar(world, hero);
    if (!hero) {
      this.bottom.innerHTML = '';
      return;
    }

    const attrs = heroAttributes(hero);
    const meta = hero.heroMeta!;
    const dead = !hero.alive;
    const respawnIn = Math.max(0, Math.ceil(meta.respawnAt - world.time));
    const abilityHtml = (hero.heroDef?.abilities ?? []).map((_, i) => this.abilitySlot(world, hero, i, ux)).join('');
    const itemHtml = hero.inventory.map((inst, i) => this.itemSlot(world, inst, i, ux)).join('');

    this.bottom.innerHTML = `
      <div style="display:grid;grid-template-columns:260px 1fr 260px;gap:10px;height:100%;">
        <div style="display:grid;grid-template-columns:74px 1fr;gap:8px;min-width:0;">
          <div style="position:relative;width:74px;height:74px;border-radius:4px;border:2px solid ${hero.heroDef?.color ?? '#888'};background:${dead ? '#252525' : (hero.heroDef?.color ?? '#555') + '33'};display:flex;align-items:center;justify-content:center;font-size:34px;color:${hero.heroDef?.color ?? '#ccc'}">
            ${hero.heroDef?.glyph ?? '?'}
            <span style="position:absolute;left:-5px;bottom:-7px;background:#0b0d09;border:1px solid #caa84a;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;color:#ffd76a;font-weight:800">${hero.level}</span>
            ${meta.skillPoints > 0 ? `<span style="position:absolute;top:-7px;right:-7px;background:#ffd54f;color:#1a1a0a;font-size:11px;font-weight:800;min-width:18px;height:18px;border-radius:9px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px #ffd54f">+${meta.skillPoints}</span>` : ''}
          </div>
          <div style="min-width:0;">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;">
              <b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${hero.name}</b>
              <span style="color:#d9b44a;white-space:nowrap">${meta.kills}/${meta.deaths}/${meta.assists}</span>
            </div>
            ${dead ? `<div style="color:#ef5350;font-size:15px;padding:10px 0">DEAD - ${respawnIn}s</div>` : `${this.meter(hero.hp, hero.calc.maxHp, '#4caf50', '#1f6b2b')}${this.meter(hero.mp, hero.calc.maxMp, '#42a5f5', '#14569a')}`}
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:2px 8px;margin-top:5px;color:#cfc7a5;font-size:11px;">
              <span>STR ${attrs.str.toFixed(0)} AGI ${attrs.agi.toFixed(0)} INT ${attrs.int.toFixed(0)}</span>
              <span>DMG ${Math.round(hero.calc.dmgMin)}-${Math.round(hero.calc.dmgMax)}</span>
              <span>ARM ${hero.calc.armor.toFixed(1)}</span>
              <span>LH/DN ${meta.lastHits}/${meta.denies}</span>
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:end;justify-content:center;gap:5px;min-width:0;">
          ${abilityHtml}
          ${this.statBonusSlot(hero)}
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,64px);grid-template-rows:repeat(2,64px);gap:5px;align-content:end;justify-content:end;">
          ${itemHtml}
        </div>
      </div>`;
  }

  private renderTopbar(world: World, hero: Unit | undefined): void {
    const t = world.time;
    const sign = t < 0 ? '-' : '';
    const mm = Math.floor(Math.abs(t) / 60);
    const ss = Math.floor(Math.abs(t) % 60).toString().padStart(2, '0');
    const gold = hero?.heroMeta?.gold ?? 0;
    let dawnKills = 0;
    let nightKills = 0;
    for (const u of world.units.values()) {
      if (!u.isHero() || !u.heroMeta) continue;
      if (u.team === 0) dawnKills += u.heroMeta.kills;
      else if (u.team === 1) nightKills += u.heroMeta.kills;
    }
    this.topbar.innerHTML =
      `<span style="color:#8fd17a;font-weight:700">${dawnKills}</span>` +
      `<span style="color:#8a9">Dawn</span>` +
      `<span>${world.isNight ? 'NIGHT' : 'DAY'}</span>` +
      `<span style="color:#cfd8a0">${sign}${mm}:${ss}</span>` +
      `<span style="color:#ffd54f">${gold}</span>` +
      `<span style="color:#a89">Night</span>` +
      `<span style="color:#ef9a9a;font-weight:700">${nightKills}</span>`;
  }

  private meter(value: number, max: number, top: string, bottom: string): string {
    const safeMax = Math.max(1, max);
    const frac = Math.max(0, Math.min(1, value / safeMax));
    return `<div style="background:#070807;border:1px solid #1f2418;height:17px;margin:3px 0;position:relative">
      <div style="background:linear-gradient(${top},${bottom});height:100%;width:${frac * 100}%"></div>
      <span style="position:absolute;inset:0;text-align:center;font-size:11px;line-height:17px;text-shadow:0 1px 2px #000">${Math.ceil(value)} / ${Math.round(max)}</span>
    </div>`;
  }

  private abilitySlot(world: World, hero: Unit, i: number, ux?: UxFeedback): string {
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
    const family = fxStyle(def.key || def.name);
    // 阿哈利姆神杖:持杖且该技能有升级时,洋红高亮 + ✦ 徽标
    const aghs = !!(def.scepter || def.scepterPassive);
    const scepterOn = aghs && hasScepter(hero);
    const border = scepterOn ? '#d56bff' : learnable ? '#ffd54f' : lvl > 0 ? (ready || passive ? '#7fae4a' : '#5a6a3a') : '#2c3520';
    const bg = lvl > 0 ? (ready || passive ? '#2a3a18' : '#1d2412') : '#0d100a';
    const flash = ux?.hudFlashFor(`ability-${i}`, world.time);
    const flashShadow = flash?.kind === 'reject' ? 'box-shadow:0 0 0 2px #ff3040 inset,0 0 10px #ff3040;' : '';
    const pips = Array.from({ length: def.maxLevel }, (_, k) =>
      `<span style="width:6px;height:4px;border-radius:1px;background:${k < lvl ? '#ffd54f' : '#3a4428'}"></span>`).join('');
    const aghsDesc = aghs && def.scepter?.desc ? `\n${def.scepter.desc}` : aghs ? '\n神杖:增强升级' : '';
    return `<div title="${def.name}${def.ultimate ? ' (Ultimate)' : ''}: ${def.description}${aghsDesc}"
      style="position:relative;width:66px;height:66px;border:1.5px solid ${border};border-radius:4px;background:${bg};
      display:flex;flex-direction:column;align-items:center;justify-content:center;${flashShadow}${lvl === 0 && !learnable ? 'opacity:.55;' : ''}">
      <span style="position:absolute;top:0;left:0;right:0;height:3px;border-radius:4px 4px 0 0;background:${family.color};box-shadow:0 0 6px ${family.glow}"></span>
      <span style="position:absolute;top:2px;left:4px;font-size:10px;color:#cfd8a0;font-weight:700">${HOTKEYS[i]}</span>
      ${passive ? '<span style="position:absolute;top:2px;right:4px;font-size:8px;color:#9ab">P</span>' : ''}
      ${scepterOn ? '<span style="position:absolute;bottom:2px;left:4px;font-size:10px;color:#d56bff;font-weight:800;text-shadow:0 0 5px #d56bff">✦</span>' : ''}
      <span style="font-size:10px;color:${lvl > 0 ? '#e8e2c8' : '#888'};text-align:center;line-height:1.05;padding:0 4px">${def.name.slice(0, 5)}</span>
      <div style="display:flex;gap:2px;margin-top:5px">${pips}</div>
      ${mana > 0 && lvl > 0 ? `<span style="position:absolute;bottom:2px;right:4px;font-size:9px;color:#5aa2ff">${mana}</span>` : ''}
      ${onCd ? `<span style="position:absolute;inset:0;background:#000a;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff">${cdLeft}</span>` : ''}
      ${learnable ? `<span data-learn="${i}" style="position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);background:#ffd54f;color:#1a1a0a;font-size:12px;font-weight:800;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 0 8px #ffd54f">+</span>` : ''}
    </div>`;
  }

  private statBonusSlot(hero: Unit): string {
    if (!canLearnStatBonus(hero)) return '';
    return `<div data-learnstat="1" title="Attribute bonus"
      style="width:42px;height:66px;border:1.5px solid #ffd54f;border-radius:4px;background:#2a3a18;cursor:pointer;
      display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;color:#ffd54f;box-shadow:0 0 6px #ffd54f66">
      <span style="font-size:18px;font-weight:800;line-height:1">+</span><span>STAT</span>
    </div>`;
  }

  private itemSlot(world: World, inst: ItemInstance | null, i: number, ux?: UxFeedback): string {
    const flash = ux?.hudFlashFor(`item-${i}`, world.time);
    const flashShadow =
      flash?.kind === 'reject' ? 'box-shadow:0 0 0 2px #ff3040 inset,0 0 10px #ff3040;' :
      flash?.kind === 'confirm' ? 'box-shadow:0 0 0 2px #d9b44a inset,0 0 10px #d9b44a;' :
      '';
    if (!inst) {
      return `<div style="position:relative;width:64px;height:64px;border:1px solid ${flash?.kind === 'reject' ? '#ff3040' : '#2c3520'};border-radius:4px;background:#0d100a;${flashShadow}
        font-size:10px;color:#555;display:flex;align-items:center;justify-content:center">
        <span style="position:absolute;top:2px;left:4px;color:#777">${i + 1}</span>
      </div>`;
    }
    const def = itemDef(inst.itemKey);
    const onCd = world.time < inst.cooldownUntil;
    const border = flash?.kind === 'reject' ? '#ff3040' : flash?.kind === 'confirm' ? '#d9b44a' : '#5a6a3a';
    return `<div title="${def.name}: ${def.description}" style="position:relative;width:64px;height:64px;border:1px solid ${border};border-radius:4px;
      background:${onCd ? '#1a1a1a' : '#222b18'};font-size:11px;color:#cfd8a0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;overflow:hidden;${onCd ? 'opacity:.5;' : ''}${flashShadow}">
      <span style="position:absolute;top:2px;left:4px;color:#d9b44a">${i + 1}</span>
      <span style="white-space:nowrap">${def.name.slice(0, 4)}</span>
      ${inst.charges > 0 ? `<span style="font-size:10px;color:#ffd54f">x${inst.charges}</span>` : ''}
    </div>`;
  }
}
