/**
 * 商店面板:分类页签 + 物品列表 + 合成树 + 储藏取回。F 键开关。
 * 0.4s 节流重绘(金币/库存变化)。
 */
import type { World } from '../sim/world';
import type { Unit } from '../sim/unit';
import { ITEMS, itemDef, type ItemDef, type ItemCategory } from '../data/items';
import { buyItem, takeFromStash, sellItem, shopAt, type BuyResult } from '../sim/items';
import { purchaseKeyFor, RECIPE_PREFIX } from '../sim/recipes';
import { buildShopAccessModel, type ShopAccessModel } from './shopAccessModel';
import { buildShopDestinationModel, type ShopDestinationModel } from './shopDestinationModel';
import {
  buildShopSearchHighlightModel,
  buildShopVisibleItems,
  orderShopVisibleItemsByAvailability,
  type ShopSearchHighlightModel,
} from './shopListModel';
import { buildShopOwnershipModel, type ShopOwnershipModel } from './shopOwnershipModel';
import {
  buildShopQuickActionModel,
  buildShopRecipeBatchActionModel,
  buildShopRecipeNextActionModel,
  type ShopQuickActionModel,
  type ShopRecipeBatchActionModel,
  type ShopRecipeNextActionModel,
  type ShopRecipeNextComponent,
} from './shopQuickActionModel';
import { buildShopRecipeProgressModel, type ShopRecipeProgressModel } from './shopRecipeModel';
import { buildShopStashActionModel, type ShopStashActionModel } from './shopStashActionModel';
import {
  buildQuickbuyModel,
  buildQuickbuyQueueModel,
  quickbuyRemainingCost,
  type QuickbuyModel,
  type QuickbuyQueueEntryInput,
} from './quickbuyModel';
import { buildShopReminderModel, type ShopReminderModel } from './shopReminderModel';
import { buildShopRelatedItemsModel, type ShopRelatedItemsModel, type ShopRelatedItemNode } from './shopRelatedItemsModel';
import { buildCourierHudModel, type CourierHudModel } from './courierHudModel';
import { availabilityStatusSuffix } from './availabilityModel';
import {
  buildShopPurchaseTraceModel,
  type ShopPurchaseSource,
  type ShopPurchaseTraceEvent,
  type ShopPurchaseTraceModel,
} from './shopPurchaseTraceModel';

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
  private query = '';
  private lastRender = 0;
  private toast: HTMLElement;
  /** Quickbuy 队列目标 key。Shift 替换首目标;Ctrl+Shift 追加。 */
  private quickbuyQueue: string[] = [];
  /** 当前用于详情/上下游图的商店物品 key(hover/最近交互更新,不改变购买语义)。 */
  private selectedItemKey: string | null = null;
  /** 最近购买落点历史:帮助玩家追溯刚买的物品去了 Hero / Backpack / Stash / Blocked。 */
  private purchaseTraceEvents: ShopPurchaseTraceEvent[] = [];
  private purchaseTraceSequence = 0;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.style.cssText = [
      // bottom:420 让商店下沿抬到右下角小地图(bottom:180 + SIZE 232 = 412)之上,杜绝遮挡(UI 审计 P1-A)
      'position:fixed;right:10px;top:80px;bottom:420px;width:300px;display:none;flex-direction:column;',
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
    const access = buildShopAccessModel(at);
    let items = buildShopVisibleItems(ITEMS.filter((i) => !i.neutral), {
      category: this.cat,
      query: this.query,
      recipePrefix: RECIPE_PREFIX,
    });
    const destinations = new Map<string, ShopDestinationModel>();
    for (const def of items) destinations.set(def.key, buildDestinationModel(def, hero, gold, at));
    items = orderShopVisibleItemsByAvailability(items, destinations);
    const searchHighlights = new Map(items.map((def) => [
      def.key,
      buildShopSearchHighlightModel(def, {
        category: this.cat,
        query: this.query,
        recipePrefix: RECIPE_PREFIX,
      }, destinations.get(def.key)),
    ]));
    const quickAction = buildShopQuickActionModel({ visibleItems: items, destinations });
    if (!this.selectedItemKey || !items.some((item) => item.key === this.selectedItemKey)) {
      this.selectedItemKey = items[0]?.key ?? null;
    }
    const recipeProgress = new Map<string, ShopRecipeProgressModel>();
    const nextComponents = new Map<string, ShopRecipeNextComponent>();
    const missingComponents = new Map<string, ShopRecipeNextComponent[]>();
    const componentDestinations = new Map<string, ShopDestinationModel>();
    for (const def of items) {
      const progress = buildShopRecipeProgressModel({
        recipe: def.recipe,
        inventory: hero.inventory,
        backpack: hero.backpack,
        stash: hero.stash,
        tpSlot: hero.tpSlot,
      });
      recipeProgress.set(def.key, progress);
      const missingList = progress.missing.map((component) => {
        const item = itemDef(component.key);
        return Array.from({ length: component.missing }, () => ({ key: item.key, name: item.name }));
      }).flat();
      if (missingList.length > 0) {
        missingComponents.set(def.key, missingList);
        for (const component of missingList) {
          if (!componentDestinations.has(component.key)) {
            componentDestinations.set(component.key, buildDestinationModel(itemDef(component.key), hero, gold, at));
          }
        }
      }
      const missing = progress.missing[0];
      if (!missing) continue;
      const component = itemDef(missing.key);
      nextComponents.set(def.key, { key: component.key, name: component.name });
    }
    const recipeNextAction = buildShopRecipeNextActionModel({
      visibleItems: items,
      nextComponents,
      destinations: componentDestinations,
    });
    const recipeBatchAction = buildShopRecipeBatchActionModel({
      visibleItems: items,
      missingComponents,
      destinations: componentDestinations,
    });
    const qb = this.quickbuyState(hero);
    const stashItems = hero.stash.map((s, i) => ({ s, i })).filter((x) => x.s);
    const stashAction = buildShopStashActionModel({
      stashItemCount: stashItems.length,
      atHomeShop: at === 'home',
      inventoryFreeSlots: freeCount(hero.inventory),
    });
    const reminders = buildShopReminderModel({
      access,
      quickbuy: qb.model,
      stashAction,
      courier: buildShopCourierModel(w, hero),
      recipeBatchAction,
      recipeNextAction,
      quickAction,
    });
    const purchaseTrace = buildShopPurchaseTraceModel({ events: this.purchaseTraceEvents });
    const related = buildShopRelatedItemsModel({
      selectedKey: this.selectedItemKey,
      catalog: ITEMS.filter((item) => !item.neutral).map((item) => ({
        key: item.key,
        name: item.name,
        cost: item.cost,
        secretShop: item.secretShop,
        sideShop: item.sideShop,
        recipe: item.recipe,
      })),
      inventory: hero.inventory,
      backpack: hero.backpack,
      stash: hero.stash,
      tpSlot: hero.tpSlot,
      shop: at,
    });
    this.root.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
        ${shopAccessBadge(access)}
        <span style="color:#ffd54f;font-weight:800;flex:none">⛁ ${gold}</span>
      </div>
      ${quickbuyBadge(qb.model)}
      ${shopReminderBadge(reminders)}
      ${purchaseTracePanel(purchaseTrace)}
      <input id="shop-search" value="${escapeAttr(this.query)}" placeholder="Search items" spellcheck="false"
        style="width:100%;box-sizing:border-box;margin-bottom:6px;border:1px solid #3a4428;border-radius:5px;background:#0b0e08;color:#e8e2c8;padding:5px 7px;font-size:12px;outline:none;" />
      ${shopSearchSummary(this.query, items.length)}
      ${quickActionBadge(quickAction)}
      ${recipeNextActionBadge(recipeNextAction)}
      ${recipeBatchActionBadge(recipeBatchAction)}
      ${relatedItemsPanel(related)}
      <div id="shop-tabs" style="display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap;"></div>
      <div id="shop-list" style="flex:1;overflow-y:auto;"></div>
      <div id="shop-stash" style="border-top:1px solid #3a4428;padding-top:6px;margin-top:6px;"></div>`;

    const search = this.root.querySelector('#shop-search') as HTMLInputElement;
    search.oninput = () => {
      this.query = search.value;
      this.lastRender = 0;
      this.render(w, hero);
      const next = this.root.querySelector('#shop-search') as HTMLInputElement | null;
      next?.focus();
      next?.setSelectionRange(next.value.length, next.value.length);
    };
    search.onkeydown = (event) => {
      if (event.key !== 'Enter' || event.repeat) return;
      if (event.ctrlKey) {
        this.buyMany(w, hero, recipeBatchAction.itemKeys);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const itemKey = event.shiftKey ? recipeNextAction.itemKey : quickAction.itemKey;
      if (!itemKey) return;
      this.buy(w, hero, itemDef(itemKey));
      event.preventDefault();
      event.stopPropagation();
    };

    const qbEl = this.root.querySelector('#shop-quickbuy') as HTMLElement | null;
    if (qbEl) {
      qbEl.onmousedown = (event) => {
        event.preventDefault();
        if (event.button === 2) { this.quickbuyQueue = []; this.showToast('已取消快速购买'); this.lastRender = 0; return; } // 右键取消
        if (qb.model.ready) this.completeQuickbuy(w, hero, qb.buyKeys);
        else this.showToast(`还需 ${qb.model.deficit} 金`);
      };
      qbEl.oncontextmenu = (e) => e.preventDefault();
    }

    const tabs = this.root.querySelector('#shop-tabs')!;
    for (const c of CATS) {
      const b = document.createElement('button');
      b.textContent = c.label;
      b.style.cssText = `padding:3px 10px;border-radius:5px;border:1px solid #3a4428;cursor:pointer;font-size:12px;
        background:${this.cat === c.key ? '#3a4428' : '#1a2012'};color:#e8e2c8;`;
      b.onmousedown = () => { this.cat = c.key as ItemCategory; this.lastRender = 0; this.render(w, hero); };
      tabs.appendChild(b);
    }

    const list = this.root.querySelector('#shop-list')!;
    if (items.length === 0) {
      list.innerHTML = '<div style="padding:12px 6px;color:#9a9277;font-size:12px;text-align:center;">No matching items</div>';
    }
    for (const def of items) {
      const row = document.createElement('div');
      const destination = destinations.get(def.key)!;
      const ownership = buildShopOwnershipModel({
        itemKey: def.key,
        inventory: hero.inventory,
        backpack: hero.backpack,
        stash: hero.stash,
        tpSlot: hero.tpSlot,
      });
      const progress = recipeProgress.get(def.key)!;
      const afford = destination.canBuy;
      row.style.cssText = `display:flex;gap:8px;align-items:center;padding:5px 6px;border-radius:5px;cursor:pointer;
        ${afford ? '' : 'opacity:.45;'}`;
      row.innerHTML = `<span style="flex:none">${iconSvg(def.category)}</span>
        <span style="flex:1;min-width:0">
          <span style="display:flex;justify-content:space-between;gap:6px">
            <b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${def.secretShop ? '◈ ' : ''}${def.name}</b>
            <span style="color:#ffd54f;font-size:12px;flex:none">${effectiveCost(def)}</span>
          </span>
          <span style="display:block;color:#9a9277;font-size:11px;line-height:1.3;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${def.description ?? ''}</span>
          ${shopSearchBadge(searchHighlights.get(def.key))}
          ${destinationBadge(destination)}
          ${ownershipBadges(ownership)}
          ${recipeProgressBadge(progress)}
          ${recipeNextComponentBadge(nextComponents.get(def.key))}
        </span>`;
      row.title = tooltip(def);
      // mousedown 而非 onclick:买入后 lastRender=0 强制重建,快速连买时 click 可能跨重建丢失;按下即触发更稳(与 HUD 一致)
      row.onmousedown = (event) => {
        this.selectedItemKey = def.key;
        // Shift 点击 → 设为 quickbuy 目标;Ctrl+Shift → 追加进队列(不立即购买)
        if (event.shiftKey) {
          this.setQuickbuyTarget(def.key, event.ctrlKey || event.metaKey);
          this.showToast(event.ctrlKey || event.metaKey ? `已追加:${def.name}` : `快速购买:${def.name}`);
          this.lastRender = 0;
          return;
        }
        const r = buyItem(w, hero, purchaseKeyFor(def.key));
        this.recordPurchase(def.key, r, 'direct');
        if (r === 'ok') this.showToast(`购入 ${def.name}`);
        else if (r === 'ok_backpack') this.showToast(`${def.name} 已放入背包栏`);
        else if (r === 'ok_stash') this.showToast(`${def.name} 已放入储藏处`);
        else if (r === 'no_gold') this.showToast('金币不足');
        else if (r === 'no_shop') this.showToast(def.secretShop ? '需要在秘密商店购买' : at === 'side' ? '需要在基地商店购买' : '不在商店范围内');
        else this.showToast('物品栏、背包栏与储藏均已满');
        this.lastRender = 0;
      };
      row.onmouseenter = () => {
        row.style.background = '#222b18';
        if (this.selectedItemKey !== def.key) {
          this.selectedItemKey = def.key;
          this.lastRender = 0;
        }
      };
      row.onmouseleave = () => { row.style.background = ''; };
      list.appendChild(row);
    }

    // 储藏处
    const stashEl = this.root.querySelector('#shop-stash')!;
    stashEl.innerHTML = `<div style="color:#9a8;font-size:12px;margin-bottom:4px">储藏处${at !== 'home' ? '(回基地取)' : ''}</div>`;
    if (stashAction.visible) {
      const action = document.createElement('button');
      action.textContent = stashAction.label;
      action.title = stashAction.detail;
      action.disabled = !stashAction.enabled;
      action.style.cssText = stashActionButtonStyle(stashAction);
      action.onmousedown = (event) => {
        event.preventDefault();
        this.takeAllStash(w, hero);
      };
      stashEl.appendChild(action);
    }
    for (const { s, i } of stashItems) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;padding:2px 6px;font-size:12px;';
      row.innerHTML = `<span>${itemDef(s!.itemKey).name}${s!.charges > 1 ? '×' + s!.charges : ''}</span>`;
      const btn = document.createElement('button');
      btn.textContent = '取回';
      btn.style.cssText = 'font-size:11px;padding:1px 8px;border-radius:4px;border:1px solid #3a4428;background:#1a2012;color:#cfd8a0;cursor:pointer;';
      btn.onmousedown = () => {
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

  /** 供 HUD 顶栏读取的 quickbuy 提醒(离店仍可见还差多少金)。 */
  quickbuyModel(hero: Unit | undefined): QuickbuyModel {
    if (!hero) return buildQuickbuyModel({ quickbuyKey: null, label: '', glyph: '', remainingCost: 0, gold: 0 });
    return this.quickbuyState(hero).model;
  }

  private setQuickbuyTarget(key: string, append: boolean): void {
    if (!append) {
      this.quickbuyQueue = [key];
      return;
    }
    this.quickbuyQueue = this.quickbuyQueue.filter((itemKey) => itemKey !== key);
    this.quickbuyQueue.push(key);
  }

  /** quickbuy 目标的当前状态 + 完成所需购买项(raw key 列表,由 buyMany 套 purchaseKeyFor)。 */
  private quickbuyState(hero: Unit): { model: QuickbuyModel; buyKeys: string[] } {
    const inactive = { model: buildQuickbuyModel({ quickbuyKey: null, label: '', glyph: '', remainingCost: 0, gold: 0 }), buyKeys: [] as string[] };
    if (this.quickbuyQueue.length === 0) return inactive;
    this.quickbuyQueue = this.quickbuyQueue.filter((key) => {
      const ownsKey = (slots: Array<{ itemKey: string } | null>) => slots.some((slot) => slot?.itemKey === key);
      return !ownsKey(hero.inventory) && !ownsKey(hero.backpack);
    });
    if (this.quickbuyQueue.length === 0) return inactive;
    const gold = hero.heroMeta?.gold ?? 0;
    const buyKeys: string[] = [];
    const entries: QuickbuyQueueEntryInput[] = [];
    for (const key of this.quickbuyQueue) {
      const state = this.quickbuyEntryState(hero, key);
      if (!state) continue;
      entries.push(state.entry);
      buyKeys.push(...state.buyKeys);
    }
    if (entries.length === 0) return inactive;
    const model = buildQuickbuyQueueModel({ entries, gold });
    return { model, buyKeys };
  }

  private quickbuyEntryState(hero: Unit, key: string): { entry: QuickbuyQueueEntryInput; buyKeys: string[] } | null {
    const def = itemDef(key);
    if (!def) return null;
    const buyKeys: string[] = [];
    let remainingCost: number;
    if (def.recipe) {
      const progress = buildShopRecipeProgressModel({
        recipe: def.recipe,
        inventory: hero.inventory,
        backpack: hero.backpack,
        stash: hero.stash,
        tpSlot: hero.tpSlot,
      });
      const missingComponentCost = progress.missing.reduce((sum, missing) => sum + missing.missing * itemDef(missing.key).cost, 0);
      remainingCost = quickbuyRemainingCost({ recipe: true, fullCost: 0, missingComponentCost, recipeCost: def.recipe.recipeCost });
      for (const missing of progress.missing) for (let i = 0; i < missing.missing; i++) buyKeys.push(missing.key);
      buyKeys.push(key);
    } else {
      remainingCost = quickbuyRemainingCost({ recipe: false, fullCost: def.cost, missingComponentCost: 0, recipeCost: 0 });
      buyKeys.push(key);
    }
    return {
      entry: { itemKey: key, label: def.name, glyph: def.secretShop ? '◈' : '🛒', remainingCost },
      buyKeys,
    };
  }

  private completeQuickbuy(w: World, hero: Unit, buyKeys: string[]): void {
    this.buyMany(w, hero, buyKeys, 'quickbuy');
    this.quickbuyQueue = []; // 完成后清除队列(buyMany 已置 lastRender=0 触发重建)
  }

  private buy(w: World, hero: Unit, def: ItemDef): void {
    const r = buyItem(w, hero, purchaseKeyFor(def.key));
    this.recordPurchase(def.key, r, 'direct');
    const at = shopAt(w, hero);
    if (r === 'ok') this.showToast(`Bought ${def.name}`);
    else if (r === 'ok_backpack') this.showToast(`${def.name} to backpack`);
    else if (r === 'ok_stash') this.showToast(`${def.name} to stash`);
    else if (r === 'no_gold') this.showToast('Not enough gold');
    else if (r === 'no_shop') this.showToast(def.secretShop ? 'Need secret shop' : at === 'side' ? 'Need home shop' : 'Not in shop range');
    else this.showToast('Inventory, backpack, and stash are full');
    this.lastRender = 0;
  }

  private buyMany(w: World, hero: Unit, itemKeys: string[], source: ShopPurchaseSource = 'recipe'): void {
    if (itemKeys.length === 0) {
      this.showToast('No buyable recipe components');
      return;
    }
    let bought = 0;
    for (const key of itemKeys) {
      const result = buyItem(w, hero, purchaseKeyFor(key));
      this.recordPurchase(key, result, source);
      if (result !== 'ok' && result !== 'ok_backpack' && result !== 'ok_stash') break;
      bought++;
    }
    this.showToast(bought > 0 ? `Bought ${bought} recipe ${bought === 1 ? 'component' : 'components'}` : 'No buyable recipe components');
    this.lastRender = 0;
  }

  private recordPurchase(itemKey: string, result: BuyResult, source: ShopPurchaseSource): void {
    this.purchaseTraceEvents.unshift({
      itemKey,
      result,
      source,
      sequence: ++this.purchaseTraceSequence,
    });
    this.purchaseTraceEvents = this.purchaseTraceEvents.slice(0, 12);
  }

  private takeAllStash(w: World, hero: Unit): void {
    let moved = 0;
    for (let i = 0; i < hero.stash.length; i++) {
      if (!hero.stash[i]) continue;
      if (!takeFromStash(w, hero, i)) break;
      moved++;
    }
    this.showToast(moved > 0 ? `Took ${moved} stash ${moved === 1 ? 'item' : 'items'}` : 'Cannot take stash items');
    this.lastRender = 0;
  }
}

