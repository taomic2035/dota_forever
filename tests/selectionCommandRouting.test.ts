import { describe, expect, it } from 'vitest';
import { issueSelectionOrder, type OrderTargetLike } from '../src/engine/selectionCommandRouting';
import type { SelectionSnapshot } from '../src/engine/selection';
import type { Order } from '../src/sim/unit';

function target(id: number): OrderTargetLike & { issued: Order[]; queued: Order[] } {
  return {
    id,
    issued: [],
    queued: [],
    issueOrder(order) {
      this.issued.push(order);
    },
    queueOrder(order) {
      this.queued.push(order);
    },
  };
}

const order: Order = { type: 'move', pos: { x: 100, y: 200 } };

describe('issueSelectionOrder', () => {
  it('issues commands to every commandable selected unit', () => {
    const hero = target(1);
    const summon = target(2);
    const enemyInspect = target(9);
    const snapshot: SelectionSnapshot = {
      primaryId: hero.id,
      selectedIds: [hero.id, summon.id, enemyInspect.id],
      commandableIds: [hero.id, summon.id],
      inspectId: 0,
    };

    const recipients = issueSelectionOrder(order, snapshot, new Map([
      [hero.id, hero],
      [summon.id, summon],
      [enemyInspect.id, enemyInspect],
    ]), hero);

    expect(recipients.map((unit) => unit.id)).toEqual([hero.id, summon.id]);
    expect(hero.issued).toEqual([order]);
    expect(summon.issued).toEqual([order]);
    expect(enemyInspect.issued).toEqual([]);
  });

  it('queues commands for every commandable selected unit when Shift is active', () => {
    const hero = target(1);
    const summon = target(2);
    const snapshot: SelectionSnapshot = {
      primaryId: hero.id,
      selectedIds: [hero.id, summon.id],
      commandableIds: [hero.id, summon.id],
      inspectId: 0,
    };

    issueSelectionOrder(order, snapshot, new Map([[hero.id, hero], [summon.id, summon]]), hero, { queued: true });

    expect(hero.issued).toEqual([]);
    expect(hero.queued).toEqual([order]);
    expect(summon.issued).toEqual([]);
    expect(summon.queued).toEqual([order]);
  });

  it('falls back to the hero when selection is inspect-only', () => {
    const hero = target(1);
    const enemy = target(9);
    const snapshot: SelectionSnapshot = {
      primaryId: enemy.id,
      selectedIds: [enemy.id],
      commandableIds: [],
      inspectId: enemy.id,
    };

    const recipients = issueSelectionOrder(order, snapshot, new Map([[enemy.id, enemy]]), hero);

    expect(recipients.map((unit) => unit.id)).toEqual([hero.id]);
    expect(hero.issued).toEqual([order]);
    expect(enemy.issued).toEqual([]);
  });

  it('drops missing commandable ids before issuing orders', () => {
    const hero = target(1);
    const summon = target(2);
    const missingId = 3;
    const snapshot: SelectionSnapshot = {
      primaryId: hero.id,
      selectedIds: [hero.id, summon.id, missingId],
      commandableIds: [hero.id, summon.id, missingId],
      inspectId: 0,
    };

    const recipients = issueSelectionOrder(order, snapshot, new Map([[hero.id, hero], [summon.id, summon]]), hero);

    expect(recipients.map((unit) => unit.id)).toEqual([hero.id, summon.id]);
    expect(hero.issued).toEqual([order]);
    expect(summon.issued).toEqual([order]);
  });
});
