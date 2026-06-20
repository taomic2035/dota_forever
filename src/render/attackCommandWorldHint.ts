import type { Vec2 } from '../core/vec2';
import type { Order } from '../sim/unit';

export type AttackCommandWorldHintKind = 'attackTarget' | 'attackMove' | 'autoTarget' | 'none';
export type AttackCommandWorldHintTone = 'danger' | 'busy' | 'ready' | 'muted';

export interface AttackCommandWorldHintUnit {
  id: number;
  pos: Vec2;
  order: Order | null;
  attackTargetId: number;
}

export interface AttackCommandWorldHintTarget {
  id: number;
  pos: Vec2;
  radius: number;
  name: string;
}

export interface AttackCommandWorldHintModel {
  visible: boolean;
  kind: AttackCommandWorldHintKind;
  tone: AttackCommandWorldHintTone;
  label: string;
  from: Vec2 | null;
  to: Vec2 | null;
  radius: number;
}

export function buildAttackCommandWorldHint(input: {
  selected: AttackCommandWorldHintUnit | null | undefined;
  target?: AttackCommandWorldHintTarget | null;
}): AttackCommandWorldHintModel {
  const selected = input.selected;
  if (!selected) return hiddenHint();
  const target = input.target;
  if (selected.order?.type === 'attack' && target) {
    return {
      visible: true,
      kind: 'attackTarget',
      tone: 'danger',
      label: '攻击目标',
      from: selected.pos,
      to: target.pos,
      radius: Math.max(34, target.radius + 12),
    };
  }
  if (selected.order?.type === 'attackmove' && selected.order.pos) {
    return {
      visible: true,
      kind: 'attackMove',
      tone: 'busy',
      label: 'A-Move',
      from: selected.pos,
      to: selected.order.pos,
      radius: 34,
    };
  }
  if (selected.attackTargetId && target) {
    return {
      visible: true,
      kind: 'autoTarget',
      tone: 'ready',
      label: '自动攻击',
      from: selected.pos,
      to: target.pos,
      radius: Math.max(28, target.radius + 10),
    };
  }
  return hiddenHint();
}

function hiddenHint(): AttackCommandWorldHintModel {
  return {
    visible: false,
    kind: 'none',
    tone: 'muted',
    label: '',
    from: null,
    to: null,
    radius: 0,
  };
}
