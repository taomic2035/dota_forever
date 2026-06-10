/**
 * HUD v0:顶栏(时间/金币)+ 底部英雄面板(等级/血蓝/属性/战绩)。
 * 纯 DOM overlay,读 sim 不写 sim。
 */
import type { World } from '../sim/world';
import type { Unit } from '../sim/unit';
import { heroAttributes } from '../sim/hero';
import { itemDef } from '../data/items';

export class Hud {
  root: HTMLElement;
  private topbar: HTMLElement;
  private bottom: HTMLElement;

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
      'position:absolute;bottom:0;left:50%;transform:translateX(-50%);',
      'background:linear-gradient(#1d2316f2,#0c0f08f8);border:1px solid #3a4428;border-bottom:none;',
      'border-radius:10px 10px 0 0;padding:8px 14px;min-width:520px;font-size:13px;',
    ].join('');
    this.root.appendChild(this.bottom);
  }

  update(world: World, hero: Unit | undefined): void {
    const t = world.time;
    const sign = t < 0 ? '-' : '';
    const mm = Math.floor(Math.abs(t) / 60);
    const ss = Math.floor(Math.abs(t) % 60).toString().padStart(2, '0');
    const gold = hero?.heroMeta?.gold ?? 0;
    this.topbar.innerHTML =
      `<span>${world.isNight ? '🌙' : '☀️'}</span>` +
      `<span style="color:#cfd8a0">⏱ ${sign}${mm}:${ss}</span>` +
      `<span style="color:#ffd54f">⛁ ${gold}</span>`;

    if (!hero) { this.bottom.innerHTML = ''; return; }
    const a = heroAttributes(hero);
    const hpFrac = Math.max(0, hero.hp / hero.calc.maxHp);
    const mpFrac = hero.calc.maxMp > 0 ? hero.mp / hero.calc.maxMp : 0;
    const m = hero.heroMeta!;
    const dead = !hero.alive;
    const respawnIn = Math.max(0, Math.ceil(m.respawnAt - world.time));
    this.bottom.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;">
        <div style="width:52px;height:52px;border-radius:6px;border:2px solid ${hero.heroDef?.color ?? '#888'};background:${dead ? '#333' : (hero.heroDef?.color ?? '#555') + '33'};display:flex;align-items:center;justify-content:center;font-size:24px;color:${hero.heroDef?.color ?? '#ccc'}">${hero.heroDef?.glyph ?? '?'}</div>
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
        <div style="display:grid;grid-template-columns:repeat(3,38px);gap:3px;">
          ${hero.inventory.map((inst, i) => this.itemSlot(world, inst, i)).join('')}
        </div>
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
