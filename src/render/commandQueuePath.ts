import { V, type Vec2 } from '../core/vec2';
import type { World } from '../sim/world';
import type { Order, Unit } from '../sim/unit';

export type CommandQueueLegKind = 'current' | 'queued';

export interface CommandQueueLeg {
  from: Vec2;
  to: Vec2;
  kind: CommandQueueLegKind;
  index: number;
}

export function buildCommandQueuePath(world: World, unit: Unit): CommandQueueLeg[] {
  const orders = unit.order ? [unit.order, ...unit.orderQueue] : [...unit.orderQueue];
  const legs: CommandQueueLeg[] = [];
  let cursor = V.clone(unit.pos);

  orders.forEach((order, orderIndex) => {
    const destination = orderDestination(world, order);
    if (!destination) return;
    legs.push({
      from: V.clone(cursor),
      to: destination,
      kind: orderIndex === 0 && unit.order ? 'current' : 'queued',
      index: orderIndex,
    });
    cursor = V.clone(destination);
  });

  return legs;
}

function orderDestination(world: World, order: Order): Vec2 | null {
  if (order.pos) return V.clone(order.pos);
  if (order.targetId) {
    const target = world.getUnit(order.targetId);
    if (target?.alive) return V.clone(target.pos);
  }
  return null;
}
