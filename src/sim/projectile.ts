/** 追踪弹道:普攻与技能共用。命中已死亡目标的弹道作废(WC3 行为)。 */
import type { Vec2 } from '../core/vec2';
import type { EntityId } from './unit';
import type { World } from './world';
import type { Unit } from './unit';

export interface Projectile {
  pos: Vec2;
  speed: number;
  targetId: EntityId;
  sourceId: EntityId;
  kind: 'attack' | 'ability';
  /** ability 弹道的命中回调 */
  onHit?: (w: World, target: Unit, sourceId: EntityId) => void;
  /** attack 弹道:已结算的伤害负载 */
  attackPayload?: { amount: number };
  /** 渲染样式 */
  style?: string;
}
