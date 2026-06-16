import { describe, expect, it } from 'vitest';
import {
  buildShopQuickActionModel,
  buildShopRecipeBatchActionModel,
  buildShopRecipeNextActionModel,
} from '../src/ui/shopQuickActionModel';

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

describe('buildShopRecipeNextActionModel', () => {
  it('selects the next missing component for the first visible recipe row', () => {
    const model = buildShopRecipeNextActionModel({
      visibleItems: [
        { key: 'magic_wand', name: 'Magic Wand' },
        { key: 'bracer', name: 'Bracer' },
      ],
      nextComponents: new Map([
        ['magic_wand', { key: 'magic_stick', name: 'Magic Stick' }],
        ['bracer', { key: 'circlet', name: 'Circlet' }],
      ]),
      destinations: new Map([
        ['magic_stick', { canBuy: true, detail: 'Goes to inventory' }],
        ['circlet', { canBuy: true, detail: 'Goes to inventory' }],
      ]),
    });

    expect(model).toEqual({
      visible: true,
      parentItemKey: 'magic_wand',
      itemKey: 'magic_stick',
      label: 'Shift+Enter: Buy Magic Stick',
      detail: 'For Magic Wand / Goes to inventory',
    });
  });

  it('shows the blocked reason when the next component cannot be bought', () => {
    const model = buildShopRecipeNextActionModel({
      visibleItems: [{ key: 'magic_wand', name: 'Magic Wand' }],
      nextComponents: new Map([
        ['magic_wand', { key: 'magic_stick', name: 'Magic Stick' }],
      ]),
      destinations: new Map([
        ['magic_stick', { canBuy: false, detail: 'Need 100 more gold' }],
      ]),
    });

    expect(model).toEqual({
      visible: true,
      parentItemKey: 'magic_wand',
      itemKey: null,
      label: 'Shift+Enter: blocked',
      detail: 'Magic Stick: Need 100 more gold',
    });
  });

  it('stays hidden when visible recipe rows have no missing components', () => {
    const model = buildShopRecipeNextActionModel({
      visibleItems: [{ key: 'magic_wand', name: 'Magic Wand' }],
      nextComponents: new Map(),
      destinations: new Map(),
    });

    expect(model.visible).toBe(false);
  });
});

describe('buildShopRecipeBatchActionModel', () => {
  it('selects all currently buyable missing components for the first visible recipe row', () => {
    const model = buildShopRecipeBatchActionModel({
      visibleItems: [
        { key: 'magic_wand', name: 'Magic Wand' },
        { key: 'bracer', name: 'Bracer' },
      ],
      missingComponents: new Map([
        ['magic_wand', [
          { key: 'magic_stick', name: 'Magic Stick' },
          { key: 'branch', name: 'Iron Branch' },
          { key: 'branch', name: 'Iron Branch' },
        ]],
        ['bracer', [{ key: 'circlet', name: 'Circlet' }]],
      ]),
      destinations: new Map([
        ['magic_stick', { canBuy: true, detail: 'Goes to inventory' }],
        ['branch', { canBuy: true, detail: 'Goes to inventory' }],
        ['circlet', { canBuy: true, detail: 'Goes to inventory' }],
      ]),
    });

    expect(model).toEqual({
      visible: true,
      parentItemKey: 'magic_wand',
      itemKeys: ['magic_stick', 'branch', 'branch'],
      label: 'Ctrl+Enter: Buy 3 components',
      detail: 'For Magic Wand: Magic Stick / Iron Branch x2',
    });
  });

  it('skips missing components that are currently blocked', () => {
    const model = buildShopRecipeBatchActionModel({
      visibleItems: [{ key: 'magic_wand', name: 'Magic Wand' }],
      missingComponents: new Map([
        ['magic_wand', [
          { key: 'magic_stick', name: 'Magic Stick' },
          { key: 'branch', name: 'Iron Branch' },
        ]],
      ]),
      destinations: new Map([
        ['magic_stick', { canBuy: false, detail: 'Need 100 more gold' }],
        ['branch', { canBuy: true, detail: 'Goes to inventory' }],
      ]),
    });

    expect(model).toEqual({
      visible: true,
      parentItemKey: 'magic_wand',
      itemKeys: ['branch'],
      label: 'Ctrl+Enter: Buy 1 component',
      detail: 'For Magic Wand: Iron Branch',
    });
  });

  it('shows a blocked batch state when no missing component can be bought', () => {
    const model = buildShopRecipeBatchActionModel({
      visibleItems: [{ key: 'magic_wand', name: 'Magic Wand' }],
      missingComponents: new Map([
        ['magic_wand', [{ key: 'magic_stick', name: 'Magic Stick' }]],
      ]),
      destinations: new Map([
        ['magic_stick', { canBuy: false, detail: 'Need home shop' }],
      ]),
    });

    expect(model).toEqual({
      visible: true,
      parentItemKey: 'magic_wand',
      itemKeys: [],
      label: 'Ctrl+Enter: blocked',
      detail: 'Magic Wand: no buyable missing components',
    });
  });
});
