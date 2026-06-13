/**
 * 商店面板:分类页签 + 物品列表 + 合成树 + 储藏取回。F 键开关。
 * 0.4s 节流重绘(金币/库存变化)。
 */
import type { World } from '../sim/world';
import type { Unit } from '../sim/unit';
import { ITEMS, itemDef, type ItemDef, type ItemCategory } from '../data/items';
import { buyItem, takeFromStash, sellItem, shopAt } from '../sim/items';
import { purchaseKeyFor, RECIPE_PREFIX } from '../sim/recipes';

const CATS: Array<{ key: ItemCategory | 'all'; label: string }> = [
  { key: 'consumable', label: '消耗' },
  { key: 'attribute', label: '属性' },
  { key: 'weapon', label: '武器' },
  { key: 'armor', label: '防具' },
  { key: 'arcane', label: '法器' },
  { key: 'combined', label: '合成' },
];

export class ShopPanel {
  root: HTMLElement;
  open = false;
  private cat: ItemCategory | 'all' = 'consumable';
  private lastRender = 0;
  private toast: HTMLElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.style.cssText = [
      'position:fixed;right:10px;top:80px;bottom:120px;width:300px;display:none;flex-direction:column;',
      'background:#10130bf2;border:1px solid #3a4428;border-radius:10px;padding:10px;z-index:40;',
      'color:#e8e2c8;font-size:13px;overflow:hidden;pointer-events:auto;',
    ].join('');
    parent.appendChild(this.root);
    this.toast = document.createElement('div');
    this.toast.style.cssText =
      'position:fixed;bottom:140px;left:50%;transform:translateX(-50%);background:#000c;color:#ffb74d;' +
      'padding:6px 16px;border-radius:6px;font-size:14px;opacity:0;transition:opacity .3s;z-index:60;pointer-events:none;';
    parent.appendChild(this.toast);
  }

  toggle(): void {
    this.open = !this.open;
    this.root.style.display = this.open ? 'flex' : 'none';
    this.lastRender = 0;
  }

  showToast(text: string): void {
    this.toast.textContent = text;
    this.toast.style.opacity = '1';
    setTimeout(() => { this.toast.style.opacity = '0'; }, 1600);
  }

  update(w: World, hero: Unit | undefined): void {
    if (!this.open || !hero) return;
    if (performance.now() - this.lastRender < 400) return;
    this.lastRender = performance.now();
    this.render(w, hero);
  }

  private render(w: World, hero: Unit): void {
    const gold = hero.heroMeta?.gold ?? 0;
    const at = shopAt(w, hero);
    const items = ITEMS.filter(
      (i) => i.category === this.cat && !i.key.startsWith(RECIPE_PREFIX) && i.cost > 0,
    );
    this.root.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <b>商店 ${at === 'secret' ? '· 秘密商店' : at === 'home' ? '· 基地' : '· <span style="color:#ef9a9a">不在商店范围</span>'}</b>
        <span style="color:#ffd54f">⛁ ${gold}</span>
      </div>
      <div id="shop-tabs" style="display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap;"></div>
      <div id="shop-list" style="flex:1;overflow-y:auto;"></div>
      <div id="shop-stash" style="border-top:1px solid #3a4428;padding-top:6px;margin-top:6px;"></div>`;

    const tabs = this.root.querySelector('#shop-tabs')!;
    for (const c of CATS) {
      const b = document.createElement('button');
      b.textContent = c.label;
      b.style.cssText = `padding:3px 10px;border-radius:5px;border:1px solid #3a4428;cursor:pointer;font-size:12px;
        background:${this.cat === c.key ? '#3a4428' : '#1a2012'};color:#e8e2c8;`;
      b.onclick = () => { this.cat = c.key as ItemCategory; this.lastRender = 0; this.render(w, hero); };
      tabs.appendChild(b);
    }

    const list = this.root.querySelector('#shop-list')!;
    for (const def of items) {
      const row = document.createElement('div');
      const afford = gold >= effectiveCost(def);
      row.style.cssText = `display:flex;justify-content:space-between;align-items:center;padding:4px 6px;border-radius:5px;cursor:pointer;
        ${afford ? '' : 'opacity:.45;'}`;
      row.onmouseenter = () => { row.style.background = '#222b18'; };
      row.onmouseleave = () => { row.style.background = ''; };
      row.innerHTML = `<span>${def.secretShop ? '◈ ' : ''}${def.name}</span>
        <span style="color:#ffd54f;font-size:12px">${effectiveCost(def)}</span>`;
      row.title = tooltip(def);
      row.onclick = () => {
        const r = buyItem(w, hero, purchaseKeyFor(def.key));
        if (r === 'ok') this.showToast(`购入 ${def.name}`);
        else if (r === 'ok_backpack') this.showToast(`${def.name} 已放入背包栏`);
        else if (r === 'ok_stash') this.showToast(`${def.name} 已放入储藏处`);
        else if (r === 'no_gold') this.showToast('金币不足');
        else if (r === 'no_shop') this.showToast(def.secretShop ? '需要在秘密商店购买' : '不在商店范围内');
        else this.showToast('物品栏、背包栏与储藏均已满');
        this.lastRender = 0;
      };
      list.appendChild(row);
    }

    // 储藏处
    const stashEl = this.root.querySelector('#shop-stash')!;
    const stashItems = hero.stash.map((s, i) => ({ s, i })).filter((x) => x.s);
    stashEl.innerHTML = `<div style="color:#9a8;font-size:12px;margin-bottom:4px">储藏处${at !== 'home' ? '(回基地取)' : ''}</div>`;
    for (const { s, i } of stashItems) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;padding:2px 6px;font-size:12px;';
      row.innerHTML = `<span>${itemDef(s!.itemKey).name}${s!.charges > 1 ? '×' + s!.charges : ''}</span>`;
      const btn = document.createElement('button');
      btn.textContent = '取回';
      btn.style.cssText = 'font-size:11px;padding:1px 8px;border-radius:4px;border:1px solid #3a4428;background:#1a2012;color:#cfd8a0;cursor:pointer;';
      btn.onclick = () => {
        if (takeFromStash(w, hero, i)) this.showToast('已取回');
        else this.showToast('需在基地且背包有空位');
        this.lastRender = 0;
      };
      row.appendChild(btn);
      stashEl.appendChild(row);
    }
  }

  /** 出售背包物品(右键背包槽时由 HUD 调)。 */
  sellSlot(w: World, hero: Unit, slot: number): void {
    const inst = hero.inventory[slot];
    if (!inst) return;
    if (sellItem(w, hero, slot)) this.showToast(`已出售 ${itemDef(inst.itemKey).name}`);
    else this.showToast('需在商店范围内出售');
  }
}

function effectiveCost(def: ItemDef): number {
  return def.recipe && def.recipe.recipeCost > 0 ? def.recipe.recipeCost : def.cost;
}

function tooltip(def: ItemDef): string {
  let t = `${def.name} — ${def.description}`;
  if (def.recipe) {
    t += `\n配方:${def.recipe.components.map((c) => itemDef(c).name).join(' + ')}`;
    if (def.recipe.recipeCost > 0) t += ` + 卷轴(${def.recipe.recipeCost})`;
    t += `\n总价:${def.cost}`;
  }
  if (def.active) t += `\n主动:${def.active.name}${def.active.manaCost ? `(${def.active.manaCost} 蓝)` : ''} CD ${def.active.cooldown}s`;
  return t;
}
