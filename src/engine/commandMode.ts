export type CommandModeResult =
  | { kind: 'none' }
  | { kind: 'instant-cast'; abilityIndex: number }
  | { kind: 'pending-cast'; abilityIndex: number }
  | { kind: 'cast'; abilityIndex: number }
  | { kind: 'pending-attackmove' }
  | { kind: 'attackmove' };

export class CommandMode {
  private pending = -1;

  get pendingCast(): number {
    return this.pending;
  }

  beginCast(abilityIndex: number, waitsForTarget: boolean): CommandModeResult {
    if (!waitsForTarget) {
      this.pending = -1;
      return { kind: 'instant-cast', abilityIndex };
    }
    this.pending = abilityIndex;
    return { kind: 'pending-cast', abilityIndex };
  }

  beginAttackMove(): CommandModeResult {
    this.pending = -2;
    return { kind: 'pending-attackmove' };
  }

  previewCast(): number | null {
    return this.pending >= 0 ? this.pending : null;
  }

  consumePrimary(options: { keepPending?: boolean } = {}): CommandModeResult {
    if (this.pending >= 0) {
      const abilityIndex = this.pending;
      if (!options.keepPending) this.pending = -1;
      return { kind: 'cast', abilityIndex };
    }
    if (this.pending === -2) {
      this.pending = -1;
      return { kind: 'attackmove' };
    }
    return { kind: 'none' };
  }

  cancel(): void {
    this.pending = -1;
  }
}
