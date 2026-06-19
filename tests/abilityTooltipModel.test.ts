import { describe, it, expect } from 'vitest';
import { buildAbilitySlotTitle, buildAbilityTooltip } from '../src/ui/abilityTooltipModel';
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

  it('技能槽 title 显示 learned autocast/toggle 当前状态与切换入口', () => {
    const auto = buildAbilitySlotTitle(def({ name: '霜寒之箭', targetMode: 'passive', tags: ['orb', 'autocast'] }), {
      level: 1,
      autocastOn: true,
    });
    expect(auto).toContain('AUTO ON');
    expect(auto).toContain('QWER/右键切换自动施放');

    const toggle = buildAbilitySlotTitle(def({ name: '燃烧姿态', targetMode: 'passive', tags: ['toggle'] }), {
      level: 1,
      toggleOn: false,
    });
    expect(toggle).toContain('OFF');
    expect(toggle).toContain('QWER/右键切换开关状态');
  });

  it('技能槽 title 显示主动技能当前冷却、法力和就绪状态', () => {
    expect(buildAbilitySlotTitle(def({ name: '闪烁' }), {
      level: 2,
      cooldownRemaining: 7.2,
      manaCost: 60,
      currentMana: 200,
    })).toContain('当前: 冷却 8s');

    expect(buildAbilitySlotTitle(def({ name: '神力' }), {
      level: 2,
      cooldownRemaining: 0,
      manaCost: 100,
      currentMana: 30,
    })).toContain('当前: 法力不足 30/100');

    expect(buildAbilitySlotTitle(def({ name: '火球' }), {
      level: 2,
      cooldownRemaining: 0,
      manaCost: 90,
      currentMana: 160,
    })).toContain('当前: 就绪');
  });

  it('技能槽 title 对可切换被动优先显示 AUTO 状态而不是就绪', () => {
    const t = buildAbilitySlotTitle(def({ name: '霜寒之箭', targetMode: 'passive', tags: ['orb', 'autocast'] }), {
      level: 1,
      autocastOn: false,
      cooldownRemaining: 0,
      manaCost: 0,
      currentMana: 300,
    });
    expect(t).toContain('AUTO OFF');
    expect(t).not.toContain('当前: 就绪');
  });

  it('技能槽 title 不给未学习技能显示当前开关态', () => {
    const t = buildAbilitySlotTitle(def({ name: '霜寒之箭', targetMode: 'passive', tags: ['orb', 'autocast'] }), {
      level: 0,
      learnable: true,
      autocastOn: true,
    });
    expect(t).not.toContain('AUTO ON');
    expect(t).toContain('点击学习(+)');
  });
});
