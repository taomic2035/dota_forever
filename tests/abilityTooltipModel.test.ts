import { describe, it, expect } from 'vitest';
import { buildAbilityTooltip } from '../src/ui/abilityTooltipModel';
import type { AbilityDef } from '../src/data/heroes/types';

function def(over: Partial<AbilityDef> = {}): AbilityDef {
  return {
    key: 'q', name: '冰霜新星', maxLevel: 4, targetMode: 'point',
    castRange: [700, 700, 700, 700], manaCost: [105, 120, 135, 150], cooldown: [11, 10, 9, 8],
    aoeRadius: [400, 400, 400, 400], description: '范围减速并造成伤害。',
    ...over,
  } as AbilityDef;
}

describe('buildAbilityTooltip', () => {
  it('已学:用当前等级的数值', () => {
    const t = buildAbilityTooltip(def(), 2);
    expect(t).toContain('冰霜新星');
    expect(t).toContain('法力 120');
    expect(t).toContain('冷却 10s');
    expect(t).toContain('施法距离 700');
    expect(t).toContain('范围 400');
    expect(t).toContain('范围减速并造成伤害。');
  });

  it('未学(lvl 0):预览 1 级数值并标注', () => {
    const t = buildAbilityTooltip(def(), 0);
    expect(t).toContain('法力 105');
    expect(t).toContain('冷却 11s');
    expect(t).toContain('1级');
  });

  it('大招标注', () => {
    expect(buildAbilityTooltip(def({ ultimate: true, name: '极寒领域' }), 1)).toContain('极寒领域 (大招)');
  });

  it('被动/无目标:不显示施法距离', () => {
    const passive = buildAbilityTooltip(def({ targetMode: 'passive', name: '巨刃顺劈', castRange: undefined }), 1);
    expect(passive).not.toContain('施法距离');
    const noTarget = buildAbilityTooltip(def({ targetMode: 'none', name: '战吼', castRange: [0, 0, 0, 0] }), 1);
    expect(noTarget).not.toContain('施法距离');
  });

  it('等级超出数组长度时取末项(钳制)', () => {
    const t = buildAbilityTooltip(def({ manaCost: [100, 110] }), 4);
    expect(t).toContain('法力 110');
  });

  it('缺失数值不显示对应项,不报错', () => {
    const t = buildAbilityTooltip({ key: 'p', name: '纯被动', maxLevel: 1, targetMode: 'passive', description: '被动加成。' } as AbilityDef, 1);
    expect(t).toContain('纯被动');
    expect(t).toContain('被动加成。');
    expect(t).not.toContain('法力');
  });
});
