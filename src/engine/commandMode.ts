export type CommandModeResult =
  | { kind: 'none' }
  | { kind: 'instant-cast'; abilityIndex: number }
  | { kind: 'instant-cast'; abilityIndex: number; queued?: boolean }
  | { kind: 'pending-cast'; abilityIndex: number; queued?: boolean }
  | { kind: 'cast'; abilityIndex: number; queued?: boolean }
  | { kind: 'instant-item'; itemSlot: number }
  | { kind: 'instant-item'; itemSlot: number; queued?: boolean }
  | { kind: 'pending-item'; itemSlot: number; queued?: boolean }
  | { kind: 'item'; itemSlot: number; queued?: boolean }
  | { kind: 'pending-attackmove'; queued?: boolean }
  | { kind: 'attackmove'; queued?: boolean };

export interface CommandModeOptions {
  queued?: boolean;
}

export class CommandMode {
  private pending:
    | { kind: 'none' }
    | { kind: 'cast'; abilityIndex: number; options: CommandModeOptions }
    | { kind: 'item'; itemSlot: number; options: CommandModeOptions }
    | { kind: 'attackmove'; options: CommandModeOptions } = { kind: 'none' };

  get pendingCast(): number {
    if (this.pending.kind === 'cast') return this.pending.abilityIndex;
    if (this.pending.kind === 'attackmove') return -2;
    return -1;
  }

  get pendingItem(): number {
    return this.pending.kind === 'item' ? this.pending.itemSlot : -1;
  }

  pendingCastOptions(): CommandModeOptions {
    return this.pending.kind === 'cast' || this.pending.kind === 'attackmove' ? { ...this.pending.options } : {};
  }

  pendingItemOptions(): CommandModeOptions {
    return this.pending.kind === 'item' ? { ...this.pending.options } : {};
  }

  beginCast(abilityIndex: number, waitsForTarget: boolean, options: CommandModeOptions = {}): CommandModeResult {
    const resultOptions = resultQueued(options);
    if (!waitsForTarget) {
      this.pending = { kind: 'none' };
      return { kind: 'instant-cast', abilityIndex, ...resultOptions };
    }
    this.pending = { kind: 'cast', abilityIndex, options: { ...options } };
    return { kind: 'pending-cast', abilityIndex, ...resultOptions };
  }

  beginItem(itemSlot: number, waitsForTarget: boolean, options: CommandModeOptions = {}): CommandModeResult {
    const resultOptions = resultQueued(options);
    if (!waitsForTarget) {
      this.pending = { kind: 'none' };
      return { kind: 'instant-item', itemSlot, ...resultOptions };
    }
    this.pending = { kind: 'item', itemSlot, options: { ...options } };
    return { kind: 'pending-item', itemSlot, ...resultOptions };
  }

  beginAttackMove(options: CommandModeOptions = {}): CommandModeResult {
    this.pending = { kind: 'attackmove', options: { ...options } };
    return { kind: 'pending-attackmove', ...resultQueued(options) };
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
      const resultOptions = resultQueued(this.pending.options);
      if (!options.keepPending) this.pending = { kind: 'none' };
      return { kind: 'cast', abilityIndex, ...resultOptions };
    }
    if (this.pending.kind === 'item') {
      const itemSlot = this.pending.itemSlot;
      const resultOptions = resultQueued(this.pending.options);
      if (!options.keepPending) this.pending = { kind: 'none' };
      return { kind: 'item', itemSlot, ...resultOptions };
    }
    if (this.pending.kind === 'attackmove') {
      const resultOptions = resultQueued(this.pending.options);
      this.pending = { kind: 'none' };
      return { kind: 'attackmove', ...resultOptions };
    }
    return { kind: 'none' };
  }

  cancel(): void {
    this.pending = { kind: 'none' };
  }
}

function resultQueued(options: CommandModeOptions): { queued?: boolean } {
  return options.queued ? { queued: true } : {};
}
