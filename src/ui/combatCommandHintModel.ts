import type { AutoAttackMode } from '../engine/controlSettings';
import { autoAttackModeLabel } from '../engine/controlSettings';
import type { Order } from '../sim/unit';

export type CombatCommandHintTone = 'muted' | 'ready' | 'busy' | 'danger';

export interface CombatCommandHintModel {
  visible: boolean;
  tone: CombatCommandHintTone;
  label: string;
  detail: string;
  actionHint: string;
}

export interface CombatCommandHintInput {
  selectedName: string;
  order: Order | null;
  attackTargetName: string;
  autoAttack: AutoAttackMode;
}

export function buildCombatCommandHintModel(input: CombatCommandHintInput): CombatCommandHintModel {
  const order = input.order;
  if (order?.type === 'attack') {
    return {
      visible: true,
      tone: 'danger',
      label: '攻击目标',
      detail: input.attackTargetName || '目标',
      actionHint: 'S 停止 · H 守住',
    };
  }
  if (order?.type === 'attackmove') {
    return {
      visible: true,
      tone: 'busy',
      label: '攻击移动',
      detail: order.pos ? `前往 ${Math.round(order.pos.x)},${Math.round(order.pos.y)} · 沿途接战` : '沿途接战',
      actionHint: '右键改移动 · S 停止',
    };
  }
  if (order?.type === 'hold') {
    return {
      visible: true,
      tone: 'ready',
      label: '守住位置',
      detail: '不追击 · 只处理近身威胁',
      actionHint: 'S 停止',
    };
  }
  if (order?.type === 'stop') {
    return {
      visible: true,
      tone: 'muted',
      label: '停止',
      detail: '清空当前命令',
      actionHint: autoAttackHint(input.autoAttack),
    };
  }
  if (input.attackTargetName) {
    return {
      visible: true,
      tone: 'danger',
      label: '自动攻击目标',
      detail: input.attackTargetName,
      actionHint: autoAttackHint(input.autoAttack),
    };
  }
  return {
    visible: true,
    tone: input.autoAttack === 'always' ? 'busy' : input.autoAttack === 'standard' ? 'ready' : 'muted',
    label: `自动攻击: ${autoAttackModeLabel(input.autoAttack)}`,
    detail: autoAttackDetail(input.autoAttack),
    actionHint: 'A 攻击移动 · S 停止 · H 守住',
  };
}

function autoAttackDetail(mode: AutoAttackMode): string {
  if (mode === 'never') return '空闲不自动平 A';
  if (mode === 'always') return '主动追击进入警戒的敌人';
  return '只处理身边敌人';
}

function autoAttackHint(mode: AutoAttackMode): string {
  return `自动攻击 ${autoAttackModeLabel(mode)}`;
}
