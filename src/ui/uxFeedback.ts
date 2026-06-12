import type { Vec2 } from '../core/vec2';

export type WorldPulseKind = 'move' | 'attack' | 'attackmove' | 'reject' | 'stop' | 'hold' | 'ping';
export type TargetingMode = 'point' | 'unit' | 'line' | 'area';
export type HudFlashKind = 'confirm' | 'reject' | 'learn' | 'cooldown';
export type CursorIntentKind = 'attackmove' | 'cast' | 'item';

export interface WorldPulse {
  kind: WorldPulseKind;
  pos: Vec2;
  time: number;
  targetId?: number;
}

export interface TargetingState {
  abilityIndex: number;
  mode: TargetingMode;
  origin: Vec2;
  range: number;
  radius?: number;
  width?: number;
}

interface HudFlash {
  key: string;
  kind: HudFlashKind;
  time: number;
}

export interface CursorIntent {
  kind: CursorIntentKind;
  label: string;
  time: number;
  ttl?: number;
  color?: string;
}

const WORLD_PULSE_LIFE = 0.55;
const HUD_FLASH_LIFE = 0.45;

export class UxFeedback {
  private pulses: WorldPulse[] = [];
  private hudFlashes: HudFlash[] = [];
  private cursorIntent: CursorIntent | null = null;
  targeting: TargetingState | null = null;
  cursorPosition: Vec2 | null = null;

  addWorldPulse(pulse: WorldPulse): void {
    this.pulses.push(pulse);
    if (this.pulses.length > 32) this.pulses.splice(0, this.pulses.length - 32);
  }

  worldPulsesAt(now: number): WorldPulse[] {
    this.pulses = this.pulses.filter((p) => now - p.time <= WORLD_PULSE_LIFE);
    return this.pulses;
  }

  setTargeting(state: TargetingState): void {
    this.targeting = state;
  }

  clearTargeting(): void {
    this.targeting = null;
  }

  setCursorPosition(pos: Vec2): void {
    this.cursorPosition = { x: pos.x, y: pos.y };
  }

  setCursorIntent(intent: CursorIntent): void {
    this.cursorIntent = { ...intent };
  }

  clearCursorIntent(): void {
    this.cursorIntent = null;
  }

  cursorIntentAt(now: number): CursorIntent | null {
    if (!this.cursorIntent) return null;
    if (this.cursorIntent.ttl !== undefined && now - this.cursorIntent.time > this.cursorIntent.ttl) {
      this.cursorIntent = null;
      return null;
    }
    return this.cursorIntent;
  }

  flashHudSlot(key: string, kind: HudFlashKind, time: number): void {
    this.hudFlashes.push({ key, kind, time });
    if (this.hudFlashes.length > 24) this.hudFlashes.splice(0, this.hudFlashes.length - 24);
  }

  hudFlashFor(key: string, now: number): HudFlash | null {
    this.hudFlashes = this.hudFlashes.filter((f) => now - f.time <= HUD_FLASH_LIFE);
    for (let i = this.hudFlashes.length - 1; i >= 0; i--) {
      const flash = this.hudFlashes[i];
      if (flash.key === key) return flash;
    }
    return null;
  }
}