function effectiveCost(def: ItemDef): number {
  return def.recipe && def.recipe.recipeCost > 0 ? def.recipe.recipeCost : def.cost;
}

function quickbuyBadge(m: QuickbuyModel): string {
  if (!m.active) return '';
  const color = m.ready ? '#8fd17a' : '#ffb74d';
  const status = m.ready ? '可购买 · 点击买齐' : `还需 ${m.deficit} 金`;
  const queue = m.queueSize && m.queueSize > 1 ? ` x${m.queueSize}` : '';
  const label = m.queueLabel || m.label;
  return `<div id="shop-quickbuy" title="左键买齐(够钱) / 右键取消 / Shift 替换 / Ctrl+Shift 追加: ${escapeAttr(label)}" style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px;padding:4px 8px;border:1px solid ${color};border-radius:5px;background:${color}1a;cursor:pointer">
    <span style="color:${color};font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">⭐ ${m.label}${queue}</span>
    <span style="color:${color};font-size:12px;flex:none">${status}</span>
  </div>`;
}

function shopReminderBadge(model: ShopReminderModel): string {
  if (!model.visible) return '';
  const rows = model.reminders.map((reminder) => {
    const p = reminderPalette(reminder.tone);
    return `<div title="${escapeAttr(`${reminder.detail} / ${reminder.actionHint}`)}" style="display:flex;align-items:center;gap:6px;min-width:0;padding:3px 5px;border:1px solid ${p.border};border-radius:4px;background:${p.bg};">
      <b style="flex:none;color:${p.fg};font-size:10px;line-height:14px;white-space:nowrap;">${reminder.headline}</b>
      <span style="min-width:0;flex:1;color:#c8bd94;font-size:10px;line-height:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${reminder.detail}</span>
      <span style="flex:none;color:${p.fg};font-size:10px;line-height:14px;">${reminder.actionHint}</span>
    </div>`;
  }).join('');
  return `<div aria-label="shop reminders" style="display:flex;flex-direction:column;gap:3px;margin:-2px 0 6px;">${rows}</div>`;
}

