import type { SelectionSnapshot } from './selection';
import type { EntityId, Order } from '../sim/unit';

export interface OrderTargetLike {
  id: EntityId;
  issueOrder(order: Order): void;
  queueOrder(order: Order): void;
}

export interface SelectionOrderOptions {
  queued?: boolean;
}

export function issueSelectionOrder<T extends OrderTargetLike>(
  order: Order,
  selection: SelectionSnapshot,
  unitsById: ReadonlyMap<EntityId, T>,
  fallback?: T,
  options: SelectionOrderOptions = {},
): T[] {
  const targets = selection.commandableIds
    .map((id) => unitsById.get(id))
    .filter((unit): unit is T => !!unit);
  const recipients = targets.length > 0 ? targets : fallback ? [fallback] : [];
  for (const unit of recipients) {
    if (options.queued) unit.queueOrder(order);
    else unit.issueOrder(order);
  }
  return recipients;
}
