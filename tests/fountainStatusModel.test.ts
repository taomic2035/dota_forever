import { describe, expect, it } from 'vitest';
import { buildFountainStatusModel } from '../src/ui/fountainStatusModel';

const base = {
  alive: true,
  hp: 900,
  maxHp: 1000,
  mp: 450,
  maxMp: 500,
  stashItems: 0,
  alliedFountainDistance: 2400,
  alliedAuraRadius: 1100,
  enemyFountainDistance: 5000,
  enemyAttackRange: 1100,
};

describe('fountainStatusModel', () => {
  it('warns first when the hero is inside enemy fountain fire', () => {
    const model = buildFountainStatusModel({
      ...base,
      hp: 700,
      enemyFountainDistance: 900,
    });

    expect(model).toMatchObject({
      visible: true,
      tone: 'danger',
      label: '敌方泉水危险',
      actionHint: '立刻撤离',
    });
    expect(model.detail).toContain('900');
  });

  it('surfaces allied fountain regen and stash actions while inside the aura', () => {
    const model = buildFountainStatusModel({
      ...base,
      hp: 320,
      mp: 120,
      stashItems: 2,
      alliedFountainDistance: 420,
    });

    expect(model).toMatchObject({
      visible: true,
      tone: 'ready',
      label: '泉水回复中',
      actionHint: '取储藏 / 补给 / 购物',
    });
    expect(model.detail).toContain('生命 32%');
    expect(model.detail).toContain('法力 24%');
    expect(model.detail).toContain('储藏 x2');
  });

  it('nudges low-resource heroes back to fountain when away from base', () => {
    const model = buildFountainStatusModel({
      ...base,
      hp: 260,
      mp: 90,
      alliedFountainDistance: 2600,
    });

    expect(model).toMatchObject({
      visible: true,
      tone: 'busy',
      label: '建议回泉水',
      actionHint: 'TP 或回撤补给',
    });
    expect(model.detail).toContain('距泉水 2600');
  });

  it('stays quiet for healthy heroes away from fountain with no stash pressure', () => {
    const model = buildFountainStatusModel(base);

    expect(model.visible).toBe(false);
  });
});
