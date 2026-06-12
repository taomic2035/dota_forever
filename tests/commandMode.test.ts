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

  it('cancels any pending command', () => {
    const mode = new CommandMode();

    mode.beginCast(1, true);
    mode.cancel();

    expect(mode.pendingCast).toBe(-1);
    expect(mode.previewCast()).toBeNull();
    expect(mode.consumePrimary()).toEqual({ kind: 'none' });
  });
});
