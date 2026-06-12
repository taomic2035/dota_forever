export type CommandModeResult =
  | { kind: 'none' }
  | { kind: 'instant-cast'; abilityIndex: number }
  | { kind: 'pending-cast'; abilityIndex: number }
  | { kind: 'cast'; abilityIndex: number }
  | { kind: 'instant-item'; itemSlot: number }
  | { kind: 'pending-item'; itemSlot: number }
  | { kind: 'item'; itemSlot: number }
  | { kind: 'pending-attackmove' }
  | { kind: 'attackmove' };

export class CommandMode {
  private pending: { kind: 'none' } | { kind: 'cast'; abilityIndex: number } | { kind: 'item'; itemSlot: number } | { kind: 'attackmove' } = { kind: 'none' };

  get pendingCast(): number {
    if (this.pending.kind === 'cast') return this.pending.abilityIndex;
    if (this.pending.kind === 'attackmove') return -2;
    return -1;
  }

  get pendingItem(): number {
    return this.pending.kind === 'item' ? this.pending.itemSlot : -1;
  }

  beginCast(abilityIndex: number, waitsForTarget: boolean): CommandModeResult {
    if (!waitsForTarget) {
      this.pending = { kind: 'none' };
      return { kind: 'instant-cast', abilityIndex };
    }
    this.pending = { kind: 'cast', abilityIndex };
    return { kind: 'pending-cast', abilityIndex };
  }

  beginItem(itemSlot: number, waitsForTarget: boolean): CommandModeResult {
    if (!waitsForTarget) {
      this.pending = { kind: 'none' };
      return { kind: 'instant-item', itemSlot };
    }
    this.pending = { kind: 'item', itemSlot };
    return { kind: 'pending-item', itemSlot };
  }

  beginAttackMove(): CommandModeResult {
    this.pending = { kind: 'attackmove' };
    return { kind: 'pending-attackmove' };
  }

  previewCast(): number | null {
    return this.pending.kind === 'cast' ? this.pending.abilityIndex : null;
  }

  previewItem(): number | null {
    return this.pending.kind === 'item' ? this.pending.itemSlot : null;
  }

  consumePrimary(options: { keepPending?: boolean } = {}): CommandModeResult {
    if (this.pending.kind === 'cast') {
      const abilityIndex = this.pending.abilityIndex;
      if (!options.keepPending) this.pending = { kind: 'none' };
      return { kind: 'cast', abilityIndex };
    }
    if (this.pending.kind === 'item') {
      const itemSlot = this.pending.itemSlot;
      if (!options.keepPending) this.pending = { kind: 'none' };
      return { kind: 'item', itemSlot };
    }
    if (this.pending.kind === 'attackmove') {
      this.pending = { kind: 'none' };
      return { kind: 'attackmove' };
    }
    return { kind: 'none' };
  }

  cancel(): void {
    this.pending = { kind: 'none' };
  }
}