function purchaseTracePanel(model: ShopPurchaseTraceModel): string {
  if (!model.visible) return '';
  const rows = model.entries.map((entry) => {
    const p = purchaseTracePalette(entry.tone);
    return `<div title="${escapeAttr(`${entry.detail} / ${entry.actionHint}`)}" style="display:grid;grid-template-columns:minmax(0,1fr) 58px 76px;gap:5px;align-items:center;min-width:0;">
      <span style="min-width:0;color:#d9d1ae;font-size:10px;line-height:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(entry.label)}</span>
      <b style="justify-self:start;max-width:58px;border:1px solid ${p.border};border-radius:3px;background:${p.bg};color:${p.fg};font-size:9px;line-height:14px;padding:0 4px;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(entry.destinationLabel)}</b>
      <span style="min-width:0;color:${p.fg};font-size:9px;line-height:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right;">${escapeHtml(entry.actionHint)}</span>
    </div>`;
  }).join('');
  return `<div aria-label="purchase route trace" title="${escapeAttr(model.summary)}" style="margin:-2px 0 6px;padding:5px 6px;border:1px solid #33402a;border-radius:5px;background:#0c1008;display:flex;flex-direction:column;gap:3px;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
      <b style="color:#cfe4aa;font-size:10px;line-height:14px;">Route</b>
      <span style="min-width:0;color:#8f876f;font-size:9px;line-height:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(model.summary)}</span>
    </div>
    ${rows}
  </div>`;
}

