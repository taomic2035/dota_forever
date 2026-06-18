import { describe, it, expect } from 'vitest';
import { buildQuickbuyModel, quickbuyRemainingCost } from '../src/ui/quickbuyModel';

describe('quickbuyRemainingCost', () => {
  it('普通物品:全额成本', () => {
    expect(quickbuyRemainingCost({ recipe: false, fullCost: 2050, missingComponentCost: 0, recipeCost: 0 })).toBe(2050);
  });
  it('配方物品:缺失组件 + 卷轴', () => {
    // 缺一个 1000 组件 + 600 卷轴(另一组件已持有)
    expect(quickbuyRemainingCost({ recipe: true, fullCost: 3200, missingComponentCost: 1000, recipeCost: 600 })).toBe(1600);
  });
  it('配方物品组件全齐:仅剩卷轴', () => {
    expect(quickbuyRemainingCost({ recipe: true, fullCost: 3200, missingComponentCost: 0, recipeCost: 600 })).toBe(600);
  });
});

describe('buildQuickbuyModel', () => {
  it('无目标 → inactive', () => {
    const m = buildQuickbuyModel({ quickbuyKey: null, label: '', glyph: '', remainingCost: 0, gold: 999 });
    expect(m.active).toBe(false);
  });
  it('金不足 → 显示差额,not ready', () => {
    const m = buildQuickbuyModel({ quickbuyKey: 'bkb', label: '黑黄', glyph: '◈', remainingCost: 1600, gold: 1000 });
    expect(m.active).toBe(true);
    expect(m.ready).toBe(false);
    expect(m.deficit).toBe(600);
    expect(m.label).toBe('黑黄');
  });
  it('金够 → ready,deficit 0', () => {
    const m = buildQuickbuyModel({ quickbuyKey: 'bkb', label: '黑黄', glyph: '◈', remainingCost: 1600, gold: 1600 });
    expect(m.ready).toBe(true);
    expect(m.deficit).toBe(0);
  });
  it('金超出也 ready 且 deficit 不为负', () => {
    const m = buildQuickbuyModel({ quickbuyKey: 'bkb', label: '黑黄', glyph: '◈', remainingCost: 1600, gold: 5000 });
    expect(m.ready).toBe(true);
    expect(m.deficit).toBe(0);
  });
});
