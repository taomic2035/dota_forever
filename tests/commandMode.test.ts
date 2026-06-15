import { describe, expect, it } from 'vitest';
import { CommandMode } from '../src/engine/commandMode';

describe('CommandMode', () => {
  it('keeps targeted casts pending until primary click confirms', () => {
    const mode = new CommandMode();

    expect(mode.beginCast(1, true)).toEqual({ kind: 'pending-cast', abilityIndex: 1 });
    expect(mode.pendingCast).toBe(1);
    expect(mode.previewCast()).toBe(1);

    expect(mode.consumePrimary()).toEqual({ kind: 'cast', abilityIndex: 1 });
    expect(mode.pendingCast).toBe(-1);
  });

  it('preserves queued intent while a targeted cast is pending', () => {
    const mode = new CommandMode();

    expect(mode.beginCast(1, true, { queued: true })).toEqual({ kind: 'pending-cast', abilityIndex: 1, queued: true });
    expect(mode.pendingCastOptions()).toEqual({ queued: true });
    expect(mode.consumePrimary()).toEqual({ kind: 'cast', abilityIndex: 1, queued: true });
  });

  it('does not enter pending mode for instant casts', () => {
    const mode = new CommandMode();

    expect(mode.beginCast(0, false)).toEqual({ kind: 'instant-cast', abilityIndex: 0 });
    expect(mode.pendingCast).toBe(-1);
    expect(mode.consumePrimary()).toEqual({ kind: 'none' });
  });

  it('keeps a pending cast active after invalid confirm', () => {
    const mode = new CommandMode();
    mode.beginCast(2, true);

    expect(mode.consumePrimary({ keepPending: true })).toEqual({ kind: 'cast', abilityIndex: 2 });
    expect(mode.pendingCast).toBe(2);
  });

  it('replaces pending cast when another ability key is pressed', () => {
    const mode = new CommandMode();

    mode.beginCast(0, true);
    mode.beginCast(3, true);

    expect(mode.pendingCast).toBe(3);
    expect(mode.consumePrimary()).toEqual({ kind: 'cast', abilityIndex: 3 });
  });

  it('uses the same primary-click flow for attack-move', () => {
    const mode = new CommandMode();

    expect(mode.beginAttackMove()).toEqual({ kind: 'pending-attackmove' });
    expect(mode.pendingCast).toBe(-2);
    expect(mode.consumePrimary()).toEqual({ kind: 'attackmove' });
    expect(mode.pendingCast).toBe(-1);
  });

  it('uses the same primary-click flow for forced move', () => {
    const mode = new CommandMode();

    expect(mode.beginMove()).toEqual({ kind: 'pending-move' });
    expect(mode.pendingCast).toBe(-3);
    expect(mode.consumePrimary()).toEqual({ kind: 'move' });
    expect(mode.pendingCast).toBe(-1);
  });

  it('marks attack-move as queued when Shift starts the command', () => {
    const mode = new CommandMode();

    expect(mode.beginAttackMove({ queued: true })).toEqual({ kind: 'pending-attackmove', queued: true });
    expect(mode.pendingCastOptions()).toEqual({ queued: true });
    expect(mode.consumePrimary()).toEqual({ kind: 'attackmove', queued: true });
  });

  it('cancels any pending command', () => {
    const mode = new CommandMode();

    mode.beginCast(1, true);
    mode.cancel();

    expect(mode.pendingCast).toBe(-1);
    expect(mode.previewCast()).toBeNull();
    expect(mode.consumePrimary()).toEqual({ kind: 'none' });
  });

  it('keeps targeted items pending until primary click confirms', () => {
    const mode = new CommandMode();

    expect(mode.beginItem(4, true)).toEqual({ kind: 'pending-item', itemSlot: 4 });
    expect(mode.pendingItem).toBe(4);
    expect(mode.previewItem()).toBe(4);

    expect(mode.consumePrimary()).toEqual({ kind: 'item', itemSlot: 4 });
    expect(mode.pendingItem).toBe(-1);
  });

  it('does not enter pending mode for instant items', () => {
    const mode = new CommandMode();

    expect(mode.beginItem(2, false)).toEqual({ kind: 'instant-item', itemSlot: 2 });
    expect(mode.pendingItem).toBe(-1);
    expect(mode.consumePrimary()).toEqual({ kind: 'none' });
  });

  it('keeps a pending item active after invalid confirm', () => {
    const mode = new CommandMode();
    mode.beginItem(5, true);

    expect(mode.consumePrimary({ keepPending: true })).toEqual({ kind: 'item', itemSlot: 5 });
    expect(mode.pendingItem).toBe(5);
  });

  it('replaces pending item when another item slot is pressed', () => {
    const mode = new CommandMode();

    mode.beginItem(1, true);
    mode.beginItem(3, true);

    expect(mode.pendingItem).toBe(3);
    expect(mode.consumePrimary()).toEqual({ kind: 'item', itemSlot: 3 });
  });

  it('replaces pending item when an ability targeting mode starts', () => {
    const mode = new CommandMode();

    mode.beginItem(1, true);
    mode.beginCast(0, true);

    expect(mode.pendingItem).toBe(-1);
    expect(mode.pendingCast).toBe(0);
    expect(mode.consumePrimary()).toEqual({ kind: 'cast', abilityIndex: 0 });
  });
});