function shopSearchSummary(query: string, count: number): string {
  const q = query.trim();
  if (!q) return '';
  return `<div title="${escapeAttr(`Search matched ${count} item${count === 1 ? '' : 's'} for "${q}"`)}" style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin:-2px 0 6px;padding:3px 6px;border:1px solid #33402a;border-radius:4px;background:#0c1008;color:#9fbf86;font-size:10px;line-height:14px;">
    <span style="min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">MATCH <b style="color:#dce8b8">${escapeHtml(q)}</b></span>
    <span style="flex:none;color:#cfe4aa;font-weight:800;">${count}</span>
  </div>`;
}

function shopSearchBadge(model: ShopSearchHighlightModel | undefined): string {
  if (!model || model.tokens.length === 0) return '';
  const palette: Record<ShopSearchHighlightModel['tone'], { border: string; bg: string; fg: string; label: string }> = {
    match: { border: '#4a5f38', bg: '#10170c', fg: '#cfe4aa', label: 'MATCH' },
    buyable: { border: '#5f8d43', bg: '#12210f', fg: '#9cff74', label: 'BUY' },
    blocked: { border: '#7b6a36', bg: '#211b0d', fg: '#ffd76a', label: 'LOCK' },
  };
  const p = palette[model.tone];
  const fields = model.matchedFields.length > 0 ? model.matchedFields.join('+') : 'text';
  return `<span title="${escapeAttr(model.title)}" style="display:inline-flex;align-items:center;gap:4px;max-width:100%;height:15px;margin-top:3px;padding:0 4px;border:1px solid ${p.border};border-radius:3px;background:${p.bg};color:${p.fg};font-size:9px;font-weight:800;box-sizing:border-box;">
    <b style="font-size:8px;line-height:13px;">${p.label}</b>
    <span style="min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(model.label)} · ${escapeHtml(fields)}</span>
  </span>`;
}

