export type ShopDestination = 'hero' | 'backpack' | 'stash' | 'tp' | 'blocked';
export type ShopDestinationTone = 'ready' | 'busy' | 'blocked';
export type ShopAccess = 'home' | 'side' | 'secret' | null;

export interface ShopDestinationItem {
  key: string;
  cost: number;
  secretShop?: boolean;
  sideShop?: boolean;
  stackCharges?: boolean;
}

export interface ShopDestinationHero {
  alive: boolean;
  gold: number;
  shop: ShopAccess;
  inventoryFreeSlots: number;
  backpackFreeSlots: number;
  stashFreeSlots: number;
  tpSlotOccupied: boolean;
  stackInInventory: boolean;
  stackInStash: boolean;
}

export interface ShopDestinationModel {
  canBuy: boolean;
  destination: ShopDestination;
  label: string;
  detail: string;
  tone: ShopDestinationTone;
}

export function buildShopDestinationModel(input: {
  item: ShopDestinationItem;
  hero: ShopDestinationHero;
}): ShopDestinationModel {
  const { item, hero } = input;
  const effectiveShop = hero.alive ? hero.shop : 'home';
  const allowed = item.secretShop
    ? effectiveShop === 'secret'
    : item.sideShop
      ? effectiveShop === 'home' || effectiveShop === 'side'
      : effectiveShop === 'home';

  if (!allowed) {
    const label = item.secretShop ? 'Secret' : effectiveShop === 'side' ? 'Side' : 'Shop';
    return blocked(label, item.secretShop ? 'Need secret shop' : 'Need home shop');
  }

  if (hero.gold < item.cost) {
    return blocked('Gold', `Need ${item.cost - hero.gold} more gold`);
  }

  if (item.key === 'tp' && hero.alive) {
    return {
      canBuy: true,
      destination: 'tp',
      label: 'TP',
      detail: hero.tpSlotOccupied ? 'Adds TP charge' : 'Goes to TP slot',
      tone: 'ready',
    };
  }

  if (!hero.alive) {
    if (item.stackCharges && hero.stackInStash) return destination('stash', 'Stash', 'Adds stash charge', 'busy');
    if (hero.stashFreeSlots > 0) return destination('stash', 'Stash', 'Dead: goes to stash', 'busy');
    return blocked('Full', 'Stash full');
  }

  if (item.stackCharges && hero.stackInInventory) {
    return destination('hero', 'Hero', 'Adds inventory charge', 'ready');
  }

  if (hero.inventoryFreeSlots > 0) {
    return destination('hero', 'Hero', effectiveShop === 'side' ? 'Side shop: goes to inventory' : 'Goes to inventory', 'ready');
  }

  if (!item.secretShop && hero.backpackFreeSlots > 0) {
    return destination('backpack', 'Backpack', 'Inventory full: goes to backpack', 'busy');
  }

  if (item.secretShop) {
    return blocked('Full', 'Secret shop cannot stash');
  }

  if (effectiveShop === 'side') {
    return blocked('Full', 'Side shop cannot stash');
  }

  if (hero.stashFreeSlots > 0) {
    return destination('stash', 'Stash', 'Inventory and backpack full: goes to stash', 'busy');
  }

  return blocked('Full', 'Inventory, backpack, and stash full');
}

function destination(destination: ShopDestination, label: string, detail: string, tone: ShopDestinationTone): ShopDestinationModel {
  return { canBuy: true, destination, label, detail, tone };
}

function blocked(label: string, detail: string): ShopDestinationModel {
  return { canBuy: false, destination: 'blocked', label, detail, tone: 'blocked' };
}
