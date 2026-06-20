import { describe, expect, it } from 'vitest';
import { buildCombatCommandHintModel } from '../src/ui/combatCommandHintModel';

describe('buildCombatCommandHintModel', () => {
  it('shows an explicit attack target before generic auto attack state', () => {
    const model = buildCombatCommandHintModel({
      selectedName: '雷恩',
      order: { type: 'attack', targetId: 12 },
      attackTargetName: '敌方小兵',
      autoAttack: 'standard',
    });

    expect(model).toEqual({
      visible: true,
      tone: 'danger',
      label: '攻击目标',
      detail: '敌方小兵',
      actionHint: 'S 停止 · H 守住',
    });
  });

  it('shows attack-move destination as an active aggressive order', () => {
    const model = buildCombatCommandHintModel({
      selectedName: '雷恩',
      order: { type: 'attackmove', pos: { x: 7200, y: 8100 } },
      attackTargetName: '',
      autoAttack: 'never',
    });

    expect(model).toEqual({
      visible: true,
      tone: 'busy',
      label: '攻击移动',
      detail: '前往 7200,8100 · 沿途接战',
      actionHint: '右键改移动 · S 停止',
    });
  });

  it('keeps hold position distinct from stop and auto attack', () => {
    expect(buildCombatCommandHintModel({
      selectedName: '雷恩',
      order: { type: 'hold' },
      attackTargetName: '',
      autoAttack: 'always',
    })).toMatchObject({
      tone: 'ready',
      label: '守住位置',
      detail: '不追击 · 只处理近身威胁',
    });

    expect(buildCombatCommandHintModel({
      selectedName: '雷恩',
      order: { type: 'stop' },
      attackTargetName: '',
      autoAttack: 'always',
    })).toMatchObject({
      tone: 'muted',
      label: '停止',
      detail: '清空当前命令',
    });
  });

  it('explains idle auto attack policies when no explicit command is active', () => {
    expect(buildCombatCommandHintModel({
      selectedName: '雷恩',
      order: null,
      attackTargetName: '',
      autoAttack: 'never',
    })).toMatchObject({
      tone: 'muted',
      label: '自动攻击: 不攻',
      detail: '空闲不自动平 A',
    });

    expect(buildCombatCommandHintModel({
      selectedName: '雷恩',
      order: null,
      attackTargetName: '敌方英雄',
      autoAttack: 'always',
    })).toMatchObject({
      tone: 'danger',
      label: '自动攻击目标',
      detail: '敌方英雄',
    });
  });
});