function relatedItemsPanel(model: ShopRelatedItemsModel): string {
  if (!model.visible) return '';
  const from = relatedItemSection('FROM', model.buildsFrom);
  const into = relatedItemSection('INTO', model.buildsInto);
  if (!from && !into) return '';
  return `<div aria-label="related item graph" title="${escapeAttr(model.summary)}" style="margin:0 0 6px 0;padding:5px 6px;border:1px solid #3a4428;border-radius:5px;background:#0d1109;">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:4px;">
      <b style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e8e2c8;font-size:11px;">${escapeHtml(model.title)}</b>
      <span style="flex:none;color:#9a9277;font-size:9px;">${escapeHtml(model.summary)}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:3px;">${from}${into}</div>
  </div>`;
}

function relatedItemSection(label: string, nodes: ShopRelatedItemNode[]): string {
  if (!nodes.length) return '';
  return `<div style="display:grid;grid-template-columns:28px minmax(0,1fr);gap:4px;align-items:start;">
    <span style="color:#7d7560;font-size:9px;font-weight:800;line-height:16px;">${label}</span>
    <span style="display:flex;flex-wrap:wrap;gap:3px;">${nodes.map(relatedItemChip).join('')}</span>
  </div>`;
}

function relatedItemChip(node: ShopRelatedItemNode): string {
  const palette: Record<ShopRelatedItemNode['state'], { border: string; bg: string; fg: string }> = {
    owned: { border: '#5f8d43', bg: '#12210f', fg: '#9cff74' },
    missing: { border: '#7b6a36', bg: '#211b0d', fg: '#ffd76a' },
    gated: { border: '#3f6f7d', bg: '#0d1a1f', fg: '#9edfff' },
    target: { border: '#6f8fbf', bg: '#101827', fg: '#bcd6ff' },
  };
  const p = palette[node.state];
  const gate = node.secretShop ? '◈ ' : '';
  return `<span title="${escapeAttr(`${node.label}: ${node.detail}`)}" style="display:inline-flex;align-items:center;gap:3px;max-width:124px;height:16px;padding:0 4px;border:1px solid ${p.border};border-radius:3px;background:${p.bg};color:${p.fg};font-size:9px;font-weight:800;box-sizing:border-box;">
    <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${gate}${escapeHtml(node.label)}</span>
    ${node.countLabel ? `<span style="flex:none;color:#cfc7a5;font-variant-numeric:tabular-nums;">${escapeHtml(node.countLabel)}</span>` : ''}
  </span>`;
}

