import { describe, expect, it } from 'vitest';
import { buildShopQuickActionModel } from '../src/ui/shopQuickActionModel';

const visibleItems = [
  { key: 'branch', name: 'Iron Branch' },
  { key: 'magic_wand', name: 'Magic Wand' },
  { key: 'blink', name: 'Blink Dagger' },
];

describe('buildShopQuickActionModel', () => {
  it('selects the first buyable visible item as the keyboard purchase target', () => {
    const model = buildShopQuickActionModel({
      visibleItems,
      destinations: new Map([
        ['branch', { canBuy: false, detail: 'Need 20 more gold' }],
        ['magic_wand', { canBuy: true, detail: 'Goes to inventory' }],
      ]),
    });

    expect(model).toEqual({
      visible: true,
      itemKey: 'magic_wand',
      label: 'Enter: Buy Magic Wand',
      detail: 'Goes to inventory',
    });
  });

  it('shows why Enter cannot buy when visible rows are blocked', () => {
    const model = buildShopQuickActionModel({
      visibleItems: [visibleItems[0]],
      destinations: new Map([
        ['branch', { canBuy: false, detail: 'Need home shop' }],
      ]),
    });

    expect(model).toEqual({
      visible: true,
      itemKey: null,
      label: 'Enter: blocked',
      detail: 'Need home shop',
    });
  });

  it('stays hidden when the shop list is empty', () => {
    const model = buildShopQuickActionModel({
      visibleItems: [],
      destinations: new Map(),
    });

    expect(model.visible).toBe(false);
  });
});