function reminderPalette(tone: 'ready' | 'busy' | 'blocked'): { border: string; bg: string; fg: string } {
  if (tone === 'ready') return { border: '#5f8d43', bg: '#12210f', fg: '#9cff74' };
  if (tone === 'busy') return { border: '#7b6a36', bg: '#211b0d', fg: '#ffd76a' };
  return { border: '#5f3832', bg: '#1c1010', fg: '#ff9f8f' };
}

function purchaseTracePalette(tone: ShopPurchaseTraceModel['entries'][number]['tone']): { border: string; bg: string; fg: string } {
  if (tone === 'ready') return { border: '#5f8d43', bg: '#12210f', fg: '#9cff74' };
  if (tone === 'busy') return { border: '#7b6a36', bg: '#211b0d', fg: '#ffd76a' };
  return { border: '#5f3832', bg: '#1c1010', fg: '#ff9f8f' };
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function freeCount(slots: Array<unknown | null>): number {
  return slots.filter((slot) => slot === null).length;
}

function stashActionButtonStyle(model: ShopStashActionModel): string {
  const palette: Record<ShopStashActionModel['tone'], { border: string; bg: string; fg: string }> = {
    muted: { border: '#3b3d35', bg: '#11130f', fg: '#9a9277' },
    ready: { border: '#5f8d43', bg: '#12210f', fg: '#9cff74' },
    busy: { border: '#7b6a36', bg: '#211b0d', fg: '#ffd76a' },
    blocked: { border: '#5f3832', bg: '#1c1010', fg: '#ff9f8f' },
  };
  const p = palette[model.tone];
  return `width:100%;margin:0 0 5px 0;padding:3px 8px;border-radius:4px;border:1px solid ${p.border};background:${p.bg};color:${p.fg};font-size:11px;font-weight:800;cursor:${model.enabled ? 'pointer' : 'not-allowed'};opacity:${model.enabled ? 1 : 0.6};`;
}

function shopAccessBadge(model: ShopAccessModel): string {
  const palette: Record<ShopAccessModel['tone'], { border: string; bg: string; fg: string }> = {
    home: { border: '#5f8d43', bg: '#12210f', fg: '#a7e87a' },
    side: { border: '#8a6b32', bg: '#21180b', fg: '#ffd06a' },
    secret: { border: '#3f6f7d', bg: '#0d1a1f', fg: '#9edfff' },
    away: { border: '#5f3832', bg: '#1c1010', fg: '#ff9f8f' },
  };
  const p = palette[model.tone];
  return `<div title="${escapeAttr(model.title)}" style="min-width:0;display:flex;flex-direction:column;gap:2px;">
    <b style="color:#e8e2c8;font-size:13px;line-height:1.15">商店 · ${model.label}</b>
    <span style="display:inline-flex;align-items:center;align-self:flex-start;max-width:220px;border:1px solid ${p.border};border-radius:4px;background:${p.bg};color:${p.fg};font-size:10px;line-height:14px;padding:0 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${model.detail}</span>
  </div>`;
}

function buildDestinationModel(
  def: ItemDef,
  hero: Unit,
  gold: number,
  at: 'home' | 'side' | 'secret' | null,
): ShopDestinationModel {
  return buildShopDestinationModel({
    item: {
      key: def.key,
      cost: effectiveCost(def),
      secretShop: def.secretShop,
      sideShop: def.sideShop,
      stackCharges: def.stackCharges,
    },
    hero: {
      alive: hero.alive,
      gold,
      shop: at,
      inventoryFreeSlots: freeCount(hero.inventory),
      backpackFreeSlots: freeCount(hero.backpack),
      stashFreeSlots: freeCount(hero.stash),
      tpSlotOccupied: !!hero.tpSlot,
      stackInInventory: hero.inventory.some((slot) => slot?.itemKey === def.key),
      stackInStash: hero.stash.some((slot) => slot?.itemKey === def.key),
    },
  });
}

function buildShopCourierModel(world: World, hero: Unit): CourierHudModel {
  const couriers = [...world.units.values()].filter((unit) => unit.kind === 'courier' && unit.team === hero.team);
  const courier = couriers.find((unit) => unit.alive) ?? couriers[couriers.length - 1];
  const fountain = [...world.units.values()].find((unit) => unit.kind === 'building' && unit.team === hero.team && unit.buildingKind === 'fountain');
  const atFountain = !!(courier && fountain && distSq(courier, fountain) <= 360 * 360);
  return buildCourierHudModel({
    courier: courier ? {
      id: courier.id,
      alive: courier.alive,
      hp: courier.hp,
      maxHp: courier.calc.maxHp,
      orderType: courier.order?.type,
      atFountain,
      stashItems: hero.stash.filter((item) => item !== null).length,
    } : undefined,
  });
}

function distSq(a: Unit, b: Unit): number {
  const dx = a.pos.x - b.pos.x;
  const dy = a.pos.y - b.pos.y;
  return dx * dx + dy * dy;
}

function destinationBadge(model: ShopDestinationModel): string {
  const palette: Record<ShopDestinationModel['tone'], { border: string; bg: string; fg: string }> = {
    ready: { border: '#5f8d43', bg: '#12210f', fg: '#9cff74' },
    busy: { border: '#7b6a36', bg: '#211b0d', fg: '#ffd76a' },
    blocked: { border: '#5f3832', bg: '#1c1010', fg: '#ff9f8f' },
  };
  const p = palette[model.tone];
  const status = availabilityStatusSuffix(model.availability);
  return `<span title="${model.detail}" style="display:flex;align-items:center;gap:5px;margin-top:3px;min-width:0;">
    <b style="flex:none;border:1px solid ${p.border};border-radius:3px;background:${p.bg};color:${p.fg};font-size:9px;line-height:14px;padding:0 4px;">${model.label}</b>
    <span style="min-width:0;color:#b8ad88;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${status} · ${model.detail}</span>
  </span>`;
}

/** 物品类别程序化 SVG 图标(与 HUD 一致:药瓶/宝石/剑/盾/法球/合成星)。 */
function quickActionBadge(model: ShopQuickActionModel): string {
  if (!model.visible) return '';
  const active = model.itemKey !== null;
  const status = model.availability ? `${availabilityStatusSuffix(model.availability)} · ` : '';
  return `<div title="${escapeAttr(model.detail)}" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:-2px 0 6px;padding:4px 6px;border:1px solid ${active ? '#4f5c38' : '#5f3832'};border-radius:5px;background:${active ? '#151b10' : '#1c1010'};">
    <b style="color:${active ? '#d9c989' : '#ff9f8f'};font-size:10px;white-space:nowrap;">${model.label}</b>
    <span style="min-width:0;color:#9a9277;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${status}${model.detail}</span>
  </div>`;
}

function recipeNextActionBadge(model: ShopRecipeNextActionModel): string {
  if (!model.visible) return '';
  const active = model.itemKey !== null;
  const status = model.availability ? `${availabilityStatusSuffix(model.availability)} · ` : '';
  return `<div title="${escapeAttr(model.detail)}" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:-2px 0 6px;padding:4px 6px;border:1px solid ${active ? '#435c4a' : '#5f3832'};border-radius:5px;background:${active ? '#101b16' : '#1c1010'};">
    <b style="color:${active ? '#a8e6bd' : '#ff9f8f'};font-size:10px;white-space:nowrap;">${model.label}</b>
    <span style="min-width:0;color:#9a9277;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${status}${model.detail}</span>
  </div>`;
}

function recipeBatchActionBadge(model: ShopRecipeBatchActionModel): string {
  if (!model.visible) return '';
  const active = model.itemKeys.length > 0;
  return `<div title="${escapeAttr(model.detail)}" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:-2px 0 6px;padding:4px 6px;border:1px solid ${active ? '#3f5d66' : '#5f3832'};border-radius:5px;background:${active ? '#0f181c' : '#1c1010'};">
    <b style="color:${active ? '#98d9ef' : '#ff9f8f'};font-size:10px;white-space:nowrap;">${model.label}</b>
    <span style="min-width:0;color:#9a9277;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${model.detail}</span>
  </div>`;
}

function recipeNextComponentBadge(component: ShopRecipeNextComponent | undefined): string {
  if (!component) return '';
  return `<span title="Next missing recipe component" style="display:flex;align-items:center;gap:4px;margin-top:3px;min-width:0;">
    <b style="flex:none;border:1px solid #435c4a;border-radius:3px;background:#101b16;color:#a8e6bd;font-size:9px;line-height:14px;padding:0 4px;">Next ${component.name}</b>
  </span>`;
}

function ownershipBadges(model: ShopOwnershipModel): string {
  if (!model.visible) return '';
  return `<span title="${model.detail}" style="display:flex;align-items:center;gap:4px;margin-top:3px;min-width:0;">
    <span style="flex:none;color:#8f9b75;font-size:10px;">Owned</span>
    ${model.badges.map((badge) => `<b style="flex:none;border:1px solid #3a4428;border-radius:3px;background:#12170e;color:#cfd8a0;font-size:9px;line-height:14px;padding:0 4px;">${badge.label} x${badge.count}</b>`).join('')}
  </span>`;
}

function recipeProgressBadge(model: ShopRecipeProgressModel): string {
  if (!model.visible) return '';
  const missing = model.missing.length > 0
    ? `<span style="min-width:0;color:#d8a84c;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Missing ${model.missing.map((component) => `${component.label} x${component.missing}`).join(' / ')}</span>`
    : '<span style="min-width:0;color:#9cff74;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Components owned</span>';
  return `<span title="${model.detail}" style="display:flex;align-items:center;gap:4px;margin-top:3px;min-width:0;">
    <b style="flex:none;border:1px solid #4f5c38;border-radius:3px;background:#151b10;color:#d9c989;font-size:9px;line-height:14px;padding:0 4px;">Recipe ${model.ownedLabel}</b>
    <b style="flex:none;border:1px solid #3a4428;border-radius:3px;background:#12170e;color:#cfd8a0;font-size:9px;line-height:14px;padding:0 4px;">Hero ${model.readyLabel}</b>
    ${missing}
  </span>`;
}

function iconSvg(category: ItemCategory): string {
  const M: Record<string, { c: string; p: string }> = {
    consumable: { c: '#6fcf5a', p: '<path d="M10 3 H14 M11 3 V8 L7 19 H17 L13 8 V3"/>' },
    attribute: { c: '#c9b07a', p: '<path d="M12 4 L19 9 L12 20 L5 9 Z"/>' },
    weapon: { c: '#e0673a', p: '<path d="M12 3 V14 M8 14 H16 M11 14 V20 H13 V14"/>' },
    armor: { c: '#6aa0d0', p: '<path d="M12 3 L19 6 V12 C19 17 12 21 12 21 C12 21 5 17 5 12 V6 Z"/>' },
    arcane: { c: '#b06bff', p: '<circle cx="12" cy="12" r="6"/>' },
    combined: { c: '#ffd54f', p: '<path d="M12 3 L14 10 L21 12 L14 14 L12 21 L10 14 L3 12 L10 10 Z"/>' },
  };
  const m = M[category] ?? M.combined;
  return `<svg viewBox="0 0 24 24" width="22" height="22" style="display:block"><g stroke="${m.c}" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round">${m.p}</g></svg>`;
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
